import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const SESSION_SECONDS = 8 * 60 * 60;
export const SESSION_COOKIE = "worthpickora-admin";

export function validAdminPin(value: string) {
  return /^[0-9]{4}$/.test(value);
}

export function validPasswordHash(hash: string) {
  return /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash);
}

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password: string) {
  if (!validAdminPin(password)) throw new Error("Enter exactly four digits (0–9).");
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  if (!validPasswordHash(stored) || !validAdminPin(password)) return false;
  const [, salt, expected] = stored.split(":");
  return timingSafeEqual(await derive(password, salt), Buffer.from(expected, "hex"));
}

function signature(payload: string, secret: string, passwordHash: string) {
  return createHmac("sha256", `${secret}:${passwordHash}`).update(payload).digest();
}

export function createSession(secret: string, passwordHash: string, now = Date.now()) {
  if (secret.length < 32 || !validPasswordHash(passwordHash)) throw new Error("Admin access is not configured.");
  const payload = Buffer.from(JSON.stringify({ role: "admin", issued: now, expires: now + SESSION_SECONDS * 1000, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  return `${payload}.${signature(payload, secret, passwordHash).toString("base64url")}`;
}

export function verifySession(token: string | undefined, secret: string, passwordHash: string, now = Date.now()) {
  if (!token || token.length > 1024 || secret.length < 32 || !validPasswordHash(passwordHash)) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 2 || !parts.every(part => /^[a-zA-Z0-9_-]+$/.test(part))) return false;
    const [payload, mac] = parts;
    const actual = Buffer.from(mac, "base64url");
    const expected = signature(payload, secret, passwordHash);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return value.role === "admin" && Number.isSafeInteger(value.issued) && Number.isSafeInteger(value.expires)
      && value.issued <= now && value.expires > now && value.expires - value.issued === SESSION_SECONDS * 1000
      && typeof value.nonce === "string" && /^[a-f0-9]{32}$/.test(value.nonce);
  } catch { return false; }
}

// Bounded, process-local throttling for the single-admin login. A shared limiter is
// required when deploying multiple server instances.
export function createLoginLimiter(limit = 20, windowMs = 60_000) {
  let attempts = 0;
  let resetAt = 0;
  return (now = Date.now()) => {
    if (now >= resetAt) { attempts = 0; resetAt = now + windowMs; }
    if (attempts >= limit) return false;
    attempts++;
    return true;
  };
}
