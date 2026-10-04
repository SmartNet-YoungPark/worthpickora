import {amazonAffiliateUrl} from "@/lib/amazon-affiliate";

const destinations = [
  {title:"Canada Coupons",label:"CANADA ? CLIP & SAVE",symbol:"CA",description:"Explore Amazon.ca coupons. Check the coupon amount, eligible options and terms on Amazon Canada.",url:"https://www.amazon.ca/deals?ref_=nav_cs_coupons&bubble-id=deals-collection-coupons",action:"Browse Canada Coupons"},
  {title:"Clip Coupons",label:"CLIP & SAVE",symbol:"✂",description:"Browse Amazon Coupons. Select an available coupon on Amazon and check eligible products, options and terms before checkout.",url:"https://www.amazon.com/coupons",action:"Browse Clip Coupons"},
  {title:"Today's Deals",label:"EXPLORE DEALS",symbol:"↘",description:"Browse Amazon's deals page and check the latest offers directly on Amazon.",url:"https://www.amazon.com/gp/goldbox/",action:"Explore today's deals"},
  {title:"Amazon Outlet",label:"OVERSTOCK FINDS",symbol:"▦",description:"Explore markdowns, clearance and overstock finds. Selection and availability vary.",url:"https://www.amazon.com/outlet",action:"Browse Amazon Outlet"},
  {title:"Amazon Renewed",label:"REFURBISHED FINDS",symbol:"↻",description:"Explore pre-owned and refurbished products. Review each listing's condition, price and terms.",url:"https://www.amazon.com/amazonrenewed",action:"Explore Amazon Renewed"},
];

export default function AmazonPublicOffers({market="US",admin=false}:{market?:"US"|"CA";admin?:boolean}){
  return <section className="amazon-public-offers" aria-labelledby="amazon-discover-title">
    <div className="amazon-discover-heading"><span className="offers-eyebrow">DISCOVER MORE AT AMAZON</span><h2 id="amazon-discover-title">More ways to find your next good deal.</h2><p>Explore these official Amazon destinations. Current products, prices and available discounts are shown on Amazon.</p></div>
    <div className="offers-grid">{destinations.filter(item=>new URL(item.url).hostname.endsWith(market==="CA"?"amazon.ca":"amazon.com")).map((item,index)=><article key={item.url} className={`offer-tile offer-tone-${index} ${index===0?"offer-kind-clip-coupon":""}`}><span className="amazon-discover-symbol" aria-hidden="true">{item.symbol}</span><span className="offers-eyebrow">{item.label}</span><h3>{item.title}</h3><p>{item.description}</p><span className="offer-host">amazon.com · Official shopping destination</span><a href={admin?item.url:amazonAffiliateUrl(item.url)} target="_blank" rel="noopener noreferrer">{item.action}<span aria-hidden="true">↗</span></a></article>)}</div>
    <p className="amazon-destination-note">These are shopping destinations, not a live product discount feed. Amazon may require sign-in to claim an offer or complete a purchase.</p>
  </section>;
}
