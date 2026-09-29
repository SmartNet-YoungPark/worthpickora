"""Read public Amazon coupon pages, verify individual offers, rank per category.
Publishes verified search results atomically; --dry-run only generates files.
"""
import argparse
import concurrent.futures
import datetime
import html
import json
import os
import re
import urllib.parse
import urllib.request
import urllib.error
import uuid
from pathlib import Path

AMAZON_TRACKING_ID = "smartnetweb0a-20"


def affiliate_url(value):
    url = urllib.parse.urlsplit(value)
    if url.scheme != "https" or url.hostname not in ("amazon.com", "www.amazon.com"):
        return value
    query = [(k,v) for k,v in urllib.parse.parse_qsl(url.query,keep_blank_values=True) if k != "tag"]
    query.append(("tag",AMAZON_TRACKING_ID))
    return urllib.parse.urlunsplit(url._replace(query=urllib.parse.urlencode(query)))


CATEGORIES = {
    'gl_drugstore': 'Health & Household', 'gl_beauty': 'Beauty & Personal Care',
    'gl_luxury_beauty': 'Beauty & Personal Care', 'gl_personal_care_appliances': 'Beauty & Personal Care',
    'gl_electronics': 'Electronics & Tech', 'gl_pc': 'Electronics & Tech',
    'gl_wireless': 'Electronics & Tech', 'gl_home_entertainment': 'Electronics & Tech',
    'gl_home': 'Home & Kitchen', 'gl_kitchen': 'Home & Kitchen',
    'gl_automotive': 'Automotive', 'gl_shoes': 'Clothing, Shoes & Jewelry',
    'gl_apparel': 'Clothing, Shoes & Jewelry', 'gl_jewelry': 'Clothing, Shoes & Jewelry',
    'gl_sports': 'Sports & Outdoors', 'gl_toy': 'Toys & Games',
    'gl_pet_products': 'Pet Supplies', 'gl_home_improvement': 'Tools & Home Improvement',
    'gl_tools': 'Tools & Home Improvement', 'gl_baby_product': 'Baby',
    'gl_office_product': 'Office Products', 'gl_grocery': 'Grocery',
}

def fetch(url):
    with urllib.request.urlopen(url, timeout=15) as response:
        return response.read().decode('utf-8', errors='replace')

def category(product):
    return CATEGORIES.get(product.get('productCategory', {}).get('symbol'), '')

def verify(product):
    asin = product['asin']
    url = 'https://www.amazon.com/dp/' + asin
    try:
        source = fetch(url)
        title = re.search(r'<span[^>]*id="productTitle"[^>]*>(.*?)</span>', source, re.S)
        image = re.search(r'<img[^>]*id="landingImage"[^>]*>', source, re.S)
        if not title or not image:
            raise ValueError('Product title or main image not available')
        image_url = re.search(r'\bsrc="([^"]+)"', image.group(0))
        if not image_url:
            raise ValueError('Main image URL missing')
        # Read only the main product area, excluding recommendations and scripts.
        main = source[title.start():]
        boundary = re.search(r'id="(?:feature-bullets|detailBullets|similarities|customerReviews)', main)
        if boundary:
            main = main[:boundary.start()]
        main = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', main, flags=re.S | re.I)
        text = re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', ' ', main)))
        rates = set(re.findall(r'(?:Apply|Clip|Save)\s+(\d+(?:\.\d+)?)%\s+coupon\b', text, re.I))
        if len(rates) != 1:
            raise ValueError('Current coupon percentage missing or ambiguous')
        rate = float(next(iter(rates)))
        if not 0 < rate <= 100:
            raise ValueError('Invalid coupon percentage')
        picture = html.unescape(image_url.group(1))
        if urllib.parse.urlparse(picture).hostname != 'm.media-amazon.com':
            raise ValueError('Unrecognized product image host')
        with urllib.request.urlopen(picture, timeout=15) as response:
            if not response.headers.get_content_type().startswith('image/'):
                raise ValueError('Product image could not be verified')
            response.read(32)
        name = html.unescape(re.sub('<[^>]+>', '', title.group(1))).strip()
        name = name if len(name) <= 80 else name[:77].rsplit(' ', 1)[0] + '...'
        checked = datetime.datetime.now(datetime.timezone.utc).isoformat()
        description = f'{rate:g}% coupon. Select the coupon on Amazon. Eligibility and selected variant may affect the offer; check checkout terms.'
        return dict(id='link-' + str(uuid.uuid5(uuid.NAMESPACE_URL, url)), asin=asin,
                    title=name, category=category(product), url=affiliate_url(url), image=picture,
                    description=description[:160], saleInfo=description, discountPercent=rate,
                    offerType='clip-coupon', verifiedAt=checked)
    except Exception as error:
        return dict(asin=asin, excluded=str(error), fetchError=isinstance(error,(urllib.error.URLError,TimeoutError,ConnectionError)))

def top_by_category(rows):
    groups = {}
    for row in rows:
        if 'excluded' not in row and row.get('category'):
            groups.setdefault(row['category'], []).append(row)
    return {name: sorted(items, key=lambda x: (-x['discountPercent'], x['asin']))[:30]
            for name, items in sorted(groups.items())}

def make_sql(rows, selected_category=None):
    rows = [{**row,"url":affiliate_url(row["url"])} for row in rows]
    payload = json.dumps(rows, ensure_ascii=True).replace("'", "''")
    scope = "null" if selected_category is None else "'" + selected_category.replace("'", "''") + "'"
    return "select public.replace_coupon_results('" + payload + "'::jsonb," + scope + ");\n"


def publish(rows, selected_category=None):
    url = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    key = os.environ.get('SUPABASE_SECRET_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not url or not key:
        raise RuntimeError('Supabase server credentials are not configured. No database changes made. Use the generated SQL through the authenticated Supabase MCP connection.')
    headers = {'apikey': key, 'Content-Type': 'application/json'}
    if not key.startswith('sb_secret_'):
        headers['Authorization'] = 'Bearer ' + key
    rows = [{**row,'url':affiliate_url(row['url'])} for row in rows]
    body = json.dumps({'p_products': rows, 'p_category': selected_category}).encode()
    request = urllib.request.Request(url.rstrip('/')+'/rest/v1/rpc/replace_coupon_results', data=body, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return json.load(response)
    except Exception:
        raise RuntimeError('Publication was not confirmed. Check the database before retrying; no automatic retry was attempted.') from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--category', default='all', help='Exact category name or all')
    parser.add_argument('--pages', type=int, default=10, help='Number of 30-item result pages to inspect')
    parser.add_argument('--output', default='.data/coupon-top30')
    parser.add_argument('--list-categories', action='store_true')
    parser.add_argument('--dry-run', action='store_true', help='Generate files without resetting or publishing')
    args = parser.parse_args()
    if args.list_categories:
        print('\n'.join(sorted(set(CATEGORIES.values())))); return
    if args.category != 'all' and args.category not in CATEGORIES.values():
        parser.error('Unknown category; use --list-categories')
    if not 1 <= args.pages <= 100:
        parser.error('--pages must be 1..100')
    candidates, errors, pages = {}, [], 0
    for page in range(args.pages):
        url = 'https://www.amazon.com/deals?' + urllib.parse.urlencode({
            'bubble-id': 'deals-collection-coupons', 'promotionsSearchStartIndex': page*30,
            'promotionsSearchPageSize': 30})
        try:
            source = fetch(url); marker = '"productSearchResponse":'
            response = json.JSONDecoder().raw_decode(source.split(marker, 1)[1])[0]
            if response.get('startIndex') != page*30:
                raise ValueError('Amazon did not return the requested page')
            products = response['products']; pages += 1
            if not products: break
            before = len(candidates)
            for product in products:
                if re.fullmatch(r'[A-Z0-9]{10}', product.get('asin', '')):
                    candidates[product['asin']] = product
            print(f'Page {page+1}: {len(products)} products; {len(candidates)} unique candidates', flush=True)
            if len(candidates) == before: break
        except Exception as error:
            errors.append(dict(page=page+1, error=str(error))); break
    selected = [p for p in candidates.values() if category(p) and (args.category=='all' or category(p)==args.category)]
    rows = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for index, row in enumerate(pool.map(verify, selected), 1):
            rows.append(row)
            if index % 10 == 0: print(f'Verified {index}/{len(selected)} product pages', flush=True)
    groups = top_by_category(rows)
    report = dict(checkedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  scope='Top 30 per category within scanned and verified products; not all Amazon offers',
                  pagesRequested=args.pages, pagesRead=pages, candidates=len(candidates),
                  productPagesChecked=len(rows), errors=errors,
                  excluded=[r for r in rows if 'excluded' in r], groups=groups)
    output = Path(args.output); output.parent.mkdir(parents=True, exist_ok=True)
    output.with_suffix('.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    published_rows = [r for items in groups.values() for r in items]
    scope = None if args.category == 'all' else args.category
    # A listing error, missing page or zero verified results must never erase the old catalog.
    if errors or any(row.get('fetchError') for row in rows) or not published_rows:
        output.with_suffix('.sql').write_text('-- Search incomplete or empty: publication blocked. Existing products preserved.\n', encoding='utf-8')
        raise RuntimeError('Search incomplete or no verified results. Existing Supabase products preserved.')
    output.with_suffix('.sql').write_text(make_sql(published_rows, scope), encoding='utf-8')
    print(json.dumps({name:len(items) for name,items in groups.items()}), flush=True)
    print(f'Report: {output.with_suffix(".json")}; SQL: {output.with_suffix(".sql")}', flush=True)
    if not args.dry_run:
        print(json.dumps(publish(published_rows, scope)), flush=True)

if __name__ == '__main__':
    main()
