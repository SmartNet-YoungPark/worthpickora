# Independent Amazon promotion database

Apply `supabase/migrations/20260927010000_amazon_promotions.sql` in Supabase SQL Editor before deploying this change. It requires the existing store-app and multi-store-link migrations.

- `amazon_products`: product ID, title, image, URL, general description, display order.
- `amazon_promotions`: product foreign key, promotion type, seller code and Sale information.
- `store_app_settings.links`: other stores only after migration.
- Shopping shorts product/category/set tables and catalog RPCs are not changed.

The migration preserves existing Amazon link IDs and their click history, and removes the migrated Amazon records from the shared links JSON. Application reads combine the separate tables for the existing UI. Saves use one transaction for products, promotion details and other-store links. Failed saves roll back. Removing an Amazon product removes its promotion row; historical clicks remain intact. RLS and grants allow only the service role to read/write these tables and RPCs. Browser users continue through existing authenticated admin endpoints.

After the migration, optionally run `supabase/seeds/tineco-amazon-promotion.sql` to insert the user-requested Tineco item and screenshot offer. It is repeatable and does not overwrite an already existing promotion. The screenshot indicates $239 from $299, with a $40 coupon subject to eligibility; it is not an automatically refreshed price. The supplied product URL has no affiliate tag.

Local development stores equivalent separate `amazonProducts` and `amazonPromotions` collections in `.data/store-apps.json`, with non-Amazon records in `links`. The user's local Tineco item has been moved to these collections. Local storage is not the hosted Supabase database.

Deployment sequence: back up database, run migration, run the optional seed, then deploy the code. Verify Admin > Store apps & offers and `/promotions/Amazon`. Do not deploy this code before the required RPCs exist. GitHub/Vercel deployment and hosted SQL execution have not been performed for this change.

## Promotion types and ten-product sets

After the initial Amazon migration, apply `supabase/migrations/20260928010000_promotion_types.sql` before deploying the promotion-set update. It adds the verified discount percentage, expands promotion types, and increases the combined custom-link limit to 1,000. Existing records are preserved.

Amazon offers are grouped by promotion type, with at most ten products per set: Coupon Set 01, Coupon Set 02, Promo Code Set 01, and so on. Each type starts its own numbering. Search and saved-offer filters preserve assigned set numbers. The layout shares Landing page card dimensions.

Admin > Store apps & offers supports Coupon, Promo Code, Price Discount, Lightning Deal, Limited-time Deal, Prime Exclusive, Subscribe & Save, Buy One Get One, Multi-buy, Targeted Offer, and General Offer. Enter an optional verified discount percentage (greater than zero, at most 100) for the selected promotion. It appears in bold red at the card's top-right. Leave it blank for monetary coupons such as $40; a separate 20% list-price reduction must not be presented as a 20% coupon. No discounts are inferred from free text or refreshed automatically from Amazon.
