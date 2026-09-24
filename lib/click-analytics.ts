export type ClickRow = {click_date:string;product_id:string;product_code:string;product_name:string;category_name:string;set_name:string;store_name:string;clicks:number;source?:string;device?:string};
export type GroupBy = "product" | "store" | "category" | "source" | "device";
export type Period = "day" | "week" | "month" | "year";
export const PERIODS: Period[] = ["day", "week", "month", "year"];
export const PERIOD_LABELS: Record<Period,string> = {day:"Daily",week:"Weekly",month:"Monthly",year:"Yearly"};
export function calendarRange(date:string,period:Period) {
  if(!validRange(date,date)||!PERIODS.includes(period))throw new Error("Choose a valid date and interval.");
  if(period==="day")return {start:date,end:date};
  if(period==="week"){const start=bucketDate(date,"week");return {start,end:shiftDate(start,6)};}
  if(period==="year")return {start:date.slice(0,4)+"-01-01",end:date.slice(0,4)+"-12-31"};
  const start=date.slice(0,7)+"-01";
  const next=new Date(start+"T12:00:00Z");next.setUTCMonth(next.getUTCMonth()+1);
  return {start,end:shiftDate(next.toISOString().slice(0,10),-1)};
}
export function torontoDate(now=new Date()) {
  return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Toronto",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
}
export function shiftDate(date:string,days:number) {
  const value=new Date(date+"T12:00:00Z");value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10);
}
export function validRange(start:string,end:string) {
  return [start,end].every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d) && start<=end && (Date.parse(end)-Date.parse(start))/86400000<=365;
}
export function bucketDate(date:string,period:Period) {
  if(period==="year")return date.slice(0,4);
  if(period==="month")return date.slice(0,7);
  if(period==="day")return date;
  const day=new Date(date+"T12:00:00Z").getUTCDay();return shiftDate(date,-((day+6)%7));
}
export function groupKey(row:ClickRow,by:GroupBy) {return by==="product"?row.product_id:by==="store"?row.store_name:by==="source"?row.source||"Unknown":by==="device"?row.device||"Unknown":row.category_name;}
export function rankClicks(rows:ClickRow[],by:GroupBy) {
  const groups=new Map<string,{key:string;label:string;clicks:number}>();
  for(const row of rows){const key=groupKey(row,by);const previous=groups.get(key);groups.set(key,{key,label:by==="product"?row.product_code+" · "+row.product_name:key,clicks:(previous?.clicks||0)+Number(row.clicks)});}
  return [...groups.values()].sort((a,b)=>b.clicks-a.clicks||a.label.localeCompare(b.label)).slice(0,10);
}
export function seriesClicks(rows:ClickRow[],start:string,end:string,period:Period) {
  const sums=new Map<string,number>();
  for(let date=start;date<=end;date=shiftDate(date,1))sums.set(bucketDate(date,period),0);
  for(const row of rows){const key=bucketDate(row.click_date,period);sums.set(key,(sums.get(key)||0)+Number(row.clicks));}
  return [...sums].map(([date,clicks])=>({date,clicks}));
}
