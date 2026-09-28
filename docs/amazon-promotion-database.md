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
