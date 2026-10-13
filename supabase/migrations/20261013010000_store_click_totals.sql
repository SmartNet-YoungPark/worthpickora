begin;
create or replace function public.product_click_store_totals()
returns table(store_name text, clicks bigint)
language sql stable security definer set search_path='' as $$
 select lower(trim(d.store_name)),sum(d.clicks)::bigint
 from public.product_click_daily d group by lower(trim(d.store_name));
$$;
revoke all on function public.product_click_store_totals() from public,anon,authenticated;
grant execute on function public.product_click_store_totals() to service_role;
notify pgrst,'reload schema';
commit;
