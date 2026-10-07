"use client";
import {useEffect} from "react";
// One event per browser document, including refreshes; React remounts reuse the ID.
let eventId:string|undefined;
export default function LandingViewTracker({admin}:{admin:boolean}){
 useEffect(()=>{
  if(admin)return;
  const record=()=>{
   if(document.visibilityState!=="visible"||(document as Document & {prerendering?:boolean}).prerendering)return;
   eventId??=crypto.randomUUID();
   fetch("/api/analytics/page-view",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:eventId,url:location.href,referrer:document.referrer}),keepalive:true}).catch(()=>{});
   document.removeEventListener("visibilitychange",record);
  };
  document.addEventListener("visibilitychange",record);record();
  return ()=>document.removeEventListener("visibilitychange",record);
 },[admin]);
 return null;
}
