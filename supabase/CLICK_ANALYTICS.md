# Product click analytics

Apply `migrations/20260919010000_product_click_analytics.sql` in the existing
project's Supabase SQL Editor before relying on production analytics. This is
additive: it does not change catalog records. Existing server Supabase environment
variables are reused; no browser keys or extra credentials are required.

The migration creates `product_click_daily` and two service-role-only functions.
The primary key is `(click_date, product_id)`. Dates use America/Toronto, and
concurrent clicks increment atomically. Each day's first click captures product
ID, code, name, category, set name and store name. Subsequent clicks increment the
counter without changing that day's labels. History remains after catalog deletion.
No visitor IP addresses, user IDs or individual browsing histories are stored.

The storefront image and store button use `/go/[id]`, which resolves the actual
published product's URL on the server. Admin sessions are excluded. HEAD,
prefetch/prerender and common crawler requests are not counted. This is a click
counter, not bot-proof unique visitor measurement. Signed-out testing in another
browser will count: sign in as administrator in that browser before testing.

`/admin/analytics` and its API require the existing administrator session.
Filters include date range, store, category and product. Top ten can rank products,
stores or categories; hover, keyboard focus and tapping update the detail chart.
Daily, Monday-based weekly and monthly series include zero-click periods. Summary
text compares the selected range with the preceding range of equal length and
identifies the leading group and busiest interval. Partial periods are labelled.

If recording fails, the outbound route logs a generic server error and attempts
to preserve the store redirect. Such failed writes cannot be retroactively counted.
The report displays an error if its migration or connection is unavailable.
Local development uses a separate `.data/clicks.json` file; Vercel requires Supabase.

Verification: `node --test tests/click-analytics.test.mjs tests/catalog-schema.test.mjs`
and `npm run build` followed by `npm run test:auth-routes`.
