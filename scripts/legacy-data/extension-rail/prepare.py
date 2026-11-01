import json,zipfile,gzip,warnings
from pathlib import Path
from collections import defaultdict
from shapely.geometry import shape,mapping,MultiLineString,Point
from shapely.ops import transform,unary_union
from pyproj import Transformer,Geod
warnings.filterwarnings('ignore',category=DeprecationWarning)
root=Path(__file__).resolve().parent;dest=root.parents[1]/'sites/carte-couches-suresnes/dist/data'
def read(p):return json.loads(p.read_text())
def write(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2))
fw=Transformer.from_crs(4326,2154,always_xy=True).transform;bw=Transformer.from_crs(2154,4326,always_xy=True).transform
city=shape(read(dest/'commune.geojson')['geometry']);citym=transform(fw,city);extent=citym.buffer(500)
extentw=transform(bw,extent)
write(dest/'transport-extent.geojson',{'type':'Feature','properties':{'buffer_m':500,'crs_calculation':'EPSG:2154'},'geometry':mapping(extentw)})
traces=read(root/'traces-du-reseau-ferre-idf.geojson')['features'];stations=read(root/'emplacement-des-gares-idf.geojson')['features']
offices=read(dest/'offices.geojson')
def parts(g):
 if g.is_empty:return []
 if g.geom_type=='LineString':return [g]
 return [l for sub in getattr(g,'geoms',[]) for l in parts(sub)]
def linear(g):
 ls=parts(g)
 return mapping(MultiLineString(ls)) if ls else None
groups=defaultdict(list)
for f in traces:
 p=f['properties'];g=transform(fw,shape(f['geometry']))
 if p['mode'] in ['TRAMWAY','TRAIN','RER','METRO'] and g.intersects(extent):
  groups[p['res_com']].append(f)
linefeatures=[];service={}
for name,rows in sorted(groups.items()):
 p=rows[0]['properties'];ident=p['idrefligc'];color='#'+p['colourweb_hexa'].lstrip('#')
 assert all(r['properties']['colourweb_hexa']==p['colourweb_hexa'] for r in rows)
 geom=unary_union([shape(r['geometry']) for r in rows]).intersection(extentw)
 key='T'+p['indice_lig'] if p['mode']=='TRAMWAY' else p['indice_lig']
 info={'id':ident,'name':name,'label':key,'mode':p['mode'],'color':color}
 service[name]=info
 f={'type':'Feature','id':ident,'properties':{**info,'kind':'rail','source':'rail','radius_geometries':{o['id']:linear(geom.intersection(shape(o['properties']['radius_geometry']))) for o in offices['features']}},'geometry':linear(geom)}
 assert f['geometry'];linefeatures.append(f)
write(dest/'rail.geojson',{'type':'FeatureCollection','features':linefeatures})
sg=defaultdict(list)
for f in stations:
 p=f['properties'];g=transform(fw,shape(f['geometry']))
 if p['res_com'] in service and citym.distance(g)<=500:
  sg[p['id_ref_zdc']].append(f)
points=[]
for zdc,rows in sg.items():
 unique={tuple(f['geometry']['coordinates']) for f in rows}
 pt=Point(sum(p[0] for p in unique)/len(unique),sum(p[1] for p in unique)/len(unique))
 p=rows[0]['properties'];ident='idfm-'+str(zdc);names=sorted(set(r['properties']['res_com'] for r in rows))
 distance=citym.distance(transform(fw,pt))
 assert distance<=500
 points.append({'type':'Feature','id':ident,'geometry':mapping(pt),'properties':{'id':ident,'name':p['nom_gares'],'kind':'transport','lines':names,'services':[service[n] for n in names],'distance_city_m':round(distance),'inside_city':city.covers(pt),'source':'transport','source_url':'https://data.iledefrance-mobilites.fr/explore/dataset/emplacement-des-gares-idf/','precision':'Point IDFM ; barycentre des positions par ligne pour les correspondances. Distance à la commune en Lambert-93.','retrieved_at':'2026-10-22'}})
points.sort(key=lambda f:f['properties']['name'])
write(dest/'transport.geojson',{'type':'FeatureCollection','features':points})
allpoints=points+sum([read(dest/(n+'.geojson'))['features'] for n in ['schools','nurseries','health','neighborhood']],[])
geod=Geod(ellps='WGS84')
for o in offices['features']:
 lon,lat=o['geometry']['coordinates'];near=[]
 for f in allpoints:
  x,y=f['geometry']['coordinates'];_,_,d=geod.inv(lon,lat,x,y)
  if d<=500:near.append({'id':f['id'],'distance_m':round(d,2),'kind':f['properties']['kind'],'name':f['properties']['name']})
 o['properties']['nearby']=sorted(near,key=lambda x:x['distance_m'])
write(dest/'offices.geojson',offices)
sources=read(dest/'sources.json')
sources['transport'].update(vintage='Jeu mis à jour le 21/10/2026 · extrait le 22/10/2026',note='9 points par ligne regroupés en 6 gares : 3 à Suresnes et 3 dans la bande de 500 m autour de la commune (distance à vol d’oiseau, calcul Lambert-93). Puteaux regroupe T2, L et U. Aucun arrêt RER ou métro dans le périmètre.')
sources['rail']={'name':'Île-de-France Mobilités · Tracés du réseau ferré','url':'https://data.iledefrance-mobilites.fr/explore/dataset/traces-du-reseau-ferre-idf/','format':'GeoJSON · tracés et champ colourweb_hexa','license':'Licence Ouverte v2.0 (Etalab)','vintage':'Jeu mis à jour le 21/10/2026 · extrait le 22/10/2026','note':'Tram T2 et Transilien L/U, découpés à Suresnes + 500 m. Couleurs officielles IDFM : T2 '+service['TRAM 2']['color']+', L '+service['TRAIN L']['color']+', U '+service['TRAIN U']['color']+'. Aucun tracé RER ou métro dans cette bande. Les lignes L/U sont légèrement décalées visuellement pour distinguer les voies communes ; données géographiques conservées.'}
write(dest/'sources.json',sources)
audit={'date':'2026-10-22','station_source_rows':sum(map(len,sg.values())),'physical_stations':len(points),'inside':sum(f['properties']['inside_city'] for f in points),'outside':[{ 'name':f['properties']['name'],'distance_m':f['properties']['distance_city_m'],'lines':f['properties']['lines']} for f in points if not f['properties']['inside_city']],'lines':list(service.values()),'no_rer_or_metro':not any(s['mode'] in ['RER','METRO'] for s in service.values()),'radius_counts':{o['id']:len(o['properties']['nearby']) for o in offices['features']}}
write(root/'validation.json',audit)
q=read(dest/'quality.json');q['rail_extension']=audit;q['counts']['stations']=len(points);q['counts']['rail_lines']=len(linefeatures);write(dest/'quality.json',q)
z=dest/'suresnes-donnees.zip'
with zipfile.ZipFile(z) as old:entries={n:old.read(n) for n in old.namelist()}
for name in ['rail.geojson','transport.geojson','transport-extent.geojson','offices.geojson','sources.json','quality.json']:entries['processed/'+name]=(dest/name).read_bytes()
for p in root.glob('*'):
 if p.suffix in ['.py','.json','.geojson']:entries['extension-rail/'+p.name]=p.read_bytes()
with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as archive:
 for n,b in entries.items():archive.writestr(n,b)
print(json.dumps(audit,ensure_ascii=False))
