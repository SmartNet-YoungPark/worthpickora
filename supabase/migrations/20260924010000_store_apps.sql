begin;
create table if not exists public.store_app_settings (
  id integer primary key check (id = 1),
  temu_offer_url text not null default '' check (length(temu_offer_url) <= 2048)
);
insert into public.store_app_settings (id) values (1) on conflict do nothing;
create table if not exists public.store_app_clicks (
  click_date date not null,
  link_id text not null check (link_id in ('amazon-ios','amazon-android','walmart','best-buy','temu','target','etsy','temu-offer')),
  clicks bigint not null default 0 check (clicks >= 0),
  primary key (click_date, link_id)
);
alter table public.store_app_settings enable row level security;
alter table public.store_app_clicks enable row level security;
revoke all on public.store_app_settings, public.store_app_clicks from public, anon, authenticated;
grant select, insert, update, delete on public.store_app_settings, public.store_app_clicks to service_role;
create or replace function public.store_app_click(p_link_id text) returns void
language sql security invoker set search_path = '' as $$
  insert into public.store_app_clicks(click_date, link_id, clicks)
  values ((now() at time zone 'America/Toronto')::date, p_link_id, 1)
  on conflict (click_date, link_id) do update set clicks = public.store_app_clicks.clicks + 1;
$$;
revoke all on function public.store_app_click(text) from public, anon, authenticated;
grant execute on function public.store_app_click(text) to service_role;
notify pgrst, 'reload schema';
commit;
