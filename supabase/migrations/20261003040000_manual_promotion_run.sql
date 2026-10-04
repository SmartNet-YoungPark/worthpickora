begin;
create or replace function public.promotion_run_start(p_trigger text default 'manual') returns uuid language plpgsql security invoker set search_path='' as $$
declare r uuid; s public.promotion_schedule;
begin
 perform pg_advisory_xact_lock(9272030);
 select id into r from public.promotion_runs where finished_at is null limit 1;
 if r is not null then return r;end if;
 select * into s from public.promotion_schedule where id=1;
 insert into public.promotion_runs(trigger_type,market) values(p_trigger,s.market) returning id into r;
 insert into public.promotion_run_items(run_id,product_id,url,product_version,promotion_version)
 select r,p.id,p.product_url,p.updated_at,a.updated_at from public.marketplace_offers p join public.promotions a on a.id=p.id
 where (s.market='ALL' or p.market=s.market);
 update public.promotion_schedule set last_started_at=now(), next_run_at=case when p_trigger='manual' then next_run_at when interval_hours=24 then (((now() at time zone 'America/Toronto')::date+1)+start_time) at time zone 'America/Toronto' else now()+make_interval(hours=>interval_hours) end where id=1;
 if not exists(select 1 from public.promotion_run_items where run_id=r) then update public.promotion_runs set finished_at=now() where id=r;end if;
 return r;
end;$$;

notify pgrst,'reload schema';
commit;
