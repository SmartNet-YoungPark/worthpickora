# WorthPickora

A curated storefront with an administrator product catalog.

## Run locally

```powershell
npm install
npm run dev
```

- Storefront: http://localhost:3000/
- Administrator login: http://localhost:3000/admin/login
- Product management: http://localhost:3000/admin/products

For phone testing on the same Wi-Fi, run `npm run dev -- --hostname 0.0.0.0`
and open `http://10.0.0.216:3000`. This PC address is explicitly listed in
`allowedDevOrigins` in `next.config.ts`, so development JavaScript and hot-reload
requests from the phone are accepted. If the PC's IP changes, update this entry
and restart the dev server. Keep the list limited to your actual development hosts.

## Administrator PIN

The optional Supabase `profiles` schema and role-management setup are documented
in [supabase/README.md](supabase/README.md). Its SQL migration supports `Admin`,
`User`, and SQL `NULL`, and can be tested with `npm run test:profiles`. Applying
this schema does not replace the existing PIN login with Supabase Auth.

Run `npm run admin:setup` in an interactive terminal and enter a four-digit PIN twice. Exactly four ASCII digits are required; leading zeros are preserved. Entry is hidden. Only a salted scrypt hash and a random signing secret are stored in the git-ignored `.env.local`.

To change the PIN, run `npm run admin:setup -- --reset`. This also rotates the signing secret and invalidates existing sessions. There is no default PIN. For hosting, set `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` as private server variables, never `NEXT_PUBLIC_` variables. Production uses HTTPS-only cookies.

Admin pages verify an eight-hour signed HttpOnly session on the server. Login, logout, and catalog writes require same-origin requests. The single-admin login throttle is process-local (20 attempts/minute).

## Shared product catalog

Products and uploaded images are now saved on the server in `.data/catalog.json`, not in individual browser storage. The file is excluded from Git. Back up this file to preserve the catalog. `CATALOG_DATA_FILE` can override its location.

Storefront HTML and public catalog responses contain image URLs instead of embedded image bytes. Published images load separately through `/api/products/[id]/image`; unpublished and deleted products return 404. Administrator editing and Excel exports retain the original embedded images. This keeps mobile page initialization and periodic catalog refreshes lightweight.

The storefront and administrator page read the same catalog. Only Published products appear publicly. A successful save is immediately available to a new storefront request; open tabs refresh on changes, focus, and every five seconds. Drafts and archived products remain private to the administrator API. Saves use atomic file replacement and reject stale revisions instead of silently overwriting another edit.

On the first administrator visit, if no server catalog exists, valid legacy data from `worthpickora-catalog-v1` in that browser is automatically imported. The original browser copy is kept. Once a server catalog exists, another browser cannot automatically replace it with older local data.

This file store is intended for one Node.js application instance with persistent disk. A serverless or multi-instance deployment needs shared persistent storage and a shared login rate limiter.

## CSV with images

**Export with Images** includes image bytes as base64 data URLs in the `image` column. Uploaded images and the reference product photographs are embedded. An image-host URL can be imported using `image` or `image_url`; export downloads and embeds it when the host permits cross-origin image access. If the host blocks access, upload that image directly before exporting.

CSV required fields: `name,code,category,store,url`.
Optional fields: `description,set,brand,asin,status,image,photo`.

Import skips codes already present in the same category and set and shows a warning listing skipped rows. Other valid rows can be imported normally. If every row is a duplicate, import stops with an error and saves nothing. Code comparison is case-insensitive. Matching codes in a different set still update the existing product. Missing image columns preserve existing images. New products without a status default to Draft. Malformed rows reject the whole import. Imports accept up to 50 MB including embedded images. CSV stores image data, not visible spreadsheet thumbnails; importing the CSV into this app restores the product images.

## Typography

Inter Variable is bundled locally through `@fontsource-variable/inter` and applied to storefront, administrator, and login screens. It is a close visual match to the provided sample; the exact original font could not be identified from the screenshot.

## Checks

```powershell
npm run lint
npm test
npm run build
npm run test:auth-routes
```

The HTTP integration test starts an isolated production server on port 3187 with temporary credentials and a temporary catalog. It checks authorization, image/name updates on the public landing page, draft privacy, conflict responses, and logout without modifying the real catalog or PIN.

## Category management

Open **Categories** in the administrator sidebar to add, rename, or delete categories. The initial list contains Tech, Home & Kitchen, Electronics & Tech, Beauty & Personal Care, Health & Household, Clothing, Shoes & Jewelry, Sports & Outdoors, Toys & Games, Pet Supplies, Automotive, and Tools & Home Improvement.

Category changes are saved with the shared catalog and update product forms, filters, and storefront navigation. Renaming updates associated products. Deleting a populated category requires choosing a destination for its products; images and set numbers are preserved. The final category cannot be deleted. Existing Home, Car, Beauty, and Cute Finds categories migrate to Home & Kitchen, Automotive, Beauty & Personal Care, and Toys & Games respectively.

## Growing product sets

Each category/set can contain at most 10 products, including drafts and archived products. Product saves, bulk moves, category moves, and Excel/CSV imports reject a resulting catalog that exceeds this limit. The API also enforces the limit before saving.

Set numbers are positive whole numbers with no fixed 1–4 limit. Registration, editing, bulk moves, filters, and the set directory derive their options from the current category's products. Choose **+ New Set** or enter a new number. Saving a product creates that set in the catalog automatically. Published products introduce their sets on the storefront; empty sets are not separate stored records. Tabs scroll horizontally as the list grows.

## Excel with actual pictures

**Excel with Images** is the default export. It creates an `.xlsx` workbook with real embedded PNG/JPEG pictures anchored to product rows, rather than image codes or base64 text in cells. **Import Excel / CSV** restores the pictures from their rows along with product data and set numbers. Keep one picture per product row and use the exported column headers when editing the workbook.

The optional **Export CSV (text)** action remains available for compatibility. CSV cannot display picture objects; its image field contains image data. New CSV exports no longer include the legacy numeric `photo` field. Legacy CSV files containing that field remain importable.

Excel imports support JPG/PNG pictures inserted with **Place in Cell** as well as **Place over Cells**. Save the workbook as `.xlsx` and keep one picture per product row, preferably in the `image` column. In-cell image relationships are resolved from workbook metadata, including repeated images and mixed placement styles. Missing image data and duplicate pictures report the affected cell or row before any catalog changes are saved.
