-- Apply AFTER 20260928010000_promotion_types.sql.
-- Offer from user screenshot, not a live price feed. URL has no affiliate tag.
begin;
do $$
declare product_key text;
begin
 perform pg_catalog.pg_advisory_xact_lock(9272026);
 select id into product_key from public.amazon_products where url like '%B0FHJ7G4WF%' order by id limit 1;
 product_key:=coalesce(product_key,'link-03fb2878-dc88-4cad-98c6-e1ae5d90a7d8');
 insert into public.amazon_products(id,title,description,url,image,position)
 values(product_key,'Raycon Essential Open Ear Earbuds (Black)','Open-ear wireless earbuds with a lightweight design and up to 36 hours of battery life.','https://www.amazon.com/dp/B0FHJ7G4WF?th=1','https://m.media-amazon.com/images/I/71R7VWJ1%2B3L._AC_SY300_SX300_QL70_ML2_.jpg',
 (select coalesce(max(position),0)+1 from public.amazon_products)) on conflict(id) do nothing;
 insert into public.amazon_promotions(product_id,offer_type,sale_info,discount_percent)
 values(product_key,'clip-coupon','Screenshot offer: $79.99 with a 20% clip coupon. Select the coupon on Amazon; approximately $63.99 before tax/shipping if eligible. Black variant. Check coupon terms and the final price at checkout; offers may change.',20)
 on conflict(product_id) do nothing;
end;
$$;
commit;
