begin;
alter table public.products add column if not exists options text not null default '' check(length(options)<=500);
create or replace function private.catalog_revision()
returns text language sql stable security definer set search_path = ''
as $$
  select md5(jsonb_build_object(
    'products',(select coalesce(jsonb_agg(jsonb_build_array(
      p.id,p.set_id,p.store_id,p.brand_id,p.name,p.code,p.description,p.options,p.asin,p.url,
      p.image_digest,p.photo,p.status,p.updated_at
    ) order by p.id),'[]'::jsonb) from public.products p),
    'categories',(select coalesce(jsonb_agg(jsonb_build_array(id,name,sort_order) order by id),'[]'::jsonb) from public.categories),
    'sets',(select coalesce(jsonb_agg(jsonb_build_array(id,category_id,set_number) order by id),'[]'::jsonb) from public.product_sets),
    'stores',(select coalesce(jsonb_agg(jsonb_build_array(id,name) order by id),'[]'::jsonb) from public.stores),
    'brands',(select coalesce(jsonb_agg(jsonb_build_array(id,name) order by id),'[]'::jsonb) from public.brands)
  )::text);
$$;
revoke all on function private.catalog_revision() from public,anon,authenticated,service_role;

create or replace function public.catalog_snapshot_metadata()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'products',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'name',p.name,'code',p.code,'description',p.description,'options',p.options,
        'category',c.name,'set',s.set_number,'store',r.name,
        'brand',coalesce(b.name,''),'asin',p.asin,'url',p.url,
        'image',case when p.image like 'data:image/%' then '' else p.image end,
        'image_embedded',p.image like 'data:image/%',
        'photo',p.photo,'status',p.status,'updated',p.updated_at
      ) order by s.set_number,p.code,p.id)
      from public.products p
      join public.product_sets s on s.id=p.set_id
      join public.categories c on c.id=s.category_id
      join public.stores r on r.id=p.store_id
      left join public.brands b on b.id=p.brand_id
    ),'[]'::jsonb),
    'categories',coalesce((select jsonb_agg(name order by sort_order,name) from public.categories),'[]'::jsonb),
    'productOptionsSupported',true,'revision',private.catalog_revision(),'persisted',true
  );
$$;
revoke all on function public.catalog_snapshot_metadata() from public,anon,authenticated;
grant execute on function public.catalog_snapshot_metadata() to service_role;
create or replace function public.catalog_apply_metadata(
  p_upserts jsonb, p_delete_ids jsonb, p_categories jsonb,
  p_remove_categories jsonb, p_revision text)
returns jsonb language plpgsql security definer set search_path = '' set statement_timeout = '45s'
as $$
declare
  item jsonb;
  category_name text;
  category_uuid uuid;
  set_uuid uuid;
  store_uuid uuid;
  brand_uuid uuid;
  position integer := 0;
begin
  if jsonb_typeof(p_upserts) is distinct from 'array'
     or jsonb_typeof(p_delete_ids) is distinct from 'array'
     or jsonb_typeof(p_categories) is distinct from 'array'
     or jsonb_typeof(p_remove_categories) is distinct from 'array' then
    raise exception 'Invalid catalog data.' using errcode='22023';
  end if;
  if jsonb_array_length(p_upserts)>5000 or jsonb_array_length(p_delete_ids)>5000
     or jsonb_array_length(p_categories) not between 1 and 200 then
    raise exception 'Invalid catalog size.' using errcode='22023';
  end if;
  lock table public.categories, public.stores, public.brands, public.product_sets, public.products in share row exclusive mode;
  if p_revision is distinct from private.catalog_revision() then
    raise exception 'CATALOG_CONFLICT' using errcode='40001';
  end if;
  -- Delete only explicitly supplied IDs. Omitted products are never deleted.
  delete from public.products where id in (select jsonb_array_elements_text(p_delete_ids));
  for category_name in select jsonb_array_elements_text(p_categories) loop
    position := position + 1;
    insert into public.categories(name,sort_order) values(category_name,position)
      on conflict (lower(name)) do update set name=excluded.name,sort_order=excluded.sort_order;
  end loop;
  for item in select value from jsonb_array_elements(p_upserts) loop
    select id into category_uuid from public.categories where name=item->>'category';
    if category_uuid is null then raise exception 'Unknown category.' using errcode='23503'; end if;
    insert into public.product_sets(category_id,set_number) values(category_uuid,(item->>'set')::integer)
      on conflict(category_id,set_number) do update set set_number=excluded.set_number returning id into set_uuid;
    select id into store_uuid from public.stores where lower(name)=lower(item->>'store');
    if store_uuid is null then raise exception 'Unknown store.' using errcode='23503'; end if;
    brand_uuid := null;
    if coalesce(item->>'brand','') <> '' then
      insert into public.brands(name) values(item->>'brand')
        on conflict(lower(name)) do update set name=excluded.name returning id into brand_uuid;
    end if;
    update public.products set set_id=set_uuid,store_id=store_uuid,brand_id=brand_uuid,
      name=item->>'name',code=item->>'code',description=coalesce(item->>'description',''),options=case when item ? 'options' then coalesce(item->>'options','') else options end,
      asin=coalesce(item->>'asin',''),url=item->>'url',image=case when item ? 'image' then coalesce(item->>'image','') else image end,
      photo=(item->>'photo')::smallint,status=item->>'status'
    where id=item->>'id';
    if not found then
      insert into public.products(id,set_id,store_id,brand_id,name,code,description,options,asin,url,image,photo,status)
      values(item->>'id',set_uuid,store_uuid,brand_uuid,item->>'name',item->>'code',
        coalesce(item->>'description',''),coalesce(item->>'options',''),coalesce(item->>'asin',''),item->>'url',
        coalesce(item->>'image',''),(item->>'photo')::smallint,item->>'status');
    end if;
  end loop;
  -- Explicit category deletion only; populated sets remain protected by foreign keys.
  for category_name in select jsonb_array_elements_text(p_remove_categories) loop
    if p_categories ? category_name then raise exception 'Category cannot be kept and deleted.' using errcode='22023'; end if;
    delete from public.product_sets s using public.categories c
      where s.category_id=c.id and c.name=category_name
        and not exists(select 1 from public.products p where p.set_id=s.id);
    delete from public.categories where name=category_name;
  end loop;
  return public.catalog_snapshot_metadata();
end;
$$;
revoke all on function public.catalog_apply_metadata(jsonb,jsonb,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.catalog_apply_metadata(jsonb,jsonb,jsonb,jsonb,text) to service_role;

notify pgrst,'reload schema';
commit;
