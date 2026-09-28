-- Apply AFTER 20260927010000_amazon_promotions.sql.
-- User-provided screenshot; not a live Amazon price feed. No personal shipping data.
begin;
do $$
declare product_key text;
begin
 select id into product_key from public.amazon_products where url like '%B0F3GYMWG5%' order by id limit 1;
 product_key:=coalesce(product_key,'link-78d51a1d-d2d4-451b-b567-64b26d10cb80');
 insert into public.amazon_products(id,title,description,url,image,position)
 values(product_key,'Tineco Floor ONE i5 Stretch Wet Dry Vacuum Cleaner',
 'Wet and dry floor cleaner with a 180-degree lay-flat design.',
 'https://www.amazon.com/dp/B0F3GYMWG5?th=1',
 'https://m.media-amazon.com/images/I/61L+f7jvShL._AC_SY450_.jpg',
 (select coalesce(max(position),0)+1 from public.amazon_products)) on conflict(id) do nothing;
 insert into public.amazon_promotions(product_id,offer_type,sale_info)
 values(product_key,'clip-coupon','Screenshot offer: $239 (20% off the $299 list price). Select the $40 coupon on Amazon: $199 before tax/shipping if eligible. Applies to Floor One i5 Stretch. Check coupon terms and the final price at checkout; offers may change.')
 on conflict(product_id) do nothing;
end;
$$;
commit;
