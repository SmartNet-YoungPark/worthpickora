-- Based on https://supabase.com/docs/guides/auth/managing-user-data
-- Apply once as the database owner via Supabase SQL Editor or migrations.
-- Deliberately fail if profiles already exists instead of replacing user data.
begin;

create type public.profile_role as enum ('Admin', 'User');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  role public.profile_role default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.role is
  'Admin or User; SQL NULL means no assigned application role. Managed by trusted administrators only.';

alter table public.profiles enable row level security;

-- RLS alone does not protect the role column from self-promotion.
revoke all on public.profiles from public, anon, authenticated;
grant usage on type public.profile_role to authenticated, service_role;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, avatar_url) on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

create policy profiles_read_own
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create function public.worthpickora_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.worthpickora_profile_updated_at() from public, anon, authenticated;

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.worthpickora_profile_updated_at();

create function public.worthpickora_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- User-supplied metadata must NEVER determine authorization roles.
  insert into public.profiles (id, first_name, last_name, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'avatar_url',
    null
  );
  return new;
end;
$$;
revoke all on function public.worthpickora_handle_new_auth_user() from public, anon, authenticated;

create trigger worthpickora_on_auth_user_created
after insert on auth.users
for each row execute function public.worthpickora_handle_new_auth_user();

-- Also create profiles for users who signed up before this migration.
insert into public.profiles (id, first_name, last_name, avatar_url, role)
select id, raw_user_meta_data ->> 'first_name', raw_user_meta_data ->> 'last_name',
       raw_user_meta_data ->> 'avatar_url', null
from auth.users;

commit;
