"""Limited public-page extraction. No recursion, contact data, images, or full texts exported."""
from probe import fetch,ROOT
import json,time,re
from bs4 import BeautifulSoup
s=BeautifulSoup((ROOT/'raw/bnppre-list.html').read_text(),'html.parser')
candidates=[]
for t in s.select('[data-offer-ref]'):
 if 'suresnes' in t.get('data-offer-title','').lower():
  candidates.append({k.removeprefix('data-offer-'):v for k,v in t.attrs.items() if k.startswith('data-offer-') and k!='data-offer-img'})
(ROOT/'processed/broker-candidates.json').write_text(json.dumps(candidates,ensure_ascii=False,indent=2))
selected=[x for x in candidates if re.search(r'\d+.*(?:Bd|Quai|Rue|Boulevard)',x['subtitle'],re.I)][:5]
(ROOT/'processed/broker-selected.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2))
for o in selected:
 fetch('broker-'+o['ref']+'.html',o['url']);time.sleep(1)
 fetch('geocode-'+o['ref']+'.json','https://data.geopf.fr/geocodage/search',{'q':o['subtitle'],'index':'address','citycode':'92073','limit':3});time.sleep(1)
fetch('geocode-school-0922740D.json','https://data.geopf.fr/geocodage/search',{'q':'28 rue Pagès 92150 Suresnes','index':'address','citycode':'92073','limit':1})
fetch('ortho-dates.pdf','https://data.geopf.fr/annexes/ressources/fiches/photographies-aeriennes-RVB/geoportail_dates_des_prises_de_vues_aeriennes-RVB.pdf')
fetch('finess-schema.pdf','https://static.data.gouv.fr/resources/finess-extraction-du-fichier-des-etablissements/20180604-151738/etalab_cs1100507.pdf')
for f in ['leaflet.js','leaflet.css']:fetch(f,'https://unpkg.com/leaflet@1.9.4/dist/'+f)
fetch('leaflet-LICENSE','https://raw.githubusercontent.com/Leaflet/Leaflet/v1.9.4/LICENSE')
