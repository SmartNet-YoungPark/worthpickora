# Multiple store links

Admin → Store apps & offers → Add link accepts a store name, link title,
HTTPS URL (including affiliate parameters) and a short description. Multiple
links may belong to the same store. Up to 1,000 custom links can be saved together after applying `20260928010000_promotion_types.sql`.
Store names are selected from a dropdown containing the six standard stores
and any previously saved custom store names. Remove a row and Save all links to remove it publicly.

The landing page merges store promotions into Shop by Brand immediately before
product sets. Brand buttons filter products. Only stores with custom promotion
links get an additional Promotions button with a count badge; official app links
do not contribute to that count. Selecting Promotions opens that store's panel,
selecting again closes it, and selecting another switches the visible panel.
Colored link titles, destination hostnames and one-line descriptions remain.
Official app links are available in a collapsed section inside promotion panels.
The single brand row scrolls horizontally on small screens. Search remains in
the same block. Empty custom lists show brand filters without promotion buttons.

Run `supabase/migrations/20260925020000_store_links.sql` after the existing
`20260924010000_store_apps.sql` migration. It adds the list setting, extends valid
click IDs and stores title/store snapshots for custom clicks. No new environment
variables are required. Until migration, old links remain readable and attempts
to save a new list show an explicit setup error.

Only configured IDs can redirect; destination query strings are preserved.
Deleted links return 404 while previously recorded counts and labels remain in
admin analytics. These counts stay separate from product clicks. Signed-in admin,
recognized bot and prefetch requests remain excluded. Missing click storage does
not block shoppers from following a configured link. Database browser roles have
no direct settings or click-write access.

Validation covers build, isolated SQL permissions/counting, legacy link behavior,
multi-store save/render/redirect, unsafe URL and duplicate-ID rejection, admin
click exclusion, removal and preserved historical labels. Remote SQL application
is a separate deployment step.
