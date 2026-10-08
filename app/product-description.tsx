"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PromoCode from "./promotions/promo-code";

export default function ProductDescription({ description, preview = false, name = "Product details", sale = false, promoCode = "" }: { description: string; preview?: boolean; name?: string; sale?: boolean; promoCode?: string }) {
  const anchor = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, ready: false });
  const id = useId();
  useLayoutEffect(() => {
    if (!open || preview) return;
    const card = anchor.current?.closest(".product-card");
    const box = popup.current;
    if (!card || !box) return;
    const rect = card.getBoundingClientRect();
    const height = box.offsetHeight;
    const width = box.offsetWidth;
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12));
    const preferredTop = rect.top >= height + 24 ? rect.top - height - 12 : rect.bottom + 12;
    const top = Math.max(12, Math.min(preferredTop, window.innerHeight - height - 12));
    setPosition({ top, left, ready: true });
    const dismiss = () => setOpen(false);
    const leaveCard = (event: Event) => {
      // Touch pointers leave after a tap; keep the popup available on mobile.
      if (!sale && (event as PointerEvent).pointerType !== "touch") dismiss();
    };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { if (box.contains(document.activeElement)) anchor.current?.querySelector("button")?.focus(); dismiss(); } };
    const outside = (event: PointerEvent) => { if (!box.contains(event.target as Node) && !anchor.current?.contains(event.target as Node)) dismiss(); };
    const scroll = (event: Event) => { if (!box.contains(event.target as Node)) dismiss(); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    card.addEventListener("pointerleave", leaveCard);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
      card.removeEventListener("pointerleave", leaveCard);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open, description, preview, sale, promoCode]);

  if (!description.trim()&&!promoCode.trim()) return null;
  const content = <>{sale&&<strong className="sale-notice-heading">⚠ Sale information</strong>}<p style={{whiteSpace:"pre-line"}}>{description}</p>{sale&&promoCode&&<PromoCode code={promoCode}/>} {sale&&<p className="sale-notice-warning">Warning: offers can change or expire. Check eligibility and the final price at the store before ordering.</p>}</>;
  if (preview) return <div className={`product-description-panel is-preview ${sale?"has-sale":""}`}>{content}</div>;
  return <div className="product-description-anchor" ref={anchor}>
    <button type="button" className={`product-description-trigger ${sale?"has-sale":""}`} aria-label={`${sale?"Sale information and warning for":"Details about"} ${name}`} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)}><span aria-hidden="true">?</span>{sale&&<b className="card-sale-mark" aria-hidden="true">SALE</b>}</button>
    {open && createPortal(<div ref={popup} id={id} role="region" aria-label={`${name} ${sale?"sale information":"description"}`} className={`product-description-panel product-description-popup ${sale?"has-sale":""}`} style={{ top: position.top, left: position.left, visibility: position.ready ? "visible" : "hidden" }}>
      <button type="button" className="product-description-close" aria-label={sale?"Close sale information":"Close description"} onClick={() => { anchor.current?.querySelector("button")?.focus(); setOpen(false); }}>×</button>{content}
    </div>, document.body)}
  </div>;
}
