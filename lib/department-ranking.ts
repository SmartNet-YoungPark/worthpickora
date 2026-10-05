import {promotionSavings,type SavingsOffer} from "./promotion-savings.ts";
export const AMAZON_DEPARTMENTS=["Automotive","Baby","Beauty & Personal Care","Books","Clothing, Shoes & Accessories","Electronics","Everything Else","Grocery & Gourmet Food","Health & Personal Care","Home & Kitchen","Industrial & Scientific","Musical Instruments, Stage & Studio","Office Products","Patio, Lawn & Garden","Pet Supplies","Sports & Outdoors","Tools & Home Improvement","Toys & Games","Video Games"];
const aliases:Record<string,string>={"Electronics & Tech":"Electronics","Clothing, Shoes & Jewelry":"Clothing, Shoes & Accessories","Grocery":"Grocery & Gourmet Food","Health & Household":"Health & Personal Care","Uncategorized":"Everything Else"};
export function canonicalDepartment(name:string){return aliases[name]||name||"Everything Else";}
export function departmentLimit(limits:DepartmentLimits,department:string){const key=canonicalDepartment(department);return limits[key]??Object.entries(limits).find(([name])=>canonicalDepartment(name)===key)?.[1]??(key==="All"?30:10);}

export type DepartmentLimits=Record<string,number>;
export function validDepartmentLimits(value:unknown):value is DepartmentLimits{return !!value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).length<=100&&Object.entries(value).every(([key,n])=>key.trim()===key&&key.length>0&&key.length<=80&&typeof n==="number"&&Number.isInteger(n)&&n>=10&&n<=100&&n%10===0);}
export function promotionRankValue(o:SavingsOffer,metric:"amount"|"percent"="amount"){
 if(metric==="percent")return typeof o.discountPercent==="number"&&o.discountPercent>0&&o.discountPercent<=100?o.discountPercent:null;
 const total=promotionSavings(o).total;if(total!==null)return total;
 return ["clip-coupon","promo-code"].includes(o.offerType||"")&&typeof o.discountAmount==="number"&&o.discountAmount>0&&(o.salePrice==null||o.discountAmount<=o.salePrice)?o.discountAmount:null;
}
export function rankDepartments<T extends SavingsOffer&{category?:string}>(offers:T[],limits:DepartmentLimits,category="",metric:"amount"|"percent"="amount"){
 return offers.filter(o=>(!category||canonicalDepartment(o.category||"")===canonicalDepartment(category))&&promotionRankValue(o,metric)!==null).sort((a,b)=>promotionRankValue(b,metric)!-promotionRankValue(a,metric)!||String(a.id).localeCompare(String(b.id))).slice(0,departmentLimit(limits,category||"All"));
}
