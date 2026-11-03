"""Build a dated, address-level BureauxLocaux snapshot from the reviewed TSV.

Run manually when the source TSV changes. Only numbered Suresnes addresses with
an IGN/BAN housenumber match are mapped; no building footprint is inferred.
"""

import argparse
import csv
import hashlib
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data-source/bureauxlocaux-2026-11-03.tsv"
METADATA = ROOT / "data-source/bureauxlocaux-2026-11-03.json"
GEOCODE_CACHE = ROOT / "data-source/geocoding-bureauxlocaux-2026-11-03.json"
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


def normalize_street(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def geocode(query, cache, refresh, date):
    url = GEOCODER + "?" + urllib.parse.urlencode({"q": query, "limit": 5})
    if refresh:
        with urllib.request.urlopen(url, timeout=20) as response:
            matches = json.load(response)["features"]
        cache[query] = {"url": url, "retrieved_at": date, "features": matches}
        GEOCODE_CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        time.sleep(0.15)
    elif query not in cache:
        raise ValueError("Géocodage absent du cache ; relancer avec --refresh-geocoding : " + query)
    matches = cache[query]["features"]
    wanted, street = query.removesuffix(" 92150 Suresnes").split(" ", 1)
    for match in matches:
        p = match["properties"]
        if (p.get("citycode") == "92073" and p.get("type") == "housenumber"
                and p.get("housenumber") == wanted and p.get("score", 0) >= 0.7
                and normalize_street(p.get("street", "")) == normalize_street(street)):
            return match, url
    return None, url


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh-geocoding", action="store_true")
    args = parser.parse_args()
    metadata = json.loads(METADATA.read_text(encoding="utf-8"))
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == metadata["source_sha256"]
    with SOURCE.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream, delimiter="\t"))
    assert len(rows) == metadata["cards_seen"] == metadata["heading_count"]
    assert len({r["id"] for r in rows}) == len(rows)
    assert all(r["chemin"].endswith(r["id"]) for r in rows)
    assert all(r["type"] in {"bureau", "coworking", "commerce"} for r in rows)
    grouped = defaultdict(list)
    excluded = []
    cache = {}
    geocode_cache = json.loads(GEOCODE_CACHE.read_text(encoding="utf-8")) if GEOCODE_CACHE.exists() else {}
    for row in rows:
        if row["type"] == "commerce":
            excluded.append({"id": row["id"], "reason": "Annonce classée commerce", "address_display": row["adresse_affichee"], "url": BASE + row["chemin"]})
            continue
        query = address_to_query(row["adresse_affichee"])
        if not query:
            excluded.append({"id": row["id"], "reason": "Numéro de rue non publié", "address_display": row["adresse_affichee"], "url": BASE + row["chemin"]})
            continue
        if query not in cache:
            cache[query] = geocode(query, geocode_cache, args.refresh_geocoding, metadata["retrieved_at"])
        match, geo_url = cache[query]
        if not match:
            excluded.append({"id": row["id"], "reason": "Aucun point BAN concordant au numéro et à la voie dans Suresnes", "address_display": row["adresse_affichee"], "url": BASE + row["chemin"]})
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
                "retrieved_at": metadata["retrieved_at"],
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
        "source_page": metadata["source_page"],
        "retrieved_at": metadata["retrieved_at"],
        "heading_count": metadata["heading_count"],
        "source_sha256": metadata["source_sha256"],
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
