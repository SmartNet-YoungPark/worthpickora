# Store app guide

The landing page has an optional, collapsed guide below Shop by Brand. Product
images retain `/go/:id` and their existing affiliate URL. No custom URI schemes,
automatic cart changes, forced app launch, or guaranteed shipping/coupon claims
are added. Installed-app opening depends on the retailer, browser and OS.

## Production setup

Run `supabase/migrations/20260924010000_store_apps.sql` in the project's Supabase
SQL editor, then deploy this code. Existing server-only `SUPABASE_URL` and
`SUPABASE_SECRET_KEY` (or the existing service-role fallback) are reused.
Never expose the secret key in a `NEXT_PUBLIC_` variable.

Admin → **Store apps & offers** (`/admin/store-apps`) contains the optional Temu
campaign URL and separate 30-day daily link click counts. Confirm the campaign's
region, eligibility and expiry in your affiliate account before enabling it.
Clear and save the URL to disable an expired campaign. No reward amount is
advertised. Only HTTPS temu.com/subdomain links are accepted.

Tables are RLS-enabled with no anon/authenticated access. The server authenticates
admins before reading private reports or changing settings. The public redirect
uses an allowlist and increments only guide/offer click counters. Admin sessions,
recognized bots, HEAD and prefetch requests are excluded. Anonymous owner tests
cannot be distinguished from customer clicks; remain signed in when testing.

Product click counters are not used. App-guide counts do not measure installs,
orders or affiliate attribution; confirm commissions in retailer reports.
If tracking fails, official app-guide links still redirect. Until the migration
is applied, the admin screen shows a setup error and Temu offers stay hidden.
Local development uses an isolated `.data/store-apps.json` file.

## Verification

`npm run build`, `npm run test:auth-routes`, and
`node --test tests/store-apps.test.mjs` verify builds, authorization, configured
offer visibility, redirect destinations, independent counting and exclusions.
On real iPhone/Android devices, test product images and guide links from Safari/
Chrome plus relevant social in-app browsers. Installation is optional. This code
does not assert that an app opened or a purchase was attributed.

Official link sources checked September 24, 2026:

- Amazon Shopping: https://apps.apple.com/us/app/amazon-shopping/id297606951
  and https://play.google.com/store/apps/details?id=com.amazon.mShop.android.shopping
- Walmart: https://www.walmart.com/cp/walmart-app/1087865
- Best Buy: https://www.bestbuy.com/discover-learn/benefits-of-the-best-buy-app/pcmcat1674162066016
- Temu: https://www.temu.com/app.html
- Target: https://www.target.com/c/target-app/-/N-4th2r
- Etsy: https://www.etsy.com/mobile
