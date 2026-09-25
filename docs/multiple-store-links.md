# Multiple store links

Admin → Store apps & offers → Add link accepts a store name, link title,
HTTPS URL (including affiliate parameters) and a short description. Multiple
links may belong to the same store. Up to 50 custom links can be saved together.
The six existing store suggestions are available, and other store names may
also be entered. Remove a row and Save all links to remove it publicly.

The landing page displays Store apps & offers below Shop by Brand, expanded by
default and collapsible. Store cards show larger headings, clickable link titles,
destination hostnames and one-line descriptions. Full tracking URLs are retained
in the redirect destination, not rendered as long, wrapping URL strings. Existing
official app links remain present. Legacy Temu offers are carried forward until
the administrator saves the new list. Empty custom lists show only app links.

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
