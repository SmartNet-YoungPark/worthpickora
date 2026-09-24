# Product overview

Product image buttons open a native modal dialog with the product image, code,
name, store, description, and optional product-option text. Escape, Close and
backdrop clicks dismiss it; native modal focus containment and focus return keep
keyboard navigation usable. The layout scrolls within a viewport-sized dialog
on mobile. The existing small question-mark description remains available.

The overview does not fetch external prices or record a product click. Its
**Check price & options at [store]** button is the only outbound action and uses
the existing `/go/:id` handler, which resolves the current published product's
stored affiliate URL, preserves tracking parameters, and excludes admin tests.
No price, discount amount, coupon eligibility or stock availability is invented.
Current promotions and final available variants must be checked at the retailer.
There is no separate persisted overview-open counter in this change.

Admin product editing has an optional **Product options** field (500 characters).
This is descriptive text, not a purchase-option selector. It supports line breaks
and is HTML-escaped. Excel/CSV exports include an `options` column; imports without
that column preserve existing options for matching products moved to another set.

## Supabase setup

Run `supabase/migrations/20260924040000_product_options.sql` in the existing
project's SQL Editor. This adds the options column and updates the current
metadata read/write functions and catalog revision calculation. Missing options
on older write payloads preserve the stored value; an explicit empty string
clears it. Existing image-preservation behavior remains intact.

The modal works with existing descriptions before the migration, but the server
blocks saving nonempty options until the database reports support, preventing
silent data loss. No new credentials are needed. Live database migration and
real-device Safari/Chrome visual checks were not performed during implementation.

Validated with production build, isolated HTTP regressions, React rendering and
click-handler tests, Excel/CSV round trips, and SQL execution in an isolated
Postgres-compatible PGlite database.
