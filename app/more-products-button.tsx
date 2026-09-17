"use client";

import { useRef } from "react";
import { createTapActivation } from "@/lib/tap-activation";

export default function MoreProductsButton({ expanded, controls, onToggle }: { expanded: boolean; controls: string; onToggle: (button: HTMLButtonElement) => void }) {
  const tap = useRef(createTapActivation());
  return <button type="button" className={`more-products-button${expanded ? "" : " has-more-products"}`} aria-expanded={expanded} aria-controls={controls}
    onPointerDown={event => tap.current.down(event)}
    onPointerMove={event => tap.current.move(event)}
    onPointerCancel={() => tap.current.cancel()}
    onPointerUp={event => {
      if (!tap.current.up(event)) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
      event.preventDefault();
      onToggle(event.currentTarget);
    }}
    onClick={event => { if (tap.current.click(event.detail)) onToggle(event.currentTarget); }}>
    <span>{expanded ? "Show Less" : "View More Products"}</span><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d={expanded ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"}/></svg>
  </button>;
}
