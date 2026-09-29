begin;
alter table public.amazon_promotions add column if not exists expires_at timestamptz;
create or replace function public.promotion_links_snapshot() returns jsonb
language sql security invoker set search_path='' as $$
 select coalesce((select links from public.store_app_settings where id=1),'[]'::jsonb) ||
 coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'store','Amazon','title',p.title,'description',p.description,'url',p.url,'image',p.image,'category',p.category,
 'offerType',coalesce(a.offer_type,'general'),'promoCode',coalesce(a.promo_code,''),'saleInfo',coalesce(a.sale_info,''),'discountPercent',a.discount_percent,'expiresAt',a.expires_at) order by p.position,p.id)
 from public.amazon_products p left join public.amazon_promotions a on a.product_id=p.id),'[]'::jsonb);
$$;
create or replace function public.promotion_links_save(p_links jsonb) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if p_links is null or jsonb_typeof(p_links)<>'array' or jsonb_array_length(p_links)>1000 then raise exception 'Invalid promotion links'; end if;
 perform pg_catalog.pg_advisory_xact_lock(9272026);
 insert into public.amazon_products(id,title,description,url,image,category,position)
 select item->>'id',item->>'title',coalesce(item->>'description',''),item->>'url',coalesce(item->>'image',''),coalesce(item->>'category',''),ord::integer
 from jsonb_array_elements(p_links) with ordinality x(item,ord) where item->>'store'='Amazon'
 on conflict(id) do update set title=excluded.title,description=excluded.description,url=excluded.url,image=excluded.image,category=excluded.category,position=excluded.position,updated_at=now();
 insert into public.amazon_promotions(product_id,offer_type,promo_code,sale_info,discount_percent,expires_at)
 select item->>'id',coalesce(item->>'offerType','general'),coalesce(item->>'promoCode',''),coalesce(item->>'saleInfo',''),(item->>'discountPercent')::numeric,nullif(item->>'expiresAt','')::timestamptz
 from jsonb_array_elements(p_links) x(item) where item->>'store'='Amazon'
 on conflict(product_id) do update set offer_type=excluded.offer_type,promo_code=excluded.promo_code,sale_info=excluded.sale_info,discount_percent=excluded.discount_percent,expires_at=excluded.expires_at,updated_at=now();
 delete from public.amazon_products where id not in (select item->>'id' from jsonb_array_elements(p_links) x(item) where item->>'store'='Amazon');
 insert into public.store_app_settings(id,links,temu_offer_url)
 values(1,(select coalesce(jsonb_agg(item),'[]') from jsonb_array_elements(p_links) x(item) where item->>'store'<>'Amazon'),
 coalesce((select item->>'url' from jsonb_array_elements(p_links) x(item) where item->>'id'='temu-offer'),''))
 on conflict(id) do update set links=excluded.links,temu_offer_url=excluded.temu_offer_url;
end;
$$;
revoke all on function public.promotion_links_snapshot(),public.promotion_links_save(jsonb) from public,anon,authenticated;
grant execute on function public.promotion_links_snapshot(),public.promotion_links_save(jsonb) to service_role;
notify pgrst,'reload schema';
commit;
