import { NextRequest, NextResponse } from "next/server";
import { adminConfig } from "@/lib/admin-auth";
import { createLoginLimiter, createSession, SESSION_COOKIE, SESSION_SECONDS, verifyPassword } from "@/lib/admin-security";

const limiterGlobal = globalThis as typeof globalThis & { adminLoginLimiter?: ReturnType<typeof createLoginLimiter> };
const allowAttempt = limiterGlobal.adminLoginLimiter ??= createLoginLimiter();

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return new NextResponse("Forbidden", { status: 403 });
  const fail = (error: string) => NextResponse.redirect(new URL(`/admin/login?error=${error}`, request.url), 303);
  const config = await adminConfig();
  if (!config.configured) return fail("unavailable");
  if (!allowAttempt()) return fail("limited");
  if (Number(request.headers.get("content-length") || 0) > 4096) return fail("invalid");
  let password: FormDataEntryValue | null;
  try { password = (await request.formData()).get("password"); } catch { return fail("invalid"); }
  if (typeof password !== "string" || !await verifyPassword(password, config.passwordHash)) return fail("invalid");
  const response = NextResponse.redirect(new URL("/admin/products", request.url), 303);
  response.cookies.set(SESSION_COOKIE, createSession(config.secret, config.passwordHash), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: SESSION_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
