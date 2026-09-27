"use client";
import {useState} from "react";
export default function PromoCode({code}:{code:string}){
  const [message,setMessage]=useState("");
  return <div className="promo-code-box"><span>CODE</span><code>{code}</code><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(code);setMessage("Copied! Paste this code at checkout.");}catch{setMessage("Select and copy the code above, then paste it at checkout.");}}}>Copy code</button><small role="status">{message}</small></div>;
}
