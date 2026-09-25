"use client";
import {useState} from "react";
import {STORE_APPS,type StoreLink} from "@/lib/store-apps";
export default function OfferForm({initialLinks}:{initialLinks:StoreLink[]}){
  const [links,setLinks]=useState(initialLinks),[busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState(false);
  const storeNames=[...new Set([...STORE_APPS.map(app=>app.store),...initialLinks.map(link=>link.store)])];
  function edit(id:string,key:keyof StoreLink,value:string){setLinks(items=>items.map(item=>item.id===id?{...item,[key]:value}:item));setSaved(false);}
  return <form className="store-app-settings store-links-editor" onSubmit={async event=>{
    event.preventDefault();setBusy(true);setError("");setSaved(false);
    try{const response=await fetch("/api/admin/store-apps",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({links})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not save links.");setSaved(true);}
    catch(problem){setError(problem instanceof Error?problem.message:"Could not save links.");}finally{setBusy(false);}
  }}><h2>Store links</h2><p>Add several URLs for any store. Each link shows its title and one-line description on the landing page. Official app links remain available. Check each campaign's terms before publishing.</p>
    <fieldset disabled={busy}>{links.map((link,index)=><div className="store-link-editor" key={link.id}><div className="store-link-editor-heading"><strong>Link {index+1}</strong><button type="button" onClick={()=>{setLinks(items=>items.filter(item=>item.id!==link.id));setSaved(false);}}>Remove link {index+1}</button></div>
      <label>Store name<select required value={link.store} onChange={event=>edit(link.id,"store",event.target.value)}><option value="" disabled>Select a store</option>{storeNames.map(store=><option key={store} value={store}>{store}</option>)}</select></label>
      <label>Link title<input required maxLength={80} placeholder="Explore this week's finds" value={link.title} onChange={event=>edit(link.id,"title",event.target.value)}/></label>
      <label>URL / affiliate link<input required type="url" maxLength={2048} placeholder="https://..." value={link.url} onChange={event=>edit(link.id,"url",event.target.value)}/></label>
      <label>One-line description<input maxLength={160} placeholder="A short explanation of this link" value={link.description} onChange={event=>edit(link.id,"description",event.target.value)}/></label></div>)}
    {!links.length&&<p>No custom links. Add a link below to get started.</p>}<div className="store-links-editor-actions"><button type="button" disabled={links.length>=50} onClick={()=>{setLinks(items=>[...items,{id:"link-"+crypto.randomUUID(),store:"",title:"",description:"",url:""}]);setSaved(false);}}>+ Add link</button><button type="submit">{busy?"Saving…":"Save all links"}</button></div></fieldset>
    <p>Removing a link takes effect after Save all links. Previously recorded click counts are kept.</p>{error&&<p className="store-app-error" role="alert">{error}</p>}{saved&&<p role="status">Saved. Refresh the landing page to see your links.</p>}</form>;
}
