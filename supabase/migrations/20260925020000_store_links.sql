begin;
alter table public.store_app_settings add column if not exists links jsonb default null
 check(links is null or (jsonb_typeof(links)='array' and jsonb_array_length(links)<=50));
alter table public.store_app_clicks drop constraint if exists store_app_clicks_link_id_check;
alter table public.store_app_clicks add constraint store_app_clicks_link_id_check
 check(link_id in ('amazon-ios','amazon-android','walmart','best-buy','temu','target','etsy','temu-offer') or link_id ~ '^link-[a-f0-9-]{36}$');
alter table public.store_app_clicks add column if not exists store_name text not null default '';
alter table public.store_app_clicks add column if not exists link_title text not null default '';
create or replace function public.store_link_click(p_link_id text,p_store text,p_title text) returns void
language sql security invoker set search_path='' as $$
 insert into public.store_app_clicks(click_date,link_id,clicks,store_name,link_title)
 values((now() at time zone 'America/Toronto')::date,p_link_id,1,left(p_store,80),left(p_title,80))
 on conflict(click_date,link_id) do update set clicks=public.store_app_clicks.clicks+1,store_name=excluded.store_name,link_title=excluded.link_title;
$$;
revoke all on function public.store_link_click(text,text,text) from public,anon,authenticated;
grant execute on function public.store_link_click(text,text,text) to service_role;
notify pgrst,'reload schema';
commit;
