"""Extract Mos 2025 classes 6, 7 and 8 (12-post nomenclature) for Suresnes.

Run with recherches/suresnes-donnees-2026-10-19/.venv/bin/python3.
The API response is kept alongside this script for reproducibility.
"""
import hashlib
import json
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import mapping, shape
from shapely.ops import transform

HERE = Path(__file__).resolve().parent
SITE_DATA = HERE.parents[1] / "sites/carte-couches-suresnes/dist/data"
API = "https://data.iledefrance.fr/api/explore/v2.1/catalog/datasets/mos-occupation-du-sol-2025-and-2021-en-79-postes-de-la-region-ile-de-france/records"
WHERE = "insee=92073 and mos2025>=28 and mos2025<=45"
CLASSES = {
    6: ("Habitat pavillonnaire", range(28, 31), "mos-pavillonnaire.geojson"),
    7: ("Habitat collectif", range(31, 36), "mos-collectif.geojson"),
    8: ("Activités", range(36, 46), "mos-activites.geojson"),
}
TO_METERS = Transformer.from_crs(4326, 2154, always_xy=True).transform
TO_LONLAT = Transformer.from_crs(2154, 4326, always_xy=True).transform


def fetch():
    records = []
    total = None
    for offset in range(0, 1000, 100):
        url = API + "?" + urllib.parse.urlencode({"where": WHERE, "limit": 100, "offset": offset})
        with urllib.request.urlopen(url, timeout=60) as response:
            page = json.load(response)
        total = page["total_count"]
        records.extend(page["results"])
        if len(records) >= total:
            break
    assert len(records) == total == 513, (len(records), total)
    (HERE / "mos-6-7-8-2025.json").write_text(json.dumps({"total_count": total, "results": records}, ensure_ascii=False, separators=(",", ":")) + "\n")
    return records


raw = HERE / "mos-6-7-8-2025.json"
records = json.loads(raw.read_text())["results"] if raw.exists() else fetch()
assert len(records) == 513
commune = shape(json.loads((SITE_DATA / "commune.geojson").read_text())["geometry"])
commune_m = transform(TO_METERS, commune)
counts = Counter()
areas = Counter()
features = {key: [] for key in CLASSES}
missing_geometry = []
for index, record in enumerate(records, 1):
    code = record["mos2025"]
    category = next((key for key, (_, codes, _) in CLASSES.items() if code in codes), None)
    assert category is not None and record["insee"] == 92073, (index, code)
    if not record.get("geo_shape"):
        missing_geometry.append({"record_index": index, "class_code": code, "class_name": record["2025poste"],
                                 "source_area_m2": record["st_area_sh"], "point": record["geo_point_2d"]})
        continue
    geom = transform(TO_METERS, shape(record["geo_shape"]["geometry"]))
    if not geom.is_valid:
        geom = geom.buffer(0)
    clipped = geom.intersection(commune_m)
    assert not clipped.is_empty and clipped.is_valid, index
    area = round(clipped.area)
    counts[category] += 1
    areas[category] += area
    features[category].append({
        "type": "Feature",
        "id": f"mos-2025-92073-{code}-{index:03d}",
        "properties": {"group_code": category, "group_name": CLASSES[category][0], "class_code": code,
                       "class_name": record["2025poste"], "year": 2025, "area_m2": area,
                       "scope": "Emprise d'occupation du sol, pas contour certifié d'un bâtiment"},
        "geometry": mapping(transform(TO_LONLAT, clipped)),
    })
for key, (_, _, filename) in CLASSES.items():
    (SITE_DATA / filename).write_text(json.dumps({"type": "FeatureCollection", "features": features[key]}, ensure_ascii=False, separators=(",", ":")) + "\n")
quality = {"checked_at": "2026-10-29", "territory": "Suresnes (INSEE 92073)", "mos_year": 2025,
           "classification": "Mos 2025, 12 postes; codes 6=28-30, 7=31-35, 8=36-45 dans la nomenclature en 79 postes",
           "source_url": "https://data.iledefrance.fr/explore/dataset/mos-occupation-du-sol-2025-and-2021-en-79-postes-de-la-region-ile-de-france/",
           "source_query": WHERE, "source_count": len(records), "mapped_count": sum(counts.values()),
           "missing_geometry": missing_geometry,
           "raw_sha256": hashlib.sha256(raw.read_bytes()).hexdigest(),
           "groups": {str(key): {"name": CLASSES[key][0], "features": counts[key], "area_m2_clipped": areas[key],
                                 "class_counts": dict(Counter(f["properties"]["class_code"] for f in features[key]))} for key in CLASSES},
           "limitations": "Occupation du sol en 2025; unités cartographiques, pas bâtiments ni usages certifiés au local. Le groupe 8 inclut le poste 45 Bureaux déjà montré séparément."}
(SITE_DATA / "mos-groups-quality.json").write_text(json.dumps(quality, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(quality["groups"], ensure_ascii=False))
