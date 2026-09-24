begin;
create table if not exists public.site_banner (
  id integer primary key check (id=1),
  message text not null default '' check (length(message)<=500)
);
insert into public.site_banner(id) values(1) on conflict do nothing;
alter table public.site_banner enable row level security;
revoke all on public.site_banner from public,anon,authenticated;
grant select,insert,update,delete on public.site_banner to service_role;
notify pgrst,'reload schema';
commit;
