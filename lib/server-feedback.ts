import "server-only";
import {rpc} from "./server-click-analytics";
export async function feedbackRpc(name:string,body:object){
 if(!(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL)||!(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY))throw new Error("Feedback storage is unavailable.");
 return rpc(name,body);
}
