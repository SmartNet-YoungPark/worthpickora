"use client";
import {useState} from "react";
import SiteMessage from "@/app/site-message";
export default function BannerForm({initialMessage}:{initialMessage:string}){
  const [message,setMessage]=useState(initialMessage),[busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState(false);
  return <form className="store-app-settings banner-settings" onSubmit={async event=>{
    event.preventDefault();setBusy(true);setError("");setSaved(false);
    try{
      const response=await fetch("/api/admin/banner",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not save the banner.");setSaved(true);
    }catch(problem){setError(problem instanceof Error?problem.message:"Could not save the banner.");}finally{setBusy(false);}
  }}><label htmlFor="banner-message">Your message</label><textarea id="banner-message" value={message} maxLength={500} rows={5} placeholder="Share a welcome message, shopping tip, or announcement…" onChange={event=>{setMessage(event.target.value);setSaved(false);}}/><small>{message.length}/500 characters. Plain text only.</small><p>Leave this empty and save to hide the banner. It appears above the products when customers load the landing page.</p><h2>Preview</h2>{message.trim()?<SiteMessage message={message.trim()}/>:<p>Banner is hidden.</p>}<button disabled={busy} type="submit">{busy?"Saving…":"Save banner"}</button>{error&&<p className="store-app-error" role="alert">{error}</p>}{saved&&<p role="status">Saved. {message.trim()?"The banner will appear on the next landing page load.":"The banner is hidden."}</p>}</form>;
}
