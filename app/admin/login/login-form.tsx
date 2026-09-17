"use client";

import { useState } from "react";

export default function LoginForm({ configured, error }: { configured: boolean; error: string }) {
  const [pending, setPending] = useState(false);
  return <form action="/api/admin/login" method="post" onSubmit={() => setPending(true)}>
    <label htmlFor="admin-password">Administrator PIN</label>
    <input id="admin-password" name="password" type="password" inputMode="numeric" pattern="[0-9]{4}" autoComplete="current-password" required minLength={4} maxLength={4} title="Enter exactly four digits (0–9)" disabled={!configured} placeholder="Enter your 4-digit PIN" autoFocus={configured}/>
    {(!configured || error) && <p className="login-error" role="alert">{!configured ? "Admin access has not been configured. Contact the site owner." : error}</p>}
    <button disabled={!configured || pending} type="submit">{pending ? "Signing in…" : "Sign in to Admin"}<span aria-hidden="true">→</span></button>
  </form>;
}
