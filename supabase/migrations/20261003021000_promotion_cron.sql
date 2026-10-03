begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create or replace function public.promotion_schedule_tick() returns void language plpgsql security definer set search_path='' as $$
declare t uuid;
begin
 perform pg_advisory_xact_lock(9272030);
 if exists(select 1 from public.promotion_schedule where enabled and next_run_at<=now()) then perform public.promotion_run_start('scheduled');end if;
 if exists(select 1 from public.promotion_runs where finished_at is null) then
 insert into public.promotion_worker_tokens default values returning token into t;
 perform net.http_post(url:='https://www.worthpickora.com/api/promotion-worker',headers:=jsonb_build_object('Content-Type','application/json'),body:=jsonb_build_object('token',t),timeout_milliseconds:=60000);
 end if;
 delete from public.promotion_worker_tokens where created_at<now()-interval '1 day';
end;$$;
revoke all on function public.promotion_schedule_tick() from public,anon,authenticated;
grant execute on function public.promotion_schedule_tick() to service_role;
select cron.schedule('worthpickora-promotion-verification','* * * * *','select public.promotion_schedule_tick();');
commit;
