import {requireAdmin} from "@/lib/admin-auth";
import FlyerCards from "./flyer-cards";
import "./flyer.css";
export const metadata={title:"Walmart PDF cards | WorthPickora Admin",robots:{index:false,follow:false}};
export default async function WalmartFlyerPage(){await requireAdmin();return <FlyerCards/>;}
