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
