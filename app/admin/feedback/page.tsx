import Link from "next/link";
import {requireAdmin} from "@/lib/admin-auth";
import CustomerFeedback from "@/app/customer-feedback";
export const metadata={title:"Customer feedback | WorthPickora Admin",robots:{index:false,follow:false}};
export default async function FeedbackPage(){
 await requireAdmin();
 return <main className="feedback-admin-page"><nav><Link href="/admin/products">Manage products</Link><Link href="/admin/analytics">Analytics</Link><Link href="/">Landing page</Link></nav><CustomerFeedback admin/></main>;
}
