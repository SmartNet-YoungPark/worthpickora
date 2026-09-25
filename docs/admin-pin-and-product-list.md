# Product list and administrator PIN

The admin product table defaults to natural, case-insensitive product-code order
(T2 before T10), with 20 rows per page. Import returns to code order and page 1.
Other sort choices remain available under More Filters. Landing-page set order
is unchanged.

## PIN setup

Run `supabase/migrations/20260925010000_admin_credentials.sql` in the production
Supabase SQL Editor. Keep the existing server-only `ADMIN_PASSWORD_HASH`,
`ADMIN_SESSION_SECRET`, `SUPABASE_URL` and `SUPABASE_SECRET_KEY` configuration.
No new environment variables are required.

Admin → **Change PIN** (`/admin/password`) requires the current PIN, a different
four-digit new PIN and matching confirmation. Only a salted scrypt hash is saved.
Successful changes invalidate all existing admin session signatures and sign out
the current browser. Sign in again with the new PIN. The environment hash is the
initial fallback until the first successful database-backed change; afterwards
the database hash takes precedence and survives redeployment.

Database reads fail closed on connection errors; they never silently accept the
old environment PIN during an outage. Before the credential table is installed,
existing environment-based login remains available and change requests show a
setup error. The table and update RPC deny browser roles. The RPC uses a table
lock and expected-hash check to reject stale concurrent changes.

Local development stores the hash in ignored `.data/admin-credentials.json`.
The existing single-admin authentication uses process-local attempt limits,
including five PIN-change attempts per minute. These limits are not a shared
multi-instance rate limiter.

Validated production build, isolated HTTP tests (20-row code ordering, auth and
origin checks, wrong current PIN, confirmation mismatch, old-session rejection,
old-PIN rejection and new-PIN login), and isolated SQL permission/CAS tests.
The production administrator PIN was not changed during development.
