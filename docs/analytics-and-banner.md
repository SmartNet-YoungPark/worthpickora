# Analytics controls and landing message

Apply these migrations in the existing Supabase project's SQL Editor:

1. `supabase/migrations/20260924020000_analytics_delete.sql`
2. `supabase/migrations/20260924030000_site_banner.sql`

The first requires the existing product click analytics table. Both migrations
restrict database access to the server's service role. No additional environment
variables are needed. Without the migrations, yearly trend grouping still works,
but saving a banner or deleting remote statistics shows a setup error.

## Statistics

Admin → Click analytics has compact Daily, Weekly, Monthly and Yearly buttons.
Trend buttons group the currently selected reporting dates; they do not change
those dates. The existing 366-day maximum reporting range still applies.

Delete buttons target the calendar period containing the **Through** date, in
Toronto time. Weeks run Monday–Sunday. The confirmation shows exact inclusive
dates before any request is sent. Deletion covers all product click records in
that period, independent of store/category/product/source/device filters, and
may extend outside the visible reporting dates. Products and app-guide counts
are kept. After successful deletion, totals and trends reload automatically.
Deletion is permanent. This implementation was tested only with isolated data;
no live customer statistics were deleted during development.

## Banner

Admin → Landing banner (`/admin/banner`) provides a 500-character plain-text
message and preview. Save blank/whitespace text to hide it. The landing page
renders the banner above Shop by Brand on initial load, before product cards;
it requires no customer click and does not block shopping. Line breaks are
preserved, long text wraps, and HTML is escaped. Saving takes effect on the next
page load. Existing open tabs need refreshing.

Validation: production build; calendar boundary/leap-year tests; rendered trend
and deletion controls; HTTP authentication/origin/confirmation checks; isolated
day/week/month/year deletion boundaries; product/app-stat preservation; banner
save, blank-hide and HTML escaping.
