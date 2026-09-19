import {requireAdmin} from "@/lib/admin-auth";
import ClickAnalytics from "./click-analytics";
import "./analytics.css";
export const metadata={title:"Click analytics · WorthPickora Admin",robots:{index:false,follow:false}};
export default async function AnalyticsPage(){await requireAdmin();return <ClickAnalytics/>;}

