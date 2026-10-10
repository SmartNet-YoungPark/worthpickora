"""Reviewed transcription of the supplied 8-14 October 2026 flyer.

Coordinates use the 813 x 2048 review render, never OCR price guesses.
Run with the source PDF as argv[1]; PyMuPDF is required only for extraction.
"""
import json, sys
from pathlib import Path
from decimal import Decimal

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tmp/pdf-tools'))
import pymupdf as fitz
doc = fitz.open(sys.argv[1])
path = ROOT / 'lib/walmart-flyer.json'
flyer = json.loads(path.read_text(encoding='utf-8'))
items = sorted((item for item in flyer['items'] if int(item['id'].split('-')[1])<=14),key=lambda item:int(item['id'].split('-')[1]))
for item in items:
    item.update(promotionType='Rollback', conditions='', pricePrefix='', sourcePages=[item['page']])
    item['imageFile'] = item['id'].replace('card-', 'product-') + '.jpg'
assets = ROOT / 'assets/admin/walmart-flyer'
seen = {(i['storeCode'], i['salePrice']): i for i in items}
coverage = {p: 0 for p in range(1, 27)}

def add(page, row, rect, kind=None):
    # code | name | size/conditions | sale price | reference price | unit
    parts = row.split('|') + [''] * 6
    code, name, size, sale, regular, unit = parts[:6]
    sale = float(sale)
    regular = float(regular) if regular else None
    coverage[page] += 1
    key = (code, sale)
    if code and key in seen:
        item = seen[key]
        if page not in item['sourcePages']: item['sourcePages'].append(page)
        return
    num = len(items) + 1
    suffix = str(num).zfill(2)
    promo = kind or ('Rollback' if regular else 'Flyer price')
    item = dict(id='card-'+suffix, storeCode=code, name=name, size=size or 'Selected varieties',
                salePrice=sale, regularPrice=regular,
                savings=float(Decimal(str(regular))-Decimal(str(sale))) if regular and regular>sale else None,
                unit=unit or 'each', page=page, sourcePages=[page], promotionType=promo,
                conditions='Online only' if promo=='Online deal' else '', pricePrefix='',
                imageFile='product-'+suffix+'.jpg')
    if promo=='From price': item['pricePrefix']='From '
    x1,y1,x2,y2=rect
    pdfpage=doc[page-1]
    clip=fitz.Rect(x1/813*pdfpage.rect.width,y1/2048*pdfpage.rect.height,x2/813*pdfpage.rect.width,y2/2048*pdfpage.rect.height)
    pdfpage.get_pixmap(matrix=fitz.Matrix(1.4,1.4),clip=clip).save(str(assets/item['imageFile']),jpg_quality=88)
    items.append(item)
    if code: seen[key]=item

def row(page,y1,y2,lines,mode='left',kind=None,xs=None):
    lines=lines.strip().split('\n')
    if xs is None: xs=[(48,395),(415,762)] if len(lines)==2 else [(48,273),(293,518),(538,763)]
    assert len(lines)==len(xs),(page,lines,xs)
    for line,(x1,x2) in zip(lines,xs):
        if mode=='left': rect=(x1,y1,x1+(x2-x1)*.61,y2)
        elif mode=='top': rect=(x1,y1,x2,y1+(y2-y1)*.62)
        elif mode=='top80': rect=(x1,y1,x2,y1+(y2-y1)*.8)
        else: rect=(x1,y1,x2,y2)
        add(page,line,rect,kind)

# Pages 1-2: the original 14 Rollback cards are retained, with missing offers added.
row(1,180,415,'''50783079|Flamingo Canada A fresh turkey|3-7 kg; sold per bird; selected stores; while quantities last|2.71||lb
51017184|Great Value hickory smoked bone-in portion ham|While quantities last|1.97||lb''','top')
row(1,440,675,'''50970591|AA Angus beef boneless cross rib roast|While quantities last|7.88||lb
51217212|Your Fresh Market coho salmon side|While quantities last|7.88||lb''','top')
add(1,'9445140|Romaine lettuce hearts|3-pack; Canada or USA|3.97',(48,817,278,1026))
row(1,1042,1256,'''30087402|Raspberries|170 g; USA or Mexico|2.44
30428331|Red or green seedless grapes|USA; No. 1 grade|2.94||lb''','top80')
add(1,'30463247|Ruffles chips|200 g; selected flavours|3.27',(48,1710,273,1860))
row(2,674,913,'''31202635|Canada Grade A or Utility frozen turkey|5-7 kg; sold per bird; selected varieties|23
50969842|Your Fresh Market potatoes or yellow onions|4.54 kg / 10 lb; Canada No. 1|3.94''')
row(2,926,1166,'''30010392|Your Fresh Market carrots|1.36 kg / 3 lb; Canada No. 1|2.44
9498347|White cauliflower or broccoli stalks|Product of Canada|2.94''','top80')
add(2,'9148356|Nestle Parlour frozen dessert|1.5 L; selected flavours|2.94',(48,1690,273,1875))

row(3,280,475,'''9275318|Campbell's broth|900 mL; selected varieties|1.47|1.97
31354686|Green Giant canned vegetables|Selected varieties and sizes|1.67|1.88''')
row(3,495,690,'''30561721|Silk plant-based beverage or Pillsbury fall cookie dough|Selected varieties and sizes|3.98|4.98
9243464|Robin Hood or Five Roses flour|2.5 kg; selected varieties|4.97|5.93
31506606|Simply Lemonade or apple / cranberry juice|Lemonade 2.25 L; juice 1.54 L|5.48|6.48''','top')
row(3,710,910,'''50297426|Christie Ritz crackers|162-180 g; selected varieties|2.48|2.78
30997524|McCain breakfast or Bistro potatoes|600-800 g; selected varieties|2.77|4.48
50438976|Tropicana orange juice|2.63 L; selected varieties|7.97|8.98''','top')
row(3,930,1135,'''30390897|Cheez-It crackers|Selected varieties and sizes|1.97|2.97
50964704|Your Fresh Market pies|Selected varieties and sizes|5.94|7.96
9126908|Chapman's frozen desserts|Sandwich novelties 12 x 120 mL or Premium 2 L|5.97|7.97''','top')
row(3,1155,1350,'''31397272|Balderson cheddar or Your Fresh Market double cream brie|Selected varieties and sizes|6.67|7.47
30814711|Great Value cooked pork back ribs|500 g|8.46''')
row(3,1370,1555,'''50982773|Great Value cola|12 x 355 mL|5.67
50130954|Kettle Brand potato chips|198 g; selected flavours|2.88''')
row(3,1575,1750,'''51069408|Purex laundry detergent|3.45-3.85 L; 85-115 loads|10.47|15.97
50147792|Bounty paper towels|8 = 16 rolls; 82 sheets per roll|16.98|21.98''')
row(3,1770,1940,'''50611357|Always or Tampax premium products|Selected varieties and sizes|10.98
50479347|Nestle minis|50-pack; selected varieties|8.47
50808580|Hershey's minis|Selected varieties and sizes|13.97''','top')

row(4,449,794,'''51038181/425|Kids' Halloween costumes|Selected styles|19.98
51038034/45402|Adults' Halloween costumes|Selected styles|19.98''','top',xs=[(48,253),(272,478)])
row(4,814,1157,'''51045291|Poseable skeleton|Halloween decor|19.98
51044056|Halloween inflatable|3.5-4 ft|22.98''','top',xs=[(48,253),(272,478)])
add(4,'51043568/5497|Halloween lawn stake lights|Selected styles|14.98',(48,1178,283,1341))
add(4,'51049911/51464/2212|Halloween plush|Selected styles|8.48',(48,1360,300,1525))
row(4,1544,1887,'''51049855|Halloween projection light|Selected styles|24.98
51049590/1|Licensed Halloween greeters|Selected styles|32.98''','top',xs=[(48,253),(272,478)])
row(5,449,731,'''51041742/4|Halloween plush|Selected styles|26.98
51043926/68944|Halloween wreaths|Selected styles|39.98''','top',xs=[(48,253),(272,478)])
add(5,'51044980|Halloween inflatable|Selected styles|59.98',(48,751,315,1034))
row(5,1053,1335,'''30423079|Frito Lay Halloween chips or treat bags|40-pack|12.97
50537009|Nestle minis|100-pack; selected varieties|18.47''','top',xs=[(48,253),(272,478)])
row(5,1354,1636,'''50784876|General Mills Fruit Roll-Ups or Gushers|Selected varieties and sizes|7.97
50825326|Goldfish Halloween crackers|24-pack|9.98''','top',xs=[(48,253),(272,478)])
row(5,1656,1938,'''51108747|Bonkers Purr Pops cat treats|5.6 g; while quantities last|1.98
30771888|Milk-Bone Dipped peanut butter crunchy biscuits|850 g|9.97|11.47''','top',xs=[(48,253),(272,478)])

row(6,448,635,'''51063442|Hans Dahi yogurt|750 g|2.27
30392192|Brar's malai paneer|375 g|4.98|5.97''')
row(6,655,843,'''30378528|Tilda basmati rice|4.54 kg|12.98|18.97
31020693|Sher durum atta flour|9.07 kg|13.22|19.27''')
row(6,864,1052,'''30369775|Verka brown sugar|4.54 kg|9.98|11.24
30090800|Brar's Desi ghee|1.6 kg|22.98|29.98''')
row(6,1073,1260,'''30175168|Redpath white sugar|2 kg|2.77
9230613|PTI besan|1.81 kg|4.88
31728900|Mazola canola or vegetable oil|1.18 L|6.97|9.97''','top')
row(6,1280,1470,'''51184642|Lactantia condensed milk|6 x 300 mL|17.97
50583448|PTI sooji|1.81 kg|4.47|4.97''')
row(6,1490,1675,'''30227767|Curry leaves|Pack|1.97
50059574|Thai green chili|Bulk|3.97||lb''')
row(6,1695,1884,'''30248168|Mint or cilantro|Bunch|1.24
50633315|Ginger or garlic|Bulk|1.97||lb''')
row(7,448,645,'''30664892|Maggi noodles|70 g|0.34|0.44
50805175|Bikaji snacks|Selected varieties|0.97''')
row(7,663,860,'''30362948|Verka para|360 g|3.14|3.77
50818424|Verka Punjabi cookies|Selected varieties|5.54|6.97''')
row(7,881,1076,'''51130429|Sitara pound or rusk cake|Selected varieties|4.97
30392188|Brar's rasmalai|Selected varieties and sizes|9.27|11.27
30555883|Wagh Bakri loose tea|907 g|9.98|12.98''','top')
row(7,1097,1290,'''50803562|Bingo Mad Angles|140 g|1.47|1.98
51082017|Fior Fiore pistachio cream|190 g|8.97''')
row(7,1312,1510,'''30965088|Brar's jalapeno and cheese samosas|624 g|5.48|6.97
30224664|Ashoka tandoori naan|15-pack; 45 oz|8.98|9.98''')
row(7,1530,1725,'''30513032|Britannia Marie Gold biscuits|150 g|0.97|1.18
50638073|Amul rasgulla or gulab jamun|1 kg; Diwali Rollback offer|5.24|5.97''')
row(7,1745,1940,'''9205321|Rubicon juice|1 L; selected varieties|1.98|2.78
50819506|Verka cream rolls|300 g|6.97''')

row(8,175,398,'''30225131|Purple sweet potato|Product of Brazil|1.87||lb
50600786|Indian red carrot|Product of China|1.98''')
add(8,'30161967|Britannia milk rusk|560 g|4.74|5.32',(48,411,275,630))
add(8,'30676314|Lijjat jeera papad|Selected varieties and sizes|2.24',(415,411,762,590))
row(8,652,882,'''30363352|Verka gurkhpur jaggery|1 kg|2.24|2.67
30338935|Senso instant cardamom chai latte mix|10-pack|5.47
50638073|Amul gulab jamun|1 kg; Navratri feature price differs from the Diwali offer|6.24''','top80')
row(8,1017,1455,'''15BGRAC79QBP|Biba Rangriti Chandrima ethnic suit|Women's set; online only|81.74|125.75
3CH12NXRX1XD|Biba Rangriti Festive Glam kurta pants set|Women's set; online only|58.19|89.53
2QZPP3C98FMH|Dweep Sara green rayon fit and flare gown|Online only|39.99|79.99''','top80',kind='Online deal')
add(8,"3CWQQRH2NTS6|Dweep Sara men's green silk blend kurta|36-inch straight fit; embroidered; side slits; online only|37.99|64.99",(48,1465,273,1825),'Online deal')
row(8,1465,1694,'''50701351|OPI RapiDry quick-dry nail lacquer|Selected colours|9.97|11.97
30797711|Garnier Nutrisse hair colour|Selected varieties|10.22|11.98''',xs=[(293,518),(538,763)])
row(8,1710,1938,'''30397223|SheaMoisture styling products, treatments or detanglers|Selected varieties and sizes|14.42
50412465|Cetaphil Healthy Radiance serum or cream|Serum 30 mL or cream 50 g|32.97''','top',xs=[(293,518),(538,763)])

row(9,175,350,'''9477011|McIntosh or Gala apples|Bulk|0.98||lb
30135245|Squash|Selected varieties|0.97||lb''')
row(9,370,545,'''50566289|Rainbow peppers|3-pack|2.98
31375329|Golden pineapple|Jumbo|3.97''')
row(9,565,745,'''50461383|Your Fresh Market basil or poultry herbs|28 g|1.67
31340494|Brussels sprouts|454 g|2.94
9481036|Green beans|Bulk|2.44||lb''','top')
row(9,765,945,'''50287873|Maple Leaf Natural Selections deli or Fantino & Mondello charcuterie|Selected varieties and sizes|5.97|6.97
31614800|Boursin cheese|150 g|4.98|6.27
30319321|Reser's side dishes|567-680 g|6.24|6.98''','top')
row(9,965,1145,'''30510909|Your Fresh Market buns or rolls|Selected varieties and sizes|3.97
50629680|Your Fresh Market butter croissants|12-pack; 696 g|5.94
51124256|Your Fresh Market loaf cakes|Selected varieties|5.24''','top')
row(9,1165,1345,'''9202389|Ocean Spray cranberry sauce|348 mL|1.57|2.77
30126312|Carnation evaporated milk|354 mL|1.74|2.47
9288032|Dole pineapple|398 mL|1.97|2.47''','top')
row(9,1365,1545,'''9255851|Club House gravy|25 g; selected varieties|0.98|1.27
9130968|Great Value whipped topping or Tenderflake deep dish shells|Topping 1 L; shells 340-397 g|2.97|3.98
50151044|Pillsbury wiener wraps or crescents|200-226 g|1.67|2.28''','top')
row(9,1565,1745,'''30263835|Montellier sparkling water|1 L|1.27|1.48
30361973|Green Giant frozen vegetables|750 g|3.47|3.97
30591085|bubly sparkling water|12 x 355 mL|6.27|6.98''','top')
row(10,508,850,'''9481904|McIntosh apples|Bulk|0.98||lb
9477053|Gala apples|Bulk|0.98||lb''','top80')
row(10,870,1211,'''31408090|Your Fresh Market Red Delicious apples|1.36 kg|3.98
9477095|Honeycrisp apples|Bulk|2.48||lb''','top80')
row(10,1235,1577,'''51070143|Your Fresh Market Rave apples|1.36 kg|4.98
30820087|Your Fresh Market apple cider|2 L|4.47''','top80')
row(10,1597,1939,'''50985989|Your Fresh Market apple turnovers|8-pack; 708 g|5.94
51024946|Your Fresh Market apple fritters|4-pack; 404 g|4.78''','top80')

row(11,175,365,'''31034407|Maple Leaf lean ground pork|454 g|4.97
30897892|Maple Leaf or Schneiders bacon / Ready Crisp|Bacon 375 g; Ready Crisp 65-85 g|4.97|5.97''')
row(11,385,575,'''30732293|Your Fresh Market BBQ or herb garlic chicken|800 g|9.77
9310340|Marcangelo chicken or pork kabobs|480-640 g|9.97|13.97''')
row(11,595,785,'''51128365|Hostess Hershey's snack cakes|Selected varieties|4.28
51062170|Lindt Dubai chocolate|150 g|12.97
51109172|Old Orchard frozen juice|355 mL|2.28''','top')
row(11,805,995,'''50450287|Great Value long grain or Thai jasmine rice|2 kg|4.77
51103437|Liberte Mediterranee yogurt|500 g|3.47
31537999|Joe's Tasty Travels walnuts or cashews|275-300 g|4.97''','top')
row(11,1015,1205,'''51103445|Liberte yogurt tubs|700-900 g|6.97
31164898|Giuseppe thin or rising crust pizza|Selected varieties and sizes|5.84''')
row(11,1225,1415,'''30506666|Our Finest or Great Value entrees|900 g-1 kg|7.97
50685828|Great Value Italian meatballs or appetizer bags|Selected varieties and sizes|9.98''')
row(11,1510,1680,'''30065390|Hershey's Chipits|Selected varieties and sizes|5.47|6.44
30437146|Hungry-Man / XL or POGO|POGO 4-pack; selected varieties and sizes|4.47|5.97''')
row(11,1700,1810,'''8104222|Dempster's 7-inch tortillas|10-pack; 340 g|2.68|3.67
30468465|Black Diamond cheese slices|410 g|3.47|4.18
8103214|Sun-Maid raisin bread|450 g|3.58|4.87''','top')
row(11,1830,1940,'''31339376|Natrel milk|4 L; 1%, 2% or skim|5.98|7.08
50438981|Starbucks iced coffee|1.18-1.42 L|6.98|8.28
50798448|Tim Hortons ground coffee or McCafe K-Cups|Ground 875 g; K-Cups 30-pack|22.86|26.97''','top')

row(12,175,408,'''9118851|Eggo waffles|8-pack; 270-280 g|2.97|3.97
31184752|SunChips or Smartfood|Selected varieties and sizes|3.47|3.97''')
row(12,428,660,'''30312878|Goldfish crackers|Selected varieties and sizes|2.24|2.98
51146593|Kool-Aid Jammers|10 x 180 mL|2.97|3.96''')
row(12,679,911,'''50126460|Palmolive dish liquid|4.27 L|7.97|10.47
30880646|OxiClean stain remover|1.28-1.36 kg|10.97|13.23''')
row(12,931,1163,'''50444838|Tide laundry detergent or Pods|39-48 loads; Pods 31 or Power Pods 18-23|9.97|12.97
50287095|Downy scent beads|598-680 g|15.97|19.97''')
row(12,1183,1415,'''30251906|Glad white garbage bags|Tall 50-pack or small 100-pack|10.97|12.97
50569644|Swiffer refills or Sweep + Mop starter kit|Selected varieties and sizes|15.97|18.97''')
row(12,1435,1667,'''30283570|Lysol cleaner|4.26 L|9.97|11.97
50118724|Cascade dishwasher tabs|51 / 67 / 80-pack|19.97|24.97''')
row(12,1686,1920,'''418728|Scotties facial tissues|18-pack|19.97|24.97
50657162|Vileda H2prO flat mop and bucket|Set|49.96|67.98''')

row(13,175,388,'''30037518|Dove body wash or soap|591 mL body wash or 6 x 106 g soap|8.86|9.98
51116298|eos shea butter lotion|473 mL|16.98''')
row(13,408,620,'''31754988|Sensodyne or Pronamel toothpaste|75 mL|6.97|8.46
50118744|TheraBreath oral rinse|473 mL|13.47|14.98''')
row(13,641,853,'''30293418|Dove hair care|Selected varieties and sizes|4.97|6.28
30651330|Pantene Pro-V shampoo or conditioner|476-530 mL|7.97
31162450|L'Oreal Hair Expertise|591 mL|8.97''','top')
row(13,872,1082,'''30997666|Aussie shampoo or conditioner|778 mL|8.97
50973971|U by Kotex liners or pads|Selected varieties and sizes|10.97|12.98''')
row(13,1103,1315,'''275941|Nivea body wash|500 mL|4.98
50380955|Dove dry spray or stick deodorant|Selected varieties and sizes|7.86|9.46
31424340|Ivory body wash|1.03 L|8.48''','top')
row(13,1450,1663,'''50719549|Rascals baby wipes|640-pack|16.88|19.88
30328328|Pampers value pack Swaddlers or Cruisers 360|Selected sizes; in-store diaper price|44.94|54.94
50420115|Enfamil A+ NeuroPro or Gentlease|18 x 237 mL|87.97''','top')
row(13,1680,1900,'''50673947|Huggies super pack diapers|Selected sizes; in-store diaper price|26.98|32.98
50507952|Kendamil organic formula|800 g|49.97
30193083|Enfamil A+ stage 1 or 2 refill|2 x 496 g|62.98|69.98''','top')

row(14,55,258,'''31197318|Jamieson calcium or zinc|Calcium 120-pack; zinc 100-pack|9.97|12.07
31199697|One A Day multivitamin gummies or RestoraLAX|Gummies 130-pack; RestoraLAX 14 doses|14.77|16.48''')
row(14,278,475,'''50361475|Equate high protein meal replacement shakes|6 x 235 mL; selected flavours|10.97
31215888|Advil Cold & Sinus|40-pack|15.07''')
row(14,488,693,'''31257855|Tylenol Extra Strength|130-pack|11.97
31193842|Advil Liqui-Gels or Mini-Gels|Liqui-Gels 72-pack; Mini-Gels 70-pack|16.98''')
row(14,817,1024,'''30082713|IAMS Proactive Health dry cat food|2.72 or 3.18 kg; selected varieties|19.77|21.97
31227341|Arm & Hammer clumping cat litter|17.2, 12.7 or 4.76 kg; selected varieties|24.67|27.46''')
row(14,1034,1242,'''30309037|Ol' Roy Maximum high protein dry dog food|18 kg; selected varieties|36.97
51120480|Pure Balance Pro+ dog food|14 kg; selected varieties|49.98
30264606|Blue Buffalo large breed dog food|9.9 kg; selected varieties|56.97|63.98''','top')
row(14,1252,1459,'''51131870|Minecraft Dungeons II|Nintendo Switch 2 or Xbox Series X|69.96
51183596|Nintendo Switch 2 + Mario Kart World bundle|Set; environmental handling fees may apply|749.96''')
row(14,1470,1677,'''50743642|14 oz three-wick candle|Selected fragrances|9.94
51056398|20 x 20 inch decorative cushions|2-pack|29.97
50635331/948948|Cozy knit throw|Selected varieties; more selection available|29.97''','top')
row(14,1695,1893,'''1080151|Castrol GTX high mileage motor oil|5 L; various viscosities|45.88
50842279|Kidde smoke alarm|Interconnected alarm with battery backup|46.78|53.47
31278841|Super Tech universal tractor fluid|18.9 L; more viscosities available|109''','left')

row(15,235,430,'''30424664|Parent's Choice organic baby food puree|128 mL; selected flavours|1
50825074|Parent's Choice infant formula|Milk-based 700 g or Gentle+ iron-fortified 629 g|26.94
2875375|Gerber Puffs or Crunchies snacks|Selected varieties and sizes|2.47|3.47''','top')
row(15,440,630,'''51102281|Munchkin Any Angle or Gentle Transition cups|10 oz|9.47
50958244|Medela Melody InBra breast pump|Wearable double electric|138
30332814|Baby Brezza Formula Pro advanced dispenser|Formula dispenser|198|248''','left')
row(15,640,828,'''30877804|Evolur Zoodle high chair|2-in-1|129
30497574|Parent's Choice wipes|1,200-pack; selected varieties|19.94
50179181|Rascals premium superpack diapers|Selected varieties and sizes|19.88''','top')
row(15,837,1027,'''50434242|Parent's Choice training pants|Selected varieties and sizes|19.94
50991154|Graco Extend2Fit convertible car seat|2-to-1|299.97|449''')
row(15,1145,1340,'''31283348|Amara organic smoothie melts or fruit bites|23 g; selected flavours|4.47|5.47
50799999|Cerelac baby cereal|400 g; selected flavours|8.43|9.97
31743716|Philips Avent Natural baby bottles|3-pack; Natural Response nipple|19.97|26.97''','top',xs=[(68,279),(300,510),(532,742)])
row(15,1350,1540,'''31527920|Ingenuity Baby Base booster seat|2-in-1|49.97|59.97
50150403|Harmony Play & Go All-in-One playard|Each|99|138
50933486|Graco simple sway baby swing|Each|149.97|199''','top',xs=[(68,279),(300,510),(532,742)])
row(15,1550,1740,'''30624697|Graco TurboBooster backless booster car seat|Each|49.97|64.97
50766832|Clek Ozzi backless booster seat|Rigid latch|89.97|99.97
50682136|Evenflo Tribute LX convertible car seat|Child weight 5-40 lb|125|135''','top',xs=[(68,279),(300,510),(532,742)])

row(16,515,650,'''30235206|Pedigree dry dog food|8 kg; selected varieties|22.48
31330489|Purina Beneful dry dog food|7 kg; selected varieties|26.97''')
row(16,663,795,'''51095166|Cesar wet dog food|6 x 100 g; selected flavours|8.48
51069759|Ol' Roy Munchy Bone dog treats|24-pack|29.98''')
row(16,805,942,'''51123791|Vibrant Life Tough Chew dog toy|Each|6.75
51123794|Ocean plush pet toy|Each|4.97
30957399|IAMS Proactive Health dry dog food|Large breeds; 18.1 kg; selected varieties|64.98''','left')
row(16,956,1087,'''50967744|Special Kitty clumping cat litter|22 kg; selected varieties|12.97
31016929|Special Kitty dry cat food|7 kg; selected varieties|18.97
50123524|Vibrant Life enclosed cat litter pan|Each|29.94''','left')
row(16,1210,1347,'''50955103|Special Kitty pate single can cat food|156 g; selected varieties|0.80|0.90
50148824|Sheba Bistro Perfect Portions wet cat food|12 x 75 g; selected varieties|15.98|17.98''','top',xs=[(68,395),(415,742)])
row(16,1356,1494,'''51037837|Fancy Feast Savory cat treats variety pack|6 x 40 g; selected varieties|6.97|8.47
51027938|Fancy Feast Gems mousse wet cat food|16 x 57 g; variety pack|15.93|17.73''','top',xs=[(68,395),(415,742)])
row(16,1503,1640,'''50623802|Whiskas wet cat food pouch singles|85 g; selected flavours|0.77|0.88
30082955|Milk-Bone dog biscuits|Selected varieties and sizes|3.97|4.77
31661728|Caledon Farms dog treats|256 g|7.98|9.98''','top',xs=[(68,279),(300,510),(532,742)])
row(16,1649,1785,'''30676093|Friskies Party Mix crunch cat treats|170 g; selected varieties|2.27|2.64
31398652|Arm & Hammer Double Duty cat litter deodorizer|850 g|4.48|4.98
30446352|Mane 'n Tail shampoo or conditioner|1 L|10.77|12.98''','top',xs=[(68,279),(300,510),(532,742)])

add(17,"51038042/426|Kids' occupation costumes|Selected styles|19.98",(48,175,273,505))
add(17,"51044908/9330|Girls' licensed costumes|Selected styles|29.98",(293,175,405,352))
add(17,"51050200/4552|Toddlers' licensed costume|Selected styles|32.98",(293,372,405,554))
add(17,"51050204/3552|Boys' licensed costumes|Selected styles|34.98",(538,175,763,500))
add(17,'51041681/2/55410/6999|Halloween decor|Selected styles|26.98',(48,570,273,698))
add(17,"51041713/55715|Adults' licensed costume|Selected styles|39.98",(293,570,518,881))
add(17,'51041573|25 inch light-up Halloween swing girl decor|Each|89.98',(538,570,763,690))
add(17,'51126866|Maynards share size candies|Selected varieties and sizes|3.98',(48,770,273,880))
add(17,'30363723|Great Value Halloween lollipops|100-pack; 500 g|5.97',(538,770,710,887))
row(17,962,1148,'''30872721|Kinder Surprise chocolate eggs|3-pack; selected varieties|4.48|5.48
51081484|Haribo Halloween candy|80-pack|14.98|18.97''')
add(17,'51037245/8169/71/50021|Harvest collection assortment|Selected pieces; prices start at the displayed amount|4.97',(48,1270,335,1400),'From price')
add(17,'51032368/9|Starfrit Dutch oven or wok with lid|7.2 qt Dutch oven or 12.6 inch wok|19.97|29.97',(415,1270,650,1400))
row(17,1440,1600,'''50236796|Alcan bakeware foil pan|Selected varieties and sizes|3.98|5.98
31155225|Alcan aluminum foil or Reynolds compostable parchment paper|Foil 60 or 100 ft; parchment 75 ft|6.98|8.48
31280327|Royal Chinet dinner plates|10.38 inch; 125-pack|21.47|23.97''','top')
row(17,1610,1770,'''51158302/3|TuffStore storage tote|63 L|6.97|7.97
30006671/818968|Starfrit pull-chopper or onion chopper|Easy mandolin also available|15.97|19.97
30705176/50450018/788286|Starfrit small appliances|Waffle maker, sandwich maker or 10-cup rice cooker|29.97''','top')
row(17,1780,1938,'''50973596|George packable jacket|Selected sizes|25
31703217/50449864|Hamilton Beach microwave|1.1 cu ft|84.97|114.97
50286518|Bissell PowerForce Turbo bagless upright vacuum|Each|98.98|119.98''','top')

row(18,145,315,'''2060WJBRODW|Ray-Ban Aviator sunglasses|Online only|188.80|236
4GSYJGIOXVVT|Cordless spin scrubber|Online only|32.99|199.99
600020083507|Diono Radian 3R All-in-One convertible car seat|Online only|234.99|329.99''','full',kind='Online deal',xs=[(36,233),(246,443),(456,653)])
row(18,589,759,'''1CLYLOETMBED|Women's smart watch|Online only|36.99|89.99
6NGOFY3I88DJ|Auusda 16 inch business laptop|Online only|671.99|1499.99
7I501FIV25WP|MERACH vibrating muscle toner|Online only|77.99|199.99''','full',kind='Online deal',xs=[(36,233),(246,443),(456,653)])
row(18,1127,1297,'''53ZHTK7SNCOZ|Set of 2 dining chairs|Online only|155.99|299.99
16RKOZCJHPSM|ViscoLogic 10 inch queen mattress|Online only|199.99|389.99
5XC9CKY015Z4|Joyway 5-piece luggage set|Online only|129.99|399.99''','full',kind='Online deal',xs=[(36,233),(246,443),(456,653)])
row(18,1571,1741,'''3A94COGZB56U|Lefant M310 Ultra robot vacuum and mop combo|Online only|146.99|182.99
0TRG1JXL0B37|Greenworks 80 V cordless snow shovel|Online only|359.99|529.99
1KXXU4IKAIXQ|Gyrocopters Plaid 3.0 electric scooter|Online only|649.96|1299.99''','full',kind='Online deal',xs=[(36,233),(246,443),(456,653)])

row(19,430,656,'''50984435|Good Protein plant-based shake mixes|352 g; selected flavours|26.97
31305662|Revolution Nutrition Iso Whey protein powder|908 g; selected flavours|40.47''')
row(19,665,890,'''50433474|BFit vanilla or chocolate protein shake|460 mL|2.97
31305217|Vega Essentials protein powder|613-619 g; selected flavours|25.97|29.97''')
row(19,897,1122,'''31198196|Jamieson vitamins|Selected varieties and sizes|9.97|12.67
31197355|Webber Naturals magnesium|Selected varieties and sizes|11.97|13.58''')
row(19,1131,1357,'''51130274|De Cecco high protein pasta|400 g; selected varieties|5.47
51157606|Premier Protein muffin mix|396 g; selected varieties|7.47
51160230|Farm Girl cake mixes|350 g; selected varieties|11.47''','top')
row(19,1370,1590,'''51071338|Quaker oatmeal protein|465 g|6.98
50953286|Prana Grano Love|300 g; selected varieties|3.97|4.97
50683154|Clif Bars|5-pack; selected varieties|7.47|11.97''','top')
row(19,1600,1823,'''50860006|Prana overnight chia|260 g; selected varieties|5.97
50944118|Dempster's Protein bread or bagels|Selected varieties and sizes|3.98|4.68
50446982|Promise gluten free bread|480 g; selected varieties|7.98''','top')

row(20,166,391,'''50944065|Suave body wash or antiperspirant|532 mL wash or 74 g antiperspirant|3.97
30270881|Live Clean holiday hand soap|500 mL; selected varieties|4.96
51167910|Daise mystery bracelets|Each|12.98''','left')
row(20,401,627,'''51068806|COVERGIRL TruBlend Sun & Sculpt bronzing glow serum|Selected shades|16.46
30039253|CeraVe foaming facial cleanser|562 mL|20.96
30039218|CeraVe AM or PM moisturizing lotion|89 mL; selected varieties|20.96''','left')
row(20,638,862,'''31217923|Garnier Whole Blends shampoo or conditioner|370 mL; selected varieties|4.98|5.28
51086618|Scent Theory hand sanitizer|30 mL; selected stores or online|6.42
50957167|L'Oreal Paris Revitalift Triple Power LZR eye cream|15 mL|39.96''','left')
row(20,873,1098,'''50817034|Q-tips original cotton swabs|500-pack|3.97|4.97
50772967|L'Oreal Paris Hair Expertise Density Booster|Shampoo or conditioner; 150-200 mL|8.97|10.97
50942632|Aquaphor healing ointment|396 g|19.96|24.97''','left')
row(20,1107,1335,'''4614327|L'Oreal Paris Voluminous mascara|Selected varieties|8.97|9.97
50674792|Crest 3D White deep stain remover|Toothpaste 67 mL or whitening rinse 946 mL|9.97|11.46
206882|John Frieda hair care|Selected shampoo, conditioner or styling products|11.48|12.98''','left')
row(20,1343,1567,'''30243271|Colgate toothbrushes or toothpaste|6-pack brushes; Sensitive Pro-Relief 120 mL or Optic White Advanced 133 mL|6.97
50701351|OPI RapiDry nail lacquer|9 mL; selected varieties|9.97|11.97
50812826|L'ange Hair flat iron or curling wand|Each|29.97|44.98''','left')
row(20,1578,1804,'''50286972|Jergens lotion|775 mL; selected varieties|8.62|9.97
50992271|Aquaphor healing ointment|50 g|9.96|11.97
49N1Q4YGZZ5W|La Roche-Posay Effaclar purifying foaming gel|400 mL; oily skin; online only|27.16|31.95''','left')
items[-1]['promotionType']='Online deal';items[-1]['conditions']='Online only'

add(21,'9297375|Sanpellegrino sparkling water|750 mL|2.47',(48,516,290,976))
add(21,'31337720|Sanpellegrino sparkling water|6 x 1 L|11.58',(415,524,762,925))
row(21,1003,1462,'''9218104|Sanpellegrino sparkling water|6 x 500 mL|8.98
50976189/91/95/334|Sanpellegrino CIAO! flavoured sparkling water|6 x 330 mL; selected varieties|8.27''','top80')
add(21,'31003781/2|Sanpellegrino flavoured sparkling drink|6 x 330 mL; selected varieties|6.97',(70,1515,339,1850))
add(21,'50761637/9/40/976198|Sanpellegrino Light|6 x 330 mL; selected varieties|6.97',(366,1515,751,1850))

row(22,525,983,'''51151901|Activia Fibre+ probiotic yogurt tubs|625 g; selected flavours|4.96
51151899|Activia probiotic yogurt|12 x 95 g or 12 x 100 g|5.96''','top80')
row(22,1003,1461,'''51151903|Activia yogurt tubs|650 g; selected flavours|3.87
51151900|Activia Fibre+ probiotic yogurt|4 x 100 g; selected flavours|3.97''','top80')
row(22,1481,1938,'''9059106|Activia probiotic yogurt 8-pack|8 x 100 g; selected flavours|4.98
31362213|Activia probiotic drinkable yogurt|8 x 93 mL; selected varieties|6.47''','top80')

add(23,'50281129|Kraft Dinner|200 g|1.67',(120,492,237,695))
add(23,'51086407|Heinz ketchup zero sugar|375 mL|3.97',(473,487,542,648))
add(23,'50559266|Heinz pickle-flavoured tomato ketchup|375 mL|2.97',(411,541,486,696))
add(23,'9045834|Philadelphia cream cheese|227-250 g; selected varieties|3.97|4.48',(120,708,279,887))
add(23,'30952043|Kraft peanut butter|1 kg; selected varieties|5.97',(437,709,540,876))
add(23,'9126719|Cool Whip whipped topping|1 L|5.48',(116,931,263,1112))
add(23,'50413628|Kraft salad dressing|425 mL; selected varieties|3.24',(415,905,542,1134))
add(23,'51140233|CRAVE crispy roll-ups|540 g; selected varieties|11.97',(169,1146,455,1290))
add(23,'51137757|Heinz soup|370-380 mL; selected varieties|5.47',(360,1460,575,1610))
add(23,'51146593|Kool-Aid Jammers fruit beverage|10 x 180 mL|2.97|3.96',(96,1782,290,1915))

row(24,513,863,'''50715240|International Delight pumpkin spice coffee creamer|946 mL|5.78
51154784|Silk Almond pumpkin spice coffee creamer|890 mL|5.46''')
row(24,867,1222,'''50685923|International Delight pistachio coffee creamer|Limited edition; 425 mL|2.97|3.87
50853880|International Delight pumpkin spice cold foam|369 g|5.78''')
row(24,1233,1582,'''30546597|Silk Barista oat beverage|946 mL|5.47
50982302|International Delight caramel macchiato coffee creamer|1.42 L|6.46|7.47''')
row(24,1590,1938,'''50783575|International Delight Reese's iced coffee|1.75 L|4.98|6.98
31361801/50982175|STOK cold brew black coffee or cappuccino|1.42 L; selected varieties|7.98''')

# Manual photo boundaries for irregular layouts (no surrounding ad copy).
add(2,'9290300|Stove Top stuffing mix|120 g; selected varieties|1.27|2.47',(434,1180,644,1413))
overrides = {}
def photos(page, values):
    for line in values.strip().split('\n'):
        code, coords=line.split('|')
        overrides[(page,code)] = tuple(map(int,coords.split(',')))

photos(3,'''9275318|142,274,292,430
30561721|173,440,268,512
9243464|295,440,408,550
31506606|543,439,646,544
50297426|102,619,235,700
30997524|321,619,489,692
50438976|551,618,640,715
30390897|104,794,242,883
50964704|307,792,403,880
9126908|602,793,738,862
31397272|115,976,234,1046
51069408|307,976,449,1056
50147792|562,974,714,1046
50982773|83,1168,359,1274
30814711|430,1169,750,1294
50130954|79,1345,263,1495
50611357|435,1345,642,1487
50479347|74,1521,240,1632
50808580|286,1521,397,1677''')
add(3,'51049243/56|24 inch Halloween blow mould|Selected styles|49.98',(558,1519,632,1678))
photos(9,'''9477011|64,167,273,348
30135245|428,177,640,347
50566289|68,372,283,565
31375329|431,375,639,565
50461383|51,579,155,762
31340494|326,581,512,724
9481036|538,589,751,710
50287873|92,782,220,880
31614800|297,786,420,913
30319321|547,787,723,882
30510909|72,995,239,1127
50629680|299,998,512,1119
51124256|548,999,731,1132
30126312|294,1204,414,1393
9288032|531,1225,651,1364
9130968|309,1411,500,1506
50151044|531,1444,649,1591
30263835|76,1616,151,1807
30361973|312,1617,502,1729
30591085|568,1617,742,1732''')
photos(11,'''31034407|57,66,260,223
30897892|424,58,721,181
30732293|60,246,262,420
9310340|432,247,642,420
51128365|54,458,332,577
51062170|503,439,601,617
51109172|55,639,277,809
50450287|424,635,706,784
51103437|52,826,264,956
31537999|320,825,488,938
51103445|545,825,755,958
31164898|52,1023,274,1138
30506666|295,1023,514,1147
50685828|545,1023,693,1112
30065390|61,1335,381,1470
30437146|407,1335,640,1469
8104222|79,1536,268,1653
30468465|317,1549,501,1634
8103214|548,1536,642,1709
31339376|85,1730,255,1832
50438981|306,1729,411,1916
50798448|548,1733,724,1828''')

photos(4,'''51038181/425|48,473,253,728
51038034/45402|259,473,494,731
51045291|83,801,197,1108
51044056|312,799,431,1099
51043568/5497|48,1178,358,1341
51049911/51464/2212|48,1348,392,1527
51049855|45,1588,245,1818
51049590/1|264,1538,478,1824''')
photos(5,'''51041742/4|48,443,253,665
51043926/68944|272,443,478,665
51044980|48,746,370,954
30423079|48,1050,253,1230
50537009|272,1050,478,1250
50784876|48,1350,253,1540
50825326|272,1350,478,1540
51108747|48,1650,253,1830
30771888|272,1650,478,1840''')
photos(6,'''51063442|85,444,242,626
31020693|492,641,651,835
31728900|539,1056,653,1256
30175168|65,1082,175,1252
9230613|302,1080,418,1252
51184642|71,1282,332,1420
30227767|48,1525,293,1657
50059574|439,1476,658,1667
30248168|67,1696,291,1876
50633315|437,1697,655,1876''')
photos(7,'''30664892|116,439,249,638
50805175|434,439,638,636
30362948|70,650,315,824
50818424|425,650,752,811
51130429|56,889,266,1002
30392188|298,868,522,1012
30555883|538,888,655,1062
50803562|61,1084,259,1278
30965088|62,1331,264,1498
30513032|65,1518,364,1632
9205321|72,1732,274,1937
50819506|425,1757,640,1915''')
photos(8,'''30225131|48,224,272,332
50600786|418,216,643,351
30363352|58,649,208,816
30338935|344,649,465,820
50638073|578,649,719,825
15BGRAC79QBP|86,1018,206,1355
3CH12NXRX1XD|344,1018,466,1356
2QZPP3C98FMH|545,1018,753,1356
50701351|285,1460,397,1690
30797711|528,1460,639,1639''')
photos(12,'''9118851|87,173,310,339
31184752|441,176,635,340
30312878|91,426,308,603
51146593|440,425,653,596
50126460|105,678,307,903
30880646|469,679,627,897
50444838|100,930,310,1154
50287095|470,933,616,1154
30251906|104,1180,305,1345
50569644|461,1181,643,1342
30283570|98,1432,308,1657
50118724|444,1434,645,1608
418728|97,1681,308,1850
50657162|444,1683,629,1908''')
photos(13,'''30037518|57,180,248,380
51116298|431,177,647,383
31754988|57,418,389,573
30293418|56,646,158,842
30651330|284,629,412,826
31162450|530,664,658,831
30997666|65,860,266,1074
50973971|409,869,643,1075
275941|85,1087,232,1260
50380955|288,1117,403,1299
31424340|569,1089,729,1247
50719549|42,1441,178,1587
30328328|295,1436,514,1561
50420115|529,1450,772,1582
50673947|54,1688,266,1797
50507952|282,1699,403,1880
30193083|566,1673,741,1804''')
photos(14,'''31197318|56,52,285,250
31199697|421,61,656,251
50361475|42,274,268,471
31193842|411,485,637,686
31227341|405,815,640,1018
30309037|78,1049,173,1230
51120480|366,1030,488,1168
30264606|557,1028,700,1146
51183596|425,1271,602,1443
50743642|88,1493,202,1638
51056398|309,1467,471,1610
50635331/948948|554,1467,705,1585
1080151|61,1714,156,1878
50842279|289,1742,395,1859
31278841|552,1714,647,1879''')
photos(15,'''30424664|48,248,154,423
50825074|321,234,517,375
2875375|539,224,664,344
51102281|48,460,151,624
50958244|326,441,506,579
30332814|550,460,640,624
30877804|48,647,182,821
30497574|289,638,518,757
50179181|538,638,762,743
50991154|422,837,638,1019
31283348|75,1146,215,1257
50799999|330,1146,482,1241
31743716|532,1150,727,1250
31527920|78,1346,203,1471
50150403|285,1395,416,1519
50933486|540,1344,615,1459
30624697|73,1547,276,1651
50766832|326,1547,482,1657
50682136|576,1544,689,1659''')
photos(16,'''51123791|98,800,220,891
51123794|298,835,421,896
30957399|544,806,637,934
50967744|46,953,155,1082
31016929|294,953,409,1084
50123524|537,952,630,1085
50955103|153,1213,290,1342
50148824|511,1208,633,1345
51037837|158,1356,288,1491
51027938|502,1356,637,1489
50623802|84,1498,179,1558
30082955|306,1499,412,1573
31661728|567,1499,627,1586
30676093|76,1645,171,1712
31398652|312,1645,373,1720
30446352|560,1645,624,1720''')
photos(17,'''51037245/8169/71/50021|55,1270,340,1388
51032368/9|425,1270,655,1400
50236796|49,1440,173,1537
31155225|290,1440,507,1498
31280327|545,1444,648,1539
51158302/3|50,1608,224,1696
30006671/818968|301,1609,412,1677
30705176/50450018/788286|543,1607,730,1726
50973596|62,1790,165,1935
31703217/50449864|285,1776,421,1858
50286518|563,1770,600,1881''')
photos(19,'''31305662|431,436,638,650
51071338|56,1381,171,1586
50953286|309,1370,500,1530
50683154|589,1379,720,1500
50944118|280,1600,399,1817''')
photos(20,'''50944065|48,164,153,385
30270881|283,164,397,385
51167910|542,166,756,326
51068806|48,398,153,623
30039253|305,406,391,619
30039218|517,407,637,625
31217923|50,635,154,854
51086618|291,638,512,808
50957167|536,645,644,852
50817034|52,900,263,992
50772967|282,870,395,1090
50942632|541,870,683,1022
4614327|76,1104,134,1330
50674792|318,1101,505,1231
206882|538,1119,642,1325
30243271|55,1340,263,1508
50812826|556,1338,600,1562
50286972|53,1582,151,1800
50992271|311,1575,379,1798
49N1Q4YGZZ5W|558,1608,642,1798''')

for item in items:
    coords=overrides.get((item['page'],item['storeCode']))
    if coords:
        page=doc[item['page']-1]
        x1,y1,x2,y2=coords
        clip=fitz.Rect(x1/813*page.rect.width,y1/2048*page.rect.height,x2/813*page.rect.width,y2/2048*page.rect.height)
        page.get_pixmap(matrix=fitz.Matrix(1.4,1.4),clip=clip).save(str(assets/item['imageFile']),jpg_quality=88)

# One code has contradictory prices in the source: retain both offer records but
# require review rather than treating either as a confirmed current selling price.
for item in items:
    item['priceConflict'] = item['storeCode']=='50638073'
    if item['priceConflict']:
        item['conditions']='The flyer shows $5.24 on page 7 and $6.24 on page 8 for this code. Confirm the applicable offer with Walmart.'
        item['promotionType']='Check price'
        item['savings']=None

items.sort(key=lambda item:(item['page'],int(item['id'].split('-')[1])))
flyer['items']=items
flyer['review']={
    'reviewedPages':list(range(1,27)),
    'productPages':list(range(1,25)),
    'excludedPages':[{'page':25,'reason':'Membership, financing and pharmacy service ads; no individually priced product offers'},
                     {'page':26,'reason':'Partner service ads; no individually priced product offers'}],
    'deduplication':'Repeated store code and flyer price shown once; sourcePages records each occurrence.',
    'priceConflicts':['50638073'],
}
path.write_text(json.dumps(flyer,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'products':len(items),'pages':sorted({i['page'] for i in items}),'types':sorted({i['promotionType'] for i in items})}))
