begin;
-- Temporary upload parts, never visible to storefront visitors.
create table private.catalog_uploads (
  id uuid primary key default gen_random_uuid(),
  part_count integer not null check (part_count between 1 and 64),
  byte_count integer not null check (byte_count between 1 and 67108864),
  expires_at timestamptz not null default now() + interval '1 hour'
);
create table private.catalog_upload_parts (
  upload_id uuid not null references private.catalog_uploads(id) on delete cascade,
  part_index integer not null check (part_index between 0 and 63),
  data bytea not null check (octet_length(data) between 1 and 1048576),
  primary key(upload_id,part_index)
);
alter table private.catalog_uploads enable row level security;
alter table private.catalog_upload_parts enable row level security;
revoke all on private.catalog_uploads,private.catalog_upload_parts from public,anon,authenticated,service_role;

create function public.catalog_upload_start(p_parts integer,p_bytes integer)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare result uuid;
begin
  delete from private.catalog_uploads where expires_at < now();
  if (select count(*) from private.catalog_uploads) >= 16 then
    raise exception 'UPLOAD_BUSY' using errcode='22023';
  end if;
  if p_parts <> ceil(p_bytes::numeric / 1048576)::integer then
    raise exception 'UPLOAD_INVALID_SIZE' using errcode='22023';
  end if;
  insert into private.catalog_uploads(part_count,byte_count) values(p_parts,p_bytes) returning id into result;
  return result;
end;
$$;

create function public.catalog_upload_part(p_id uuid,p_index integer,p_data text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare upload private.catalog_uploads; bytes bytea; expected integer; previous bytea;
begin
  select * into upload from private.catalog_uploads where id=p_id and expires_at>now() for update;
  if not found then raise exception 'UPLOAD_EXPIRED' using errcode='22023'; end if;
  if p_index < 0 or p_index >= upload.part_count then raise exception 'UPLOAD_INVALID_PART' using errcode='22023'; end if;
  bytes := decode(p_data,'base64');
  expected := case when p_index=upload.part_count-1 then upload.byte_count-p_index*1048576 else 1048576 end;
  if octet_length(bytes) <> expected then raise exception 'UPLOAD_INVALID_SIZE' using errcode='22023'; end if;
  select data into previous from private.catalog_upload_parts where upload_id=p_id and part_index=p_index;
  if found then
    if previous <> bytes then raise exception 'UPLOAD_PART_CHANGED' using errcode='22023'; end if;
    return true;
  end if;
  insert into private.catalog_upload_parts(upload_id,part_index,data) values(p_id,p_index,bytes);
  return true;
end;
$$;

create function public.catalog_upload_read(p_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare upload private.catalog_uploads; bytes bytea; parts integer;
begin
  select * into upload from private.catalog_uploads where id=p_id and expires_at>now();
  if not found then raise exception 'UPLOAD_EXPIRED' using errcode='22023'; end if;
  select count(*),string_agg(data,''::bytea order by part_index) into parts,bytes
    from private.catalog_upload_parts where upload_id=p_id;
  if parts<>upload.part_count or octet_length(bytes)<>upload.byte_count then
    raise exception 'UPLOAD_INCOMPLETE' using errcode='22023';
  end if;
  return convert_from(bytes,'UTF8')::jsonb;
end;
$$;

create function public.catalog_upload_remove(p_id uuid)
returns void language sql security definer set search_path = ''
as $$ delete from private.catalog_uploads where id=p_id; $$;

revoke all on function public.catalog_upload_start(integer,integer) from public,anon,authenticated;
revoke all on function public.catalog_upload_part(uuid,integer,text) from public,anon,authenticated;
revoke all on function public.catalog_upload_read(uuid) from public,anon,authenticated;
revoke all on function public.catalog_upload_remove(uuid) from public,anon,authenticated;
grant execute on function public.catalog_upload_start(integer,integer) to service_role;
grant execute on function public.catalog_upload_part(uuid,integer,text) to service_role;
grant execute on function public.catalog_upload_read(uuid) to service_role;
grant execute on function public.catalog_upload_remove(uuid) to service_role;
commit;
