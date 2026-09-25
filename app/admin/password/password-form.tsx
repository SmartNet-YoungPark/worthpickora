"use client";
import {useState} from "react";
export default function PasswordForm(){
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  return <form className="store-app-settings admin-password-form" onSubmit={async event=>{
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);setBusy(true);setError("");
    try{const response=await fetch("/api/admin/password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(data))});const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not change PIN.");form.reset();window.location.assign("/admin/login?changed=1");}
    catch(problem){setError(problem instanceof Error?problem.message:"Could not change PIN.");setBusy(false);}
  }}>{[["current","Current PIN"],["next","New PIN"],["confirm","Confirm new PIN"]].map(([name,label])=><label key={name}>{label}<input name={name} type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} required autoComplete={name==="current"?"current-password":"new-password"}/></label>)}<button disabled={busy}>{busy?"Saving…":"Change PIN"}</button>{error&&<p className="store-app-error" role="alert">{error}</p>}</form>;
}
