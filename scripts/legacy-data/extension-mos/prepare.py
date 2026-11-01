"""Build the Suresnes MOS office and likely mixed-use map layers.

Inputs are dated extracts in this folder. Run with the project's GIS venv:
  recherches/suresnes-donnees-2026-10-19/.venv/bin/python3 recherches/mos-suresnes-2026-10-29/prepare.py
"""

import hashlib
import json
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import Point, mapping, shape
from shapely.ops import transform
from shapely import wkt

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
SITE_DATA = ROOT / "sites/carte-couches-suresnes/dist/data"
TO_METERS = Transformer.from_crs(4326, 2154, always_xy=True).transform
TO_LONLAT = Transformer.from_crs(2154, 4326, always_xy=True).transform


def read_json(name):
    return json.loads((HERE / name).read_text())


def save_geojson(name, features):
    payload = {"type": "FeatureCollection", "features": features}
    (SITE_DATA / name).write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")


mos_records = read_json("mos-bureaux-2025.json")["results"]
commerce_records = read_json("bpe-commerces-suresnes-2025.json")["results"]
building_records = read_json("bdnb-groupes-suresnes.json")
building_usages = read_json("bdnb-usages-suresnes.json")
commune = shape(json.loads((SITE_DATA / "commune.geojson").read_text())["geometry"])
commune_m = transform(TO_METERS, commune)

assert len(mos_records) == 25
assert all(m["insee"] == 92073 and m["mos2025"] == 45 and m["2025poste"] == "Bureaux" for m in mos_records)
assert len(commerce_records) == 203
assert all(b["depcom"] == 92073 and b["dom"] == "B" and b["an"] == "2025" for b in commerce_records)
assert len(building_records) == 4194

mos_polygons = []
office_features = []
for index, record in enumerate(mos_records, start=1):
    geometry_m = transform(TO_METERS, shape(record["geo_shape"]["geometry"]))
    clipped_m = geometry_m.intersection(commune_m)
    assert not clipped_m.is_empty and clipped_m.is_valid
    mos_polygons.append(geometry_m)
    office_features.append({
        "type": "Feature",
        "id": f"mos-2025-92073-45-{index:02d}",
        "properties": {
            "class_code": 45,
            "class_name": "Bureaux",
            "year": 2025,
            "area_m2": round(clipped_m.area),
            "area_source_m2": round(record["st_area_sh"]),
            "scope": "Emprise d'occupation du sol, pas contour certifié d'un bâtiment",
        },
        "geometry": mapping(transform(TO_LONLAT, clipped_m)),
    })

# The BPE also contains electric charging stations (B326), which are not shops
# in the intended sense. Keep only well geocoded, published shops with a SIRET.
shops = []
for record in commerce_records:
    if record["statut_diffusion"] != "O" or record["qualite_xy"] != "B" or record["typequ"] == "B326" or not record.get("siret"):
        continue
    if record.get("lambert_x") is None or record.get("lambert_y") is None:
        continue
    point = Point(record["lambert_x"], record["lambert_y"])
    if commune_m.covers(point):
        shops.append((record, point))

mixed_features = []
for building in building_records:
    building_id = building["batiment_groupe_id"]
    if building_usages.get(building_id) != "Tertiaire":
        continue
    geometry_m = wkt.loads(building["geom_groupe"])
    if not geometry_m.is_valid:
        geometry_m = geometry_m.buffer(0)
    if geometry_m.is_empty or geometry_m.area < 1000 or not commune_m.covers(geometry_m.representative_point()):
        continue
    overlap = [(i, geometry_m.intersection(polygon).area / geometry_m.area)
               for i, polygon in enumerate(mos_polygons)]
    mos_index, ratio = max(overlap, key=lambda pair: pair[1])
    if ratio < .90:
        continue
    # A shop point within two metres of this building group is an address
    # alignment, not proof that commerce and offices share a legal building.
    found = [record for record, point in shops if geometry_m.distance(point) <= 2]
    if not found:
        continue
    seen = set()
    commerces = []
    for record in found:
        siret = str(record["siret"])
        if siret in seen:
            continue
        seen.add(siret)
        commerces.append({
            "name": record["cnomrs"] or record["nomrs"],
            "type": record["lib_equ"],
            "address": " ".join(str(x) for x in [record["numvoie"], record["typvoie"], record["libvoie"]] if x),
            "siret": siret,
        })
    mixed_features.append({
        "type": "Feature",
        "id": building_id,
        "properties": {
            "status": "Mixité bureau-commerce probable · à vérifier",
            "bdnb_usage": "Tertiaire",
            "mos_class": "Bureaux",
            "mos_office_id": office_features[mos_index]["id"],
            "mos_overlap_pct": round(ratio * 100),
            "footprint_m2": round(geometry_m.area),
            "bpe_shops": commerces,
            "uncertainty": "Le Mos qualifie une emprise et la BDNB un groupe de bâtiments ; le commerce BPE est géolocalisé à proximité immédiate. La présence de bureaux dans le même bâtiment n'est pas confirmée par un état locatif ou un relevé des locaux.",
        },
        "geometry": mapping(transform(TO_LONLAT, geometry_m.intersection(commune_m))),
    })

mixed_features.sort(key=lambda feature: feature["properties"]["bpe_shops"][0]["address"])
assert len(mixed_features) == 3, [(f["id"], f["properties"]["bpe_shops"]) for f in mixed_features]
assert len({f["id"] for f in mixed_features}) == 3
save_geojson("mos-offices.geojson", office_features)
save_geojson("mixed-buildings.geojson", mixed_features)

quality = {
    "checked_at": "2026-10-29",
    "territory": "Suresnes (INSEE 92073)",
    "mos_year": 2025,
    "mos_office_class": 45,
    "mos_office_polygons": len(office_features),
    "mos_office_area_m2_clipped": round(sum(f["properties"]["area_m2"] for f in office_features)),
    "bpe_year": 2025,
    "bpe_commerces_considered": len(commerce_records),
    "bdnb_release": "2026-02.b / schema v0.7.12",
    "bdnb_building_groups_suresnes": len(building_records),
    "candidate_mixed_buildings": len(mixed_features),
    "criteria": "BDNB usage principal Tertiaire, emprise >= 1000 m², >= 90 % dans un polygone MOS 2025 code 45, commerce BPE 2025 géolocalisé à <= 2 m de l'emprise, SIRET et qualité XY B ; bornes communales contrôlées.",
    "status": "Candidats spatiaux, pas bâtiments mixtes certifiés",
    "candidates": [{"bdnb_id": f["id"], "mos_office_id": f["properties"]["mos_office_id"], "shops": f["properties"]["bpe_shops"]} for f in mixed_features],
    "source_files_sha256": {name: hashlib.sha256((HERE / name).read_bytes()).hexdigest() for name in [
        "mos-bureaux-2025.json", "bpe-commerces-suresnes-2025.json", "bdnb-groupes-suresnes.json", "bdnb-usages-suresnes.json"]},
}
(SITE_DATA / "mos-quality.json").write_text(json.dumps(quality, ensure_ascii=False, indent=2) + "\n")
print(f"MOS offices: {len(office_features)} polygons; mixed-use candidates: {len(mixed_features)}")
for feature in mixed_features:
    print(feature["id"], feature["properties"]["bpe_shops"][0]["address"])
