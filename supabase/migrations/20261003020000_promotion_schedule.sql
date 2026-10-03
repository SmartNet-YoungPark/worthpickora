begin;
create table public.promotion_schedule (
 id integer primary key check(id=1), enabled boolean not null default false,
 start_time time not null default '06:00', timezone text not null default 'America/Toronto' check(timezone='America/Toronto'),
 interval_hours integer not null default 24 check(interval_hours in (6,12,24)),
 market text not null default 'ALL' check(market in ('ALL','US','CA')), next_run_at timestamptz,
 last_started_at timestamptz,last_finished_at timestamptz
);
insert into public.promotion_schedule(id) values(1);
create table public.promotion_runs(id uuid primary key default gen_random_uuid(),started_at timestamptz not null default now(),finished_at timestamptz,trigger_type text not null,market text not null);
create table public.promotion_run_items(
 run_id uuid references public.promotion_runs(id) on delete cascade,product_id text not null,url text not null,product_version timestamptz not null,promotion_version timestamptz not null,
 state text not null default 'pending' check(state in ('pending','processing','confirmed','unknown','expired','skipped')),
 note text,attempts integer not null default 0,lease_id uuid,leased_at timestamptz,finished_at timestamptz,primary key(run_id,product_id)
);
create table public.promotion_worker_tokens(token uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),used boolean not null default false);
alter table public.promotion_schedule enable row level security;
alter table public.promotion_runs enable row level security;
alter table public.promotion_run_items enable row level security;
alter table public.promotion_worker_tokens enable row level security;
revoke all on public.promotion_schedule,public.promotion_runs,public.promotion_run_items,public.promotion_worker_tokens from public,anon,authenticated;
grant all on public.promotion_schedule,public.promotion_runs,public.promotion_run_items,public.promotion_worker_tokens to service_role;
create function public.promotion_schedule_save(p_enabled boolean,p_time time,p_hours integer,p_market text) returns void language plpgsql security invoker set search_path='' as $$
declare next_time timestamptz;
begin
 if p_time is null or p_enabled is null or p_hours is null or p_hours not in (6,12,24) or p_market is null or p_market not in ('ALL','US','CA') then raise exception 'Invalid schedule';end if;
 next_time:=((now() at time zone 'America/Toronto')::date+p_time) at time zone 'America/Toronto';
 if p_hours=24 and next_time<=now() then next_time:=(((now() at time zone 'America/Toronto')::date+1)+p_time) at time zone 'America/Toronto';else while next_time<=now() loop next_time:=next_time+make_interval(hours=>p_hours);end loop;end if;
 update public.promotion_schedule set enabled=p_enabled,start_time=p_time,interval_hours=p_hours,market=p_market,next_run_at=next_time where id=1;
end;$$;
create function public.promotion_run_start(p_trigger text default 'manual') returns uuid language plpgsql security invoker set search_path='' as $$
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
 update public.promotion_schedule set last_started_at=now(), next_run_at=case when interval_hours=24 then (((now() at time zone 'America/Toronto')::date+1)+start_time) at time zone 'America/Toronto' else now()+make_interval(hours=>interval_hours) end where id=1;
 if not exists(select 1 from public.promotion_run_items where run_id=r) then update public.promotion_runs set finished_at=now() where id=r;end if;
 return r;
end;$$;
create function public.promotion_batch_claim(p_token uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 perform pg_advisory_xact_lock(9272030);
 update public.promotion_worker_tokens set used=true where token=p_token and not used and created_at>now()-interval '5 minutes';
 if not found then raise exception 'Invalid worker token';end if;
 update public.promotion_run_items set state=case when attempts>=3 then 'unknown' else 'pending' end,note='Worker timeout; verification not confirmed',finished_at=case when attempts>=3 then now() end where state='processing' and leased_at<now()-interval '3 minutes';
 with picked as(select run_id,product_id from public.promotion_run_items where state='pending' order by run_id,product_id limit 8 for update skip locked),
 claimed as(update public.promotion_run_items i set state='processing',attempts=attempts+1,lease_id=p_token,leased_at=now() from picked x where i.run_id=x.run_id and i.product_id=x.product_id returning i.*)
 select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('store',o.store,'market',o.market,'termsUrl',p.terms_url)),'[]') into result from claimed c join public.marketplace_offers o on o.id=c.product_id join public.promotions p on p.id=o.id;
 update public.promotion_runs r set finished_at=now() where finished_at is null and not exists(select 1 from public.promotion_run_items i where i.run_id=r.id and state in ('pending','processing'));
 return result;
end;$$;
create function public.promotion_result_save(p_run uuid,p_id text,p_lease uuid,p_result jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare i public.promotion_run_items; st text; typ text;
begin
 select * into i from public.promotion_run_items where run_id=p_run and product_id=p_id and state='processing' and lease_id=p_lease for update;
 if not found then return;end if;
 st:=p_result->>'state';typ:=p_result->>'offerType';
 if st not in ('confirmed','unknown','expired') or st is null then raise exception 'Invalid result';end if;
 if st='confirmed' and (typ is null or typ not in ('clip-coupon','limited-time','price-discount') or p_result->>'url' is distinct from i.url) then raise exception 'Invalid confirmed offer';end if;
 if not exists(select 1 from public.marketplace_offers p join public.promotions a on a.id=p.id where p.id=p_id and p.product_url=i.url and p.updated_at=i.product_version and a.updated_at=i.promotion_version) then st:='skipped';
 else
 update public.promotions set status=st,last_verified_at=now(),verified_url=i.url,verification_note=left(p_result->>'note',300),
 promotion_type=case when st='confirmed' then typ else promotion_type end,
 discount_percent=case when st='confirmed' then (p_result->>'discountPercent')::numeric else discount_percent end,
 discount_amount=case when st='confirmed' then (p_result->>'discountAmount')::numeric else discount_amount end,
 raw_promotion_text=case when st='confirmed' then left(p_result->>'saleInfo',300) else raw_promotion_text end,
 end_at=case when st='confirmed' then null else end_at end,
 end_on=case when st='confirmed' then (p_result->>'expiresOn')::date else end_on end,
 source_url=case when st='confirmed' then p_result->>'sourceUrl' else source_url end,
 updated_at=now() where id=p_id;
 end if;
 update public.promotion_run_items set state=st,note=left(p_result->>'note',300),finished_at=now() where run_id=p_run and product_id=p_id;
 update public.promotion_runs r set finished_at=now() where id=p_run and not exists(select 1 from public.promotion_run_items x where x.run_id=r.id and state in ('pending','processing'));
 update public.promotion_schedule set last_finished_at=(select max(finished_at) from public.promotion_runs) where id=1;
end;$$;
create function public.promotion_schedule_status() returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('settings',(select to_jsonb(s) from public.promotion_schedule s where id=1),'items',(select coalesce(jsonb_agg(t),'[]') from (select o.id,d.name,o.store,o.market,o.currency,o.affiliate_url,o.tracking_id,p.status,p.last_verified_at,p.verification_note from public.marketplace_offers o join public.deal_products d on d.id=o.product_id join public.promotions p on p.id=o.id order by o.position,o.id limit 1000)t),'runs',(select coalesce(jsonb_agg(t),'[]') from (select r.*, (select count(*) from public.promotion_run_items i where i.run_id=r.id) as total,(select count(*) from public.promotion_run_items i where i.run_id=r.id and i.state='confirmed') as confirmed,(select count(*) from public.promotion_run_items i where i.run_id=r.id and i.state in ('unknown','expired','skipped')) as needs_check from public.promotion_runs r order by started_at desc limit 10)t));
$$;
revoke all on function public.promotion_schedule_save(boolean,time,integer,text),public.promotion_run_start(text),public.promotion_batch_claim(uuid),public.promotion_result_save(uuid,text,uuid,jsonb),public.promotion_schedule_status() from public,anon,authenticated;
grant execute on function public.promotion_schedule_save(boolean,time,integer,text),public.promotion_run_start(text),public.promotion_batch_claim(uuid),public.promotion_result_save(uuid,text,uuid,jsonb),public.promotion_schedule_status() to service_role;
notify pgrst,'reload schema';
commit;
