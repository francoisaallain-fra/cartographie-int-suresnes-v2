# Données, provenance et reprise

`public/data/sources.json` décrit les producteurs, millésimes et licences. Les journaux `quality.json`, `mos-quality.json`, `mos-groups-quality.json` et `plu-maintien-quality.json` conservent la traçabilité. Les 24 fichiers de données du point de départ sont conservés sans modification, y compris le ZIP téléchargé par l'utilisateur.

Les scripts Python historiques présents dans le ZIP ont été rendus consultables dans `scripts/legacy-data/`. Ils gardent leurs hypothèses de chemins et de jeux sources de 2026 ; ils ne constituent pas une collecte automatiquement actualisée. Leur relance nécessite de lire leurs entrées, vérifier les accès aux producteurs et comparer les résultats. Le ZIP reste un instantané de référence, pas un artefact régénéré silencieusement lors du build.

Pour une mise à jour : conserver les fichiers sources, mettre à jour les scripts concernés, valider les coordonnées/identifiants/géométries, recalculer les 5 × 15 scénarios, actualiser les journaux et textes, puis revoir explicitement les empreintes de référence. Ne jamais actualiser les empreintes pour masquer une différence non expliquée.

Le cinquième point ciblé, ajouté le 2 novembre 2026, est le **39 rue Rouget de Lisle** selon l'IGN/BAN (identifiant `92073_3o60ni_00039`, score 0,973). La saisie « 39 rue Roger de l’isle » renvoie à d'autres voies et ne doit pas servir au placement. Le point et les 15 scénarios supplémentaires sont conservés dans `offices-extra.geojson` et `radii-extra.json` pour préserver octet pour octet les données initiales. `scripts/build-extra-office-radii.py` régénère les scénarios à partir des données locales avec le même calcul géodésique WGS84 et le même découpage des voies que les quatre adresses précédentes. Ses dépendances Python sont fixées dans `scripts/legacy-data/requirements.txt` ; les installer avec `python3 -m pip install -r scripts/legacy-data/requirements.txt` avant de le relancer dans un environnement isolé. La liste des cinq adresses demeure un ciblage, sans preuve de vacance ou de disponibilité.

Une adresse n'est pas une preuve de vacance. Une emprise Mos n'est pas un bâtiment certifié. Les trois bâtiments mixtes restent des candidats. Les limites territoriales, incertitudes et liens réglementaires de l'interface sont conservés. Les droits sur les données et logos restent ceux des producteurs ; aucune nouvelle licence globale n'est attribuée au dépôt.

## Revue des aménités · 2 novembre 2026

Les [14 décisions détaillées](AMENITES_REVIEW.md) sont enregistrées dans `public/data/amenity-review.json`. Le chargement applique les corrections de nom, d'adresse et de catégorie aux trois GeoJSON de référence sans modifier leurs empreintes. Cinq points commerciaux dont la boutique ou la position n'est pas suffisamment corroborée sont exclus de l'affichage ; Tea o’clock est affiché comme magasin de thé. Les scénarios de rayon initiaux sont conservés ; les compteurs et marqueurs visibles utilisent seulement les points retenus. La recherche Google Maps n'est pas une preuve d'absence, et les deux localisations encore divergentes restent signalées.

## Annonces de bureaux à louer · relevé du 3 novembre 2026

La couche utilise la nouvelle recherche communale BureauxLocaux fournie par François (`location=Suresnes`, `location_type=city`). Son URL complète est conservée dans `public/data/rental-offices-quality.json` et `data-source/bureauxlocaux-2026-11-03.json`. Le compteur affiché est de **57 annonces**, avec 57 identifiants uniques extraits des cartes publiques dans le navigateur. La copie des champs a été contrôlée ligne par ligne par empreinte ; les métadonnées conservent le SHA-256 du TSV. L’ancien relevé du 2 novembre est conservé.

La sélection conserve **27 annonces à 19 points d’adresse**, dont une offre de bureaux privatifs classée coworking. Elle exclut **29 annonces sans numéro de rue publié** et **1 commerce** (39776861). Le commerce, lui-même sans numéro, n’est pas compté deux fois. Deux annonces sans adresse citent le 52 rue Carnot dans la rubrique transports : il s’agit d’une borne de recharge et non de l’adresse des bureaux ; elles restent exclues. Aucun rapprochement avec une autre annonce ou avec un nom d’immeuble ne sert à inventer une adresse.

Quatre annonces s’ajoutent au relevé précédent, sans retrait : 43005791 et 36749298 au 30 rue Pasteur ; 38689730 au 24 rue des Moulineaux ; 38262835 au 5–7 rue Frédéric Clavel. Ce dernier point est représenté au numéro 7. Les autres plages de numéros conservent leur convention précédente : 6–10 rue Chevreul au 10 et 27–29 quai Gallieni au 27. Ce sont des points représentatifs, pas des entrées exactes ou des contours de bâtiment.

Le script `python3 scripts/build-rental-offices.py` régénère les données hors ligne depuis le TSV et les réponses IGN/BAN conservées dans `data-source/geocoding-bureauxlocaux-2026-11-03.json`. L’option `--refresh-geocoding` interroge à nouveau l’API publique IGN. Une correspondance exige le numéro, la voie normalisée (accents/casse/tirets), le type `housenumber`, le code commune 92073 et un score d’au moins 0,7 ; les 19 résultats retenus ont un score supérieur à 0,95. Les tests contrôlent aussi leur appartenance géométrique à Suresnes. Un score de géocodage n’est pas une probabilité de disponibilité.

Les annonces d’une même adresse sont regroupées, sans additionner les surfaces ni dédupliquer les lots. Seuls identifiant, type, surface, loyer affiché, adresse et lien sont repris ; aucune photo ni description commerciale. Le loyer n’est pas recalculé et son régime de charges/TVA n’est pas déduit. La disponibilité, la vacance et le nombre de lots distincts restent non vérifiés. Source commerciale, sans droit général de réutilisation commerciale établi ; relevé ponctuel sans synchronisation automatique.

## Repérage vert des bureaux ciblés · actualisé le 3 novembre 2026

Le calcul utilise les 5 adresses ciblées, les 6 points de gare/station de `transport.geojson` (source IDFM) et les 5 géométries `MultiPolygon` de `plu-maintien-bureaux.geojson` (prescription graphique du PLU). Il est exécuté au chargement, sans modifier ces fichiers de référence. La distance à la gare la plus proche est calculée à vol d’oiseau avec la même formule sphérique que les cercles Leaflet de 500 m. Le point doit être à 500 m ou moins et hors de toutes les géométries de maintien ; un point exactement sur une limite est traité comme intérieur au périmètre. Les trous des polygones sont pris en compte.

Deux points ciblés remplissent les deux critères : 2 rue de la République (302 m des Coteaux) et 39 rue Rouget de Lisle (440 m de Belvédère). Les distances sont arrondies à l’affichage ; les valeurs non arrondies déterminent le seuil. Le repérage apparaît en vert et violet. Les couleurs personnalisées restent prioritaires. Les bureaux à louer sont exclus de ce calcul et de sa légende depuis le 3 novembre 2026, à la demande de François ; leurs coordonnées et annonces sont conservées.

Cette couleur est un **repérage cartographique** : les points BAN ne délimitent ni l’entrée exacte, ni la parcelle, ni l’emprise entière d’un immeuble. Être hors du périmètre sur ce point ne valide pas l’absence de restriction sur tout un projet ; les pièces PLU et la faisabilité restent à examiner à l’adresse concernée. La proximité d’une gare ne prouve pas non plus la vacance ou la disponibilité du bureau.

## Alimentation et marchés (3 novembre 2026)

32 points et trois filtres dans la couche Aménités de quartier : 23 épiceries / supérettes, 7 supermarchés et 2 marchés. [Sources, limites, reproduction et recette](ALIMENTATION.md).
