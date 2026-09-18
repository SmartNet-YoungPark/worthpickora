## Operational catalog tables

Applied catalog migration: `migrations/20260918003102_create_catalog.sql`.

| Table | Purpose |
| --- | --- |
| categories | Editable categories; 11 default names seeded |
| product_sets | Category and positive set number; unique within a category |
| stores | Retailers; Amazon, Walmart, Best Buy, Temu, Target, Etsy seeded |
| brands | Optional product brands |
| products | Product code, name, description, ASIN, affiliate URL, image, status and set |

The product category is obtained through product_sets.category_id, so renaming
a category does not require rewriting its products. Products use set_id,
store_id and optional brand_id foreign keys. A product's image accepts actual
JPG/PNG/WebP base64 data or an HTTP(S) image URL, up to 8 MiB; it is not an
image code. This migration does not create a Storage bucket.

Every table has RLS. Anonymous visitors can read lookup data, Published
products, and sets containing at least one Published product. Authenticated
users with profiles.role = Admin can create, edit and permanently delete
catalog records. User and NULL roles cannot write. Role assignment itself
remains restricted by the profiles migration. The admin helper lives in the
non-exposed private schema and checks the current authenticated user.

A set holds at most 10 products, including drafts and archived products.
The automatically assigned slot (1-10) plus unique (set_id,slot) constraint
prevents exceeding capacity even with concurrent writes. A concurrent allocation
may return a uniqueness conflict; retry the entire transaction. Product codes
are case-insensitively unique inside each set; other sets can reuse the code.
The current file-backed application still enforces global code uniqueness;
its validation must be adapted when switching to this schema.

Deleting a product is permanent and frees capacity. Deleting a populated set,
a category with sets, or a store referenced by products is blocked: move or
delete the children first. Deleting a brand clears the optional brand reference.

Rows have no implicit order in SQL. Query sets by set_number and products by
code; preserve the application's natural code comparator when displaying codes
such as T2 and T10. To create a product in a new set, first insert/upsert the
category's product_sets row, then use its id in products.

Import duplicate skipping, warning/error presentation, and Excel extraction
remain application responsibilities. Database constraints enforce the final
invariants; this migration does not implement an import endpoint.

### Integration status

The server now supports Supabase storage when SUPABASE_URL and
SUPABASE_SECRET_KEY are configured. SUPABASE_SERVICE_ROLE_KEY is also accepted
for legacy keys. The existing PIN/session checks protect every write API.
Without these variables, local development keeps its file store, but Vercel
writes fail with a configuration message instead of attempting filesystem writes.
Never use NEXT_PUBLIC_ for either secret key.

Migration 20260918004315_catalog_bridge.sql was applied remotely. Its server-only
catalog_snapshot and catalog_apply RPCs are executable only by service_role.
Changes are explicit upserts/deletion IDs with revision checks and atomic commits;
omitted products are preserved. No blanket catalog replacement is used.
Deletion sends only selected IDs from the browser and returns a compact result.

No local products or images were uploaded. The Supabase product table is empty
until products are explicitly registered/imported. No administrator was created
or promoted. GitHub/Vercel deployment and environment registration are separate
from the applied DB migration. A specific old Vercel deployment URL continues
to run its old code; use the new deployment after updating.

In Vercel Settings > Environment Variables, set SUPABASE_URL to
https://kcafllbnlbomvmmllqsv.supabase.co and SUPABASE_SECRET_KEY to the project's
secret API key for the intended Production/Preview environment. Keep
ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET. Redeploy the updated source.
Large image imports still use the catalog PUT endpoint and are subject to
the hosting provider's request size limit; this change specifically makes
deletion independent of image payload size.

Verification:
- Local: `node --test tests/catalog-schema.test.mjs tests/profiles.test.mjs tests/supabase-catalog-storage.test.mjs`
- Remote: all five tables have RLS; 10 policies; 11 categories and 6 stores;
  anonymous SELECT works and anonymous INSERT privilege is absent.
