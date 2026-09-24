import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { exportProductWorkbook, workbookToCsv } from "../lib/catalog-workbook.ts";
import { importCsv, seedProducts } from "../lib/catalog.ts";

const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1sAAAAASUVORK5CYII=";

const cellFixture = () => readFile(new URL("./fixtures/in-cell-images.xlsx", import.meta.url));

test("Excel re-import rejects an existing code in the same set", async () => {
  const product = { ...seedProducts[0], image, photo: null };
  const csv = await workbookToCsv(await exportProductWorkbook([product]));
  assert.throws(() => importCsv(csv, [product]), /T001 already exists in Tech Set 1/);
});

test("Place in Cell PNG/JPG images restore by metadata, including repeated images and mixed drawings", async () => {
  const restored = importCsv(await workbookToCsv(await cellFixture()), []);
  assert.deepEqual(restored.map(product => product.code), ["T301", "T302", "T303", "T304"]);
  assert.equal(restored[0].image, image);
  assert.match(restored[1].image, /^data:image\/jpeg;base64,\/9j\//);
  assert.equal(restored[2].image, restored[1].image);
  assert.equal(restored[3].image, image);
  assert.deepEqual(restored.map(product => product.set), [11, 12, 13, 14]);
});

test("missing in-cell image media reports its cell instead of silently losing the image", async () => {
  const zip = await JSZip.loadAsync(await cellFixture());
  for (const path of Object.keys(zip.files).filter(path => path.endsWith(".jpeg"))) zip.remove(path);
  await assert.rejects(workbookToCsv(await zip.generateAsync({ type: "arraybuffer" })), /Cell A3:.*picture could not be read/);
});

test("in-cell and floating pictures in the same product row require resolving the duplicate", async () => {
  const zip = await JSZip.loadAsync(await cellFixture());
  const path = "xl/drawings/drawing1.xml";
  zip.file(path, (await zip.file(path).async("string")).replaceAll("<xdr:row>4</xdr:row>", "<xdr:row>1</xdr:row>"));
  await assert.rejects(workbookToCsv(await zip.generateAsync({ type: "arraybuffer" })), /Row 2 has multiple pictures/);
});

test("Excel export contains visible picture objects, not image codes in cells", async () => {
  const products = [{ ...seedProducts[0], image, photo: null, set: 27 }, { ...seedProducts[1], image, photo: null, set: 105 }];
  const buffer = await exportProductWorkbook(products);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet("Products");
  assert.equal(sheet.getCell("A1").text, "image");
  assert.equal(sheet.getCell("A2").text, "");
  assert.equal(sheet.getImages().length, 2);
  assert.equal(workbook.getImage(Number(sheet.getImages()[0].imageId)).extension, "png");
  const restored = importCsv(await workbookToCsv(buffer), []);
  assert.equal(restored[0].image, image);
  assert.equal(restored[1].image, image);
  assert.equal(restored[0].set, 27);
  assert.equal(restored[1].set, 105);
  assert.equal(restored[0].photo, null);
});

test("Excel import associates moved images with their new product rows", async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");
  sheet.addRow(["image", "code", "name", "category", "store", "set", "url"]);
  sheet.addRow(["", "T200", "No picture", "Tech", "Amazon", 8, "https://example.com/a"]);
  sheet.addRow(["", "T201", "With picture", "Tech", "Amazon", 9, "https://example.com/b"]);
  const id = workbook.addImage({ base64: image, extension: "png" });
  sheet.addImage(id, { tl: { col: 0, row: 2 }, ext: { width: 100, height: 100 } });
  const restored = importCsv(await workbookToCsv(await workbook.xlsx.writeBuffer()), []);
  assert.equal(restored[0].image, "");
  assert.equal(restored[1].image, image);
});
