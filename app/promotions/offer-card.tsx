import {promotionSavings} from "@/lib/promotion-savings";
import type {StoreLink} from "@/lib/store-apps";
import {PROMOTION_TYPES} from "@/lib/promotion-types";
import PromoCode from "./promo-code";
export default function OfferCard({offer,index}:{offer:StoreLink;index:number}){
  const savings=promotionSavings(offer);
  const kind=offer.offerType||"general";

  return <article className={`offer-tile offer-tone-${index%4} offer-kind-${kind}`}>
    <span className="offers-eyebrow">{offer.store} · OFFER {String(index+1).padStart(2,"0")}</span>
    {kind!=="general"&&<span className="offer-kind-badge">{PROMOTION_TYPES.find(type=>type.value===kind)?.label}</span>}
    <div className="card-discount-icons" title={savings.details}>{savings.badges.map(b=><span key={b.type} aria-label={b.label} title={b.label}>{b.icon}</span>)}</div>
    <h2>{offer.title}</h2><strong>{savings.label}</strong><small>{offer.channel==="in-store"?"In store":offer.channel==="both"?"Online and in store":"Online"}{offer.newCustomerOnly?" / New customers only":""}</small>
    {kind==="promo-code"&&offer.promoCode&&<><PromoCode code={offer.promoCode.trim()}/><p className="offer-instructions">Copy the code and enter it at {offer.store} checkout. Check eligible products and confirm the discount before placing your order.</p></>}
    {kind==="clip-coupon"&&<p className="offer-instructions">On the {offer.store} product page, select the coupon if it is available for your account and chosen option. Confirm the discount at checkout.</p>}
    <span className="offer-host">{new URL(offer.url).hostname}</span>
    <a href={`/store-app/${offer.id}`} target="_blank" rel="noopener noreferrer sponsored">View offer at {offer.store}<span aria-hidden="true">↗</span></a>
  </article>;
}
