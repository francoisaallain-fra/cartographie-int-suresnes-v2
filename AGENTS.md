# Cartographie Suresnes v2 — règles de développement

Ces règles s'appliquent aux travaux sur ce dépôt, en complément des instructions du projet Icade × Lokimo. La référence de code est `francoisaallain-fra/cartographie-int-suresnes-v2` sur GitHub.

## Avant de modifier

- Vérifier le dépôt, la branche, `git status`, les changements préexistants et l'écart éventuel avec `main` sur GitHub. Une copie locale ou un export Sites ne prouve pas une synchronisation avec GitHub ; préserver les modifications en cours.
- Lire les parties utiles de `README.md`, `docs/ARCHITECTURE.md`, `docs/DONNEES.md`, `docs/RECETTE.md`, `src/catalog.js`, `.github/workflows/quality.yml` et des tests. Examiner le code existant avant de choisir un nouveau modèle d'implémentation.
- Pour toute opération GitHub, vérifier que le dépôt et les droits de `francoisaallain-fra` sont disponibles. Ne pas utiliser un autre compte ou dépôt par supposition.

## Code et données

- Continuer l'architecture du dépôt : modules ES dans `src/`, données et ressources dans `public/`, Vite pour produire `dist/`, Leaflet et extension de rotation vendus localement. Ne pas modifier `dist/` à la main. Garder les dépendances verrouillées dans `pnpm-lock.yaml`.
- Conserver la séparation entre catalogue, chargement et validation des données, état, contrôles, couches, sélection et présentation. Toute nouvelle couche suit les contrôles existants de visibilité, ordre, repli, opacité, légende, sélection et persistance lorsque ces fonctions sont pertinentes.
- Garder la v2 indépendante de la v1 : identité Sites de `.openai/hosting.json`, clés de stockage `suresnes-v2-` et ressources propres à la v2. Ne pas modifier la v1 pour faire fonctionner la v2.
- Préserver les données et ressources initiales contrôlées par `tests/baseline-sha256.json`. Ajouter les nouvelles données dans des fichiers séparés ; ne changer une empreinte qu'après avoir expliqué et vérifié la modification du fichier source.
- Pour chaque donnée ajoutée, documenter source, date de relevé, couverture, droits, méthode de rapprochement ou géocodage et limites de précision. Garder une entrée source et un script reproductible lorsque la donnée est transformée. Une annonce ne démontre ni la vacance, ni une disponibilité actuelle, ni l'emplacement exact d'un lot.
- Échapper les textes externes dans les fiches et popups ; valider les données à leur entrée. Préserver les usages clavier, mobile et le comportement en cas de données manquantes.

## Vérification et livraison

- Mettre à jour les tests et les documents utiles quand un comportement, une couche, un nombre ou une source change. Contrôler les parcours concernés dans le navigateur.
- Reprendre la chaîne de qualité de GitHub Actions : `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`, puis `pnpm test:e2e` avec Chromium disponible. Signaler précisément tout contrôle non exécuté ou en échec ; ne pas présenter un test local comme une exécution GitHub Actions.
- Pour publier du code sur GitHub, intégrer les changements sur une branche `codex/`, faire vérifier la CI et utiliser une PR, sauf instruction explicite différente. Une modification locale n'est pas publiée ; un déploiement Sites demande une instruction qui le couvre.
