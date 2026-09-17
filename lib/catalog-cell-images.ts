import JSZip from "jszip";
import { SaxesParser } from "saxes";

type XmlNode = { name: string; attrs: Record<string, string>; children: XmlNode[]; text: string };
function parseXml(text: string): XmlNode {
  const root: XmlNode = { name: "", attrs: {}, children: [], text: "" };
  const stack = [root];
  const parser = new SaxesParser({ xmlns: true });
  parser.on("doctype", () => { throw new Error("Workbook XML must not contain a document type."); });
  parser.on("opentag", tag => {
    const node: XmlNode = { name: tag.local, attrs: {}, children: [], text: "" };
    for (const attr of Object.values(tag.attributes)) node.attrs[attr.local] = attr.value;
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  });
  parser.on("text", value => { stack[stack.length - 1].text += value; });
  parser.on("closetag", () => { stack.pop(); });
  parser.write(text).close();
  return root;
}
function all(node: XmlNode | undefined, name: string): XmlNode[] {
  if (!node) return [];
  return node.children.flatMap(child => [...(child.name === name ? [child] : []), ...all(child, name)]);
}
function index(value: string | undefined): number {
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : -1;
}
function resolvePart(source: string, target: string): string {
  const parts = target.startsWith("/") ? [] : source.split("/").slice(0, -1);
  for (const part of target.split("/")) {
    if (part === "..") { if (!parts.length) throw new Error("Invalid workbook relationship."); parts.pop(); }
    else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
}

// Excel Place in Cell stores images as rich values, separate from drawing anchors.
// Follow vm -> valueMetadata -> XLRICHVALUE futureMetadata -> rv -> image relationship.
export async function readCellImages(buffer: ArrayBuffer, sheetName: string) {
  const zip = await JSZip.loadAsync(buffer);
  async function xml(path: string) {
    const file = zip.file(path);
    if (!file) throw new Error(`The workbook is missing ${path}. Re-save it in Excel and try again.`);
    return parseXml(await file.async("string"));
  }
  async function relationships(source: string) {
    const bits = source.split("/");
    const filename = bits.pop();
    return all(await xml([...bits, "_rels", `${filename}.rels`].join("/")), "Relationship");
  }
  const bookPath = "xl/workbook.xml";
  const book = await xml(bookPath);
  const rels = await relationships(bookPath);
  const sheet = all(book, "sheet").find(node => node.attrs.name === sheetName);
  const sheetRel = rels.find(node => node.attrs.Id === sheet?.attrs.id);
  if (!sheetRel || sheetRel.attrs.TargetMode === "External") throw new Error("The product worksheet could not be read.");
  const sheetXml = await xml(resolvePart(bookPath, sheetRel.attrs.Target));
  const cells = all(sheetXml, "c").filter(cell => index(cell.attrs.vm) > 0);
  if (!cells.length) return [];
  function part(type: string) {
    const rel = rels.find(node => node.attrs.Type?.toLowerCase().endsWith(`/${type.toLowerCase()}`));
    if (!rel || rel.attrs.TargetMode === "External") throw new Error("The workbook's in-cell image metadata is incomplete. Re-save it in Excel and try again.");
    return resolvePart(bookPath, rel.attrs.Target);
  }
  const metadata = await xml(part("sheetMetadata"));
  const types = all(metadata, "metadataType");
  const blocks = all(metadata, "valueMetadata")[0]?.children.filter(node => node.name === "bk") || [];
  const future = all(metadata, "futureMetadata").find(node => node.attrs.name === "XLRICHVALUE")?.children.filter(node => node.name === "bk") || [];
  const values = all(await xml(part("rdRichValue")), "rv");
  const structures = all(await xml(part("rdRichValueStructure")), "s");
  const imageRelsPath = part("richValueRel");
  const imageRefs = all(await xml(imageRelsPath), "rel");
  const imageRels = await relationships(imageRelsPath);
  const result: { address: string; row: number; image: string }[] = [];
  for (const cell of cells) {
    const address = cell.attrs.r;
    const fail = () => new Error(`Cell ${address}: the in-cell picture could not be read. Reinsert a JPG or PNG with Place in Cell and save the workbook.`);
    const rc = all(blocks[index(cell.attrs.vm) - 1], "rc").find(node => types[index(node.attrs.t) - 1]?.attrs.name === "XLRICHVALUE");
    if (!rc) throw fail();
    const richIndex = index(all(future[index(rc.attrs.v)], "rvb")[0]?.attrs.i);
    const rich = values[richIndex];
    const structure = structures[index(rich?.attrs.s)];
    const keyIndex = structure?.children.filter(node => node.name === "k").findIndex(node => node.attrs.n === "_rvRel:LocalImageIdentifier") ?? -1;
    if (keyIndex < 0) throw fail();
    const refIndex = index(rich?.children.filter(node => node.name === "v")[keyIndex]?.text.trim());
    const rel = imageRels.find(node => node.attrs.Id === imageRefs[refIndex]?.attrs.id);
    if (!rel || rel.attrs.TargetMode === "External") throw fail();
    const path = resolvePart(imageRelsPath, rel.attrs.Target);
    const media = zip.file(path);
    if (!media) throw fail();
    const bytes = await media.async("uint8array");
    const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!png && !jpeg) throw new Error(`Cell ${address}: use a JPG or PNG in-cell picture.`);
    if (bytes.length > 6 * 1024 * 1024) throw new Error(`Cell ${address}: reduce the picture size to less than 6 MB.`);
    const row = Number(/^[A-Z]+([1-9]\d*)$/.exec(address)?.[1]);
    if (!row || row === 1) throw new Error(`Cell ${address}: put the picture in a product row below the headers.`);
    result.push({ address, row, image: `data:image/${png ? "png" : "jpeg"};base64,${await media.async("base64")}` });
  }
  return result;
}
