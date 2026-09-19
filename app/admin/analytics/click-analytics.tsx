"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {groupKey,rankClicks,seriesClicks,shiftDate,torontoDate,validRange,type ClickRow,type GroupBy,type Period} from "@/lib/click-analytics";

export default function ClickAnalytics(){
  const [end,setEnd]=useState(()=>torontoDate());
  const [start,setStart]=useState(()=>shiftDate(torontoDate(),-29));
  const [range,setRange]=useState({start,end});
  const [rows,setRows]=useState<ClickRow[]>([]);
  const [error,setError]=useState("");const [busy,setBusy]=useState(true);
  const [refresh,setRefresh]=useState(0);
  const [store,setStore]=useState("");const [category,setCategory]=useState("");const [product,setProduct]=useState("");
  const [by,setBy]=useState<GroupBy>("product");const [period,setPeriod]=useState<Period>("day");
  const [selected,setSelected]=useState("");const [limit,setLimit]=useState(50);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/admin/analytics?"+new URLSearchParams(range),{cache:"no-store",signal:controller.signal})
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);setRows(data.rows);setError("");})
      .catch(problem=>{if(problem.name!=="AbortError")setError(problem.message||"Could not load analytics.");})
      .finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    return ()=>controller.abort();
  },[range,refresh]);
  const options=(key:"store_name"|"category_name")=>[...new Set(rows.map(row=>row[key]))].sort();
  const productOptions=[...new Map(rows.map(row=>[row.product_id,row])).values()];
  const filtered=useMemo(()=>rows.filter(row=>(!store||row.store_name===store)&&(!category||row.category_name===category)&&(!product||row.product_id===product)),[rows,store,category,product]);
  const current=filtered.filter(row=>row.click_date>=range.start&&row.click_date<=range.end);
  const previous=filtered.filter(row=>row.click_date<range.start);
  const total=current.reduce((sum,row)=>sum+Number(row.clicks),0);
  const prior=previous.reduce((sum,row)=>sum+Number(row.clicks),0);
  const ranking=rankClicks(current,by);
  const active=ranking.find(item=>item.key===selected)||ranking[0];
  const detail=current.filter(row=>active&&groupKey(row,by)===active.key).sort((a,b)=>b.click_date.localeCompare(a.click_date)||b.clicks-a.clicks);
  const trend=seriesClicks(detail,range.start,range.end,period);
  const max=Math.max(1,...trend.map(point=>point.clicks));
  const points=trend.map((point,index)=>(20+index*560/Math.max(1,trend.length-1))+","+(150-point.clicks/max*125)).join(" ");
  const allTrend=seriesClicks(current,range.start,range.end,period);
  const peak=[...allTrend].sort((a,b)=>b.clicks-a.clicks)[0];
  const days=Math.round((Date.parse(range.end)-Date.parse(range.start))/86400000)+1;
  const comparison=prior?(total===prior?"Unchanged":(total>prior?"Up ":"Down ")+Math.abs((total-prior)/prior*100).toFixed(1)+"%")+" vs previous "+days+" days.":total?"No prior-period clicks; percentage change is not available.":"No clicks in either period.";
  return <main className="analytics-page">
    <header><div><p className="analytics-eyebrow">WORTHPICKORA ADMIN</p><h1>Click analytics</h1><p>Store visits from product images and View on Store buttons. Toronto time.</p></div><nav><Link href="/admin/products">Manage products</Link><Link href="/">Landing page</Link></nav></header>
    <p className="analytics-exclusion">Your clicks are excluded while signed in as administrator in this browser. These are click totals, not unique customers or sales.</p>
    <form className="analytics-filters" onSubmit={event=>{event.preventDefault();if(!validRange(start,end)){setError("Choose a valid range of up to 366 days.");return;}setBusy(true);setSelected("");setLimit(50);setRange({start,end});setRefresh(value=>value+1);}}>
      <label>From<input type="date" value={start} onChange={e=>setStart(e.target.value)} required/></label>
      <label>Through<input type="date" value={end} onChange={e=>setEnd(e.target.value)} required/></label>
      <button disabled={busy}>{busy?"Loading…":"Apply / Refresh"}</button>
      <label>Store<select value={store} onChange={e=>{setStore(e.target.value);setSelected("");setLimit(50);}}><option value="">All stores</option>{options("store_name").map(name=><option key={name}>{name}</option>)}</select></label>
      <label>Category<select value={category} onChange={e=>{setCategory(e.target.value);setSelected("");setLimit(50);}}><option value="">All categories</option>{options("category_name").map(name=><option key={name}>{name}</option>)}</select></label>
      <label>Product<select value={product} onChange={e=>{setProduct(e.target.value);setSelected("");setLimit(50);}}><option value="">All products</option>{productOptions.map(row=><option key={row.product_id} value={row.product_id}>{row.product_code} · {row.product_name}</option>)}</select></label>
      <label>Rank by<select value={by} onChange={e=>{setBy(e.target.value as GroupBy);setSelected("");setLimit(50);}}><option value="product">Product</option><option value="store">Store</option><option value="category">Category</option></select></label>
      <label>Trend interval<select value={period} onChange={e=>setPeriod(e.target.value as Period)}><option value="day">Daily</option><option value="week">Weekly (Monday)</option><option value="month">Monthly</option></select></label>
    </form>
    {error&&<p className="analytics-error" role="alert">{error}</p>}
    {!error&&<><section className="analytics-stats"><div><span>Total clicks</span><strong>{total.toLocaleString()}</strong></div><div><span>Products clicked</span><strong>{new Set(current.map(row=>row.product_id)).size}</strong></div><div><span>Previous equal period</span><strong>{prior.toLocaleString()}</strong></div></section>
    <div className="analytics-charts"><section className="analytics-panel"><h2>Top 10 · {by}</h2><p>Hover, focus, or tap a bar to view its records.</p>{!ranking.length&&<p className="analytics-empty">No customer clicks for these filters yet.</p>}
      <div className="analytics-ranking">{ranking.map((item,index)=><button key={item.key} className={active?.key===item.key?"active":""} onMouseEnter={()=>{setSelected(item.key);setLimit(50);}} onFocus={()=>{setSelected(item.key);setLimit(50);}} onClick={()=>{setSelected(item.key);setLimit(50);}} aria-pressed={active?.key===item.key}><span>{index+1}. {item.label}</span><span className="analytics-bar-track"><i style={{width:(item.clicks/Math.max(1,ranking[0].clicks)*100)+"%"}}/></span><b>{item.clicks.toLocaleString()}</b></button>)}</div>
    </section><section className="analytics-panel analytics-detail" aria-label="Selected click records"><h2>{active?.label||"Click details"}</h2><p>{active?active.clicks.toLocaleString()+" clicks · "+detail.length+" daily records":"Select a ranked item"}</p>
      {active&&<><svg className="analytics-line" viewBox="0 0 600 185" role="img" aria-label={active.label+" click trend"}><line x1="20" y1="150" x2="580" y2="150" stroke="#dbe5df"/><polyline points={points} fill="none" stroke="#28724e" strokeWidth="3"/>{trend.map((point,index)=><circle key={point.date} cx={20+index*560/Math.max(1,trend.length-1)} cy={150-point.clicks/max*125} r="3" fill="#28724e"><title>{point.date+": "+point.clicks+" clicks"}</title></circle>)}<text x="20" y="178">{trend[0]?.date}</text><text x="580" y="178" textAnchor="end">{trend.at(-1)?.date}</text><text x="20" y="15">{max} clicks</text></svg>
      <details><summary>View {period} totals</summary><div className="analytics-periods">{trend.map(point=><span key={point.date}>{point.date}: <b>{point.clicks}</b></span>)}</div></details>
      <div className="analytics-table-scroll"><table><thead><tr><th>Date</th><th>Set</th><th>Product / ID</th><th>Store</th><th>Clicks</th></tr></thead><tbody>{detail.slice(0,limit).map(row=><tr key={row.click_date+row.product_id}><td>{row.click_date}</td><td>{row.set_name}</td><td>{row.product_name}<small>{row.product_code} · {row.product_id}</small></td><td>{row.store_name}</td><td>{row.clicks}</td></tr>)}</tbody></table></div>{detail.length>limit&&<button className="analytics-load-more" onClick={()=>setLimit(value=>value+50)}>Show more records ({limit} of {detail.length})</button>}</>}
    </section></div>
    <section className="analytics-insights"><h2>Trend & current activity</h2><p><strong>{total.toLocaleString()} clicks</strong> from {range.start} through {range.end}. {comparison}</p>{ranking[0]&&<p>Leading {by}: <strong>{ranking[0].label}</strong>, {ranking[0].clicks} clicks ({(ranking[0].clicks/total*100).toFixed(1)}% of the filtered total).</p>}{peak?.clicks>0&&<p>Busiest {period}: {peak.date}, {peak.clicks} clicks.</p>}<p>{range.end>=torontoDate()?"Today is still in progress. ":""}Weeks and months at the edges of the selected range may be partial. Reports start when tracking is enabled; earlier clicks cannot be recovered.</p></section></>}
  </main>;
}
