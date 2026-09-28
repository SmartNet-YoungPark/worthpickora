begin;
-- Independent of Shopping shorts/catalog_products and catalog RPCs.
create table if not exists public.amazon_products (
 id text primary key check(id='temu-offer' or id ~ '^link-[a-f0-9-]{36}$'),
 title text not null check(length(title) between 1 and 80),
 description text not null default '' check(length(description)<=160),
 url text not null check(length(url)<=2048 and url like 'https://%'),
 image text not null default '' check(length(image)<=2048 and (image='' or image like 'https://%')),
 position integer not null default 0,
 updated_at timestamptz not null default now()
);
create table if not exists public.amazon_promotions (
 product_id text primary key references public.amazon_products(id) on delete cascade,
 offer_type text not null default 'general' check(offer_type in ('general','promo-code','clip-coupon')),
 promo_code text not null default '' check(length(promo_code)<=80),
 sale_info text not null default '' check(length(sale_info)<=300),
 updated_at timestamptz not null default now(),
 check(offer_type<>'promo-code' or length(trim(promo_code))>0)
);
alter table public.amazon_products enable row level security;
alter table public.amazon_promotions enable row level security;
revoke all on public.amazon_products,public.amazon_promotions from public,anon,authenticated;
grant select,insert,update,delete on public.amazon_products,public.amazon_promotions to service_role;

-- Move legacy Amazon records, retaining IDs, URLs and click history.
insert into public.amazon_products(id,title,description,url,image,position)
select item->>'id',item->>'title',coalesce(item->>'description',''),item->>'url',coalesce(item->>'image',''),ord::integer
from public.store_app_settings s cross join lateral jsonb_array_elements(coalesce(s.links,'[]')) with ordinality as x(item,ord)
where item->>'store'='Amazon' on conflict(id) do nothing;
insert into public.amazon_promotions(product_id,offer_type,promo_code,sale_info)
select item->>'id',coalesce(item->>'offerType','general'),coalesce(item->>'promoCode',''),coalesce(item->>'saleInfo','')
from public.store_app_settings s cross join lateral jsonb_array_elements(coalesce(s.links,'[]')) as x(item)
where item->>'store'='Amazon' on conflict(product_id) do nothing;
update public.store_app_settings s set links=(select coalesce(jsonb_agg(item),'[]') from jsonb_array_elements(s.links) x(item) where item->>'store'<>'Amazon') where s.links is not null;

create or replace function public.promotion_links_snapshot() returns jsonb
language sql security invoker set search_path='' as $$
 select coalesce((select links from public.store_app_settings where id=1),'[]'::jsonb) ||
 coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'store','Amazon','title',p.title,'description',p.description,'url',p.url,'image',p.image,
 'offerType',coalesce(a.offer_type,'general'),'promoCode',coalesce(a.promo_code,''),'saleInfo',coalesce(a.sale_info,'')) order by p.position,p.id)
 from public.amazon_products p left join public.amazon_promotions a on a.product_id=p.id),'[]'::jsonb);
$$;
create or replace function public.promotion_links_save(p_links jsonb) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if p_links is null or jsonb_typeof(p_links)<>'array' or jsonb_array_length(p_links)>50 then raise exception 'Invalid promotion links'; end if;
 perform pg_catalog.pg_advisory_xact_lock(9272026);
 insert into public.amazon_products(id,title,description,url,image,position)
 select item->>'id',item->>'title',coalesce(item->>'description',''),item->>'url',coalesce(item->>'image',''),ord::integer
 from jsonb_array_elements(p_links) with ordinality x(item,ord) where item->>'store'='Amazon'
 on conflict(id) do update set title=excluded.title,description=excluded.description,url=excluded.url,image=excluded.image,position=excluded.position,updated_at=now();
 insert into public.amazon_promotions(product_id,offer_type,promo_code,sale_info)
 select item->>'id',coalesce(item->>'offerType','general'),coalesce(item->>'promoCode',''),coalesce(item->>'saleInfo','')
 from jsonb_array_elements(p_links) x(item) where item->>'store'='Amazon'
 on conflict(product_id) do update set offer_type=excluded.offer_type,promo_code=excluded.promo_code,sale_info=excluded.sale_info,updated_at=now();
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
