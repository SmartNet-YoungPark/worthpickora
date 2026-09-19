begin;
create table public.product_click_daily (
  click_date date not null,
  product_id text not null,
  product_code text not null,
  product_name text not null,
  category_name text not null,
  set_name text not null,
  store_name text not null,
  clicks bigint not null default 1 check(clicks>0),
  primary key(click_date,product_id)
);
-- Keep historical records after a product is deleted; no cascading product FK.
alter table public.product_click_daily enable row level security;
revoke all on public.product_click_daily from public,anon,authenticated;
create index product_click_daily_product_date on public.product_click_daily(product_id,click_date);

create function public.product_click_outbound(p_id text,p_count boolean)
returns text language plpgsql security definer set search_path='' as $$
declare p record; destination text;
begin
  select x.id,x.code,x.name,x.url,c.name as category,s.set_number,r.name as store
  into p from public.products x
  join public.product_sets s on s.id=x.set_id
  join public.categories c on c.id=s.category_id
  join public.stores r on r.id=x.store_id
  where x.id=p_id and x.status='Published';
  if not found then return null; end if;
  destination:=p.url;
  if p_count then
    insert into public.product_click_daily(click_date,product_id,product_code,product_name,category_name,set_name,store_name)
    values((current_timestamp at time zone 'America/Toronto')::date,p.id,p.code,p.name,p.category,p.category||' Set '||p.set_number,p.store)
    on conflict(click_date,product_id) do update set clicks=public.product_click_daily.clicks+1;
  end if;
  return destination;
end $$;
create function public.product_click_report(p_start date,p_end date)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if p_start is null or p_end is null or p_end<p_start or p_end-p_start>731 then raise exception 'Invalid analytics date range'; end if;
  return coalesce((select jsonb_agg(to_jsonb(d) order by d.click_date,d.product_id)
    from public.product_click_daily d where click_date between p_start and p_end),'[]'::jsonb);
end $$;
revoke all on function public.product_click_outbound(text,boolean) from public,anon,authenticated;
revoke all on function public.product_click_report(date,date) from public,anon,authenticated;
grant execute on function public.product_click_outbound(text,boolean) to service_role;
grant execute on function public.product_click_report(date,date) to service_role;
notify pgrst,'reload schema';
commit;

