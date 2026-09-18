# Supabase user profiles

Target project:
- Name: `worthpickora`
- Project reference: `kcafllbnlbomvmmllqsv`
- API URL: `https://kcafllbnlbomvmmllqsv.supabase.co`
- SQL Editor: https://supabase.com/dashboard/project/kcafllbnlbomvmmllqsv/sql/new

The URL identifies the project but does not authorize database changes.
The existing profiles schema was verified remotely. Catalog migration
`20260918003102_create_catalog.sql` was applied via authenticated MCP and
recorded remotely as version `20260918003102` (`create_catalog`).
Do not rerun the create scripts on this project. The profiles schema already
existed without a migration-history entry; baseline it before using CLI db push.

Apply `migrations/20260917000100_create_profiles.sql` in the target project's
**SQL Editor** as the database owner. This migration creates a new table;
if `public.profiles` already exists, inspect its schema before adapting the
migration. The transaction fails without replacing an existing table.

In **Table Editor → public → profiles → role**, select `Admin` or `User`.
Use **Set NULL** to remove the assigned role. NULL is a database null value,
not the text `"Null"`. New signups and existing users start with NULL.

The `id` is the user's **Authentication → Users → User UID**. A signup trigger
creates the profile, existing users are backfilled, and deleting the Auth user
also deletes its profile. Name/avatar changes update `updated_at` automatically.

Only the Supabase database owner / dashboard administrators and trusted backend
code using `service_role` can assign roles. Authenticated users can read their
own profile and edit their own name/avatar, but cannot insert/delete profiles,
change IDs, or change roles. Even users with the application role `Admin` do
not gain direct role-management API access with this migration alone.

For example, in SQL Editor (replace the UUID with the actual Auth user ID):

```sql
update public.profiles set role = 'Admin' where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set role = 'User' where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set role = null where id = '00000000-0000-0000-0000-000000000001';
```

This adds the Supabase data model only. The site's current PIN-based login does
not yet use Supabase Auth or these roles. Never expose a service-role key in
browser code or a `NEXT_PUBLIC_` environment variable.

Run `npm run test:profiles` to validate the SQL using isolated in-memory
PostgreSQL with a minimal test-only Supabase Auth schema and roles. These tests
do not connect to or modify a real Supabase project.

References:
- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/guides/database/postgres/column-level-security
