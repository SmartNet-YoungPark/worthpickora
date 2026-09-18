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
Large saves now use /api/catalog/upload: payloads over 2 MiB are encoded as
1 MiB byte parts, with each HTTP request under 2 MiB. The server stages the
parts privately and validates/commits the catalog only after all parts arrive.
Migration 20260918010903_catalog_uploads.sql has been applied remotely.
The existing total catalog limit is 64 MiB including embedded images.
Upload sessions expire after an hour; expired staging records are removed when
a new upload starts, and completed/aborted uploads are removed immediately.
Interrupted uploads never write products. RPC access is service_role only;
every upload API request verifies the existing PIN session and same origin.
Local development uses bounded temporary memory; Vercel uses Supabase staging.

Administrator pages, GETs and save responses now use authenticated per-product
image URLs instead of embedding all base64 image bytes in JSON/HTML. The server
resolves unchanged image references before saving, preserving the original bytes.
Public image routes still hide draft products. No additional environment keys
are required for this migration.

Verification:
Metadata write migration `20260918015358_catalog_metadata_writes.sql` is applied.
All app catalog reads, including save/delete validation, use metadata only.
The new service-only catalog_apply_metadata RPC preserves images when the image
field is omitted; an explicit empty string removes an image. It returns compact
metadata, with the same atomic revision check and explicit deletion rules.
The adapter resolves unchanged authenticated image references to omitted fields.
The old full snapshot/apply RPCs remain for compatibility with older deployments.

Image read migration `20260918014410_catalog_image_reads.sql` is applied.
Catalog lists use a metadata-only RPC; individual image requests read just the
requested product by primary key instead of loading every embedded image.
Both RPCs are restricted to service_role. The HTTP image route still checks
publication status or the administrator session before returning bytes.
Existing image bytes are unchanged; no re-import is needed.

Performance migration `20260918012856_catalog_import_performance.sql` is applied.
The server-only catalog_apply RPC has a 45-second function timeout instead of
inheriting the API's 8-second default; other roles and functions are unchanged.
Products store a generated image_digest. Catalog revisions hash metadata and
that digest, avoiding repeated serialization of the full image catalog before
writes. Clients should reload after this migration because the revision format
changes. Existing products and images are preserved.

Landing categories with at least five populated sets use collapsed native
details groups of five rows. Labels reflect each group's first and last actual
set numbers; gaps do not create empty rows. Search/favorites results expand
groups automatically. Categories with fewer than five sets retain their tabs.

- Set grouping: `node --test tests/set-groups.test.mjs`
- Local: `node --test tests/catalog-schema.test.mjs tests/profiles.test.mjs tests/supabase-catalog-storage.test.mjs`
- Large imports: `node --test tests/catalog-upload-client.test.mjs tests/catalog-uploads.test.mjs`
- HTTP: `npm run build` then `npm run test:auth-routes`, including a 20-product,
  image-bearing catalog over 4.5 MiB, small requests/responses, draft image
  privacy, admin reload, and image preservation after subsequent edits.
- Remote: all five tables have RLS; 10 policies; 11 categories and 6 stores;
  anonymous SELECT works and anonymous INSERT privilege is absent.
