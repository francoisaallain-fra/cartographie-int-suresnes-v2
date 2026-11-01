"""Add the official childcare points to the current Suresnes snapshot, preserving provenance."""
from pathlib import Path
import json,gzip,hashlib,zipfile,io,collections
from shapely.geometry import shape,Point
from pyproj import Geod
ROOT=Path(__file__).resolve().parents[1];WORKSPACE=ROOT.parents[1];DATA=WORKSPACE/'sites/carte-couches-suresnes/dist/data';RAW=ROOT/'raw';OUT=ROOT/'processed'
def read(path):
 b=path.read_bytes();return json.loads(gzip.decompress(b) if b[:2]==b'\x1f\x8b' else b)
def write(path,d):path.write_text(json.dumps(d,ensure_ascii=False,indent=2))
boundary=shape(read(DATA/'commune.geojson')['geometry']);d=read(RAW/'eaje-suresnes.json');meta=read(RAW/'eaje-dept-meta.json')['metas']['default'];features=[];excluded=[]
assert len(d['results'])==d['total_count'], 'Incomplete source pagination'
url='https://opendata.hauts-de-seine.fr/explore/dataset/etablissements-daccueil-de-la-petite-enfance-pe/'
for r in d['results']:
 pt=r.get('geo_point_2d');xy=[pt['lon'],pt['lat']] if pt else None
 if not xy or not boundary.covers(Point(xy)):
  excluded.append({'name':r['nom'],'reason':'missing coordinate or outside Suresnes'});continue
 assert r['code_insee']=='92073' and r['type'] in ['Multi-accueil','Micro crèche']
 id='eaje92-'+hashlib.sha256((r['nom']+'|'+r['adresse']).encode()).hexdigest()[:12]
 features.append({'type':'Feature','id':id,'geometry':{'type':'Point','coordinates':xy},'properties':{'id':id,'name':r['nom'],'kind':'nursery','category':r['type'],'address':r['adresse']+', '+r['cp']+' Suresnes','source':'childcare','source_url':url,'precision':'Point géographique du Département · emprise non vérifiée','source_vintage':meta['modified'][:10],'retrieved_at':'2026-10-19'}})
assert len(features)==32 and not excluded and len(set(f['id'] for f in features))==32
fc={'type':'FeatureCollection','features':features};write(OUT/'nurseries.geojson',fc);write(DATA/'nurseries.geojson',fc)
sources=read(DATA/'sources.json');sources['childcare']={'name':'Département des Hauts-de-Seine · Petite enfance','url':url,'format':'API JSON → GeoJSON','license':meta['license'],'vintage':'Jeu daté du 30/04/2025 · extrait le 19/10/2026','note':'32 établissements : 20 multi-accueils et 12 micro-crèches. Points fournis par le Département, contrôlés dans Suresnes. Plusieurs établissements peuvent partager une adresse ; ouverture actuelle non vérifiée individuellement.'};write(DATA/'sources.json',sources)
all_points=[]
for n in ['transport','schools','health','neighborhood','nurseries']:all_points+=read(DATA/(n+'.geojson'))['features']
offices=read(DATA/'offices.geojson');g=Geod(ellps='WGS84')
for f in offices['features']:
 lon,lat=f['geometry']['coordinates'];near=[]
 for a in all_points:
  x,y=a['geometry']['coordinates'];dist=g.inv(lon,lat,x,y)[2]
  if dist<=500:near.append({'id':a['id'],'distance_m':round(dist,1)})
 f['properties']['nearby']=near
write(DATA/'offices.geojson',offices)
quality=read(DATA/'quality.json');quality['counts'].update({'childcare_source_rows':d['total_count'],'childcare_establishments':len(features),'childcare_multiaccueil':20,'childcare_microcreches':12})
coords=collections.Counter(tuple(f['geometry']['coordinates']) for f in features)
quality['childcare_checks']={'source_url':url,'source_modified':meta['modified'],'source_data_processed':meta['data_processed'],'source_query':read(RAW/'eaje-suresnes.json.meta.json')['url'],'all_inside_commune':True,'excluded':excluded,'distinct_point_locations':len(coords),'shared_point_locations':sum(1 for n in coords.values() if n>1),'note':'Effectifs d’établissements, pas de bâtiments distincts. Date de traitement technique distincte du millésime déclaré par la source.'}
quality['nearby_counts']={f['id']:len(f['properties']['nearby']) for f in offices['features']};write(DATA/'quality.json',quality)
for name in ['offices.geojson','sources.json','quality.json']:write(OUT/name,read(DATA/name))
# Update the existing downloadable bundle without discarding the original collection scripts.
archive=DATA/'suresnes-donnees.zip';old=zipfile.ZipFile(io.BytesIO(archive.read_bytes()));replacements={f'processed/{n}':(DATA/n).read_bytes() for n in ['nurseries.geojson','offices.geojson','sources.json','quality.json']}
manifest=read(RAW/'eaje-suresnes.json.meta.json');replacements['extensions/petite-enfance/extraction.json']=json.dumps(manifest,ensure_ascii=False,indent=2).encode()
replacements['extensions/petite-enfance/enrich.py']=Path(__file__).read_bytes()
replacements['extensions/petite-enfance/LISEZ-MOI.txt']=('Ajout du 19 octobre 2026 : 32 établissements d’accueil de petite enfance du Département des Hauts-de-Seine, source datée du 30 avril 2025. Le fichier processed/nurseries.geojson contient les points. Les listes de proximité des bureaux, sources et compteurs qualité ont été recalculées. Les réponses sources sont archivées localement dans recherches/suresnes-petite-enfance-2026-10-19/raw ; le manifeste donne la requête et son empreinte. Plusieurs établissements partagent un même point. Aucune vérification individuelle d’ouverture. Les README et rapports de l’extraction initiale décrivent l’état avant cet ajout.\n').encode()
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for info in old.infolist():
  if info.filename not in replacements:z.writestr(info,old.read(info.filename))
 for name,content in replacements.items():z.writestr(name,content)
print(json.dumps({'nurseries':len(features),'distinct_locations':len(coords),'nearby':quality['nearby_counts'],'source_modified':meta['modified']},ensure_ascii=False))
