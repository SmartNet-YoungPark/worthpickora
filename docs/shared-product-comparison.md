# Shared product and store comparison schema

Migration: `supabase/migrations/20261007020000_shared_product_variants.sql`.
Apply once in Supabase SQL Editor. This is an additive change to the promotions catalog, not Shopping shorts `public.products`. Existing RPC clients can continue to save old fields; new fields are preserved. Admin editing and comparison cards are not added by this schema migration.

## Relationships

- `deal_products`: product family, universal `product_code` (PRD-...), name, brand, manufacturer.
- `deal_product_variants`: exact sellable configuration, universal `variant_code` (VAR-...), family FK. Pack size, net content per pack, flavour, colour, model and dimensions distinguish variants.
- `deal_variant_gtins`: verified, globally unique GTIN-14 strings pointing to a variant. Convert valid UPC/EAN by zero-padding on the left, never by numeric conversion. Check digit is validated. Source and verification time are mandatory. A checksum alone is not evidence that the identifier belongs to the product.
- `marketplace_offers`: a store/market/seller/location listing. Contains nullable variant FK and store-specific product code, sales channel, price basis, original full/affiliate URL. Codes are scoped by store; flyer group codes may include several flavours or sizes and must remain unverified until an exact SKU is identified.
- `promotions`: existing offer-linked price, discount, coupon, dates, source and status. It is not a universal product identity table.
- `promotion_product_comparison`: service-only read view joining these records. Compare exact products by verified variant ID **and market/currency**; retain seller, locality, dates and conditions.

## Quantities

Canonical units: grams, millilitres, millimetres and item counts. Values may be NULL; unknown quantities are never treated as 1. `pack_count` is the number of inner packages. Net content excludes packaging/shipping weight.

| Configuration | pack_count | unit_net_volume_ml | unit_item_count | total volume |
| --- | ---: | ---: | ---: | ---: |
| 355 mL cans x 12 | 12 | 355 | 1 | 4260 mL |
| 500 mL bottles x 6 | 6 | 500 | 1 | 3000 mL |

These have distinct variant codes. Two stores selling the first configuration share its variant code but keep separate store codes and offers. A carton of 18 eggs can use pack_count=1 and unit_item_count=18. Mixed bundles should retain component details in attributes and leave unsupported comparable totals NULL.

Set `comparison_basis` explicitly: mass, volume or count. A verified selling price for a package is divided by confirmed total content. Supported price bases also include kg, lb, 100g, litre, 100ml and each. Never convert mass to volume without reliable density data. Dimensions do not determine liquid capacity or net contents.

## Verification and pricing

Legacy rows are NOT automatically matched, assigned GTINs or marked verified. Enter specifications and source evidence first. A verified variant and verified offer-to-variant match are both required for unit price output, as is confirmed promotion status. Changes to identity/specification fields invalidate verification; verify again in a subsequent update after review.

The comparison view calculates only selling price per 100g / 100mL / each. It does not silently subtract coupons or combine promotions. It exposes status and validity dates; callers must also check timing, locality, membership, stock, shipping, taxes and deposits before labeling an offer active or cheapest. Do not compare USD and CAD amounts directly. Expiry/date uncertainty must remain visible.

New stores need new offer rows, not new tables. Store-specific information belongs in `offer_attributes`; variant-specific information belongs in `attributes`. Existing ASIN remains compatible. No existing affiliate URL or tracking ID is rewritten by this migration.

RLS is enabled on new tables and grants are limited to service_role. Public clients should use authenticated/validated server APIs.
