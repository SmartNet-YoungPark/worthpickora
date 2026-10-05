begin;
create table public.amazon_department_rankings(market text not null check(market in ('US','CA')),department text not null check(length(department) between 1 and 80),ranking_limit integer not null check(ranking_limit between 10 and 100 and ranking_limit%10=0),primary key(market,department));
alter table public.amazon_department_rankings enable row level security;
revoke all on public.amazon_department_rankings from public,anon,authenticated;
grant select,insert,update,delete on public.amazon_department_rankings to service_role;
create function public.amazon_department_ranking_get() returns jsonb language sql security invoker set search_path='' as $$select coalesce(jsonb_object_agg(market,limits),'{}') from (select market,jsonb_object_agg(department,ranking_limit) limits from public.amazon_department_rankings group by market)x$$;
create function public.amazon_department_ranking_save(p_market text,p_limits jsonb) returns void language plpgsql security invoker set search_path='' as $$begin
 if p_market is null or p_market not in ('US','CA') or jsonb_typeof(p_limits) is distinct from 'object' then raise exception 'Invalid department settings';end if;
 if (select count(*) from jsonb_each(p_limits))>100 then raise exception 'Too many departments';end if;
 if exists(select 1 from jsonb_each(p_limits) where length(key) not between 1 and 80 or trim(key)<>key or jsonb_typeof(value)<>'number' or value::text !~ '^[0-9]+$') then raise exception 'Invalid department limits';end if;
 if exists(select 1 from jsonb_each_text(p_limits) where value::numeric<10 or value::numeric>100 or mod(value::numeric,10)<>0) then raise exception 'Choose 10-100 in steps of 10';end if;
 perform pg_advisory_xact_lock(9272040);
 delete from public.amazon_department_rankings where market=p_market;
 insert into public.amazon_department_rankings(market,department,ranking_limit) select p_market,key,value::integer from jsonb_each_text(p_limits);
end;$$;
revoke all on function public.amazon_department_ranking_get(),public.amazon_department_ranking_save(text,jsonb) from public,anon,authenticated;
grant execute on function public.amazon_department_ranking_get(),public.amazon_department_ranking_save(text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
