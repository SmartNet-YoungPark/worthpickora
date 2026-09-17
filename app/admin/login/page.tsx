import type { Metadata } from "next";
import Link from "next/link";
import SiteLogo from "@/app/site-logo";
import { redirect } from "next/navigation";
import { adminConfig, isAdmin } from "@/lib/admin-auth";
import LoginForm from "./login-form";
import "./login.css";

export const metadata: Metadata = { title: "Admin Login · WorthPickora", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin/products");
  const { configured } = adminConfig();
  const { error } = await searchParams;
  const messages: Record<string, string> = {
    invalid: "Incorrect PIN. Enter your four-digit administrator PIN.", limited: "Too many attempts. Please wait one minute and try again.", unavailable: "Admin access has not been configured. Contact the site owner.",
  };
  return <main className="admin-login-page"><Link className="wordmark site-brand" href="/"><SiteLogo/><span className="site-brand-text">Worth<span>Pickora</span>.</span></Link><section className="admin-login-card"><div className="login-lock" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg></div><span className="login-eyebrow">WORTHPICKORA WORKSPACE</span><h1>A little space for<br/>your good finds.</h1><p>Sign in with your four-digit administrator PIN<br/>to manage the product collection.</p><LoginForm configured={configured} error={error && messages[error] || ""}/><Link href="/" className="login-back">← Back to Landing Page</Link></section><p className="login-footnote">Thoughtfully curated. Carefully managed.</p></main>;
}
