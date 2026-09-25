import Link from "next/link";
import {requireAdmin} from "@/lib/admin-auth";
import PasswordForm from "./password-form";
export const metadata={title:"Change admin PIN | WorthPickora",robots:{index:false,follow:false}};
export default async function PasswordPage(){await requireAdmin();return <main className="store-app-admin"><nav><Link href="/admin/products">← Products</Link></nav><h1>Change administrator PIN</h1><p>Choose a new four-digit PIN. All current admin sessions will end after saving.</p><PasswordForm/></main>;}
