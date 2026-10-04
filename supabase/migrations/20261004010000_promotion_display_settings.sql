begin;
create table public.promotion_display_settings(id integer primary key check(id=1),ranking_limit integer not null default 30 check(ranking_limit between 10 and 300 and ranking_limit%10=0));
insert into public.promotion_display_settings(id) values(1);
alter table public.promotion_display_settings enable row level security;
revoke all on public.promotion_display_settings from public,anon,authenticated;
grant select,update on public.promotion_display_settings to service_role;
create function public.promotion_display_get() returns jsonb language sql security invoker set search_path='' as $$select jsonb_build_object('rankingLimit',ranking_limit) from public.promotion_display_settings where id=1$$;
create function public.promotion_display_save(p_limit integer) returns void language plpgsql security invoker set search_path='' as $$begin
 if p_limit is null or p_limit<10 or p_limit>300 or p_limit%10<>0 then raise exception 'Invalid ranking limit';end if;
 update public.promotion_display_settings set ranking_limit=p_limit where id=1;
end;$$;
revoke all on function public.promotion_display_get(),public.promotion_display_save(integer) from public,anon,authenticated;
grant execute on function public.promotion_display_get(),public.promotion_display_save(integer) to service_role;
notify pgrst,'reload schema';
commit;
