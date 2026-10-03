# Shop by Brand daily updates

Admin: `/admin/store-apps#daily-updates`.

Save the enable switch, daily time (America/Toronto, DST aware), and US/CA scope. `Update now` uses the saved settings, queues a run, and starts the first batch. An existing run is reused rather than duplicated. Pending items are processed eight per minute. Runs and per-offer verification results appear in the admin tables. This is a refresh of registered marketplace offers, not an automatic product discovery job.

## Database and activation

After existing migrations through `20260929050000_coupon_expiry_evidence.sql`, apply these in order:

1. `20261003010000_unified_promotions.sql`
2. `20261003020000_promotion_schedule.sql`
3. `20261003021000_promotion_cron.sql`

Deploy the Next.js code, then enable the daily schedule in admin. Initial schedule is paused. The cron checks due runs once per minute. Its fixed callback URL is `https://www.worthpickora.com/api/promotion-worker`. Change that SQL constant if the production domain changes. It creates a random, one-use five-minute token stored in a private RLS-protected table; no browser key or new public secret is required. The existing server Supabase secret is required. `pg_cron` and `pg_net` must be available. Worker failures retry after a lease expires, up to three attempts. The UI must not report a queued run as completed.

Check `cron.job`, `cron.job_run_details`, and `net._http_response` for delivery failures. Do not expose worker tokens publicly. When deploying to another environment, do not run this production cron migration unchanged.

## Data model

`deal_products` is independent of Shopping shorts. `marketplace_offers` associates a shared product with a store, US/CA market, currency, ASIN, source URL and affiliate URL. `promotions` contains nullable prices, percent/amount, raw text, type, code, date/time evidence, verification and metadata. Existing Amazon tables remain as migration backups; snapshot/save and coupon import RPCs use the unified tables. Adding store names needs no new table. Add the same product's second market with the editor button; it starts with empty price, coupon and URL fields, never copied discounts.

Amazon source verification does not follow redirects across markets. OneLink routing remains Amazon's responsibility; an affiliate redirect cannot be used to infer another market's price/coupon. Source fields must identify the marketplace, independently of affiliate destinations. On save and outbound redirects, amazon.com uses smartnetweb0a-20 and amazon.ca uses smartnetwe06a-20. Other network URLs and parameters are preserved; no unknown store tracking IDs are invented.

The Amazon public-page adapter confirms a coupon or explicit timed discount only. Missing/blocked/ambiguous offers become Check and cannot show a current discount badge. Saved verified offers age out after 36 hours. Other stores currently require manual verification or a future official API adapter; the scheduler reports this limitation rather than treating a successful page fetch as a verified discount. Country selection uses the stored marketplace and never converts ASINs or currencies automatically.

Automated public-page checking can be blocked by Amazon; review the run results. This is not a guarantee of shopper eligibility or commission attribution.
