begin;
alter table public.promotions add column is_active boolean not null default true,
 add column channel text not null default 'online' check(channel in ('online','in-store','both')),
 add column source_links jsonb not null default '[]' check(jsonb_typeof(source_links)='array'),
 add column discount_basis text not null default 'explicit' check(discount_basis in ('explicit','calculated'));
alter table public.promotions add constraint promotion_period_valid check(start_at is null or end_at is null or start_at<end_at);
-- Legacy promotion titles duplicated product names, rather than offer display titles.
update public.promotions p set promotion_title='' from public.marketplace_offers o join public.deal_products d on d.id=o.product_id where p.id=o.id and p.promotion_title=d.name;
create or replace function public.promotion_links_snapshot() returns jsonb language sql security invoker set search_path='' as $$
select coalesce(jsonb_agg((jsonb_build_object('id',o.id,'productId',d.id,'store',o.store,'market',o.market,'currency',o.currency,'asin',o.asin,'title',d.name,'description',coalesce(p.promotion_description,''),'category',coalesce(d.category,''),'image',coalesce(d.image_url,''),'url',o.affiliate_url,'productUrl',o.product_url,'trackingId',o.tracking_id,'offerType',p.promotion_type,'discountPercent',p.discount_percent,'discountAmount',p.discount_amount,'regularPrice',p.regular_price,'salePrice',p.sale_price,'promoCode',coalesce(p.promo_code,''),'saleInfo',coalesce(p.raw_promotion_text,''),'expiresAt',p.end_at,'expiresOn',p.end_on,'termsUrl',p.terms_url,'verificationState',p.status,'verifiedAt',p.last_verified_at,'verifiedUrl',p.verified_url,'verificationNote',p.verification_note,'newCustomerOnly',p.new_customer_only,'metadata',p.metadata)||jsonb_build_object('promotionTitle',p.promotion_title,'startsAt',p.start_at,'isActive',p.is_active,'channel',p.channel,'sourceType',p.source_type,'sourceUrl',p.source_url,'sourceLinks',p.source_links,'discountBasis',p.discount_basis)) order by o.position,o.id),'[]') from public.marketplace_offers o join public.deal_products d on d.id=o.product_id join public.promotions p on p.id=o.id;
$$;
create or replace function public.promotion_links_save(p_links jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare x jsonb; n integer:=0; pid text; m text;
begin
 if jsonb_typeof(p_links) is distinct from 'array' or jsonb_array_length(p_links)>1000 then raise exception 'Invalid links';end if;
 perform pg_advisory_xact_lock(9272026);
 for x in select value from jsonb_array_elements(p_links) loop
 n:=n+1;pid:=coalesce(nullif(x->>'productId',''),x->>'id');m:=coalesce(x->>'market',case when x->>'url' ~ '^https://(www\.)?amazon\.ca/' then 'CA' else 'US' end);
 insert into public.deal_products(id,name,image_url,category) values(pid,x->>'title',x->>'image',x->>'category') on conflict(id) do update set name=excluded.name,image_url=excluded.image_url,category=excluded.category,updated_at=now();
 insert into public.marketplace_offers(id,product_id,store,market,currency,asin,product_url,affiliate_url,tracking_id,position)
 values(x->>'id',pid,x->>'store',m,case m when 'CA' then 'CAD' else 'USD' end,x->>'asin',coalesce(nullif(x->>'productUrl',''),x->>'url'),x->>'url',x->>'trackingId',n)
 on conflict(id) do update set product_id=excluded.product_id,store=excluded.store,market=excluded.market,currency=excluded.currency,asin=excluded.asin,product_url=excluded.product_url,affiliate_url=excluded.affiliate_url,tracking_id=excluded.tracking_id,position=excluded.position,updated_at=now();
 insert into public.promotions(id,promotion_type,promotion_title,promotion_description,raw_promotion_text,regular_price,sale_price,discount_percent,discount_amount,promo_code,end_at,terms_url,new_customer_only,metadata,start_at,is_active,channel,source_type,source_url,source_links,discount_basis)
 values(x->>'id',coalesce(x->>'offerType','general'),coalesce(x->>'promotionTitle',''),coalesce(x->>'description',''),coalesce(x->>'saleInfo',''),(x->>'regularPrice')::numeric,(x->>'salePrice')::numeric,(x->>'discountPercent')::numeric,(x->>'discountAmount')::numeric,x->>'promoCode',nullif(x->>'expiresAt','')::timestamptz,x->>'termsUrl',coalesce((x->>'newCustomerOnly')::boolean,false),coalesce(x->'metadata','{}'),nullif(x->>'startsAt','')::timestamptz,coalesce((x->>'isActive')::boolean,true),coalesce(x->>'channel','online'),coalesce(x->>'sourceType','manual'),x->>'sourceUrl',coalesce(x->'sourceLinks','[]'),coalesce(x->>'discountBasis','explicit'))
 on conflict(id) do update set promotion_type=excluded.promotion_type,promotion_title=excluded.promotion_title,promotion_description=excluded.promotion_description,raw_promotion_text=excluded.raw_promotion_text,regular_price=excluded.regular_price,sale_price=excluded.sale_price,discount_percent=excluded.discount_percent,discount_amount=excluded.discount_amount,promo_code=excluded.promo_code,end_at=excluded.end_at,terms_url=excluded.terms_url,new_customer_only=excluded.new_customer_only,metadata=excluded.metadata,start_at=excluded.start_at,is_active=excluded.is_active,channel=excluded.channel,source_type=excluded.source_type,source_url=excluded.source_url,source_links=excluded.source_links,discount_basis=excluded.discount_basis,status='unknown',last_verified_at=null,updated_at=now();
 end loop;
 delete from public.marketplace_offers where id not in(select value->>'id' from jsonb_array_elements(p_links));
end;$$;
revoke all on function public.promotion_links_snapshot(),public.promotion_links_save(jsonb) from public,anon,authenticated;
grant execute on function public.promotion_links_snapshot(),public.promotion_links_save(jsonb) to service_role;

notify pgrst,'reload schema';
commit;
