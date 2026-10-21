begin;
alter table public.product_click_daily add column if not exists market text not null default 'Unknown';
alter table public.product_click_daily drop constraint if exists product_click_market_valid;
alter table public.product_click_daily add constraint product_click_market_valid check(market in ('US','CA','Other','Unknown'));
alter table public.product_click_daily drop constraint product_click_daily_pkey;
alter table public.product_click_daily add primary key(click_date,product_id,source,device,market);
create or replace function public.product_click_outbound_market(p_id text,p_count boolean,p_source text,p_device text,p_market text)
returns text language plpgsql security definer set search_path='' as $$
declare p record; destination text;
begin
  if p_market not in ('US','CA','Other','Unknown') or p_market is null then raise exception 'Invalid market'; end if;
  select x.id,x.code,x.name,x.url,c.name as category,s.set_number,r.name as store
  into p from public.products x
  join public.product_sets s on s.id=x.set_id
  join public.categories c on c.id=s.category_id
  join public.stores r on r.id=x.store_id
  where x.id=p_id and x.status='Published';
  if not found then return null; end if;
  destination:=p.url;
  if p_count then
    insert into public.product_click_daily(click_date,product_id,product_code,product_name,category_name,set_name,store_name,source,device,market)
    values((current_timestamp at time zone 'America/Toronto')::date,p.id,p.code,p.name,p.category,p.category||' Set '||p.set_number,p.store,p_source,p_device,p_market)
    on conflict(click_date,product_id,source,device,market) do update set clicks=public.product_click_daily.clicks+1;
  end if;
  return destination;
end $$;

create or replace function public.product_click_outbound_attributed(p_id text,p_count boolean,p_source text,p_device text)
returns text language sql security definer set search_path='' as $$
 select public.product_click_outbound_market(p_id,p_count,p_source,p_device,'Unknown');
$$;
revoke all on function public.product_click_outbound_market(text,boolean,text,text,text) from public,anon,authenticated;
grant execute on function public.product_click_outbound_market(text,boolean,text,text,text) to service_role;
revoke all on function public.product_click_outbound_attributed(text,boolean,text,text) from public,anon,authenticated;
grant execute on function public.product_click_outbound_attributed(text,boolean,text,text) to service_role;
notify pgrst,'reload schema';
commit;
