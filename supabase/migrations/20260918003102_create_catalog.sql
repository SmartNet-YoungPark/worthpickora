-- Operational catalog schema. Requires public.profiles from the profiles migration.
-- Apply once; existing tables are never dropped or replaced.
begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create function private.catalog_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.profiles
    where id = (select auth.uid()) and role = 'Admin');
$$;
revoke all on function private.catalog_is_admin() from public, anon, authenticated;
grant execute on function private.catalog_is_admin() to anon, authenticated, service_role;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_name_unique on public.categories (lower(name));

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 100),
  website_url text check (website_url is null or website_url ~* '^https?://[^[:space:]]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index stores_name_unique on public.stores (lower(name));

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index brands_name_unique on public.brands (lower(name));

create table public.product_sets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  set_number integer not null check (set_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, set_number)
);

create table public.products (
  -- Text accepts both existing legacy IDs and new UUID strings.
  id text primary key default gen_random_uuid()::text check (char_length(id) between 1 and 200),
  set_id uuid not null references public.product_sets(id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 300),
  code text not null check (code ~ '^[A-Za-z0-9_-]{2,24}$'),
  description text not null default '',
  asin text not null default '' check (asin = '' or asin ~ '^[A-Za-z0-9]{10}$'),
  url text not null check (url ~* '^https?://[^[:space:]]+$'),
  -- Actual JPG/PNG/WebP data URI or a hosted image URL, never an image/product code.
  image text not null default '' check (
    octet_length(image) <= 8388608 and
    (image = '' or image ~* '^https?://[^[:space:]]+$'
      or image ~* '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')
  ),
  photo smallint check (photo between 0 and 4),
  status text not null default 'Draft' check (status in ('Published','Draft','Needs Review','Archived')),
  -- Finite unique slots enforce the ten-product limit even under concurrent writes.
  slot smallint not null check (slot between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (set_id, slot)
);
create unique index products_set_code_unique on public.products (set_id, lower(code));
create index products_store_id_idx on public.products(store_id);
create index products_brand_id_idx on public.products(brand_id);
create index products_published_idx on public.products(set_id, code) where status = 'Published';

create function private.catalog_assign_slot()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' or new.set_id is distinct from old.set_id then
    -- Serialize allocations to a set; the unique constraint is the final concurrency guard.
    perform 1 from public.product_sets where id = new.set_id for update;
    select s into new.slot from generate_series(1,10) as s
    where not exists (
      select 1 from public.products p where p.set_id = new.set_id and p.slot = s
    ) order by s limit 1;
    if new.slot is null then
      raise exception 'A product set can contain at most 10 products.'
        using errcode = '23514';
    end if;
  else
    new.slot := old.slot;
  end if;
  return new;
end;
$$;
revoke all on function private.catalog_assign_slot() from public, anon, authenticated;
create trigger products_assign_slot before insert or update on public.products
for each row execute function private.catalog_assign_slot();

create function private.catalog_touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.catalog_touch_updated_at() from public, anon, authenticated;

-- Explicit grants override Supabase default privileges.
do $$
declare table_name text;
begin
  foreach table_name in array array['categories','stores','brands','product_sets','products'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', table_name);
    execute format('grant select on public.%I to anon, authenticated', table_name);
    execute format('grant insert, update, delete on public.%I to authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to service_role', table_name);
    execute format('create policy catalog_admin_all on public.%I for all to authenticated using ((select private.catalog_is_admin())) with check ((select private.catalog_is_admin()))', table_name);
    execute format('create trigger catalog_updated_at before update on public.%I for each row execute function private.catalog_touch_updated_at()', table_name);
  end loop;
  foreach table_name in array array['categories','stores','brands'] loop
    execute format('create policy catalog_public_read on public.%I for select to anon, authenticated using (true)', table_name);
  end loop;
end;
$$;

create policy products_public_read on public.products for select to anon, authenticated
using (status = 'Published');
create policy sets_public_read on public.product_sets for select to anon, authenticated
using (exists (select 1 from public.products p where p.set_id = product_sets.id and p.status = 'Published'));

insert into public.categories(name, sort_order) values
('Tech',1),('Home & Kitchen',2),('Electronics & Tech',3),('Beauty & Personal Care',4),
('Health & Household',5),('Clothing, Shoes & Jewelry',6),('Sports & Outdoors',7),
('Toys & Games',8),('Pet Supplies',9),('Automotive',10),('Tools & Home Improvement',11);
insert into public.stores(name,website_url) values
('Amazon','https://www.amazon.com'),('Walmart','https://www.walmart.com'),
('Best Buy','https://www.bestbuy.com'),('Temu','https://www.temu.com'),
('Target','https://www.target.com'),('Etsy','https://www.etsy.com');

comment on table public.products is 'Catalog products. Public reads only Published rows; mutations require Admin or trusted backend. Hard deletion is supported.';
comment on column public.products.slot is 'Automatically assigned internal capacity slot, 1-10. Do not set from the UI.';
comment on column public.products.image is 'Actual JPG/PNG/WebP base64 data URI or hosted HTTP(S) image URL, up to 8 MiB.';
comment on table public.product_sets is 'Category + positive set_number identifies a set. Public visibility requires at least one Published product.';
commit;
