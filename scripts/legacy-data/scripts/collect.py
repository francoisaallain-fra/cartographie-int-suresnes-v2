from probe import fetch,ROOT
import json,concurrent.futures,math
c=json.loads((ROOT/'raw/commune.json').read_text())
f=json.loads((ROOT/'raw/finess-meta.json').read_text())
resource=next(x for x in f['resources'] if 'géolocalisés' in x['title'] and x['format']=='csv')
z=16;lat=48.870;lon=2.22;x=int((lon+180)/360*2**z);y=int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z)
jobs=[
('zones.json','https://apicarto.ign.fr/api/gpu/zone-urba',{'partition':'DU_92073'}),
('stations.json','https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/emplacement-des-gares-idf/records',{'where':"within_distance(geo_point_2d,GEOM'POINT(2.22 48.87)',3km)",'limit':100}),
('finess.csv',resource['url'],None),
('schools-meta.json','https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education',None),
('bnppre-list.html','https://www.bnppre.fr/a-louer/bureau/hauts-de-seine-92/suresnes-92150/',None),
('ortho-test.jpg','https://data.geopf.fr/wmts',{'SERVICE':'WMTS','VERSION':'1.0.0','REQUEST':'GetTile','LAYER':'ORTHOIMAGERY.ORTHOPHOTOS','STYLE':'normal','FORMAT':'image/jpeg','TILEMATRIXSET':'PM','TILEMATRIX':z,'TILEROW':y,'TILECOL':x}),
('osm.json','https://overpass-api.de/api/interpreter',{'data':'[out:json][timeout:40];area["ref:INSEE"="92073"]["boundary"="administrative"]["admin_level"="8"]->.a;(nwr["shop"="bakery"](area.a);nwr["amenity"="pharmacy"](area.a););out center tags;'}),
('gpu-page.html','https://www.geoportail-urbanisme.gouv.fr/document/by-id/64ef58d064a2d45604223108ff089d2d',None)]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as p:list(p.map(lambda j:fetch(*j),jobs))
