"use client";
import Script from "next/script";
import {useEffect,useState} from "react";

declare global {
  interface Window { Genius?:{amazon:{convertLinks:(tsid:number,preserve:boolean,domain:string)=>void}}; }
}
export default function Geniuslink(){
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    if(!ready)return;
    let timer:ReturnType<typeof setTimeout>;
    const convert=()=>window.Genius?.amazon.convertLinks(447940,true,"https://buy.geni.us");
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(convert,50);};
    // The official snippet scans once. React adds more links after filtering/navigation.
    const observer=new MutationObserver(records=>{
      if(records.some(record=>record.type==="childList"||
        (record.target instanceof HTMLAnchorElement&&/^https:\/\/(www\.)?amazon\.(com|ca)\//.test(record.target.href))))schedule();
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["href"]});
    convert();
    return()=>{clearTimeout(timer);observer.disconnect();};
  },[ready]);
  return <Script src="https://geniuslinkcdn.com/snippet.min.js" strategy="afterInteractive" onReady={()=>setReady(true)} />;
}
