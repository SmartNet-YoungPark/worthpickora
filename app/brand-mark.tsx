export default function BrandMark({brand}:{brand:string}) {
  return <span className={`brand-mark ${brand.toLowerCase().replaceAll(" ","-")}`} role="img" aria-label={brand} title={brand}>{brand==="Amazon"?"a":brand==="Walmart"?"✳":brand==="Best Buy"?<>BEST<br/>BUY</>:brand==="Temu"?"TEMU":brand==="Target"?"◎":brand==="Etsy"?"E":brand.slice(0,2)}</span>;
}
