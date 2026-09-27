import type {StoreLink} from "@/lib/store-apps";
import PromoCode from "./promo-code";
export default function OfferCard({offer,index}:{offer:StoreLink;index:number}){
  const kind=offer.offerType||"general";
  return <article className={`offer-tile offer-tone-${index%4} offer-kind-${kind}`}>
    <span className="offers-eyebrow">{offer.store} · OFFER {String(index+1).padStart(2,"0")}</span>
    {kind!=="general"&&<span className="offer-kind-badge">{kind==="promo-code"?"SELLER PROMO CODE":"✂ CLIP COUPON"}</span>}
    <h2>{offer.title}</h2>{offer.description&&<p>{offer.description}</p>}
    {kind==="promo-code"&&offer.promoCode&&<><PromoCode code={offer.promoCode.trim()}/><p className="offer-instructions">Copy the code and enter it at {offer.store} checkout. Check eligible products and confirm the discount before placing your order.</p></>}
    {kind==="clip-coupon"&&<p className="offer-instructions">On the {offer.store} product page, select the coupon if it is available for your account and chosen option. Confirm the discount at checkout.</p>}
    <span className="offer-host">{new URL(offer.url).hostname}</span>
    <a href={`/store-app/${offer.id}`} target="_blank" rel="noopener noreferrer sponsored">View offer at {offer.store}<span aria-hidden="true">↗</span></a>
  </article>;
}
