-- Apply after 20260928010000_promotion_types.sql. Manually observed coupon collection.
-- Only products with confirmed coupon rates, images and product URLs are included.
-- No automatic refresh. No affiliate tags supplied.
-- Adds products without changing existing records or the Shopping shorts catalog.
begin;
do $seed$
declare item jsonb; product_key text;
begin
 perform pg_catalog.pg_advisory_xact_lock(9272026);
 for item in select value from jsonb_array_elements($products$[
  {
    "id": "link-79316312-0d6d-561f-8b7b-4db7e560fe53",
    "asin": "B09RKDGYJD",
    "title": "Biotin, Collagen & Keratin + Full B-Complex - Hair Growth Support - 60 Caps",
    "description": "Observed 15% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B09RKDGYJD",
    "image": "https://m.media-amazon.com/images/I/81ImSzG9ZfL._AC_SY300_SX300_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 15% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 15.0
  },
  {
    "id": "link-54476993-b7ae-54fd-a884-7e59a7fe5f3c",
    "asin": "B0DSW7R4VN",
    "title": "WOLFBOX MegaFlow 50 Compressed Air Duster, 110,000 RPM, 3-Gear Adjustable",
    "description": "Observed 15% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B0DSW7R4VN",
    "image": "https://m.media-amazon.com/images/I/713BEhBxXWL._AC_SY300_SX300_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 15% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 15.0
  },
  {
    "id": "link-72158d0e-3988-5db7-910c-f38d1497680f",
    "asin": "B0FFN1RJ8V",
    "title": "Momcozy KleanPal Pro All-in-One Bottle Washer, Sterilizer & Dryer - Matte",
    "description": "Observed 10% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B0FFN1RJ8V",
    "image": "https://m.media-amazon.com/images/I/61L5DS9KzvL._AC_SX342_SY445_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 10% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 10.0
  },
  {
    "id": "link-4e02297c-4a7e-5245-9791-601f40450d4b",
    "asin": "B0FMD8Z8K2",
    "title": "Car Battery Jump Starter with Air Compressor 4500A 150PSI, Car Jumper...",
    "description": "Observed 42% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B0FMD8Z8K2",
    "image": "https://m.media-amazon.com/images/I/718AM2Oh-FL._AC_SY300_SX300_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 42% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 42.0
  },
  {
    "id": "link-85f5795a-34ff-51a6-adc4-309cfb8ad8cd",
    "asin": "B0GHRFCH1Y",
    "title": "GROWNSY 5-in-1 Baby Bassinet Bedside Sleeper with Gentle Manual Rocking",
    "description": "Observed 5% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B0GHRFCH1Y",
    "image": "https://m.media-amazon.com/images/I/81GuL9OUk7L._AC_SY300_SX300_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 5% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 5.0
  },
  {
    "id": "link-bee04479-aecd-5f9f-aa08-7b099eb80d86",
    "asin": "B003PWNH4Q",
    "title": "SafeRest Waterproof Queen Size Mattress Protector",
    "description": "Observed 30% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B003PWNH4Q",
    "image": "https://m.media-amazon.com/images/I/71zChhoCxsL._AC_SY300_SX300_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 30% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 30.0
  },
  {
    "id": "link-4ab88b5b-1db5-5bda-8254-e374a67d45ba",
    "asin": "B0D5SBPDBW",
    "title": "10X Health Methylated Multivitamin - 90 Capsules",
    "description": "Observed 15% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B0D5SBPDBW",
    "image": "https://m.media-amazon.com/images/I/81ulJtCPS9L._AC_SY300_SX300_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 15% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 15.0
  },
  {
    "id": "link-f335df4e-5331-579a-858c-6ec294004172",
    "asin": "B095T14D4S",
    "title": "Raycon Everyday Bluetooth Wireless Earbuds with Microphone - Active Noise...",
    "description": "Observed 20% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B095T14D4S",
    "image": "https://m.media-amazon.com/images/I/61FlBGir-lL._AC_SY300_SX300_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 20% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 20.0
  },
  {
    "id": "link-f23af136-385c-5ff6-b515-f103b6e8f7a9",
    "asin": "B0CYT7XGVP",
    "title": "Ceylon Cinnamon Capsules - Energy Heart & Metabolism Support - 60 Capsules",
    "description": "Observed 10% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B0CYT7XGVP",
    "image": "https://m.media-amazon.com/images/I/71I86MW-33L._AC_SY300_SX300_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 10% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 10.0
  },
  {
    "id": "link-c176f1cb-26c4-56c1-b633-1d8c0ee5d392",
    "asin": "B0BS6G9WG6",
    "title": "KIDMI Genuine Suede Clogs for Women Men Cork Footbed Mules Potato Shoes",
    "description": "Observed 5% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B0BS6G9WG6",
    "image": "https://m.media-amazon.com/images/I/81zCzavhSUL._AC_SY395_SX395_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 5% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 5.0
  },
  {
    "id": "link-790f0b79-047f-5421-9c80-14314435f1ed",
    "asin": "B00RH5K26I",
    "title": "Zenwise Health Digestive Enzymes, Probiotics, for Gut Health Bloat - 180 CT",
    "description": "Observed 20% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B00RH5K26I",
    "image": "https://m.media-amazon.com/images/I/71l0EHI0T-L._AC_SY300_SX300_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 20% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 20.0
  },
  {
    "id": "link-5882b66b-2d2d-5f5b-9e39-e81832d9d56b",
    "asin": "B09VZ11WHK",
    "title": "Purriko Refrigerator Deodorizer,Long-Lasting Fridge Odor Eliminator",
    "description": "Observed 10% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B09VZ11WHK",
    "image": "https://m.media-amazon.com/images/I/71Yk6yF+UsL._AC_SY300_SX300_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 10% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 10.0
  },
  {
    "id": "link-b34669dc-dd93-57ed-909e-b3a1ae739e93",
    "asin": "B09YH1L75X",
    "title": "OLOV Electric Body Hair Trimmer - Groin Trimmer for Men - Bikini Trimmer...",
    "description": "Observed 15% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B09YH1L75X",
    "image": "https://m.media-amazon.com/images/I/514WuS5ldsL._AC_SY300_SX300_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 15% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 15.0
  },
  {
    "id": "link-a94b1b2b-c5d8-5eb6-b2ab-188b0bba2bf4",
    "asin": "B07T7W7VR3",
    "title": "QUTOOL Cooling Pillow for Sleeping, CertiPUR-US Shredded Memory Foam Queen...",
    "description": "Observed 24% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B07T7W7VR3",
    "image": "https://m.media-amazon.com/images/I/81dhAxMgUTL._AC_SY300_SX300_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 24% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 24.0
  },
  {
    "id": "link-ccc47b64-5873-5360-ab36-0e39bd0553b9",
    "asin": "B0H93MFZ34",
    "title": "Mini Projector with WiFi 6 and BT 5.4, Built-in Apps 2026 Upgraded",
    "description": "Observed 15% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B0H93MFZ34",
    "image": "https://m.media-amazon.com/images/I/710P5nNQH9L._AC_SY300_SX300_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 15% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 15.0
  },
  {
    "id": "link-9ad82711-cb24-592d-b096-2ea76a04306e",
    "asin": "B0GSV5Q5R6",
    "title": "occiam Active Noise Cancelling Earbuds Wireless Bluetooth Headphones",
    "description": "Observed 50% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "url": "https://www.amazon.com/dp/B0GSV5Q5R6",
    "image": "https://m.media-amazon.com/images/I/81wujM636GL._AC_SY300_SX300_QL70_ML2_.jpg",
    "offerType": "clip-coupon",
    "saleInfo": "Observed 50% clip coupon. Select the coupon on Amazon. Eligibility, variant and offer terms may vary. Check the current price and coupon at checkout.",
    "discountPercent": 50.0
  }
]$products$::jsonb) loop
  select id into product_key from public.amazon_products where url like '%'||(item->>'asin')||'%' order by id limit 1;
  product_key:=coalesce(product_key,item->>'id');
  insert into public.amazon_products(id,title,description,url,image,position)
  values(product_key,item->>'title',item->>'description',item->>'url',item->>'image',(select coalesce(max(position),0)+1 from public.amazon_products)) on conflict(id) do nothing;
  insert into public.amazon_promotions(product_id,offer_type,sale_info,discount_percent)
  values(product_key,'clip-coupon',item->>'saleInfo',(item->>'discountPercent')::numeric) on conflict(product_id) do nothing;
 end loop;
end;
$seed$;
commit;
