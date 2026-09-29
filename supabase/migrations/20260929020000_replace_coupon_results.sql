begin;
create or replace function public.replace_coupon_results(p_products jsonb, p_category text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare old_count integer; new_count integer;
begin
 if p_products is null or jsonb_typeof(p_products)<>'array' or jsonb_array_length(p_products)=0 or jsonb_array_length(p_products)>1000 then
  raise exception 'A nonempty verified coupon result is required';
 end if;
 if exists(select 1 from jsonb_array_elements(p_products) x where
  coalesce(x->>'offerType','')<>'clip-coupon' or coalesce(x->>'category','')='' or
  coalesce(x->>'title','')='' or coalesce(x->>'image','') not like 'https://m.media-amazon.com/%' or
  coalesce(x->>'url','') not like 'https://www.amazon.com/dp/%' or
  coalesce(jsonb_typeof(x->'discountPercent'),'')<>'number' or
  (x->>'discountPercent')::numeric<=0 or (x->>'discountPercent')::numeric>100 or
  (p_category is not null and x->>'category'<>p_category)) then
  raise exception 'Every result needs a verified category, image, URL and coupon percentage';
 end if;
 if exists(select 1 from jsonb_array_elements(p_products) x group by x->>'category' having count(*)>30) or
    exists(select 1 from jsonb_array_elements(p_products) x group by x->>'id' having count(*)>1) then
  raise exception 'Duplicate products or more than 30 products in a category';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(9272026);
 with removed as (
  delete from public.amazon_products p using public.amazon_promotions a
  where a.product_id=p.id and a.offer_type='clip-coupon' and (p_category is null or p.category=p_category)
  returning p.id
 ) select count(*) into old_count from removed;
 insert into public.amazon_products(id,title,description,url,image,category,position)
 select item->>'id',item->>'title',coalesce(item->>'description',''),item->>'url',item->>'image',item->>'category',
  (select coalesce(max(position),0) from public.amazon_products)+ord::integer
 from jsonb_array_elements(p_products) with ordinality x(item,ord);
 insert into public.amazon_promotions(product_id,offer_type,sale_info,discount_percent)
 select item->>'id','clip-coupon',coalesce(item->>'saleInfo',''),(item->>'discountPercent')::numeric
 from jsonb_array_elements(p_products) x(item);
 new_count:=jsonb_array_length(p_products);
 return jsonb_build_object('removed',old_count,'inserted',new_count,'category',p_category);
end;
$$;
revoke all on function public.replace_coupon_results(jsonb,text) from public,anon,authenticated;
grant execute on function public.replace_coupon_results(jsonb,text) to service_role;
notify pgrst,'reload schema';
commit;
