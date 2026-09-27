const destinations = [
  {title:"Today's Deals",label:"EXPLORE DEALS",symbol:"↘",description:"Browse Amazon's deals page and check the latest offers directly on Amazon.",url:"https://www.amazon.com/gp/goldbox/",action:"Explore today's deals"},
  {title:"Amazon Outlet",label:"OVERSTOCK FINDS",symbol:"▦",description:"Explore markdowns, clearance and overstock finds. Selection and availability vary.",url:"https://www.amazon.com/outlet",action:"Browse Amazon Outlet"},
  {title:"Amazon Renewed",label:"REFURBISHED FINDS",symbol:"↻",description:"Explore pre-owned and refurbished products. Review each listing's condition, price and terms.",url:"https://www.amazon.com/amazonrenewed",action:"Explore Amazon Renewed"},
];

export default function AmazonPublicOffers(){
  return <section className="amazon-public-offers" aria-labelledby="amazon-discover-title">
    <div className="amazon-discover-heading"><span className="offers-eyebrow">DISCOVER MORE AT AMAZON</span><h2 id="amazon-discover-title">Three ways to find your next good deal.</h2><p>Explore these official Amazon destinations. Current products, prices and available discounts are shown on Amazon.</p></div>
    <div className="offers-grid">{destinations.map((item,index)=><article key={item.url} className={`offer-tile offer-tone-${index}`}><span className="amazon-discover-symbol" aria-hidden="true">{item.symbol}</span><span className="offers-eyebrow">{item.label}</span><h3>{item.title}</h3><p>{item.description}</p><span className="offer-host">amazon.com · Official shopping destination</span><a href={item.url} target="_blank" rel="noopener noreferrer">{item.action}<span aria-hidden="true">↗</span></a></article>)}</div>
    <p className="amazon-destination-note">These are shopping destinations, not a live product discount feed. Amazon may require sign-in to claim an offer or complete a purchase.</p>
  </section>;
}
