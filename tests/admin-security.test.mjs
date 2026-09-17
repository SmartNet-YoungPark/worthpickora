import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createLoginLimiter, createSession, hashPassword, verifyPassword, verifySession, validAdminPin, SESSION_SECONDS } from "../lib/admin-security.ts";

const password = "0739"; // Test fixture, not a default credential.
const hash = await hashPassword(password);
const secret = randomBytes(48).toString("hex");

test("password verification rejects wrong credentials and malformed hashes", async () => {
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
  assert.equal(await verifyPassword(password, "scrypt:invalid"), false);
  assert.equal(await verifyPassword("x".repeat(257), hash), false);
  assert.equal(await verifyPassword("", hash), false);
});
test("password hashes are salted and do not contain the password", async () => {
  assert.notEqual(await hashPassword(password), hash);
  assert.match(hash, /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
});
test("signed sessions grant access only within the eight-hour lifetime", () => {
  const now = Date.now(); const token = createSession(secret, hash, now);
  assert.equal(verifySession(token, secret, hash, now), true);
  assert.equal(verifySession(token, secret, hash, now + SESSION_SECONDS * 1000), false);
  assert.equal(verifySession(token, secret, hash, now - 1), false);
});
test("modifying session payload, role, or signature fails verification", () => {
  const token = createSession(secret, hash);
  const [payload, signature] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url")), role: "viewer" })).toString("base64url");
  assert.equal(verifySession(`${forged}.${signature}`, secret, hash), false);
  assert.equal(verifySession(`${payload}.${"a".repeat(43)}`, secret, hash), false);
  assert.equal(verifySession(`${token}.extra`, secret, hash), false);
});
test("missing configuration, browser flags, and invalid cookies never grant admin access", () => {
  for (const token of [undefined, "true", "admin", '{"role":"admin"}', "x".repeat(2048)]) assert.equal(verifySession(token, secret, hash), false);
  assert.equal(verifySession(createSession(secret, hash), "", hash), false);
  assert.throws(() => createSession("", hash));
});
test("rotating either password or signing secret invalidates existing sessions", async () => {
  const token = createSession(secret, hash);
  assert.equal(verifySession(token, randomBytes(48).toString("hex"), hash), false);
  assert.equal(verifySession(token, secret, await hashPassword("5831")), false);
});
test("login attempts are limited and recover after the time window", () => {
  const allow = createLoginLimiter(2, 1000);
  assert.equal(allow(1000), true);
  assert.equal(allow(1100), true);
  assert.equal(allow(1200), false);
  assert.equal(allow(2000), true);
});

test("PINs must contain exactly four ASCII digits and preserve leading zeros", async () => {
  for (const pin of ["0000", "0739", "1234", "9999"]) assert.equal(validAdminPin(pin), true);
  for (const pin of ["", "739", "00739", " 0739", "0739 ", "0739\n", "12ab", "-123", "1.23", "１２３４", "١٢٣٤"]) {
    assert.equal(validAdminPin(pin), false);
    assert.equal(await verifyPassword(pin, hash), false);
    await assert.rejects(hashPassword(pin), /exactly four digits/);
  }
  assert.equal(await verifyPassword("0739", hash), true);
  assert.equal(await verifyPassword("739", hash), false);
  assert.equal(await verifyPassword("0740", hash), false);
});
