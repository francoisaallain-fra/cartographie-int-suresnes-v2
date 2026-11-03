# Commerces alimentaires et marchés · 3 novembre 2026

32 points ajoutés à « Aménités de quartier » : 23 épiceries / supérettes (dont 2 épiceries fines / traiteurs), 7 supermarchés et 2 marchés réguliers. Les catégories viennent d’OSM, sauf Carrefour Market Verdun reclassé en supermarché selon sa fiche officielle. Elles ne prouvent pas une surface de vente. La boutique TotalEnergies est incluse car recensée comme commerce de proximité dans OSM.

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
