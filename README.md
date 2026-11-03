# Cartographie interactive de Suresnes v2

Application cartographique de Suresnes développée avec Leaflet. Le code source est organisé dans `src/`, les données et bibliothèques conservées dans `public/`, le résultat construit dans `dist/` (non versionné).

## Installation et commandes

Prérequis : Node.js 24 et pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm preview
pnpm exec playwright install chromium
pnpm test:e2e
```

Les tests unitaires s'exécutent sans serveur. Les tests navigateur démarrent l'aperçu du build et contrôlent notamment les 75 scénarios de rayon et les cercles de 500 m des six gares. Le fond IGN et le logo SNCF utilisent des services externes ; la disponibilité de ces services n'est pas garantie par le dépôt.

Le zonage PLU est masqué à l'ouverture et reste activable. Les pastilles des bureaux ciblés et des bureaux à louer disposent d'un choix de couleur individuel dans leur fiche ; ce choix est enregistré uniquement dans le navigateur utilisé.

Les pastilles des bureaux ciblés et des bureaux proposés à la location ont une pointe en bas à gauche, ancrée sur le point d’adresse géocodé. Celui-ci ne localise pas nécessairement l’entrée exacte de l’immeuble.

Les bureaux à louer sont bleus avec un point blanc central, sans numéro ni repérage par les deux critères gare/maintien. Les anciennes couleurs personnelles de cette couche sont réinitialisées une seule fois ; de nouveaux choix individuels restent possibles. Le repérage vert et violet reste réservé aux deux bureaux ciblés dont le point d’adresse est à 500 m ou moins d’une gare et hors des périmètres de maintien. Il ne vérifie pas l’emprise du bâtiment ni sa faisabilité. Le maintien apparaît en liseré jaune fluo pointillé de 5 px, sans remplissage ; MOS Activités utilise un bleu électrique `#0055ff`.

Les rayons blancs de 500 m des gares se cumulent : un clic ajoute le cercle de la gare, un second clic sur la même gare retire seulement ce cercle. Masquer la couche Transports retire tous les rayons de gare.

À l'ouverture, les transports, les deux couches de bureaux et le maintien des surfaces de bureau apparaissent en premier dans la colonne. Viennent ensuite les couches Mos 6, 7 et 8, activées avec des opacités de 55 %, 55 % et 50 % ; les activités Mos sont bleues. Les bâtiments mixtes et les bureaux Mos sont masqués. Le nouvel ordre initial s'applique aussi aux navigateurs ayant conservé l'ancien ordre ; les réorganisations faites ensuite restent enregistrées.

## Parcours de lecture

1. `docs/ARCHITECTURE.md` : responsabilités, état et dépendances.
2. `src/main.js` : initialisation et assemblage de la carte.
3. `src/catalog.js` : douze couches et libellés.
4. `src/controls.js`, `src/layers.js`, `src/selection.js` : interactions et rendu.
5. `tests/` et `docs/RECETTE.md` : contrat fonctionnel et contrôles.
6. `docs/DONNEES.md` : sources, scripts historiques et limites.

## Publication indépendante

Le manifeste `.openai/hosting.json` est lié uniquement au projet Sites `appgprj_6ae7236180948191be7fac25a4ba93ec`. Le site est accessible publiquement : https://cartographie-suresnes-v2.francois-a-allain.chatgpt.site. Le dépôt GitHub de référence est `francoisaallain-fra/cartographie-int-suresnes-v2`. Les données sont hébergées avec l’application. Les préférences locales utilisent le préfixe `suresnes-v2-`.

Construire avec `pnpm build`, puis publier le dossier `dist/` avec le workflow Sites du projet v2. Le workflow GitHub exécute les contrôles ; il ne publie pas. Pour revenir en arrière, redéployer une version enregistrée du projet v2. Les données doivent être mises à jour explicitement, avec contrôle du journal qualité et des sources.

## Alimentation et marchés (3 novembre 2026)

32 points et trois filtres dans la couche Aménités de quartier : 23 épiceries / supérettes, 7 supermarchés et 2 marchés. [Sources, limites, reproduction et recette](docs/ALIMENTATION.md).

## BureauxLocaux · relevé communal du 3 novembre 2026

La couche des locations présente 27 annonces à 19 adresses, issues des 57 offres de la nouvelle recherche communale. 29 annonces sans adresse précise et 1 commerce sont exclus. Le relevé, ses sources, le cache BAN et la méthode de reconstruction sont décrits dans [la documentation des données](docs/DONNEES.md).

Le filtre **Surface des bureaux à louer**, sous le rayon, accepte un minimum et un maximum en m². Il sélectionne les adresses selon leur surface de référence : maximum annoncé sans doublon, ou cumul de lots distincts documenté. La fiche explique chaque valeur ; le bouton de réinitialisation retire les bornes. Les immeubles ciblés, leurs rayons et les autres couches restent indépendants. Voir [la méthode de calcul](docs/DONNEES.md#filtre-de-surface-des-locations--3-novembre-2026).
