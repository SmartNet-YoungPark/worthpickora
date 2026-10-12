"use client";
import {useEffect,useRef,useState} from "react";
import {FEEDBACK_KINDS,type Feedback,type FeedbackKind} from "@/lib/customer-feedback";
import {shiftDate,torontoDate,validRange} from "@/lib/click-analytics";
import "./customer-feedback.css";
function ReplyEditor({row,onSaved}:{row:Feedback;onSaved:()=>void}){
 const [reply,setReply]=useState(row.reply),[status,setStatus]=useState(row.status),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 return <form className="feedback-reply-editor" onSubmit={async e=>{e.preventDefault();setBusy(true);setNotice("");try{
  const r=await fetch("/api/admin/feedback",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:row.id,reply,status})});const b=await r.json();if(!r.ok)throw new Error(b.error);setNotice(b.message);onSaved();
 }catch(error){setNotice(error instanceof Error?error.message:"Save failed.");}finally{setBusy(false);}}}>
 <label>Administrator reply<textarea value={reply} maxLength={1500} onChange={e=>setReply(e.target.value)}/></label>
 <label>Visibility<select value={status} onChange={e=>setStatus(e.target.value as Feedback["status"])}><option value="pending">Pending review</option><option value="visible">Public (comment and reply)</option><option value="hidden">Hidden</option></select></label>
 <button disabled={busy}>{busy?"Saving…":"Save reply / visibility"}</button><p role="status">{notice}</p></form>;
}
export default function CustomerFeedback({admin=false}:{admin?:boolean}){
 const [date,setDate]=useState(()=>torontoDate()),[rows,setRows]=useState<Feedback[]>([]),[offset,setOffset]=useState(0),[more,setMore]=useState(false),[refresh,setRefresh]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [name,setName]=useState(""),[kind,setKind]=useState<FeedbackKind>("suggestion"),[message,setMessage]=useState(""),[sending,setSending]=useState(false),[notice,setNotice]=useState("");
 const submission=useRef<{id:string;payload:string}|null>(null);
 const endpoint=admin?"/api/admin/feedback":"/api/feedback";
 useEffect(()=>{
  const controller=new AbortController();
  fetch(endpoint+"?"+new URLSearchParams({date,offset:String(offset)}),{cache:"no-store",signal:controller.signal})
   .then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error);if(controller.signal.aborted)return;setRows(b.rows);setMore(b.rows.length===50);setError("");})
   .catch(e=>{if(!controller.signal.aborted)setError(e.message||"Comments unavailable.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return ()=>controller.abort();
 },[date,offset,endpoint,refresh]);
 function selectDate(value:string){if(!validRange(value,value))return;setDate(value);setOffset(0);setRows([]);setLoading(true);}
 return <section className="customer-feedback" aria-label="Daily customer feedback"><header><div><p className="feedback-eyebrow">YOUR EXPERIENCE MATTERS</p><h2>{admin?"Customer feedback & replies":"How was your visit today?"}</h2><p>Tell us what helped, or what stopped you from shopping.</p></div></header>
 {!admin&&<form className="feedback-compose" onSubmit={async e=>{e.preventDefault();if(sending)return;setSending(true);setNotice("");const payload=JSON.stringify({name:name.trim()||"Guest",sentiment:kind,message});if(submission.current?.payload!==payload)submission.current={id:crypto.randomUUID(),payload};try{
  const r=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...JSON.parse(payload),id:submission.current.id})});const b=await r.json();if(!r.ok)throw new Error(b.error);setNotice(b.message);setMessage("");submission.current=null;
 }catch(e){setNotice(e instanceof Error?e.message:"Could not send feedback.");}finally{setSending(false);}}}>
 <div className="feedback-fields"><label>Display name (optional)<input value={name} maxLength={60} onChange={e=>setName(e.target.value)} placeholder="Guest"/></label><label>Your experience<select value={kind} onChange={e=>setKind(e.target.value as FeedbackKind)}>{Object.entries(FEEDBACK_KINDS).map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></label></div>
 <label>Comment<textarea value={message} minLength={5} maxLength={1500} required onChange={e=>setMessage(e.target.value)} placeholder="Was a price unclear, a link broken, or something difficult to find?"/></label><small>Approved comments and replies are public. Please do not include contact, payment or order details.</small><button disabled={sending}>{sending?"Sending…":"Send feedback"}</button><p role="status">{notice}</p></form>}
 <div className="feedback-date"><strong>Daily comments · Toronto time</strong><button type="button" onClick={()=>selectDate(shiftDate(date,-1))} aria-label="Previous day">‹</button><label>Date<input type="date" value={date} onChange={e=>selectDate(e.target.value)}/></label><button type="button" onClick={()=>selectDate(shiftDate(date,1))} disabled={date>=torontoDate()} aria-label="Next day">›</button><button type="button" onClick={()=>{setLoading(true);setRefresh(n=>n+1);}}>Refresh</button></div>
 {loading?<p role="status">Loading comments…</p>:error?<p role="alert">{error}</p>:<>{rows.length===0&&<p>No {admin?"":"published "}comments for this day.</p>}{rows.map(row=><article className="feedback-comment" key={row.id}><header><strong>{row.display_name}</strong><span>{FEEDBACK_KINDS[row.sentiment]}</span><time dateTime={row.created_at}>{new Intl.DateTimeFormat("en-CA",{timeZone:"America/Toronto",hour:"numeric",minute:"2-digit"}).format(new Date(row.created_at))}</time>{admin&&<b>{row.status}</b>}</header><p>{row.message}</p>{row.reply&&<div className="feedback-response"><strong>WorthPickora reply</strong><p>{row.reply}</p></div>}{admin&&<ReplyEditor row={row} onSaved={()=>setRefresh(n=>n+1)}/>}</article>)}<div className="feedback-pagination">{offset>0&&<button onClick={()=>{setLoading(true);setOffset(n=>Math.max(0,n-50));}}>Previous comments</button>}{more&&<button onClick={()=>{setLoading(true);setOffset(n=>n+50);}}>More comments</button>}</div></>}
 </section>;
}
