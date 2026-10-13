begin;
-- Owner-confirmed deleted, non-overlapping click totals: 721 + 155.
-- Preserve these separately; product/store/date details are unavailable.
create table if not exists public.product_click_history_adjustments (
 recovery_key text primary key,
 clicks bigint not null check(clicks>=0),
 reason text not null,
 created_at timestamptz not null default now()
);
alter table public.product_click_history_adjustments enable row level security;
revoke all on public.product_click_history_adjustments from public,anon,authenticated;
insert into public.product_click_history_adjustments(recovery_key,clicks,reason)
values ('owner_confirmed_deleted_totals_20261013',876,'Owner confirmed deleted non-overlapping totals of 721 and 155; store/product/date attribution unavailable.')
on conflict(recovery_key) do nothing;
create or replace function public.product_click_store_totals()
returns table(store_name text, clicks bigint)
language sql stable security definer set search_path='' as $$
 select lower(trim(d.store_name)),sum(d.clicks)::bigint
 from public.product_click_daily d group by lower(trim(d.store_name))
 union all
 select '__historical_unassigned__',sum(h.clicks)::bigint
 from public.product_click_history_adjustments h having count(*)>0;
$$;
revoke all on function public.product_click_store_totals() from public,anon,authenticated;
grant execute on function public.product_click_store_totals() to service_role;
notify pgrst,'reload schema';
commit;
