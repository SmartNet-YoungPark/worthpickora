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
