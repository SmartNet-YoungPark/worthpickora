begin;
create table if not exists public.admin_credentials (
 id integer primary key check(id=1),
 password_hash text not null check(password_hash ~ '^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$'),
 updated_at timestamptz not null default now()
);
alter table public.admin_credentials enable row level security;
revoke all on public.admin_credentials from public,anon,authenticated;
grant select on public.admin_credentials to service_role;
create or replace function public.admin_change_password(p_expected text,p_new text)
returns boolean language plpgsql security definer set search_path='' as $$
declare stored text;
begin
 if p_expected is null or p_new is null or p_expected !~ '^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$' or p_new !~ '^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$' then raise exception 'Invalid hash'; end if;
 lock table public.admin_credentials in exclusive mode;
 select password_hash into stored from public.admin_credentials where id=1;
 if stored is not null and stored<>p_expected then return false; end if;
 insert into public.admin_credentials(id,password_hash) values(1,p_new)
 on conflict(id) do update set password_hash=excluded.password_hash,updated_at=now();
 return true;
end;
$$;
revoke all on function public.admin_change_password(text,text) from public,anon,authenticated;
grant execute on function public.admin_change_password(text,text) to service_role;
notify pgrst,'reload schema';
commit;
