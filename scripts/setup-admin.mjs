import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { hashPassword, validAdminPin } from "../lib/admin-security.ts";

if (!process.stdin.isTTY) {
  console.error("Run npm run admin:setup in an interactive terminal. Passwords are entered privately.");
  process.exit(1);
}
const path = new URL("../.env.local", import.meta.url);
let existing = "";
try { existing = await readFile(path, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
if (/^ADMIN_PASSWORD_HASH=.+/m.test(existing) && !process.argv.includes("--reset")) {
  console.error("Admin access is already configured. To change the password and invalidate existing sessions, run: npm run admin:setup -- --reset");
  process.exit(1);
}

let hidden = false;
const output = new Writable({ write(chunk, encoding, done) { if (!hidden) process.stdout.write(chunk, encoding); done(); } });
const input = createInterface({ input: process.stdin, output, terminal: true });
async function secretQuestion(prompt) {
  process.stdout.write(prompt); hidden = true;
  try { return await input.question(""); }
  finally { hidden = false; process.stdout.write("\n"); }
}

try {
  const password = await secretQuestion("Choose a four-digit administrator PIN (0–9): ");
  if (!validAdminPin(password)) throw new Error("Enter exactly four digits (0–9). Leading zeros are allowed.");
  if (password !== await secretQuestion("Confirm PIN: ")) throw new Error("PINs did not match. Nothing was changed.");
  const hash = await hashPassword(password);
  const secret = randomBytes(48).toString("hex");
  const preserved = existing.split(/\r?\n/).filter(line => !/^ADMIN_(PASSWORD_HASH|SESSION_SECRET)=/.test(line)).join("\n").trimEnd();
  await writeFile(path, `${preserved}${preserved ? "\n\n" : ""}ADMIN_PASSWORD_HASH=${hash}\nADMIN_SESSION_SECRET=${secret}\n`, { mode: 0o600 });
  console.log("Administrator access configured. Only the password hash was stored in .env.local.");
  console.log("Restart the application if needed, then open /admin/login.");
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally { input.close(); }
