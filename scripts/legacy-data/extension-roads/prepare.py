import json,zipfile
from pathlib import Path
from shapely.geometry import shape,mapping,LineString,MultiLineString
from shapely.ops import unary_union,transform
from pyproj import Transformer
root=Path(__file__).resolve().parent
site=root.parents[1]/'sites/carte-couches-suresnes'
dest=site/'dist/data'
raw=json.loads((root/'osm-roads.json').read_text())
city=shape(json.loads((dest/'commune.geojson').read_text())['geometry'])
extent=shape(json.loads((dest/'transport-extent.geojson').read_text())['geometry'])
offices=json.loads((dest/'offices.geojson').read_text())['features']
metric=Transformer.from_crs(4326,2154,always_xy=True).transform
official='https://www.hauts-de-seine.fr/toutes-les-actualites/detail/a-suresnes-le-boulevard-washington-fait-place-au-velo'
definitions=[
 ('quais','Quais de Seine',['Quai Gallieni','D 7 Quai Gallieni','Quai Léon Blum','Quai Marcel Dassault','Quai de Dion Bouton','Quai Dion Bouton'],'RD 7'),
 ('henri-sellier','Boulevard Henri-Sellier',['Boulevard Henri Sellier','Pont de Suresnes','Boulevard de la République','Route de Suresnes'],'RD 985 / liaison pont de Suresnes'),
 ('washington','Boulevard Washington',['Boulevard Washington','Rue Paul Vaillant-Couturier / Boulevard Washington','Route des Fusillés de la Résistance','Rue des Fusillés de la Résistance'],'RD 5'),
 ('franklin-roosevelt','Avenue Franklin-Roosevelt',['Avenue Franklin Roosevelt'],'RD 3')]
def lines(g):
 if g.is_empty:return []
 if g.geom_type=='LineString':return [g]
 if hasattr(g,'geoms'):return [l for c in g.geoms for l in lines(c)]
 return []
def geom(g):
 ls=lines(g)
 return mapping(MultiLineString(ls)) if ls else None
features=[]
audit=[]
for ident,name,names,ref in definitions:
 ways=[e for e in raw['elements'] if e.get('tags',{}).get('name') in names]
 parts=[];ids=[]
 for w in ways:
  clipped=LineString([(p['lon'],p['lat']) for p in w['geometry']]).intersection(extent)
  ls=lines(clipped)
  if ls:parts+=ls;ids.append(w['id'])
 g=unary_union(parts)
 assert not g.is_empty and g.is_valid
 assert g.difference(extent.buffer(1e-9)).is_empty
 near={f['id']:geom(g.intersection(shape(f['properties']['radius_geometry']))) for f in offices}
 features.append({'type':'Feature','id':'road-'+ident,'properties':{'kind':'road','name':name,'ref':ref,'streets':names,'osm_way_ids':ids,'source':'roads','source_url':'https://www.openstreetmap.org/copyright','official_url':official if ident!='quais' else 'https://www.hauts-de-seine.fr/rd7-1','extracted_at':'2026-10-22','length_m':round(transform(metric,g).length),'radius_geometries':near},'geometry':geom(g)})
 audit.append({'axis':name,'osm_way_count':len(ids),'length_m':round(transform(metric,g).length),'parts':len(lines(g)),'outside_city_length_m':round(transform(metric,g.difference(city)).length)})
out={'type':'FeatureCollection','features':features}
(dest/'roads.geojson').write_text(json.dumps(out,ensure_ascii=False))
sources=json.loads((dest/'sources.json').read_text())
sources['roads']={'name':'OpenStreetMap · sélection recoupée avec le Département des Hauts-de-Seine','url':'https://www.openstreetmap.org/copyright','format':'GeoJSON / Overpass API','license':'ODbL 1.0 · © contributeurs OpenStreetMap','vintage':'Extraction du 22 octobre 2026','note':'4 axes choisis : quais de Seine, Henri-Sellier et pont, Washington, Franklin-Roosevelt. Géométries OSM découpées à la commune et à une bande de 500 m autour de ses limites ; les prolongements suivent les quais de Dion Bouton, le boulevard de la République, la route de Suresnes et la route/rue des Fusillés de la Résistance. Franklin-Roosevelt reste un axe intérieur à la commune ; sélection qualitative, sans classement par trafic. Au clic sur un bureau, seuls les tronçons dans le rayon de 500 m sont affichés.','official_sources':[official,'https://www.hauts-de-seine.fr/rd7-1'],'osm_base_timestamp':raw.get('osm3s',{}).get('timestamp_osm_base')}
(dest/'sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2))
q=json.loads((dest/'quality.json').read_text());q['roads']={'extracted_at':'2026-10-22','axes':audit,'invalid_geometries':0,'outside_500m_extent':0,'method':'Exact OSM names including connected continuations, union and intersection with commune + 500m in Lambert-93; precomputed intersection with existing geodesic 500m polygons. Length in Lambert-93 includes separate carriageways. No traffic ranking.'}
(dest/'quality.json').write_text(json.dumps(q,ensure_ascii=False,indent=2))
(root/'validation.json').write_text(json.dumps(q['roads'],ensure_ascii=False,indent=2))
z=dest/'suresnes-donnees.zip'
with zipfile.ZipFile(z) as original: entries={n:original.read(n) for n in original.namelist()}
for n in ['roads.geojson','sources.json','quality.json']:
 entries.pop('data/'+n,None)
 entries['processed/'+n]=(dest/n).read_bytes()
for n in ['collect.py','prepare.py','query.overpass','osm-roads.json','osm-roads-city-original.json','validation.json']:entries['extension-roads/'+n]=(root/n).read_bytes()
with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as archive:
 for n,b in entries.items():archive.writestr(n,b)
print(json.dumps(audit,ensure_ascii=False))
