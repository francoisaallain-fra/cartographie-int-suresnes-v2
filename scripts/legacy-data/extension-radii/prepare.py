import json,zipfile
from pathlib import Path
from shapely.geometry import shape,mapping,Polygon,MultiLineString
from pyproj import Geod
root=Path(__file__).resolve().parent;dest=root.parents[1]/'sites/carte-couches-suresnes/dist/data'
def read(n):return json.loads((dest/n).read_text())
geod=Geod(ellps='WGS84')
points=sum([read(n+'.geojson')['features'] for n in ['transport','schools','nurseries','health','neighborhood']],[])
roads=read('roads.geojson')['features'];rail=read('rail.geojson')['features']
def parts(g):
 if g.is_empty:return []
 if g.geom_type=='LineString':return [g]
 return [l for sub in getattr(g,'geoms',[]) for l in parts(sub)]
def clip(g,poly):
 ls=parts(shape(g).intersection(poly))
 return mapping(MultiLineString(ls)) if ls else None
out={'min':300,'max':1000,'step':50,'default':500,'offices':{}}
for o in read('offices.geojson')['features']:
 lon,lat=o['geometry']['coordinates']
 distances=[]
 for p in points:
  x,y=p['geometry']['coordinates'];_,_,d=geod.inv(lon,lat,x,y)
  distances.append({'id':p['id'],'distance_m':d})
 scenarios={}
 for radius in range(300,1001,50):
  ring=[list(geod.fwd(lon,lat,angle,radius)[:2]) for angle in range(0,360,2)]
  ring.append(ring[0]);poly=Polygon(ring);assert poly.is_valid
  near=[dict(id=p['id'],distance_m=round(p['distance_m'],2)) for p in distances if p['distance_m']<=radius]
  scenarios[str(radius)]={'geometry':mapping(poly),'nearby':sorted(near,key=lambda p:p['distance_m']),'roads':{f['id']:clip(f['geometry'],poly) for f in roads},'rail':{f['id']:clip(f['geometry'],poly) for f in rail}}
 out['offices'][o['id']]=scenarios
(dest/'radii.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
q=read('quality.json');q['adjustable_radius']={'min_m':300,'max_m':1000,'step_m':50,'default_m':500,'method':'WGS84 geodesic distances and circles sampled every 2 degrees; Shapely clipping of existing roads/rail. No extension of source coverage.'}
(dest/'quality.json').write_text(json.dumps(q,ensure_ascii=False,indent=2))
s=read('sources.json');s['roads']['note']=s['roads']['note'].replace('rayon de 500 m','rayon sélectionné (300 m à 1 km)')
(dest/'sources.json').write_text(json.dumps(s,ensure_ascii=False,indent=2))
z=dest/'suresnes-donnees.zip'
with zipfile.ZipFile(z) as a:entries={n:a.read(n) for n in a.namelist()}
for n in ['radii.json','quality.json','sources.json']:entries['processed/'+n]=(dest/n).read_bytes()
entries['extension-radii/prepare.py']=Path(__file__).read_bytes()
with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as a:
 for n,b in entries.items():a.writestr(n,b)
print({id:{r:len(sc['nearby']) for r,sc in vals.items() if r in ['300','500','1000']} for id,vals in out['offices'].items()})
