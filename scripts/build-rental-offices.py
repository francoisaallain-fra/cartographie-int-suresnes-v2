"""Build a dated, address-level BureauxLocaux snapshot from the reviewed TSV.

Run manually when the source TSV changes. Only numbered Suresnes addresses with
an IGN/BAN housenumber match are mapped; no building footprint is inferred.
"""

import csv
import json
import re
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data-source/bureauxlocaux-2026-11-02.tsv"
OUTPUT = ROOT / "public/data/rental-offices.geojson"
QUALITY = ROOT / "public/data/rental-offices-quality.json"
BASE = "https://www.bureauxlocaux.com"
GEOCODER = "https://data.geopf.fr/geocodage/search/"


def address_to_query(display):
    text = display.split(", 92150 Suresnes")[0]
    match = re.search(r"(?<!\d)(\d+(?:-\d+)?)\s+(Rue|Boulevard|Quai|Allée|Avenue)\b.*", text, re.I)
    if not match:
        return None
    street = match.group(0)
    # A numbered range is represented by one numbered entrance, not its midpoint.
    if "-" in match.group(1):
        start, end = match.group(1).split("-")
        street = end + street[len(match.group(1)) :] if match.group(2).lower() == "rue" else start + street[len(match.group(1)) :]
    return street + " 92150 Suresnes"


def geocode(query):
    url = GEOCODER + "?" + urllib.parse.urlencode({"q": query, "limit": 5})
    with urllib.request.urlopen(url, timeout=20) as response:
        matches = json.load(response)["features"]
    wanted = query.split()[0]
    for match in matches:
        p = match["properties"]
        if p.get("citycode") == "92073" and p.get("type") == "housenumber" and p.get("housenumber") == wanted:
            return match, url
    return None, url


def main():
    with SOURCE.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream, delimiter="\t"))
    assert len(rows) == 53 and len({r["id"] for r in rows}) == 53
    assert all(r["chemin"].endswith(r["id"]) for r in rows)
    grouped = defaultdict(list)
    excluded = []
    cache = {}
    for row in rows:
        if row["type"] == "commerce":
            excluded.append({"id": row["id"], "reason": "Annonce classée commerce"})
            continue
        query = address_to_query(row["adresse_affichee"])
        if not query:
            excluded.append({"id": row["id"], "reason": "Numéro de rue non publié"})
            continue
        if query not in cache:
            cache[query] = geocode(query)
            time.sleep(0.15)
        match, geo_url = cache[query]
        if not match:
            excluded.append({"id": row["id"], "reason": "Aucun point BAN au numéro dans Suresnes"})
            continue
        p = match["properties"]
        grouped[p["id"]].append((row, match, geo_url, query))
    features = []
    for ban_id, items in sorted(grouped.items(), key=lambda entry: entry[1][0][1]["properties"]["label"]):
        _, match, geo_url, _ = items[0]
        properties = match["properties"]
        features.append({
            "type": "Feature",
            "id": "rental-" + ban_id,
            "geometry": match["geometry"],
            "properties": {
                "kind": "rentalOffice",
                "name": properties["name"],
                "address": properties["label"],
                "ban_id": ban_id,
                "geocode_score": properties["score"],
                "geocode_url": geo_url,
                "retrieved_at": "2026-11-02",
                "precision": "Point BAN au numéro ; entrée et emprise de l'immeuble non vérifiées",
                "listings": [{
                    "id": row["id"],
                    "type": row["type"],
                    "surface_display": row["surface_affichee"],
                    "rent_display": row["loyer_affiche"],
                    "address_display": row["adresse_affichee"],
                    "url": BASE + row["chemin"],
                    "address_note": "Plage de numéros : point représentatif au numéro " + query.split()[0]
                    if re.search(r"\d+-\d+", row["adresse_affichee"]) else None,
                } for row, _, _, query in items],
            },
        })
    collection = {"type": "FeatureCollection", "features": features}
    quality = {
        "source_page": "https://www.bureauxlocaux.com/recherche/?transaction_type=rental&realty_type=office&location=48.876199%7C2.238858%7C48.863129%7C2.217272&location_type=map_moved_boundaries&location_dept=D92&location_zip_code=92150&location_label=92150+Suresnes&ne_lat=48.876199&ne_lng=2.238858&sw_lat=48.863129&sw_lng=2.217272&lat=48.8704428&lng=2.21815&geocode_loc=Suresnes&geocode_loc_type=city&zoom=15&is_fallback_result=false",
        "retrieved_at": "2026-11-02",
        "cards_seen": len(rows),
        "mapped_listings": sum(len(f["properties"]["listings"]) for f in features),
        "mapped_address_points": len(features),
        "excluded": excluded,
        "notes": [
            "Annonces publiques déclaratives : disponibilité et surfaces non confirmées auprès des annonceurs.",
            "Un point BAN au numéro ne certifie ni l'entrée ni l'emprise exacte du bâtiment.",
            "Les annonces répétées à une adresse sont regroupées sans additionner les surfaces.",
            "La page peut évoluer ; instantané ponctuel sans synchronisation ni exhaustivité garantie.",
        ],
    }
    OUTPUT.write_text(json.dumps(collection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    QUALITY.write_text(json.dumps(quality, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(rows)} annonces, {quality['mapped_listings']} cartographiées sur {len(features)} points ; {len(excluded)} écartées")


if __name__ == "__main__":
    main()
