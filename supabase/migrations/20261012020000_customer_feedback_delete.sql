begin;
create or replace function public.customer_feedback_delete(p_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 delete from public.customer_feedback where id=p_id;
 return found;
end $$;
revoke all on function public.customer_feedback_delete(uuid) from public,anon,authenticated;
grant execute on function public.customer_feedback_delete(uuid) to service_role;
notify pgrst,'reload schema';
commit;
