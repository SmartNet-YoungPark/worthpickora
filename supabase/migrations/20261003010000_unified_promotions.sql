begin;
-- Separate from Shopping shorts public.products. A product has any number of marketplace offers.
create table public.deal_products(id text primary key,name text not null,image_url text,category text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.marketplace_offers(
 id text primary key,product_id text not null references public.deal_products(id),store text not null,market text not null check(market in ('US','CA')),currency text not null check(currency in ('USD','CAD')),
 asin text,product_url text not null,affiliate_url text not null,tracking_id text,position integer not null default 0,updated_at timestamptz not null default now(),
 check((market='US' and currency='USD') or (market='CA' and currency='CAD'))
);
create table public.promotions(
 id text primary key references public.marketplace_offers(id) on delete cascade,
 promotion_type text not null default 'general',promotion_title text,promotion_description text,raw_promotion_text text,
 regular_price numeric(12,2) check(regular_price>=0),sale_price numeric(12,2) check(sale_price>=0),discount_percent numeric(5,2) check(discount_percent>0 and discount_percent<=100),discount_amount numeric(12,2) check(discount_amount>0),
 promo_code text,new_customer_only boolean not null default false,start_at timestamptz,end_at timestamptz,end_on date,
 source_type text not null default 'manual',source_url text,terms_url text,
 status text not null default 'unknown' check(status in ('confirmed','unknown','expired')),last_verified_at timestamptz,verified_url text,verification_note text,
 metadata jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.deal_products enable row level security;
alter table public.marketplace_offers enable row level security;
alter table public.promotions enable row level security;
revoke all on public.deal_products,public.marketplace_offers,public.promotions from public,anon,authenticated;
grant all on public.deal_products,public.marketplace_offers,public.promotions to service_role;
create index marketplace_offers_market_store on public.marketplace_offers(market,store);
create index promotions_verification on public.promotions(last_verified_at);
insert into public.deal_products(id,name,image_url,category) select id,title,image,category from public.amazon_products;
insert into public.marketplace_offers(id,product_id,store,market,currency,asin,product_url,affiliate_url,position)
select id,id,'Amazon',case when url ~ '^https://(www\.)?amazon\.ca/' then 'CA' else 'US' end,case when url ~ '^https://(www\.)?amazon\.ca/' then 'CAD' else 'USD' end,substring(url from '/dp/([A-Z0-9]{10})'),split_part(url,'?',1),url,position from public.amazon_products;
insert into public.promotions(id,promotion_type,promotion_title,promotion_description,raw_promotion_text,discount_percent,promo_code,end_at,end_on,terms_url,metadata)
select p.id,coalesce(a.offer_type,'general'),p.title,p.description,a.sale_info,a.discount_percent,a.promo_code,a.expires_at,a.expires_on,a.expiry_source_url,jsonb_build_object('legacy','amazon_promotions','expiryCheckedAt',a.expiry_checked_at) from public.amazon_products p left join public.amazon_promotions a on a.product_id=p.id;
insert into public.deal_products(id,name,image_url,category)
select x->>'id',x->>'title',x->>'image',x->>'category' from public.store_app_settings s cross join lateral jsonb_array_elements(coalesce(s.links,'[]')) x where s.id=1 on conflict do nothing;
insert into public.marketplace_offers(id,product_id,store,market,currency,product_url,affiliate_url,position)
select x->>'id',x->>'id',x->>'store',coalesce(x->>'market','US'),case when x->>'market'='CA' then 'CAD' else 'USD' end,x->>'url',x->>'url',n::integer from public.store_app_settings s cross join lateral jsonb_array_elements(coalesce(s.links,'[]')) with ordinality t(x,n) where s.id=1 on conflict do nothing;
insert into public.promotions(id,promotion_type,promotion_title,promotion_description,raw_promotion_text,promo_code)
select x->>'id',coalesce(x->>'offerType','general'),x->>'title',x->>'description',coalesce(x->>'saleInfo',x->>'description'),x->>'promoCode' from public.store_app_settings s cross join lateral jsonb_array_elements(coalesce(s.links,'[]')) x where s.id=1 on conflict do nothing;
create function public.normalize_offer_tracking() returns trigger language plpgsql set search_path='' as $$
declare tag text; base text;
begin
 if new.store='Amazon' and new.affiliate_url ~ '^https://(www\.)?amazon\.(com|ca)/' then
 tag:=case when new.affiliate_url ~ '^https://(www\.)?amazon\.ca/' then 'smartnetwe06a-20' else 'smartnetweb0a-20' end;
 base:=regexp_replace(new.affiliate_url,'([?&])tag=[^&#]*',E'\\1','g');base:=replace(base,'?&','?');base:=replace(base,'&&','&');base:=rtrim(base,'?&');
 -- Normalize via URL handling in application too; fragments must remain after query parameters.
 new.affiliate_url:=rtrim(split_part(base,'#',1),'?&')||case when position('?' in rtrim(split_part(base,'#',1),'?&'))>0 then '&' else '?' end||'tag='||tag||case when position('#' in base)>0 then '#'||split_part(base,'#',2) else '' end;
 new.tracking_id:=tag;
 end if;
 return new;
end;$$;
create trigger normalize_offer_tracking before insert or update of affiliate_url on public.marketplace_offers for each row execute function public.normalize_offer_tracking();
update public.marketplace_offers set affiliate_url=affiliate_url;
create or replace function public.promotion_links_snapshot() returns jsonb language sql security invoker set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'productId',d.id,'store',o.store,'market',o.market,'currency',o.currency,'asin',o.asin,'title',d.name,'description',coalesce(p.promotion_description,''),'category',coalesce(d.category,''),'image',coalesce(d.image_url,''),'url',o.affiliate_url,'productUrl',o.product_url,'trackingId',o.tracking_id,'offerType',p.promotion_type,'discountPercent',p.discount_percent,'discountAmount',p.discount_amount,'regularPrice',p.regular_price,'salePrice',p.sale_price,'promoCode',coalesce(p.promo_code,''),'saleInfo',coalesce(p.raw_promotion_text,''),'expiresAt',p.end_at,'expiresOn',p.end_on,'termsUrl',p.terms_url,'verificationState',p.status,'verifiedAt',p.last_verified_at,'verifiedUrl',p.verified_url,'verificationNote',p.verification_note,'newCustomerOnly',p.new_customer_only,'metadata',p.metadata) order by o.position,o.id),'[]') from public.marketplace_offers o join public.deal_products d on d.id=o.product_id join public.promotions p on p.id=o.id;
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
 insert into public.promotions(id,promotion_type,promotion_title,promotion_description,raw_promotion_text,regular_price,sale_price,discount_percent,discount_amount,promo_code,end_at,terms_url,new_customer_only,metadata)
 values(x->>'id',coalesce(x->>'offerType','general'),x->>'title',coalesce(x->>'description',''),coalesce(x->>'saleInfo',''),(x->>'regularPrice')::numeric,(x->>'salePrice')::numeric,(x->>'discountPercent')::numeric,(x->>'discountAmount')::numeric,x->>'promoCode',nullif(x->>'expiresAt','')::timestamptz,x->>'termsUrl',coalesce((x->>'newCustomerOnly')::boolean,false),coalesce(x->'metadata','{}'))
 on conflict(id) do update set promotion_type=excluded.promotion_type,promotion_title=excluded.promotion_title,promotion_description=excluded.promotion_description,raw_promotion_text=excluded.raw_promotion_text,regular_price=excluded.regular_price,sale_price=excluded.sale_price,discount_percent=excluded.discount_percent,discount_amount=excluded.discount_amount,promo_code=excluded.promo_code,end_at=excluded.end_at,terms_url=excluded.terms_url,new_customer_only=excluded.new_customer_only,metadata=excluded.metadata,status='unknown',last_verified_at=null,updated_at=now();
 end loop;
 delete from public.marketplace_offers where id not in(select value->>'id' from jsonb_array_elements(p_links));
end;$$;
revoke all on function public.promotion_links_snapshot(),public.promotion_links_save(jsonb) from public,anon,authenticated;
grant execute on function public.promotion_links_snapshot(),public.promotion_links_save(jsonb) to service_role;
create or replace function public.replace_market_coupon_results(p_products jsonb,p_market text,p_category text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare kept jsonb; incoming jsonb; removed integer;
begin
 if p_market not in ('US','CA') or p_market is null or jsonb_typeof(p_products) is distinct from 'array' or jsonb_array_length(p_products)=0 or jsonb_array_length(p_products)>1000 then raise exception 'Nonempty verified marketplace results required';end if;
 if exists(select 1 from jsonb_array_elements(p_products) x where x->>'offerType' is distinct from 'clip-coupon' or coalesce(x->>'category','')='' or coalesce(x->>'title','')='' or coalesce(x->>'image','') not like 'https://m.media-amazon.com/%' or coalesce(x->>'url','') not like ('https://www.amazon.'||case p_market when 'CA' then 'ca' else 'com' end||'/dp/%') or (x->>'discountPercent' is null and trim(coalesce(x->>'saleInfo',''))='') or (p_category is not null and x->>'category'<>p_category)) then raise exception 'Unverified or wrong-market coupon';end if;
 if exists(select 1 from jsonb_array_elements(p_products) x group by x->>'category' having count(*)>30) or exists(select 1 from jsonb_array_elements(p_products) x group by x->>'id' having count(*)>1) then raise exception 'Invalid result count or duplicate ID';end if;
 perform pg_advisory_xact_lock(9272026);
 select count(*) into removed from public.marketplace_offers o join public.promotions p on p.id=o.id join public.deal_products d on d.id=o.product_id where o.store='Amazon' and o.market=p_market and p.promotion_type='clip-coupon' and (p_category is null or d.category=p_category);
 select coalesce(jsonb_agg(x),'[]') into kept from jsonb_array_elements(public.promotion_links_snapshot()) x where not(x->>'store'='Amazon' and x->>'market'=p_market and x->>'offerType'='clip-coupon' and (p_category is null or x->>'category'=p_category));
 select jsonb_agg(x||jsonb_build_object('store','Amazon','market',p_market,'currency',case p_market when 'CA' then 'CAD' else 'USD' end,'productUrl',split_part(x->>'url','?',1))) into incoming from jsonb_array_elements(p_products) x;
 perform public.promotion_links_save(kept||incoming);
 return jsonb_build_object('removed',removed,'inserted',jsonb_array_length(p_products),'market',p_market);
end;$$;
create or replace function public.replace_coupon_results(p_products jsonb,p_category text default null) returns jsonb language sql security invoker set search_path='' as $$ select public.replace_market_coupon_results(p_products,'US',p_category); $$;
revoke all on function public.replace_market_coupon_results(jsonb,text,text),public.replace_coupon_results(jsonb,text) from public,anon,authenticated;
grant execute on function public.replace_market_coupon_results(jsonb,text,text),public.replace_coupon_results(jsonb,text) to service_role;
-- Original tables remain as a read-only migration backup; only the unified tables are served.
notify pgrst,'reload schema';
commit;
