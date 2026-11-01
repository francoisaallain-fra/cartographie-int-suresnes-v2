from pathlib import Path
import urllib.request,urllib.parse,urllib.error,json,hashlib,datetime,concurrent.futures
ROOT=Path(__file__).resolve().parents[1]
for folder in ['raw','processed','reports']:(ROOT/folder).mkdir(parents=True,exist_ok=True)
def fetch(name,url,params=None):
 p=ROOT/'raw'/name
 if p.exists():
  print(name,'CACHED',p.stat().st_size,flush=True);return
 try:
  target=url+('?' + urllib.parse.urlencode(params) if params else '')
  req=urllib.request.Request(target,headers={'User-Agent':'SuresnesDataTest/1.0 (limited research extraction)'})
  try:r=urllib.request.urlopen(req,timeout=55)
  except urllib.error.HTTPError as e:r=e
  data=r.read();p.write_bytes(data)
  (ROOT/'raw'/(name+'.meta.json')).write_text(json.dumps({'url':r.url,'status':r.status,'content_type':r.headers.get('Content-Type'),'retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()},indent=2))
  print(name,r.status,len(data),flush=True)
 except Exception as e:print(name,type(e).__name__,str(e)[:200],flush=True)
if __name__=='__main__':
 jobs=[
 ('commune.json','https://geo.api.gouv.fr/communes/92073',{'fields':'nom,code,contour,centre','format':'geojson','geometry':'contour'}),
 ('schools.json','https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records',{'where':"code_commune='92073'",'limit':100}),
 ('idfm-meta.json','https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/emplacement-des-gares-idf',None),
 ('finess-meta.json','https://www.data.gouv.fr/api/1/datasets/finess-extraction-du-fichier-des-etablissements/',None),
 ('bnppre-robots.txt','https://www.bnppre.fr/robots.txt',None),
 ('gpu-doc.json','https://apicarto.ign.fr/api/gpu/document',{'partition':'DU_92073'}),
 ('wmts-capabilities.xml','https://data.geopf.fr/wmts',{'SERVICE':'WMTS','VERSION':'1.0.0','REQUEST':'GetCapabilities'})]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(lambda j:fetch(*j),jobs))
