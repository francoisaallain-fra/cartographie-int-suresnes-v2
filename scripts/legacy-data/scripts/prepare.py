"""Build a minimal, auditable Suresnes data snapshot from the archived public sources."""
from pathlib import Path
import json,gzip,csv,collections,re,math
from bs4 import BeautifulSoup
from shapely.geometry import shape,Point,mapping
from shapely.ops import transform,unary_union
from pyproj import Transformer,Geod
ROOT=Path(__file__).resolve().parents[1];RAW=ROOT/'raw';OUT=ROOT/'processed'
DATE='2026-10-19';geo=Geod(ellps='WGS84');to93=Transformer.from_crs(4326,2154,always_xy=True);to84=Transformer.from_crs(2154,4326,always_xy=True)
def read(name):
 b=(RAW/name).read_bytes();return json.loads(gzip.decompress(b) if b[:2]==b'\x1f\x8b' else b)
def write(name,d): (OUT/name).write_text(json.dumps(d,ensure_ascii=False,indent=2))
def fc(fs):return {'type':'FeatureCollection','features':fs}
def feat(id,xy,props):return {'type':'Feature','id':id,'geometry':{'type':'Point','coordinates':list(xy)},'properties':{'id':id,'retrieved_at':DATE,**props}}
commune=read('commune.json');boundary=shape(commune['geometry']);warnings=[]
def inside(xy):return boundary.covers(Point(xy))
SOURCES={
 'ign':{'name':'IGN · BD ORTHO','url':'https://cartes.gouv.fr/rechercher-une-donnee/dataset/IGNF_BD-ORTHO','format':'WMTS JPEG','license':'Licence Ouverte 2.0','vintage':'Prises de vues 2024 · résolution native 20 cm (Hauts-de-Seine)','note':'Photographie aérienne orthorectifiée ; équivalent visuel d’un fond satellite.','date_url':'https://data.geopf.fr/annexes/ressources/fiches/photographies-aeriennes-RVB/geoportail_dates_des_prises_de_vues_aeriennes-RVB.pdf'},
 'plu':{'name':'Géoportail de l’urbanisme · API Carto IGN','url':'https://www.geoportail-urbanisme.gouv.fr/document/by-id/64ef58d064a2d45604223108ff089d2d','format':'GeoJSON · API Carto','license':'Données publiques GPU · accès libre','vintage':'PLU du 26/06/2024 · publié le 15/01/2025','note':'Zonage du document indiqué en vigueur par le GPU. Lire aussi le règlement, les OAP et les servitudes avant toute conclusion de faisabilité.'},
 'transport':{'name':'Île-de-France Mobilités','url':'https://data.iledefrance-mobilites.fr/explore/dataset/emplacement-des-gares-idf/','format':'API JSON / GeoJSON','license':'Licence Ouverte 2.0','vintage':read('idfm-meta.json')['metas']['default']['modified'][:10],'note':'Un point par gare et par ligne dans la source ; regroupement par zone de correspondance. Pas de station de métro dans Suresnes dans cet extrait.'},
 'education':{'name':'Éducation nationale · Annuaire de l’éducation','url':'https://data.education.gouv.fr/explore/dataset/fr-en-annuaire-education/','format':'API JSON','license':'Licence Ouverte 2.0','vintage':read('schools-meta.json')['metas']['default']['modified'][:10],'note':'Écoles, collèges et lycées ouverts, publics et privés. Une coordonnée hors commune corrigée à partir de l’adresse BAN ; voir journal qualité.'},
 'health':{'name':'Ministère de la Santé · FINESS','url':'https://www.data.gouv.fr/datasets/finess-extraction-du-fichier-des-etablissements','format':'CSV national géolocalisé','license':'Licence Ouverte 2.0','vintage':'Stock au 04/05/2026 · publication 12/05/2026','note':'Sélection des structures de soins : hôpital, SSR, psychiatrie, centres et maison de santé, soins non programmés, dialyse. Les identifiants FINESS représentent des établissements, pas nécessairement des bâtiments distincts.'},
 'osm':{'name':'OpenStreetMap · Overpass','url':'https://www.openstreetmap.org/copyright','format':'API Overpass JSON → GeoJSON','license':'ODbL · © les contributeurs OpenStreetMap','vintage':read('osm.json')['osm3s']['timestamp_osm_base'],'note':'Boulangeries shop=bakery. Base contributive, couverture non certifiée. Les pharmacies sont affichées depuis FINESS, sans additionner les 13 pharmacies OSM.'},
 'broker':{'name':'BNP Paribas Real Estate','url':'https://www.bnppre.fr/a-louer/bureau/hauts-de-seine-92/suresnes-92150/','format':'Pages HTML publiques · extraction ponctuelle','license':'Source commerciale ; pas de licence ouverte identifiée','vintage':DATE,'note':'Échantillon de cinq offres avec adresse, parmi dix cartes d’annonces observées. Les cinq fiches déclarent une disponibilité immédiate. Vacance physique, état locatif et surface réellement libre non confirmés. Pas de synchronisation automatique.'},
 'ban':{'name':'Base Adresse Nationale · Géoplateforme IGN','url':'https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/geocodage/','format':'API GeoJSON','license':'Licence Ouverte 2.0','vintage':DATE,'note':'Géocodage au numéro d’adresse ; ne délimite pas l’emprise du bâtiment.'},
 'boundary':{'name':'API Découpage administratif','url':'https://geo.api.gouv.fr/decoupage-administratif/communes','format':'GeoJSON','license':'Données ouvertes','vintage':DATE,'note':'Périmètre communal Suresnes, code INSEE 92073.'}}
# PLU: retain original polygons without simplification.
zones=read('zones.json')['features'];invalid=[]
for f in zones:
 p=f['properties'];g=shape(f['geometry'])
 if not g.is_valid: invalid.append(f.get('id'))
 q=transform(to93.transform,g);c=to84.transform(*q.representative_point().coords[0]);p.update({'label_point':c,'area_m2':round(q.area),'source':'plu'})
# Stations: one symbol for a physical station, keep line identifiers.
st={}
for r in read('stations.json')['results']:
 xy=(r['geo_point_2d']['lon'],r['geo_point_2d']['lat'])
 if not inside(xy):continue
 key=str(r['id_ref_zdc']);line=r['res_com']
 if key not in st:st[key]=feat('idfm-'+key,xy,{'name':r['nom_gares'],'kind':'transport','lines':[],'source':'transport','source_url':SOURCES['transport']['url'],'precision':'Point de gare IDFM'})
 if line not in st[key]['properties']['lines']:st[key]['properties']['lines'].append(line)
# Schools: preserve IDs; correction is explicit, with original coordinate retained.
schools=[];school_originals=[]
for r in read('schools.json')['results']:
 if r['etat']!='OUVERT' or r['type_etablissement'] not in ['Ecole','Collège','Lycée']:continue
 id=r['identifiant_de_l_etablissement'];xy=[r['longitude'],r['latitude']];precision=r.get('precision_localisation');correction=None
 if not inside(xy):
  school_originals.append({'id':id,'name':r['nom_etablissement'],'coordinates':xy,'reason':'Point source hors commune'})
  corrected=read('geocode-school-'+id+'.json')['features'][0];cp=corrected['properties']
  assert cp['citycode']=='92073' and cp['type']=='housenumber' and cp['housenumber']=='28' and cp['street'].lower()=='rue pagès' and inside(corrected['geometry']['coordinates'])
  correction={'original_coordinates':xy,'method':'BAN via Géoplateforme','address':cp['label'],'score':cp['score'],'ban_id':cp['id']};xy=corrected['geometry']['coordinates'];precision='Adresse BAN au numéro · correction du point source'
 schools.append(feat(id,xy,{'name':r['nom_etablissement'],'kind':'school','category':r['type_etablissement'],'address':r['adresse_1']+', '+r['code_postal']+' Suresnes','status':r['statut_public_prive'],'source':'education','source_url':SOURCES['education']['url'],'precision':precision,'correction':correction}))
# FINESS: join geolocalisation rows by geographic establishment identifier.
rows=list(csv.reader((RAW/'finess.csv').open(encoding='utf-8-sig'),delimiter=';'));geos={r[1]:r for r in rows if r[0]=='geolocalisation'}
communal=[r for r in rows if r[0]=='structureet' and r[12]=='073' and r[13]=='92'];health=[];pharmacies=[]
health_codes={'365','109','292','124','603','617','146'}
for r in communal:
 if r[18] not in health_codes|{'620'}:continue
 g=geos[r[1]];xy=to84.transform(float(g[2]),float(g[3]));assert inside(xy)
 quality=g[4].split(',')[0];kind='pharmacy' if r[18]=='620' else 'health';address=' '.join(x for x in r[7:10] if x)+' '+r[15]
 p={'name':r[3],'kind':kind,'category':r[19],'category_code':r[18],'address':address,'source':'health','source_url':SOURCES['health']['url'],'precision':'Numéro / parcelle (FINESS)' if quality=='1' else 'Rue (FINESS) · localisation approximative','geocode_quality':quality,'coordinate_date':g[5]}
 if quality!='1':warnings.append({'id':r[1],'name':r[3],'issue':'Coordonnée FINESS à la rue ; distance de proximité indicative'})
 (pharmacies if kind=='pharmacy' else health).append(feat('finess-'+r[1],xy,p))
# OSM bakeries, no inferred absence and no mixing with OSM pharmacy duplicates.
bakeries=[];osm_pharmacies=[]
for r in read('osm.json')['elements']:
 xy=(r.get('lon',r.get('center',{}).get('lon')),r.get('lat',r.get('center',{}).get('lat')));assert inside(xy)
 if r['tags'].get('amenity')=='pharmacy':osm_pharmacies.append(r);continue
 if r['tags'].get('shop')!='bakery':continue
 tags=r['tags'];address=' '.join(tags.get(x,'') for x in ['addr:housenumber','addr:street']).strip()
 bakeries.append(feat('osm-'+r['type']+'-'+str(r['id']),xy,{'name':tags.get('name','Boulangerie · nom non renseigné'),'kind':'bakery','category':'Boulangerie','address':address or 'Adresse non renseignée dans OSM','source':'osm','source_url':'https://www.openstreetmap.org/'+r['type']+'/'+str(r['id']),'precision':'Point OSM' if r['type']=='node' else 'Centre de l’objet OSM'}))
# Broker: factual fields only, no photos or descriptions/contacts republished.
offices=[];office_quality=[]
for i,o in enumerate(json.loads((OUT/'broker-selected.json').read_text()),1):
 d=read('geocode-'+o['ref']+'.json')['features'][0];p=d['properties'];xy=d['geometry']['coordinates'];assert p['type']=='housenumber' and p['citycode']=='92073' and inside(xy)
 original=[float(o['lng']),float(o['lat'])];delta=geo.inv(*original,*xy)[2]
 html=BeautifulSoup((RAW/('broker-'+o['ref']+'.html')).read_text(),'html.parser');txt=html.get_text(' ',strip=True);m=re.search(r'Disponibilité\s*:\s*(.*?)\s*Référence',txt)
 availability=m.group(1) if m else 'Non précisée';assert availability=='Immédiate'
 title=' '.join(html.h1.get_text(' ',strip=True).split())
 props={'name':o['subtitle'].split(',')[0].title(),'number':i,'kind':'office','address':o['subtitle'],'surface_label':' '.join(o['surface'].split()),'rent':(o['startingprice']+' '+o['price']+' '+o['price-info']).strip(),'availability_declared':availability,'vacancy_status':'Non confirmée','source':'broker','source_url':o['url'],'precision':'Adresse BAN au numéro ; emprise du bâtiment non vérifiée','ban_label':p['label'],'ban_id':p['id'],'geocode_score':p['score'],'broker_coordinates':original,'broker_ban_distance_m':round(delta,1),'title_source':title}
 if o['ref']=='OLBUR2640542':props['precision']='Adresse 72–74 : repère au 74 via BAN ; emprise non vérifiée'
 offices.append(feat(o['ref'],xy,props));office_quality.append({'id':o['ref'],'source_address':o['subtitle'],'ban_address':p['label'],'score':p['score'],'broker_ban_distance_m':round(delta,1),'citycode':p['citycode'],'type':p['type']})
# Precompute exact ellipsoidal distances and 500m geodesic polygons.
amenities=list(st.values())+schools+health+pharmacies+bakeries
for f in offices:
 x,y=f['geometry']['coordinates'];f['properties']['nearby']=[]
 for a in amenities:
  lon,lat=a['geometry']['coordinates'];dist=geo.inv(x,y,lon,lat)[2]
  if dist<=500:f['properties']['nearby'].append({'id':a['id'],'distance_m':round(dist,1)})
 ring=[geo.fwd(x,y,az,500)[:2] for az in range(0,361,2)]
 f['properties']['radius_geometry']={'type':'Polygon','coordinates':[ring]}
# Check geometries/counts, ensure no IDs duplicated.
assert len(zones)==55 and not invalid
assert len({f['id'] for f in amenities+offices})==len(amenities+offices)
assert len(st)==3 and len(schools)==30 and len(health)==13 and len(pharmacies)==13 and len(bakeries)==18 and len(offices)==5
for name,fs in [('plu',zones),('transport',list(st.values())),('schools',schools),('health',health),('neighborhood',pharmacies+bakeries),('offices',offices)]:write(name+'.geojson',fc(fs))
write('commune.geojson',commune)
quality={'date':DATE,'city':'Suresnes','insee':'92073','counts':{'plu_polygons':len(zones),'plu_labels':len(set(f['properties']['libelle'] for f in zones)),'transport_source_rows_in_city':4,'stations':len(st),'schools_source_rows':33,'schools':len(schools),'schools_corrected':len(school_originals),'finess_source_establishments':len(communal),'health_selected':len(health),'pharmacies_finess':len(pharmacies),'bakeries_osm':len(bakeries),'pharmacies_osm_not_added':len(osm_pharmacies),'broker_cards':10,'broker_without_address':3,'broker_sample':5},'invalid_plu_geometries':invalid,'school_corrections':school_originals,'point_warnings':warnings,'broker_geocoding':office_quality,'health_categories':dict(collections.Counter(f['properties']['category'] for f in health)),'nearby_counts':{f['id']:len(f['properties']['nearby']) for f in offices},'limits':['Les aménités sont limitées à Suresnes : un rayon de 500 m traversant la limite communale ne couvre pas les équipements des communes voisines.','Le rayon est une distance géodésique à vol d’oiseau, pas un trajet piéton ; il dépend de la précision des points sources.','Échantillon d’annonces : aucun taux de vacance communal ne peut être calculé.','Les données constituent un instantané, sans synchronisation automatique.']}
metric_boundary=transform(to93.transform,boundary)
metric_zones=[transform(to93.transform,shape(f['geometry'])) for f in zones]
zone_union=unary_union(metric_zones)
quality['plu_geometry_checks']={'commune_area_km2':round(metric_boundary.area/1e6,6),'coverage_pct':round(100*metric_boundary.intersection(zone_union).area/metric_boundary.area,4),'overlap_m2':round(sum(g.area for g in metric_zones)-zone_union.area,2),'note':'Géométries sources conservées : légers écarts entre le contour communal et le zonage, et petites superpositions ; pas de correction automatique ni de certification parcellaire.'}
write('quality.json',quality);write('sources.json',SOURCES)
print(json.dumps(quality,ensure_ascii=False,indent=2))
