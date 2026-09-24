"use client";
import { useState } from "react";
export default function OfferForm({ initialOffer }: { initialOffer: string }) {
  const [offer, setOffer] = useState(initialOffer), [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  return <form className="store-app-settings" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError(""); setSaved(false);
    try {
      const response = await fetch("/api/admin/store-apps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offer, confirmed }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save settings.");
      setSaved(true);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save settings."); }
    finally { setBusy(false); }
  }}>
    <h2>Temu new-customer offer</h2><p>Optional. Paste your official Temu affiliate campaign URL. Leave empty to hide this section. Rewards and eligibility are shown by Temu, not promised here.</p>
    <label>Campaign URL<input type="url" maxLength={2048} value={offer} placeholder="https://www.temu.com/..." onChange={event => { setOffer(event.target.value); setConfirmed(false); setSaved(false); }}/></label>
    <label className="store-app-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)}/>I checked this campaign in my Temu affiliate account, including region, eligibility and expiration.</label>
    <button type="submit" disabled={busy || (!!offer.trim() && !confirmed)}>{busy ? "Saving…" : "Save offer settings"}</button>
    {error && <p role="alert" className="store-app-error">{error}</p>}{saved && <p role="status">Saved. Refresh the landing page to see the change.</p>}
  </form>;
}
