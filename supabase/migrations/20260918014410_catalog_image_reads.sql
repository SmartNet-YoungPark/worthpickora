begin;
create function public.catalog_product_image(p_id text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('id',id,'image',image,'status',status)
  from public.products where id=p_id;
$$;
revoke all on function public.catalog_product_image(text) from public,anon,authenticated;
grant execute on function public.catalog_product_image(text) to service_role;

create function public.catalog_snapshot_metadata()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'products',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'name',p.name,'code',p.code,'description',p.description,
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
    'revision',private.catalog_revision(),'persisted',true
  );
$$;
revoke all on function public.catalog_snapshot_metadata() from public,anon,authenticated;
grant execute on function public.catalog_snapshot_metadata() to service_role;
notify pgrst,'reload schema';
commit;
