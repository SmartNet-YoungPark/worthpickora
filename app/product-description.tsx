"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ProductDescription({ description, preview = false, name = "Product details" }: { description: string; preview?: boolean; name?: string }) {
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
      if ((event as PointerEvent).pointerType !== "touch") dismiss();
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
  }, [open, description, preview]);

  if (!description.trim()) return null;
  const content = <p>{description}</p>;
  if (preview) return <div className="product-description-panel is-preview">{content}</div>;
  return <div className="product-description-anchor" ref={anchor}>
    <button type="button" className="product-description-trigger" aria-label={`Details about ${name}`} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)}><span aria-hidden="true">?</span></button>
    {open && createPortal(<div ref={popup} id={id} role="region" aria-label={`${name} description`} className="product-description-panel product-description-popup" style={{ top: position.top, left: position.left, visibility: position.ready ? "visible" : "hidden" }}>
      <button type="button" className="product-description-close" aria-label="Close description" onClick={() => { anchor.current?.querySelector("button")?.focus(); setOpen(false); }}>×</button>{content}
    </div>, document.body)}
  </div>;
}
