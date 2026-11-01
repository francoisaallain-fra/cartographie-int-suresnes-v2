import urllib.request,urllib.parse,json
from pathlib import Path
root=Path(__file__).parent
q='[out:json][timeout:45];way["highway"~"^(primary|secondary|tertiary|trunk)(_link)?$"](48.84,2.18,48.90,2.26);out tags geom;'
(root/'query.overpass').write_text(q)
url='https://overpass-api.de/api/interpreter'
req=urllib.request.Request(url,data=urllib.parse.urlencode({'data':q}).encode(),headers={'User-Agent':'SuresnesMap/1.0'})
with urllib.request.urlopen(req,timeout=60) as r: raw=r.read()
(root/'osm-roads.json').write_bytes(raw)
d=json.loads(raw)
for name in sorted(set(x.get('tags',{}).get('name','') for x in d['elements'])): print(name)
print('ways',len(d['elements']))
