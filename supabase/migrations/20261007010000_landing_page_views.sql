begin;
create table public.landing_page_views (
 event_id uuid primary key,
 viewed_at timestamptz not null default now(),
 view_date date not null default (now() at time zone 'America/Toronto')::date,
 source text not null,
 device text not null
);
create index landing_page_views_date_idx on public.landing_page_views(view_date);
alter table public.landing_page_views enable row level security;
revoke all on public.landing_page_views from public, anon, authenticated;
create function public.landing_page_view_record(p_event_id uuid,p_source text,p_device text)
returns void language sql security definer set search_path='' as $$
 insert into public.landing_page_views(event_id,source,device)
 values(p_event_id,left(p_source,80),left(p_device,30)) on conflict(event_id) do nothing;
$$;
create function public.landing_page_view_report(p_start date,p_end date)
returns table(view_date date,source text,device text,views bigint)
language sql stable security definer set search_path='' as $$
 select v.view_date,v.source,v.device,count(*) from public.landing_page_views v
 where v.view_date between p_start and p_end group by v.view_date,v.source,v.device;
$$;
revoke all on function public.landing_page_view_record(uuid,text,text) from public,anon,authenticated;
revoke all on function public.landing_page_view_report(date,date) from public,anon,authenticated;
grant execute on function public.landing_page_view_record(uuid,text,text) to service_role;
grant execute on function public.landing_page_view_report(date,date) to service_role;
notify pgrst, 'reload schema';
commit;
