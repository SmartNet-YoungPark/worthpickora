begin;
-- Shared catalog for promotions only; Shopping shorts public.products is untouched.
create sequence public.deal_product_code_seq;
alter table public.deal_products
 add column product_code text not null default ('PRD-' || lpad(nextval('public.deal_product_code_seq')::text,10,'0')) unique,
 add column brand text,
 add column manufacturer text;

create sequence public.deal_variant_code_seq;
create table public.deal_product_variants (
 id uuid primary key default gen_random_uuid(),
 product_id text not null references public.deal_products(id) on delete cascade,
 variant_code text not null unique default ('VAR-' || lpad(nextval('public.deal_variant_code_seq')::text,10,'0')),
 label text not null check (length(trim(label))>0),
 model_number text,
 flavour text,
 colour text,
 size_label text,
 pack_count integer check(pack_count>0),
 -- Net content PER inner package, not packaging/shipping weight.
 unit_net_weight_g numeric(14,4) check(unit_net_weight_g>0),
 unit_net_volume_ml numeric(14,4) check(unit_net_volume_ml>0),
 unit_item_count integer check(unit_item_count>0),
 total_net_weight_g numeric generated always as (pack_count*unit_net_weight_g) stored,
 total_net_volume_ml numeric generated always as (pack_count*unit_net_volume_ml) stored,
 total_item_count bigint generated always as (pack_count::bigint*unit_item_count::bigint) stored,
 length_mm numeric(14,4) check(length_mm>0),
 width_mm numeric(14,4) check(width_mm>0),
 height_mm numeric(14,4) check(height_mm>0),
 dimension_scope text check(dimension_scope in ('item','retail_package')),
 comparison_basis text check(comparison_basis in ('mass','volume','count')),
 attributes jsonb not null default '{}' check(jsonb_typeof(attributes)='object'),
 verification_status text not null default 'unverified' check(verification_status in ('unverified','verified')),
 verification_source_url text,
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(product_id,id),
 check(verification_status<>'verified' or (verified_at is not null and nullif(trim(verification_source_url),'') is not null)),
 check((length_mm is null and width_mm is null and height_mm is null) or dimension_scope is not null)
);
create index deal_product_variants_product_idx on public.deal_product_variants(product_id);

-- GTIN is stored as a 14-digit string; retain leading zeroes.
create function public.valid_gtin14(value text) returns boolean
language plpgsql immutable strict set search_path='' as $$
declare total integer:=0; i integer;
begin
 if value !~ '^[0-9]{14}$' or value='00000000000000' then return false; end if;
 for i in 1..13 loop
  total:=total+substring(value,i,1)::integer*case when i%2=1 then 3 else 1 end;
 end loop;
 return ((10-total%10)%10)=substring(value,14,1)::integer;
end;$$;
create table public.deal_variant_gtins (
 gtin14 text primary key check(public.valid_gtin14(gtin14)),
 variant_id uuid not null references public.deal_product_variants(id) on delete cascade,
 source_url text not null check(length(trim(source_url))>0),
 verified_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index deal_variant_gtins_variant_idx on public.deal_variant_gtins(variant_id);

alter table public.marketplace_offers
 add column variant_id uuid,
 add column store_product_code text,
 add column seller_name text,
 add column store_location_code text,
 add column region text,
 add column sales_channel text not null default 'unknown' check(sales_channel in ('online','in_store','both','unknown')),
 add column price_basis text not null default 'unknown' check(price_basis in ('package','each','kg','lb','100g','litre','100ml','unknown')),
 add column variant_match_status text not null default 'unverified' check(variant_match_status in ('unverified','verified')),
 add column variant_match_source_url text,
 add column variant_matched_at timestamptz,
 add column offer_attributes jsonb not null default '{}' check(jsonb_typeof(offer_attributes)='object'),
 add constraint marketplace_offers_variant_fk foreign key(product_id,variant_id) references public.deal_product_variants(product_id,id),
 add constraint marketplace_offers_verified_variant_check check(variant_match_status<>'verified' or (variant_id is not null and variant_matched_at is not null and nullif(trim(variant_match_source_url),'') is not null));
create index marketplace_offers_variant_idx on public.marketplace_offers(variant_id,market,currency);
create index marketplace_offers_store_code_idx on public.marketplace_offers(store,market,store_product_code);
-- No automatic backfill of store codes or variants: flyer group IDs are not UPCs.
-- Leave existing offers unverified rather than matching by title.

-- Prevent stale identity verification after an editor changes an offer's product.
create function public.invalidate_offer_variant_match() returns trigger language plpgsql set search_path='' as $$
begin
 if row(new.variant_id,new.product_id,new.store,new.market,new.asin,new.product_url,new.store_product_code)
    is distinct from row(old.variant_id,old.product_id,old.store,old.market,old.asin,old.product_url,old.store_product_code) then
  new.variant_match_status:='unverified';new.variant_matched_at:=null;new.variant_match_source_url:=null;
  if new.product_id is distinct from old.product_id then new.variant_id:=null; end if;
 end if;
 return new;
end;$$;
create trigger invalidate_offer_variant_match before update on public.marketplace_offers
 for each row execute function public.invalidate_offer_variant_match();
create function public.touch_deal_variant() returns trigger language plpgsql set search_path='' as $$
begin
 new.updated_at:=now();
 if row(new.product_id,new.model_number,new.flavour,new.colour,new.size_label,new.pack_count,new.unit_net_weight_g,new.unit_net_volume_ml,new.unit_item_count,new.length_mm,new.width_mm,new.height_mm,new.dimension_scope,new.comparison_basis,new.attributes)
    is distinct from row(old.product_id,old.model_number,old.flavour,old.colour,old.size_label,old.pack_count,old.unit_net_weight_g,old.unit_net_volume_ml,old.unit_item_count,old.length_mm,old.width_mm,old.height_mm,old.dimension_scope,old.comparison_basis,old.attributes) then
  new.verification_status:='unverified';new.verified_at:=null;
 end if;
 return new;
end;$$;
create trigger touch_deal_variant before update on public.deal_product_variants
 for each row execute function public.touch_deal_variant();

create view public.promotion_product_comparison with (security_invoker=true) as
select d.product_code,d.name as product_name,d.brand,v.variant_code,v.id as variant_id,
 v.label as variant_label,v.flavour,v.colour,v.model_number,v.size_label,
 v.pack_count,v.unit_net_weight_g,v.unit_net_volume_ml,v.unit_item_count,
 v.total_net_weight_g,v.total_net_volume_ml,v.total_item_count,
 o.id as offer_id,o.store,o.market,o.currency,o.store_product_code,o.seller_name,o.store_location_code,o.region,o.sales_channel,
 o.price_basis,o.product_url,o.affiliate_url,
 p.regular_price,p.sale_price,p.promotion_type,p.raw_promotion_text,p.promo_code,
 p.discount_amount,p.discount_percent,p.start_at,p.end_at,p.end_on,p.status as promotion_status,p.last_verified_at,
 (v.verification_status='verified' and o.variant_match_status='verified') as identity_verified,
 -- Selling price only. Coupons, membership, tax, shipping and deposits are not assumed included.
 case when v.verification_status='verified' and o.variant_match_status='verified' and p.status='confirmed' then
  case
   when v.comparison_basis='mass' then case o.price_basis
    when 'package' then p.sale_price*100/nullif(v.total_net_weight_g,0)
    when 'kg' then p.sale_price/10
    when 'lb' then p.sale_price*100/453.59237
    when '100g' then p.sale_price end
   when v.comparison_basis='volume' then case o.price_basis
    when 'package' then p.sale_price*100/nullif(v.total_net_volume_ml,0)
    when 'litre' then p.sale_price/10
    when '100ml' then p.sale_price end
   when v.comparison_basis='count' then case o.price_basis
    when 'package' then p.sale_price/nullif(v.total_item_count,0)
    when 'each' then p.sale_price end
  end
 end as selling_price_per_unit,
 case v.comparison_basis when 'mass' then '100g' when 'volume' then '100mL' when 'count' then 'each' end as comparison_unit
from public.marketplace_offers o join public.deal_products d on d.id=o.product_id
left join public.deal_product_variants v on v.id=o.variant_id
left join public.promotions p on p.id=o.id;

alter table public.deal_product_variants enable row level security;
alter table public.deal_variant_gtins enable row level security;
revoke all on public.deal_product_variants,public.deal_variant_gtins,public.promotion_product_comparison from public,anon,authenticated;
revoke all on sequence public.deal_product_code_seq,public.deal_variant_code_seq from public,anon,authenticated;
revoke all on function public.valid_gtin14(text) from public,anon,authenticated;
grant all on public.deal_product_variants,public.deal_variant_gtins to service_role;
grant select on public.promotion_product_comparison to service_role;
grant usage,select on sequence public.deal_product_code_seq,public.deal_variant_code_seq to service_role;
grant execute on function public.valid_gtin14(text) to service_role;
notify pgrst, 'reload schema';
commit;
