import json,gzip,urllib.request,concurrent.futures
from pathlib import Path
root=Path(__file__).parent
def fetch(ds):
 base='https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/'+ds
 for suffix,name in [('',ds+'-meta.json'),('/exports/geojson',ds+'.geojson')]:
  with urllib.request.urlopen(base+suffix,timeout=90) as r:raw=r.read()
  if raw[:2]==b'\x1f\x8b':raw=gzip.decompress(raw)
  (root/name).write_bytes(raw)
 d=json.loads(raw)
 print(ds,len(d['features']),json.dumps(d['features'][0]['properties'],ensure_ascii=False))
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:list(ex.map(fetch,['traces-du-reseau-ferre-idf','emplacement-des-gares-idf']))
