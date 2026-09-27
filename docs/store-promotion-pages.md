# Store promotion pages

Each landing-page **Store apps & offers** link opens `/promotions/{store}` (for example, `/promotions/Amazon` or `/promotions/Best%20Buy`). A button is shown only when the store has registered offer links. Brand buttons continue to filter the shopping catalog.

Manage these links in **Admin → Store apps & offers**. The promotion page reads only the separate store-link configuration; it does not read products, sets, saved products, or the Shopping shorts catalog. It shows only the selected store's offers and official app links. Empty known stores show an empty state; unknown stores return 404. Existing `/store-app/{id}` redirects preserve affiliate URLs and the separate store-link click tracking.

No database migration or new environment variable is required. Amazon API synchronization is not implemented by this change. Registered offer titles and descriptions are manually maintained and must be checked for accuracy.

The Amazon page also contains three static official destinations: Today's Deals, Amazon Outlet, and Amazon Renewed. These links require no API credentials and are not a live feed of product offers. They contain no affiliate tag and are not recorded as product or store-link clicks. Existing administrator-managed affiliate links retain their original tracking. The public destinations do not change catalog products or sets.

Amazon Creators API OffersV2 documents price, savings and deal details when available. The documented fields do not provide a general seller promo-code or clip-coupon feed. A future API integration requires account access and credentials, ASINs, and compliance with Amazon's data-use requirements. Keep any future promotion data separate from catalog products.
