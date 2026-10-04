# Marketplace promotions

Shopping shorts continues to use its own catalog. Promotion products use:

- `deal_products`: shared product name, image, category.
- `marketplace_offers`: many rows per product; store, US/CA market, currency, ASIN, source product URL, affiliate URL and tracking ID.
- `promotions`: one current promotion per offer, across every store. Prices, percentage/amount, raw text, display title/description, start/end, terms/source URLs, customer eligibility, online/in-store channel, verification and metadata.

These are joins, not duplicated per-store tables. IDs remain text to preserve existing links and analytics. Adding a store requires entering its name in Admin > Store links; no new table or page implementation is needed for manual offers. Automated collection/verification for a new store may require an adapter.

## Country and routing

US uses USD and `smartnetweb0a-20`; CA uses CAD and `smartnetwe06a-20`. Source Amazon product URL must match the selected marketplace. Affiliate routing never supplies prices, coupons or expiry. OneLink account linking is configured in Amazon Associates, outside this application; this implementation does not claim that account linking is verified.

Add another marketplace offer creates another offer for the same product, with empty local prices and promotion fields. Editing product name/image/category updates sibling offers in the editor; market-specific values remain independent.

## Evidence and normalization

Explicit percentage takes precedence, then currency amount. A price reduction is computed only with finite positive regular price and a lower nonnegative sale price. Rounded zero is not stored as a discount. Coupon/code types never inherit the separate list-price markdown. Calculated percentages carry a `discount_basis` so later edits recompute rather than treating the previous result as a new explicit coupon.

`raw_promotion_text` preserves original text (1000 characters). `promotion_title` is the optional display title, separate from the product name. Additional source/terms links are stored in `source_links`; store-specific values in `metadata`. Unknown prices and dates stay NULL. Date-only expiry remains `end_on`; no midnight/timezone is invented.

Disabled and future-start offers are not listed. Confirmed Amazon badges require recent verification of that exact marketplace source. Unknown verification is not proof of expiry or absence of a coupon.

## Migration

Existing deployments: apply `20261003030000_promotion_details.sql` after the unified promotions/schedule migrations. The migration preserves existing products and offers and removes only old display titles that duplicated product names. New deployments run migrations in filename order, including this migration after the daily-schedule setup bundle.

## Country-specific pages and admin preview

`/promotions/Amazon` resolves visitor market from Vercel `x-vercel-ip-country`. When absent, the primary browser language ending in `-CA` selects Canada; otherwise US is the fallback. Only the selected country's offers are sent to the client. No US offers are substituted when Canadian inventory is empty.

Authenticated administrators can use `?market=US` and `?market=CA` to preview either market; anonymous query overrides are ignored. Admin Amazon clicks use a clean source-market `/dp/ASIN` URL with no affiliate tag or saved geo-routing parameters, and are excluded from click analytics. Public clicks use the verified source-market URL with its regional tracking ID. Amazon account-level redirect settings remain external to this application; no undocumented redirect-bypass parameter is added.
