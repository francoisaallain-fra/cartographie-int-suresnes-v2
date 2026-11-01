"""Replace the displayed office addresses using the archived BAN responses.

The previous broker sample remains in Git history and the original research
folder; no broker surfaces, rents or availability claims are carried over.
"""

import json
import runpy
import zipfile
from pathlib import Path

from shapely.geometry import Point, shape


root = Path(__file__).resolve().parent
project = root.parents[1]
dest = project / 'sites/carte-couches-suresnes/dist/data'
evidence = json.loads((root / 'geocodage-ban.json').read_text())
commune = shape(json.loads((dest / 'commune.geojson').read_text())['geometry'])

features = []
checks = []
for number, record in enumerate(evidence['records'], start=1):
    candidates = record['response']['features']
    matches = [f for f in candidates if f['properties'].get('citycode') == '92073'
               and f['properties'].get('type') == 'housenumber']
    if not matches:
        raise ValueError(f"Aucune adresse au numéro à Suresnes : {record['supplied_address']}")
    match = matches[0]
    properties = match['properties']
    coordinates = match['geometry']['coordinates']
    if not commune.covers(Point(coordinates)):
        raise ValueError(f"Adresse hors de Suresnes : {properties['label']}")
    postcode_corrected = properties['postcode'] not in record['supplied_address']
    address_note = (
        "La liste fournie indique 92210 Suresnes ; la Base Adresse Nationale "
        "référence ce numéro au 92150 Suresnes."
        if postcode_corrected else None
    )
    feature_id = f"ban-{properties['id']}"
    features.append({
        'type': 'Feature', 'id': feature_id,
        'geometry': {'type': 'Point', 'coordinates': coordinates},
        'properties': {
            'id': feature_id,
            'number': number,
            'kind': 'office',
            'origin': 'provided_address',
            'name': properties['name'],
            'address': properties['label'],
            'input_address': record['supplied_address'],
            'address_note': address_note,
            'vacancy_status': 'Non vérifiée',
            'source': 'provided_addresses',
            'source_url': record['request_url'],
            'retrieved_at': evidence['accessed_at'],
            'ban_label': properties['label'],
            'ban_id': properties['id'],
            'geocode_score': properties['score'],
            'precision': 'Point BAN au numéro ; emprise du bâtiment non vérifiée',
        },
    })
    checks.append({
        'id': feature_id,
        'supplied_address': record['supplied_address'],
        'ban_address': properties['label'],
        'ban_id': properties['id'],
        'score': properties['score'],
        'coordinates': coordinates,
        'postcode_corrected': postcode_corrected,
        'inside_suresnes': True,
    })

(dest / 'offices.geojson').write_text(json.dumps({
    'type': 'FeatureCollection', 'features': features,
}, ensure_ascii=False, indent=2) + '\n')

sources = json.loads((dest / 'sources.json').read_text())
sources['provided_addresses'] = {
    'name': 'Adresses fournies · géocodage BAN',
    'url': 'https://adresse.data.gouv.fr/outils/api-doc/adresse',
    'format': 'Quatre adresses communiquées ; coordonnées du géocodeur Géoplateforme/BAN',
    'license': 'Liste fournie pour ce test ; BAN, Licence Ouverte',
    'vintage': '28 octobre 2026',
    'note': 'Quatre adresses au numéro dans Suresnes. Le 2 rue de la République est au 92150 selon la BAN, et non au 92210 indiqué dans la liste. Aucun bureau vacant ou disponible n’est établi par cette liste.',
}
(dest / 'sources.json').write_text(json.dumps(sources, ensure_ascii=False, indent=2) + '\n')

quality = json.loads((dest / 'quality.json').read_text())
quality['original_collection_date'] = quality.get('original_collection_date', quality['date'])
quality['date'] = evidence['accessed_at']
old_counts = {key: quality['counts'].pop(key) for key in
              ['broker_cards', 'broker_without_address', 'broker_sample']
              if key in quality['counts']}
old_geocoding = quality.pop('broker_geocoding', [])
if old_counts or old_geocoding:
    quality['historical_broker_sample_2026_10_19'] = {
        'counts': old_counts,
        'geocoding': old_geocoding,
        'status': 'Remplacé sur la carte le 28 octobre 2026 ; conservé dans l’historique Git et la recherche initiale.',
    }
quality['counts']['office_target_addresses'] = len(features)
quality['office_address_replacement'] = {
    'date': evidence['accessed_at'],
    'source': 'Liste communiquée par l’utilisateur ; géocodeur Géoplateforme/BAN',
    'checks': checks,
    'vacancy_verified': False,
}
quality['limits'] = [x for x in quality['limits'] if 'Échantillon d’annonces' not in x]
quality['limits'].append('Les quatre adresses ciblées ne prouvent ni la présence de bureaux vacants, ni une disponibilité commerciale.')
(dest / 'quality.json').write_text(json.dumps(quality, ensure_ascii=False, indent=2) + '\n')

# Recompute the 15 geodesic circles and nearby items for each new address.
runpy.run_path(str(project / 'recherches/suresnes-rayons-2026-10-22/prepare.py'))
radii = json.loads((dest / 'radii.json').read_text())
quality = json.loads((dest / 'quality.json').read_text())
quality['nearby_counts'] = {fid: len(scenarios['500']['nearby'])
                            for fid, scenarios in radii['offices'].items()}
(dest / 'quality.json').write_text(json.dumps(quality, ensure_ascii=False, indent=2) + '\n')

# Keep the downloadable processed snapshot in step with the displayed data.
archive = dest / 'suresnes-donnees.zip'
with zipfile.ZipFile(archive) as source:
    entries = {name: source.read(name) for name in source.namelist()}
for name in ['offices.geojson', 'radii.json', 'sources.json', 'quality.json']:
    entries['processed/' + name] = (dest / name).read_bytes()
entries['extension-addresses/geocodage-ban.json'] = (root / 'geocodage-ban.json').read_bytes()
entries['extension-addresses/prepare.py'] = Path(__file__).read_bytes()
entries['extension-addresses/README.txt'] = (
    'Les quatre adresses fournies le 28 octobre 2026 remplacent le précédent '
    'échantillon broker dans processed/offices.geojson et processed/radii.json. '
    'scripts/broker.py reste une trace de la collecte historique du 19 octobre. '
    'Aucune vacance, surface ou loyer ne découle des nouvelles adresses.\n'
).encode()
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as target:
    for name, content in entries.items():
        target.writestr(name, content)

print({feature['properties']['address']: quality['nearby_counts'][feature['id']]
       for feature in features})
