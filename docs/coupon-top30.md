# Coupon discovery and category ranking

Run from the project folder:

```powershell
python scripts/find-coupon-top30.py --list-categories
python scripts/find-coupon-top30.py --category "Electronics & Tech" --pages 10
python scripts/find-coupon-top30.py --category all --pages 10
```

The script scans current public Amazon coupon result pages, deduplicates ASINs, and verifies each candidate product page and main image. Only one unambiguous current percentage coupon qualifies. Unknown categories, dollar-only coupons, inaccessible pages and missing images are excluded. No guessed discounts, proxy rotation, or CAPTCHA bypass is used.

Outputs `.data/coupon-top30.json` (verification times, errors, excluded items, category rankings) and `.data/coupon-top30.sql` (atomic replacement). After a successful search, the script publishes through `replace_coupon_results` using server-side `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) environment variables. Do not put secrets in source control. `--dry-run` skips publication. Without credentials, files are prepared but the script reports that publication was not performed; an authenticated Supabase MCP connection can execute the generated SQL. Results are the highest percentages among scanned verified products, not a guaranteed Amazon-wide top 30. `--pages` controls coverage (1?100). No scheduled refresh is configured. Amazon.com URLs use the owner-confirmed tracking ID `smartnetweb0a-20`. Product verification requests remain untagged; stored customer links carry the tag.

Apply `20260929010000_promotion_categories.sql` before deploying category-aware application code. Amazon products store their own category, independent of Shopping shorts. The admin offer editor supports category entry. The promotion page's Top 30 coupons control filters registered verified coupon percentages by category, descending, capped at 30, shown in sets of ten. The All categories option ranks across registered categories. Live discovery uses the script above; the customer page does not scrape Amazon.


## Reset behavior

Apply `20260929020000_replace_coupon_results.sql` before publishing. A search of all categories replaces all Amazon clip-coupon products; a single-category search replaces only that category's coupon products. Other promotion types, Shopping shorts and click history stay intact. Reset and insertion run in one database transaction; invalid data rolls back the reset. Empty results, listing errors or network errors block automatic publication. Coupon candidates without an unambiguous percentage are excluded. An unconfirmed HTTP response is not automatically retried; inspect the database first.

The verified September 29 report replaced 16 prior coupon products with 123 products across 11 categories. The customer-facing code still needs its normal deployment step; SQL changes do not deploy frontend code.

## Canadian coupons and non-percentage offers
Use `python scripts/find-coupon-top30.py --market CA --pages 10` for Amazon.ca. Canadian URLs use `smartnetwe06a-20`; US URLs use `smartnetweb0a-20`. Publication replaces only coupons from the selected marketplace and category.

Only product-page coupon evidence is accepted. An explicit percentage is preferred, then a coupon amount, then a short Apply/Clip coupon instruction. Canadian dollar amounts are labeled CA$. Percentage offers sort first; amount/text offers follow without inventing a comparable percentage. The UI percentage-ranking filter intentionally includes percentage offers only. `--dry-run` previews without changing products.
