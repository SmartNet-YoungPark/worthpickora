import { isAdmin } from "@/lib/admin-auth";

export async function GET() {
  const admin = await isAdmin();
  return Response.json({ admin }, { status: admin ? 200 : 401, headers: { "Cache-Control": "no-store, private" } });
}
