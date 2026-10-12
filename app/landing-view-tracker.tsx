"use client";
import {useEffect} from "react";
// Retries/remounts reuse the document ID; a browser refresh creates a new ID.
let eventId:string|undefined;
let recorded=false;
export default function LandingViewTracker({admin}:{admin:boolean}){
 useEffect(()=>{
  if(admin||recorded)return;
  let stopped=false,pending=false,attempts=0;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const payload=()=>{eventId??=crypto.randomUUID();return JSON.stringify({id:eventId,url:location.href,referrer:document.referrer});};
  const visible=()=>document.visibilityState==="visible"&&!(document as Document & {prerendering?:boolean}).prerendering;
  const record=async()=>{
   if(stopped||recorded||pending||!visible()||attempts>=5)return;
   pending=true;attempts++;
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),8000);
   try{
    const response=await fetch("/api/analytics/page-view",{method:"POST",headers:{"Content-Type":"application/json"},body:payload(),keepalive:true,signal:controller.signal});
    if(response.ok)recorded=true;
    else if(response.status>=400&&response.status<500&&response.status!==429)attempts=5;
   }catch{/* Retry transient failures with the same deduplicated event ID. */}
   finally{clearTimeout(timeout);pending=false;if(!stopped&&!recorded&&attempts<5)timer=setTimeout(()=>void record(),1000*2**attempts);}
  };
  const online=()=>{attempts=0;void record();};
  const leaving=()=>{if(!recorded&&eventId)navigator.sendBeacon?.("/api/analytics/page-view",new Blob([payload()],{type:"application/json"}));};
  document.addEventListener("visibilitychange",record);window.addEventListener("online",online);window.addEventListener("pagehide",leaving);void record();
  return ()=>{stopped=true;clearTimeout(timer);document.removeEventListener("visibilitychange",record);window.removeEventListener("online",online);window.removeEventListener("pagehide",leaving);};
 },[admin]);
 return null;
}
