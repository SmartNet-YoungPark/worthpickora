import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, validPasswordHash, verifySession } from "./admin-security";
import { storedAdminHash } from "./admin-credentials";

export async function adminConfig() {
  let passwordHash="";
  try{passwordHash=await storedAdminHash()||process.env.ADMIN_PASSWORD_HASH||"";}catch{return {passwordHash:"",secret:"",configured:false};}
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  return { passwordHash, secret, configured: validPasswordHash(passwordHash) && secret.length >= 32 };
}

export async function isAdmin() {
  // Always read request cookies, including when configuration is absent at build
  // time, so permission-dependent pages can never be statically cached.
  const cookieStore = await cookies();
  const config = await adminConfig();
  return config.configured && verifySession(cookieStore.get(SESSION_COOKIE)?.value, config.secret, config.passwordHash);
}

export async function requireAdmin() {
  if (!await isAdmin()) redirect("/admin/login");
}
