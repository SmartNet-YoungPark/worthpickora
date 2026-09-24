begin;
create or replace function public.product_click_delete_range(p_start date,p_end date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if p_start is null or p_end is null or p_start > p_end or p_end - p_start > 365 then
    raise exception 'Invalid analytics deletion range';
  end if;
  with removed as (
    delete from public.product_click_daily where click_date between p_start and p_end returning clicks
  ) select jsonb_build_object('records',count(*),'clicks',coalesce(sum(clicks),0)) into result from removed;
  return result;
end;
$$;
revoke all on function public.product_click_delete_range(date,date) from public,anon,authenticated;
grant execute on function public.product_click_delete_range(date,date) to service_role;
notify pgrst, 'reload schema';
commit;
