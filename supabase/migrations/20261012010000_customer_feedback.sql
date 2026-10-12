begin;
create table if not exists public.customer_feedback (
 id uuid primary key,
 created_at timestamptz not null default now(),
 display_name text not null check (char_length(display_name) between 1 and 60),
 sentiment text not null check (sentiment in ('happy','problem','suggestion')),
 message text not null check (char_length(message) between 5 and 1500),
 status text not null default 'pending' check (status in ('pending','visible','hidden')),
 reply text not null default '' check (char_length(reply)<=1500),
 replied_at timestamptz,
 sender_hash text not null
);
create index if not exists customer_feedback_date_idx on public.customer_feedback(created_at desc);
create index if not exists customer_feedback_sender_idx on public.customer_feedback(sender_hash,created_at desc);
alter table public.customer_feedback enable row level security;
revoke all on public.customer_feedback from public, anon, authenticated;

create or replace function public.customer_feedback_submit(p_id uuid,p_name text,p_sentiment text,p_message text,p_sender text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if p_sender is null or length(p_sender)<>64 then raise exception 'Invalid sender'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_sender,0));
 if exists(select 1 from customer_feedback where id=p_id and sender_hash=p_sender) then return true; end if;
 if (select count(*) from customer_feedback where sender_hash=p_sender and created_at>now()-interval '1 hour')>=3 then return false; end if;
 insert into customer_feedback(id,display_name,sentiment,message,sender_hash)
 values(p_id,trim(p_name),p_sentiment,trim(p_message),p_sender);
 return true;
end $$;

create or replace function public.customer_feedback_list(p_date date,p_admin boolean default false,p_offset integer default 0)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at desc,f.id),'[]'::jsonb) from (
 select id,created_at,display_name,sentiment,message,reply,replied_at,status
 from customer_feedback where created_at>=p_date::timestamp at time zone 'America/Toronto'
 and created_at<(p_date+1)::timestamp at time zone 'America/Toronto'
 and (p_admin or status='visible') order by created_at desc,id limit 50 offset greatest(0,p_offset)
 ) f;
$$;

create or replace function public.customer_feedback_update(p_id uuid,p_reply text,p_status text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 update customer_feedback set reply=trim(p_reply),status=p_status,
 replied_at=case when trim(p_reply)='' then null when reply=trim(p_reply) then replied_at else now() end
 where id=p_id;
 return found;
end $$;

create or replace function public.customer_feedback_summary(p_start date,p_end date)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('total',count(*),'pending',count(*) filter(where status='pending'),
 'problems',count(*) filter(where sentiment='problem')) from customer_feedback
 where created_at>=p_start::timestamp at time zone 'America/Toronto'
 and created_at<(p_end+1)::timestamp at time zone 'America/Toronto' and status<>'hidden';
$$;
revoke all on function public.customer_feedback_submit(uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.customer_feedback_list(date,boolean,integer) from public,anon,authenticated;
revoke all on function public.customer_feedback_update(uuid,text,text) from public,anon,authenticated;
revoke all on function public.customer_feedback_summary(date,date) from public,anon,authenticated;
grant execute on function public.customer_feedback_submit(uuid,text,text,text,text) to service_role;
grant execute on function public.customer_feedback_list(date,boolean,integer) to service_role;
grant execute on function public.customer_feedback_update(uuid,text,text) to service_role;
grant execute on function public.customer_feedback_summary(date,date) to service_role;
notify pgrst,'reload schema';
commit;
