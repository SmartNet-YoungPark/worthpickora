import type {ClickRow} from "./click-analytics";
export const storeKey=(name:string)=>name.trim().toLowerCase();
export function storeClickRankings(rows:ClickRow[],stores:string[]){
 return [...new Map(stores.map(name=>[storeKey(name),name])).entries()].map(([key,store])=>{
  const products=new Map<string,{id:string;name:string;clicks:number;date:string}>();
  let total=0;
  for(const row of rows){
   if(storeKey(row.store_name)!==key)continue;
   const clicks=Number(row.clicks);total+=clicks;
   const previous=products.get(row.product_id);
   products.set(row.product_id,{id:row.product_id,name:previous&&previous.date>row.click_date?previous.name:row.product_name,date:previous&&previous.date>row.click_date?previous.date:row.click_date,clicks:(previous?.clicks||0)+clicks});
  }
  return {store,total,products:[...products.values()].filter(p=>p.clicks>0).sort((a,b)=>b.clicks-a.clicks||a.name.localeCompare(b.name)||a.id.localeCompare(b.id)).slice(0,5)};
 });
}
