#!/usr/bin/env python3
"""Extract the official Suresnes office-retention prescription without redrawing it."""

import hashlib
import json
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform


ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).parent / "sources" / "prescription-surf.json"
SITE_DATA = ROOT / "sites" / "carte-couches-suresnes" / "dist" / "data"
DOCUMENT_ID = "64ef58d064a2d45604223108ff089d2d"
DOCUMENT_URL = f"https://www.geoportail-urbanisme.gouv.fr/document/by-id/{DOCUMENT_ID}"
RULE_URL = (
    "https://data.geopf.fr/annexes/gpu/documents/DU_92073/"
    f"{DOCUMENT_ID}/92073_reglement_20240626.pdf#page=9"
)
PLAN_URL = (
    "https://data.geopf.fr/annexes/gpu/documents/DU_92073/"
    f"{DOCUMENT_ID}/92073_reglement_graphique_20240626.pdf"
)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    raw = json.loads(SOURCE.read_text())
    assert raw["type"] == "FeatureCollection"
    assert len(raw["features"]) == 603, "Check for a new GPU version or collection"
    selected = [
        feature for feature in raw["features"]
        if feature["properties"].get("txt") == "SUR_BUREAU"
        and feature["properties"].get("libelle") == "Maintien des surfaces de bureau"
        and feature["properties"].get("gpu_doc_id") == DOCUMENT_ID
        and feature["properties"].get("idurba") == "92073_PLU_20240626"
    ]
    assert len(selected) == 5, "The official five-perimeter prescription changed"
    selected.sort(key=lambda feature: feature["properties"]["gid"])

    commune = shape(json.loads((SITE_DATA / "commune.geojson").read_text())["geometry"])
    to_l93 = Transformer.from_crs(4326, 2154, always_xy=True).transform
    output = []
    areas = []
    for feature in selected:
        geometry = shape(feature["geometry"])
        assert geometry.is_valid and not geometry.is_empty
        assert commune.covers(geometry), "Official prescription falls outside Suresnes"
        area = round(transform(to_l93, geometry).area)
        assert area > 0
        areas.append(area)
        output.append({
            "type": "Feature",
            "id": f"plu-bureaux-{feature['properties']['gid']}",
            "geometry": feature["geometry"],
            "properties": {
                "source_gid": feature["properties"]["gid"],
                "libelle": feature["properties"]["libelle"],
                "source_code": "SUR_BUREAU",
                "area_m2": area,
                "document": "92073_PLU_20240626",
                "rule": "Dispositions générales, article 14, page imprimée 8 (PDF page 9)",
                "rule_url": RULE_URL,
                "plan_url": PLAN_URL,
            },
        })

    geojson = {"type": "FeatureCollection", "features": output}
    target = SITE_DATA / "plu-maintien-bureaux.geojson"
    target.write_text(json.dumps(geojson, ensure_ascii=False, separators=(",", ":")) + "\n")

    quality = {
        "extracted_on": "2026-10-29",
        "document_id": DOCUMENT_ID,
        "document_url": DOCUMENT_URL,
        "document_version": "92073_PLU_20240626",
        "gpu_status_checked": "En vigueur, version 4, publié le 15/01/2025",
        "source_endpoint": "https://apicarto.ign.fr/api/gpu/prescription-surf?partition=DU_92073",
        "source_feature_count": len(raw["features"]),
        "selection": "txt=SUR_BUREAU; libelle=Maintien des surfaces de bureau; gpu_doc_id et idurba égaux au document en vigueur",
        "selected_feature_count": len(output),
        "source_gids": [feature["properties"]["source_gid"] for feature in output],
        "areas_m2_lambert93": areas,
        "total_area_m2_lambert93": sum(areas),
        "geometry_valid_and_in_commune": True,
        "geometry_handling": "Coordonnées officielles conservées, sans simplification ni généralisation",
        "graphic_plan_url": PLAN_URL,
        "rule_url": RULE_URL,
        "rule_scope": "Transformation de surfaces existantes de bureaux dans les secteurs rouges; autres destinations listées admises; exception des surfaces existantes inférieures à 100 m²",
        "source_sha256": sha256(SOURCE),
        "rule_pdf_sha256": sha256(Path(__file__).parent / "sources" / "reglement-20240626.pdf"),
        "plan_pdf_sha256": sha256(Path(__file__).parent / "sources" / "reglement-graphique-20240626.pdf"),
        "output_sha256": sha256(target),
    }
    (SITE_DATA / "plu-maintien-quality.json").write_text(json.dumps(quality, ensure_ascii=False, indent=2) + "\n")
    overall_path = SITE_DATA / "quality.json"
    overall = json.loads(overall_path.read_text())
    overall["plu_office_retention_2024"] = {
        "checked_at": quality["extracted_on"],
        "document": quality["document_version"],
        "gpu_status": quality["gpu_status_checked"],
        "perimeter_count": len(output),
        "total_area_m2_lambert93": sum(areas),
        "geometry_valid_and_in_commune": True,
        "rule": "Dispositions générales, article 14 : transformation des surfaces de bureaux existantes encadrée, avec usages permis et exception en dessous de 100 m²",
        "detailed_quality_file": "plu-maintien-quality.json",
    }
    overall_path.write_text(json.dumps(overall, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(output)} perimeters, {sum(areas)} m², {target}")


if __name__ == "__main__":
    main()
