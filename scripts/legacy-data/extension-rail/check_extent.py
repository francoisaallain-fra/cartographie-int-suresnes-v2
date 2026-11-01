import json
from pathlib import Path
from shapely.geometry import shape
from shapely.ops import transform
from pyproj import Transformer
r=Path(__file__).parent; dest=r.parents[1]/'sites/carte-couches-suresnes/dist/data'
project=Transformer.from_crs(4326,2154,always_xy=True).transform
city=transform(project,shape(json.loads((dest/'commune.geojson').read_text())['geometry']))
for f in json.loads((r/'emplacement-des-gares-idf.geojson').read_text())['features']:
 g=transform(project,shape(f['geometry']));d=city.distance(g)
 if d<1000:print(round(d),f['properties']['nom_gares'],f['properties']['res_com'],f['properties']['id_ref_zdc'],f['geometry']['coordinates'])
lines={}
for f in json.loads((r/'traces-du-reseau-ferre-idf.geojson').read_text())['features']:
 if transform(project,shape(f['geometry'])).intersects(city.buffer(500)):
  p=f['properties'];lines[p['res_com']]=(p['colourweb_hexa'],p['mode'])
print('LINES',lines)
