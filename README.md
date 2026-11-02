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
