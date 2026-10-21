"use client";
import {storeClickRankings} from "@/lib/store-clicks";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {STORES} from "@/lib/catalog";
import {CLICK_SOURCES,CLICK_DEVICES} from "@/lib/click-attribution";
import {bucketDate,groupKey,rankClicks,seriesClicks,shiftDate,torontoDate,validRange,calendarRange,PERIODS,PERIOD_LABELS,type ClickRow,type GroupBy,type Period} from "@/lib/click-analytics";

export default function ClickAnalytics(){
  const [end,setEnd]=useState(()=>torontoDate());
  const [start,setStart]=useState(()=>shiftDate(torontoDate(),-29));
  const [range,setRange]=useState({start,end});
  const [rows,setRows]=useState<ClickRow[]>([]);
  const [restoredClicks,setRestoredClicks]=useState(0);
  const [allStoreTotal,setAllStoreTotal]=useState<number|null>(null);
  const [stores,setStores]=useState<string[]>([...STORES]);
  const [categories,setCategories]=useState<string[]>([]);
  const [error,setError]=useState("");const [busy,setBusy]=useState(true);
  const [refresh,setRefresh]=useState(0);
  const [store,setStore]=useState("");const [category,setCategory]=useState("");const [product,setProduct]=useState("");
  const [source,setSource]=useState("");const [device,setDevice]=useState("");
  const [by,setBy]=useState<GroupBy>("product");const [period,setPeriod]=useState<Period>("day");
  const [selected,setSelected]=useState("");const [limit,setLimit]=useState(50);
  const [deletion,setDeletion]=useState<({period:Period;date:string;start:string;end:string})|null>(null);
  const [deleting,setDeleting]=useState(false);const [deleteError,setDeleteError]=useState("");const [deleteNotice,setDeleteNotice]=useState("");
  const [feedback,setFeedback]=useState<{total:number;pending:number;problems:number}|null>(null);
  async function confirmDeletion(){
    if(!deletion||deleting)return;
    setDeleting(true);setDeleteError("");setDeleteNotice("");
    try{
      const response=await fetch("/api/admin/analytics",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({...deletion,confirmed:true})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not delete analytics.");
      setDeletion(null);setDeleteNotice(`Deleted ${result.clicks} interactions (${result.records} records), ${result.start} through ${result.end}.`);
      setBusy(true);setSelected("");setLimit(50);setRefresh(value=>value+1);
    }catch(problem){setDeleteError((problem instanceof Error?problem.message:"Deletion could not be confirmed.")+" Refresh analytics to check current data before retrying.");}
    finally{setDeleting(false);}
  }
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/admin/analytics?"+new URLSearchParams(range),{cache:"no-store",signal:controller.signal})
      .then(async response=>{const data=await response.json();if(controller.signal.aborted)return;if(!response.ok)throw new Error(data.error);setRows(data.rows);setRestoredClicks(Number(data.allStoreTotals?.__historical_unassigned__||0));setAllStoreTotal(data.allStoreTotals?Object.values(data.allStoreTotals as Record<string,number>).reduce((sum,n)=>sum+Number(n),0):null);setFeedback(data.feedback??null);setStores(data.stores);setCategories(data.categories);setError("");})
      .catch(problem=>{if(!controller.signal.aborted&&problem.name!=="AbortError")setError(problem.message||"Could not load analytics.");})
      .finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    return ()=>controller.abort();
  },[range,refresh]);
  function changeDates(nextStart:string,nextEnd:string){
    setStart(nextStart);setEnd(nextEnd);
    if(!validRange(nextStart,nextEnd)){setError("Choose a valid range of up to 366 days.");return;}
    setError("");setBusy(true);setSelected("");setLimit(50);setRange({start:nextStart,end:nextEnd});
  }
  const options=(key:"store_name"|"category_name")=>key==="store_name"?stores:categories;
  const productOptions=[...new Map(rows.map(row=>[row.product_id,row])).values()];
  const filtered=useMemo(()=>rows.filter(row=>(!store||row.store_name===store)&&(!category||row.category_name===category)&&(!product||row.product_id===product)&&(!source||(row.source||"Unknown")===source)&&(!device||(row.device||"Unknown")===device)),[rows,store,category,product,source,device]);
  const current=filtered.filter(row=>row.click_date>=range.start&&row.click_date<=range.end);
  const previous=filtered.filter(row=>row.click_date<range.start);
  const total=current.reduce((sum,row)=>sum+Number(row.clicks),0);
  const marketTotals:Record<string,number>={US:0,CA:0,Other:0,Unknown:0};
  for(const row of current){const key=row.market&&Object.hasOwn(marketTotals,row.market)?row.market:"Unknown";marketTotals[key]+=Number(row.clicks);}
  const deviceTotals:Record<string,number>={PC:0,Mobile:0,Tablet:0,Unknown:0};
  for(const row of current){const key=row.device&&Object.hasOwn(deviceTotals,row.device)?row.device:"Unknown";deviceTotals[key]+=Number(row.clicks);}

  const prior=previous.reduce((sum,row)=>sum+Number(row.clicks),0);
  const storeRankings=storeClickRankings(current,store?stores.filter(name=>name===store):stores);
  const ranking=rankClicks(current,by);
  const active=ranking.find(item=>item.key===selected)||ranking[0];
  const detail=current.filter(row=>active&&groupKey(row,by)===active.key).sort((a,b)=>b.click_date.localeCompare(a.click_date)||b.clicks-a.clicks);
  const trend=seriesClicks(detail,range.start,range.end,period);
  const periodProducts=new Map<string,Map<string,{id:string;code:string;name:string;clicks:number;stores:string[]}>>();
  for(const row of detail){
    const date=bucketDate(row.click_date,period);
    const products=periodProducts.get(date)||new Map();
    const previous=products.get(row.product_id);
    products.set(row.product_id,{id:row.product_id,code:row.product_code,name:row.product_name,clicks:(previous?.clicks||0)+Number(row.clicks),stores:[...new Set<string>([...(previous?.stores||[]),row.store_name])]});
    periodProducts.set(date,products);
  }
  const max=Math.max(1,...trend.map(point=>point.clicks));
  const points=trend.map((point,index)=>(20+index*560/Math.max(1,trend.length-1))+","+(150-point.clicks/max*125)).join(" ");
  const allTrend=seriesClicks(current,range.start,range.end,period);
  const peak=[...allTrend].sort((a,b)=>b.clicks-a.clicks)[0];
  const days=Math.round((Date.parse(range.end)-Date.parse(range.start))/86400000)+1;
  const comparison=prior?(total===prior?"Unchanged":(total>prior?"Up ":"Down ")+Math.abs((total-prior)/prior*100).toFixed(1)+"%")+" vs previous "+days+" days.":total?"No prior-period interactions; percentage change is not available.":"No interactions in either period.";
  return <main className="analytics-page">
    <header><div><p className="analytics-eyebrow">WORTHPICKORA ADMIN</p><h1>Product interactions</h1><p>Store visits from product images and View on Store buttons. Toronto time.</p></div><nav><Link href="/admin/products">Manage products</Link><Link href="/">Landing page</Link></nav></header>
    <p className="analytics-exclusion">Your interactions are excluded while signed in as administrator in this browser. Device clicks and product interactions count product-card store-link clicks, not unique customers, unique devices or purchases. Purchase conversion is unknown without purchase reports from the affiliate store.</p>
    <details className="analytics-exclusion"><summary>About source and device tracking</summary><p>Source uses utm_source or the referring website, retained for 30 minutes in this browser. Share links ending in ?utm_source=youtube or ?utm_source=tiktok for clearer attribution. Without this information, visits are Direct / Unknown. Device is estimated from browser headers; some tablets may appear as PC. Earlier records remain Unknown.</p></details>
    <form className="analytics-filters" onSubmit={event=>{event.preventDefault();if(!validRange(start,end)){setError("Choose a valid range of up to 366 days.");return;}setBusy(true);setSelected("");setLimit(50);setRange({start,end});setRefresh(value=>value+1);}}>
      <label>From<input type="date" value={start} onChange={e=>changeDates(e.target.value,end)} required/></label>
      <label>Through<input type="date" value={end} onChange={e=>changeDates(start,e.target.value)} required/></label>
      <button disabled={busy}>{busy?"Loading…":"Refresh"}</button>
      <label>Store<select value={store} onChange={e=>{setStore(e.target.value);setSelected("");setLimit(50);}}><option value="">All stores</option>{options("store_name").map(name=><option key={name}>{name}</option>)}</select></label>
      <label>Category<select value={category} onChange={e=>{setCategory(e.target.value);setSelected("");setLimit(50);}}><option value="">All categories</option>{options("category_name").map(name=><option key={name}>{name}</option>)}</select></label>
      <label>Product<select value={product} onChange={e=>{setProduct(e.target.value);setSelected("");setLimit(50);}}><option value="">All products</option>{productOptions.map(row=><option key={row.product_id} value={row.product_id}>{row.product_code} · {row.product_name}</option>)}</select></label>
      <label>Rank by<select value={by} onChange={e=>{setBy(e.target.value as GroupBy);setSelected("");setLimit(50);}}><option value="product">Product</option><option value="store">Store</option><option value="category">Category</option><option value="source">Source</option><option value="device">Device</option></select></label>
      <label>Source<select value={source} onChange={e=>{setSource(e.target.value);setSelected("");setLimit(50);}}><option value="">All sources</option>{CLICK_SOURCES.map(name=><option key={name}>{name}</option>)}</select></label>
      <label>Device<select value={device} onChange={e=>{setDevice(e.target.value);setSelected("");setLimit(50);}}><option value="">All devices</option>{CLICK_DEVICES.map(name=><option key={name}>{name}</option>)}</select></label>
    </form>
    <div className="analytics-tools"><div className="analytics-small-buttons" role="group" aria-label="Trend interval"><strong>Trend interval</strong>{PERIODS.map(value=><button key={value} type="button" aria-pressed={period===value} onClick={()=>{setPeriod(value);setLimit(50);}}>{PERIOD_LABELS[value]}</button>)}</div>
      <div className="analytics-small-buttons analytics-delete-buttons" role="group" aria-label="Delete product interaction statistics"><strong>Delete product interaction statistics</strong>{PERIODS.map(value=><button key={value} type="button" disabled={busy||deleting||!validRange(end,end)} onClick={()=>{setDeleteError("");setDeleteNotice("");setDeletion({period:value,date:end,...calendarRange(end,value)});}}>Delete {PERIOD_LABELS[value]}</button>)}</div>
      <p>Delete uses the calendar day / week / month / year containing the Through date ({end || "choose a date"}). Weeks begin Monday. All product interaction records in that period are included, regardless of filters. Products and other statistics are kept.</p>
    </div>
    {deletion&&<section className="analytics-delete-confirm" role="alertdialog" aria-labelledby="analytics-delete-title" aria-describedby="analytics-delete-description"><h2 id="analytics-delete-title">Permanently delete {PERIOD_LABELS[deletion.period].toLowerCase()} statistics?</h2><p id="analytics-delete-description"><strong>{deletion.start} through {deletion.end} (Toronto time)</strong><br/>All products, stores, categories, sources and devices in this period. This may extend beyond the displayed report. This cannot be undone.</p><div><button type="button" disabled={deleting} onClick={()=>{setDeletion(null);setDeleteError("");}}>Cancel</button><button type="button" disabled={deleting} onClick={()=>void confirmDeletion()}>{deleting?"Deleting…":"Delete permanently"}</button></div>{deleteError&&<p className="analytics-error" role="alert">{deleteError}</p>}</section>}
    {deleteNotice&&<p className="analytics-delete-notice" role="status">{deleteNotice}</p>}
    <p className="analytics-applied-range" role="status">{busy?"Loading selected dates…":`Reporting period: ${range.start} through ${range.end} (Toronto time).`} Dates apply automatically. Daily / Weekly / Monthly / Yearly changes the chart grouping only. Current interval: {PERIOD_LABELS[period]}.</p>
    {error&&<p className="analytics-error" role="alert">{error}</p>}
    {!error&&!busy&&<><section className="analytics-stats"><div><span>Total device clicks</span><strong>{total.toLocaleString()}</strong><small>Product-link clicks in the selected dates and filters; not unique devices.</small><ul className="analytics-device-totals" aria-label="Clicks by device">{CLICK_DEVICES.map(name=><li key={name}><span>{name}</span><b>{deviceTotals[name].toLocaleString()}</b></li>)}</ul><div className="analytics-market-summary"><h3>Market clicks</h3><ul className="analytics-device-totals" aria-label="Clicks by visitor market">{([['US','United States'],['CA','Canada'],['Other','Other countries'],['Unknown','Unknown / older records']] as const).map(([key,label])=><li key={key}><span>{label}</span><b>{marketTotals[key].toLocaleString()}</b></li>)}</ul><small>Visitor country at click time, using IP geolocation. Same dates and filters apply. Older records without country information remain Unknown.</small></div><small>Restored historical totals have no device or market details and are excluded.</small></div><div><span>Total product interactions</span><strong>{allStoreTotal===null?"Unavailable":allStoreTotal.toLocaleString()}</strong><small>All stores, all recorded dates. Filters do not apply.</small>{restoredClicks>0&&<small>Includes {restoredClicks.toLocaleString()} restored historical interactions confirmed by the owner. Store/product details are unavailable; excluded from rankings.</small>}</div><div><span>Customer feedback</span><strong>{feedback?feedback.total.toLocaleString():"Unavailable"}</strong><small>{feedback?`${feedback.pending} pending review ? ${feedback.problems} reported problems. Date range applies; other filters do not.`:"Check feedback storage and migration."}</small><Link href="/admin/feedback">Read daily comments & reply</Link></div></section>
    <section className="analytics-store-clicks" aria-label="Product interactions by store"><h2>Product interactions by store</h2><p>Selected dates and filters: {total.toLocaleString()} product interactions. Top 5 products in each store; repeated interactions are included.</p>{storeRankings.map(item=><article className="analytics-store-card" key={item.store}><header><h3>{item.store}</h3><strong>{item.total.toLocaleString()} <small>product interactions</small></strong></header>{item.products.length?<ol className="analytics-store-top-five">{item.products.map((p,index)=><li key={p.id}><span className="analytics-store-rank">#{index+1}</span><span className="analytics-store-product-name">{p.name}</span><b>{p.clicks.toLocaleString()} interactions</b></li>)}</ol>:<p>No product interactions in this period.</p>}</article>)}</section>
    <div className="analytics-charts"><section className="analytics-panel"><h2>Top 10 · {by}</h2><p>Hover, focus, or tap a bar to view its records.</p>{!ranking.length&&<p className="analytics-empty">No customer interactions for these filters yet.</p>}
      <div className="analytics-ranking">{ranking.map((item,index)=><button key={item.key} className={active?.key===item.key?"active":""} onMouseEnter={()=>{setSelected(item.key);setLimit(50);}} onFocus={()=>{setSelected(item.key);setLimit(50);}} onClick={()=>{setSelected(item.key);setLimit(50);}} aria-pressed={active?.key===item.key}><span>{index+1}. {item.label}</span><span className="analytics-bar-track"><i style={{width:(item.clicks/Math.max(1,ranking[0].clicks)*100)+"%"}}/></span><b>{item.clicks.toLocaleString()}</b></button>)}</div>
    </section><section className="analytics-panel analytics-detail" aria-label="Selected interaction records"><h2>{active?.label||"Interaction details"}</h2><p>{active?active.clicks.toLocaleString()+" interactions · "+detail.length+" daily records":"Select a ranked item"}</p>
      {active&&<><svg className="analytics-line" viewBox="0 0 600 185" role="img" aria-label={active.label+" interaction trend"}><line x1="20" y1="150" x2="580" y2="150" stroke="#dbe5df"/><polyline points={points} fill="none" stroke="#28724e" strokeWidth="3"/>{trend.map((point,index)=><circle key={point.date} cx={20+index*560/Math.max(1,trend.length-1)} cy={150-point.clicks/max*125} r="3" fill="#28724e"><title>{point.date+": "+point.clicks+" interactions"}</title></circle>)}<text x="20" y="178">{trend[0]?.date}</text><text x="580" y="178" textAnchor="end">{trend.at(-1)?.date}</text><text x="20" y="15">{max} interactions</text></svg>
      <details><summary>View {period} totals</summary><div className="analytics-periods">{trend.map(point=><div className="analytics-period-record" key={point.date}><strong>{point.date}: {point.clicks} interactions</strong>
        <table aria-label={point.date+" product interaction totals"}>
          <thead><tr><th>ID</th><th>Product</th><th className="analytics-click-count">Interactions</th><th>Store</th></tr></thead>
          <tbody>{[...(periodProducts.get(point.date)?.values()||[])].map(item=><tr key={item.id}>
            <td className="analytics-product-id"><b>{item.code}</b><small>{item.id}</small></td>
            <td>{item.name}</td>
            <td className="analytics-click-count">{item.clicks}</td>
            <td>{item.stores.join(", ")}</td>
          </tr>)}</tbody>
        </table>
      </div>)}</div></details>
      <div className="analytics-table-scroll"><table>
        <thead><tr><th>Date</th><th>Set</th><th>ID</th><th>Product</th><th className="analytics-click-count">Interactions</th><th>Store</th><th>Source</th><th>Device</th></tr></thead>
        <tbody>{detail.slice(0,limit).map(row=><tr key={JSON.stringify([row.click_date,row.product_id,row.source,row.device,row.market])}>
          <td>{row.click_date}</td>
          <td>{row.set_name}</td>
          <td className="analytics-product-id"><b>{row.product_code}</b><small>{row.product_id}</small></td>
          <td>{row.product_name}</td>
          <td className="analytics-click-count">{row.clicks}</td>
          <td>{row.store_name}</td>
          <td>{row.source||"Unknown"}</td>
          <td>{row.device||"Unknown"}</td>
        </tr>)}</tbody>
      </table></div>{detail.length>limit&&<button className="analytics-load-more" onClick={()=>setLimit(value=>value+50)}>Show more records ({limit} of {detail.length})</button>}</>}
    </section></div>
    <section className="analytics-insights"><h2>Trend & current activity</h2><p><strong>{total.toLocaleString()} interactions</strong> from {range.start} through {range.end}. {comparison}</p>{ranking[0]&&<p>Leading {by}: <strong>{ranking[0].label}</strong>, {ranking[0].clicks} interactions ({(ranking[0].clicks/total*100).toFixed(1)}% of the filtered total).</p>}{peak?.clicks>0&&<p>Busiest {period}: {peak.date}, {peak.clicks} interactions.</p>}<p>{range.end>=torontoDate()?"Today is still in progress. ":""}Weeks, months and years at the edges of the selected range may be partial. Reports start when tracking is enabled; deleted interactions cannot be recovered.</p></section></>}
  </main>;
}
