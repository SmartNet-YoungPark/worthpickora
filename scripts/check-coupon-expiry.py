"""Read expiry dates from the current product's coupon Terms, never other offers."""
import concurrent.futures,datetime,html,json,re,urllib.request,urllib.parse
from pathlib import Path

def fetch(url):
    with urllib.request.urlopen(url,timeout=20) as r:return r.read().decode('utf-8','replace')

def check(row):
    url=row['url'].split('?')[0]
    result={'id':row['id'],'url':url,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        s=fetch(url)
        links=[]
        # Restrict Terms to the coupon label; price reductions and checkout offers are separate.
        for m in re.finditer(r'<span[^>]*id="couponText[^>]*>',s):
            block=s[m.end():m.end()+2500]
            link=re.search(r'/promotion/details/popup/[^"<>\s]+',html.unescape(block))
            if link:links.append(urllib.parse.urljoin(url,link.group(0)))
        links=list(dict.fromkeys(links))
        if len(links)!=1:raise ValueError('No unique coupon Terms link')
        terms=fetch(links[0]);result['termsUrl']=links[0]
        values=set(re.findall(r'"EXPIRATION"\s*:\s*"([^"\n]+)"',terms))
        if len(values)!=1:raise ValueError('No unique coupon expiry text')
        value=next(iter(values));result['expiryText']=value
        date=re.search(r'([A-Za-z]+ \d{1,2}, \d{4})',value)
        if not date:raise ValueError('Unrecognized date format')
        result['expiresOn']=datetime.datetime.strptime(date.group(1),'%B %d, %Y').date().isoformat()
        result['timeZoneProvided']=False
    except Exception as e:result['error']=str(e)
    return result

if __name__=='__main__':
    rows=json.loads(Path('.data/expiry-products.json').read_text(encoding='utf-8'))
    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for i,row in enumerate(pool.map(check,rows),1):
            results.append(row)
            if i%20==0:print(f'Checked {i}/{len(rows)}',flush=True)
    Path('.data/coupon-expiry-report.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    print(json.dumps({'checked':len(results),'withDate':sum('expiresOn' in r for r in results),'errors':sum('error' in r for r in results)}))
