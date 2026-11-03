# Commerces alimentaires et marchés · 3 novembre 2026

Instantané initial avant revue : 32 points ajoutés à « Aménités de quartier » : 23 épiceries / supérettes (dont 2 épiceries fines / traiteurs), 7 supermarchés et 2 marchés réguliers. Les catégories viennent d’OSM, sauf Carrefour Market Verdun reclassé en supermarché selon sa fiche officielle. Elles ne prouvent pas une surface de vente. La boutique TotalEnergies est incluse car recensée comme commerce de proximité dans OSM.

## Source ouverte et périmètre

[magOSM / Magellium, commerces OpenStreetMap sur data.gouv.fr](https://www.data.gouv.fr/datasets/localisations-des-magasins-dans-openstreetmap), licence ODbL 1.0, © les contributeurs OpenStreetMap.

Flux WFS `https://magosm.magellium.com/geoserver/wfs` : `request=GetFeature`, `version=2.0.0`, `typeName=magosm:shops_point`, `outputFormat=application/json`, `srsName=EPSG:4326`, `count=10000`. Bbox WGS84 `[2.19,48.85,2.24,48.89]`, convertie en EPSG:3857 pour le paramètre `bbox=...,...,...,...,EPSG:3857`. La réponse contient 663 commerces bruts, dont 97 candidats alimentaires (`convenience`, `supermarket`, `grocery`, `deli`). Le filtrage géométrique dans Suresnes en retient 30 et en exclut 67 hors commune. Deux magasins ne sont pas fusionnés au seul motif d’une enseigne commune.

Les serveurs Overpass ont échoué lors de la collecte ; le flux WFS constitue la source effectivement téléchargée. Le fichier d’entrée conserve les champs utiles des 97 candidats et l’horodatage de réponse. L’extrait couvre la commune, pas une couronne autour de celle-ci.

## Marchés

Les coordonnées proviennent des objets OSM [Caron](https://www.openstreetmap.org/way/70961879) et [Zola](https://www.openstreetmap.org/node/2364399609), lus via l’API publique OSM. La [page de l’Office de tourisme](https://www.suresnes-tourisme.com/un-samedi-au-marche.html) confirme lieux et jours : Caron place Jean Jaurès, jeudi/dimanche matin ; Zola place du Général Leclerc, mercredi/samedi matin.

Caron est placé au centre de l’enveloppe de sa halle OSM, contrôlé à l’intérieur ; Zola au point OSM du marché. Le résultat BAN « Avenue Jean Jaurès » demandé pour la place a été rejeté. Un point ne représente ni une entrée ni l’étendue des étals. Les événements temporaires et exceptions ne sont pas recensés.

## Qualité et limites

Les dates de modification OSM sont conservées ; elles ne constituent pas des dates de vérification d’ouverture. Les adresses absentes sont signalées et ne sont jamais remplacées par le numéro d’immeuble le plus proche. Des compléments pour Lidl Jean Jaurès, Chez Abdel et Carrefour Verdun sont sourcés dans `scripts/sources/food-amenities-review.json`.

Biocoop présente une divergence : 15 avenue Édouard Vaillant selon Acceslibre, 17/25 selon une publicité de février 2026, 28 avenue Jean Jaurès selon la fiche nationale. Le point OSM est conservé et le numéro signalé à confirmer. Aucun inventaire exhaustif ni contrôle terrain n’est revendiqué.

La base dérivée OSM est téléchargeable depuis « Sources & méthode », sous ODbL. Les informations factuelles des pages opérateurs et de l’Office de tourisme sont attribuées ; aucune licence ouverte n’a été identifiée pour leurs pages.

## Reproduction et recette

À la racine du dépôt : `node scripts/build-food-amenities.mjs`.

Entrées : `scripts/sources/food-amenities-input.json` et `food-amenities-review.json`. Sorties : `public/data/food-amenities.geojson`, `food-amenities-sources.json`, `food-amenities-quality.json`. Le journal liste les exclusions, les adresses manquantes et les divergences. Pour actualiser, télécharger un nouvel extrait avec les paramètres ci-dessus, relire les sources des marchés et la revue, puis comparer les sorties avant publication.

Les nouveaux points complètent en mémoire les 75 scénarios de rayon avec la distance sphérique `distanceMeters` utilisée par Leaflet. Les scénarios historiques WGS84 restent inchangés ; un écart métrique entre les deux méthodes est possible. Compteurs, distances des fiches et filtres incluent les nouvelles aménités.

Trois filtres indépendants permettent de masquer les épiceries / supérettes, les supermarchés ou les marchés. La couche reste désactivée à l’ouverture. La recette contrôle les filtres, fiches, jours de marché, téléchargements, périmètre communal, provenance, doublons et intégration aux 75 parcours de rayon.

## Revue Google Maps du 3 novembre 2026

Les 23 points signalés ont été vérifiés dans Google Maps par nom, adresse lorsqu’elle était connue, et rapprochement avec les coordonnées source. Le journal `public/data/neighborhood-review-2026-11-03.json` conserve les décisions, liens, réserves et indices qualitatifs de 1 à 3. Ce journal complète celui du 2 novembre et s’applique au chargement, avant l’ajout des commerces aux scénarios de rayon ; les GeoJSON sources et les empreintes de référence sont inchangés. Aucun point n’est déplacé.

Coccinelle Express, indiqué définitivement fermé, est exclu des commerces actifs. Épicerie Carnot est remplacé au même point par RC – Alimentation Générale. Les noms JS SUPERETTE, RML Asian Store, Fin Gourmet et U Express et Drive sont harmonisés. Les adresses des fiches sont renseignées avec les données relevées.

Les 31 points alimentaires/marchés encore affichés sont répartis en 6 épiceries/supérettes, 16 supermarchés, 2 primeurs, 2 magasins bio, 2 traiteurs/plats préparés, 1 station-service avec boutique et 2 marchés. Avec les 32 aménités antérieures retenues, la couche compte 63 points. Les catégories reproduisent celles des sources/Maps ; « supermarché » n’atteste pas une surface de vente. Les nouvelles catégories disposent de filtres séparés et de pictogrammes dans la palette rouge clair existante.

Six réserves restent matérialisées par un « ? » : Votre Marché (3/3, enseigne/adresse/activité actuelle non confirmées ; Street View d’octobre 2025), Biocoop (2/3, Maps au 17 avenue Édouard-Vaillant contre 28 avenue Jean-Jaurès sur le site officiel), L’Atelier de Flo (2/3, divergence de voie antérieure), Franprix République (2/3, adresse Maps au 18 mais point source distant d’environ 75 m conservé), TotalEnergies (2/3, boutique/café confirmés mais pas épicerie généraliste) et Marché d’à Côté (2/3, lien de fiche vers Franprix). Ce sont des indices qualitatifs d’incertitude, pas des probabilités.

Les téléchargements distinguent l’extrait OSM initial et la revue factuelle. Les coordonnées conservent leur provenance OSM/ODbL ; aucune licence ouverte n’est attribuée aux vérifications Maps ou aux pages opérateurs. Aucune photo, aucun avis ni description commerciale n’est repris. Le chargement est la transformation reproductible : appliquer les deux journaux dans l’ordre, puis calculer les scénarios complémentaires. La collecte manuelle n’est pas une actualisation automatique.
