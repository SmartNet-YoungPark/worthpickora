import ExcelJS from "exceljs";
import { readCellImages } from "./catalog-cell-images.ts";
import type { Product } from "./catalog";

const fields = ["image", "code", "name", "description", "category", "set", "store", "brand", "asin", "url", "status", "options"] as const;

export async function exportProductWorkbook(products: Product[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "WorthPickora";
  const sheet = workbook.addWorksheet("Products", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = fields.map(key => ({ key, header: key, width: key === "image" ? 23 : key === "description" || key === "url" ? 38 : key === "name" ? 28 : 16 }));
  sheet.getRow(1).height = 27;
  sheet.getRow(1).eachCell(cell => { cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF24354D" } }; });
  for (const product of products) {
    const row = sheet.addRow({ ...product, image: "" });
    row.height = 100;
    row.eachCell({ includeEmpty: true }, cell => { cell.alignment = { vertical: "middle", wrapText: true }; cell.font = { name: "Arial", size: 11 }; });
    if (product.image) {
      const match = /^data:image\/(png|jpeg);base64,/.exec(product.image);
      if (!match) throw new Error(`Convert the image for ${product.code} to PNG or JPEG before exporting.`);
      const id = workbook.addImage({ base64: product.image, extension: match[1] as "png" | "jpeg" });
      sheet.addImage(id, { tl: { col: 0.08, row: row.number - 0.94 }, ext: { width: 150, height: 120 }, editAs: "oneCell" });
    }
  }
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: fields.length } };
  return workbook.xlsx.writeBuffer();
}

export async function workbookToCsv(buffer: ArrayBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet("Products") || workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook has no product sheet.");
  if (sheet.rowCount > 5001) throw new Error("Import up to 5,000 products at a time.");
  const header = Array.from({ length: sheet.columnCount }, (_, index) => sheet.getRow(1).getCell(index + 1).text.trim().toLowerCase());
  const images = new Map<number, string>();
  for (const picture of await readCellImages(buffer, sheet.name)) {
    if (images.has(picture.row)) throw new Error(`Row ${picture.row} has multiple pictures. Keep one product image per row.`);
    images.set(picture.row, picture.image);
    // Remove Excel's #VALUE! placeholder before converting cells to product fields.
    sheet.getCell(picture.address).value = null;
  }
  for (const placement of sheet.getImages()) {
    const row = Math.floor(placement.range.tl.nativeRow) + 1;
    if (images.has(row)) throw new Error(`Row ${row} has multiple pictures. Keep one product image per row.`);
    const media = workbook.getImage(Number(placement.imageId));
    if (!["png", "jpeg", "jpg"].includes(media.extension)) throw new Error(`Row ${row}: use a PNG or JPEG product image.`);
    const mime = media.extension === "png" ? "png" : "jpeg";
    let image: string;
    if (media.base64) image = media.base64.startsWith("data:") ? media.base64 : `data:image/${mime};base64,${media.base64}`;
    else if (media.buffer) {
      const bytes = new Uint8Array(media.buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      image = `data:image/${mime};base64,${btoa(binary)}`;
    } else throw new Error(`Row ${row}: the picture could not be read.`);
    images.set(row, image);
  }
  let imageColumn = header.findIndex(field => field === "image" || field === "image_url");
  if (imageColumn < 0) { imageColumn = header.length; header.push("image"); }
  const escape = (text: string) => '"' + text.replaceAll('"', '""') + '"';
  const rows = [header];
  for (let number = 2; number <= sheet.rowCount; number++) {
    const row = sheet.getRow(number);
    const values = header.map((_, index) => row.getCell(index + 1).text);
    if (!values.some(Boolean) && !images.has(number)) continue;
    values[imageColumn] = images.get(number) || values[imageColumn] || "";
    rows.push(values);
  }
  return rows.map(row => row.map(escape).join(",")).join("\r\n");
}
