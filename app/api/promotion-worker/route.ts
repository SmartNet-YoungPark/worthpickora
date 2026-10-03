import {promotionRpc} from "@/lib/server-promotion-schedule";
import {verifyAmazonOffer} from "@/lib/promotion-verifier";
export const maxDuration=60;
export async function POST(request:Request){
 const headers={"Cache-Control":"no-store"};let token:string;
 try{const b=await request.json();token=b.token;if(typeof token!=="string"||!/^[-a-f0-9]{36}$/.test(token))throw new Error();}catch{return Response.json({error:"Unauthorized"},{status:401,headers});}
 let items:{run_id:string;product_id:string;url:string;lease_id:string;store:string;market:string;termsUrl?:string|null}[];
 try{items=await promotionRpc("promotion_batch_claim",{p_token:token});}catch{return Response.json({error:"Unauthorized or unavailable"},{status:401,headers});}
 const results=await Promise.allSettled(items.map(async item=>{const result=item.store==="Amazon"?await verifyAmazonOffer(item.url,item.termsUrl):{state:"unknown",url:item.url,note:"Automatic verification is not configured for this store. Review the saved product and terms URLs."};await promotionRpc("promotion_result_save",{p_run:item.run_id,p_id:item.product_id,p_lease:item.lease_id,p_result:result});}));
 return Response.json({processed:results.filter(x=>x.status==="fulfilled").length,failed:results.filter(x=>x.status==="rejected").length},{headers});
}
