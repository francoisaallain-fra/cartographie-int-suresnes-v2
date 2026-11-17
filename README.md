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

Le zonage PLU est masqué à l’ouverture et reste activable. Les réglages de couleur ont été retirés de toutes les fiches. Les couleurs déjà enregistrées dans ce navigateur sont conservées en lecture seule ; aucun changement de couleur ni bouton de réinitialisation n’est proposé.

Les pastilles des bureaux ciblés ont une pointe en bas à gauche, ancrée sur le point d’adresse géocodé. Les bureaux à louer sont des carrés bleus centrés sur ce point. Celui-ci ne localise pas nécessairement l’entrée exacte de l’immeuble.

Les bureaux à louer sont des carrés bleus unis de 24 × 24 pixels au zoom nominal, avec un fin contour blanc, sans pointe, numéro ni point central. Les anciennes préférences de couleur des locations sont ignorées pour garantir ce bleu. Les cinq immeubles ciblés ont des pastilles violettes unies, indépendamment des critères gare/maintien. Le maintien apparaît en liseré jaune fluo de 2 px, en tirets de 5 px espacés de 5 px comme la limite communale, sans remplissage ; MOS Activités utilise un bleu vif `#0080ff`.

Les fiches compactes des immeubles ciblés et des bureaux à louer ne contiennent que l’adresse, les surfaces annoncées disponibles et les aménités recensées dans le rayon choisi, avec un détail transports / équipements / commerces et services. Le total suit le curseur de 300 m à 1 km, même pendant que la fiche reste ouverte, indépendamment des couches masquées. Pour une adresse ciblée, une surface annoncée n’est reprise que si son identifiant BAN correspond exactement à une adresse de location ; sinon la fiche indique « Non renseignée ». Il ne s’agit pas d’une surface totale de bâtiment. Les détails de provenance et les limites restent dans Sources & méthode et la documentation.

Les rayons blancs de 500 m des gares se cumulent : un clic ajoute le cercle de la gare, un second clic sur la même gare retire seulement ce cercle. Masquer la couche Transports retire tous les rayons de gare.

À l'ouverture, les transports, les deux couches de bureaux et le maintien des surfaces de bureau apparaissent en premier dans la colonne. Viennent ensuite les couches Mos 6, 7 et 8, activées avec des opacités de 55 %, 55 % et 75 % ; les activités Mos sont bleues. Les bâtiments mixtes et les bureaux Mos sont masqués. Le nouvel ordre initial s'applique aussi aux navigateurs ayant conservé l'ancien ordre ; les réorganisations faites ensuite restent enregistrées.

## Parcours de lecture

1. `docs/ARCHITECTURE.md` : responsabilités, état et dépendances.
2. `src/main.js` : initialisation et assemblage de la carte.
3. `src/catalog.js` : treize couches et libellés.
4. `src/controls.js`, `src/layers.js`, `src/selection.js` : interactions et rendu.
5. `tests/` et `docs/RECETTE.md` : contrat fonctionnel et contrôles.
6. `docs/DONNEES.md` : sources, scripts historiques et limites.

## Publication indépendante

Le manifeste `.openai/hosting.json` est lié uniquement au projet Sites `appgprj_6ae7236180948191be7fac25a4ba93ec`. Le site est accessible publiquement : https://cartographie-suresnes-v2.francois-a-allain.chatgpt.site. Le dépôt GitHub de référence est `francoisaallain-fra/cartographie-int-suresnes-v2`. Les données sont hébergées avec l’application. Les préférences locales utilisent le préfixe `suresnes-v2-`.

Construire avec `pnpm build`, puis publier le dossier `dist/` avec le workflow Sites du projet v2. Le workflow GitHub exécute les contrôles ; il ne publie pas. Pour revenir en arrière, redéployer une version enregistrée du projet v2. Les données doivent être mises à jour explicitement, avec contrôle du journal qualité et des sources.

## Alimentation et marchés (3 novembre 2026)

Après revue Google Maps : 31 points alimentaires/marchés, avec filtres distincts pour 6 épiceries/supérettes, 16 supermarchés, 2 primeurs, 2 magasins bio, 2 traiteurs, 1 boutique de station-service et 2 marchés. La couche complète compte 63 aménités, dont 6 avec réserve. [Sources, limites, reproduction et recette](docs/ALIMENTATION.md).

## BureauxLocaux · relevé communal du 3 novembre 2026

La couche des locations présente 27 annonces à 19 adresses, issues des 57 offres de la nouvelle recherche communale. 29 annonces sans adresse précise et 1 commerce sont exclus. Le relevé, ses sources, le cache BAN et la méthode de reconstruction sont décrits dans [la documentation des données](docs/DONNEES.md).

Le filtre **Surface des bureaux à louer**, sous le rayon, accepte un minimum et un maximum en m². Il sélectionne les adresses selon leur surface de référence : maximum annoncé sans doublon, ou cumul de lots distincts documenté. La fiche affiche la valeur retenue et distingue le cumul de lots ; le bouton de réinitialisation retire les bornes. Les immeubles ciblés, leurs rayons et les autres couches restent indépendants. Voir [la méthode de calcul](docs/DONNEES.md#filtre-de-surface-des-locations--3-novembre-2026).

## Panneau, zoom et hubs · 17 novembre 2026

Le bord droit du panneau des couches se glisse pour régler sa largeur entre 240 et 560 pixels, dans la limite de la place disponible. Les flèches gauche/droite du clavier règlent aussi la largeur ; un double-clic sur la poignée rétablit 316 pixels. Le bouton chevron placé sur la carte replie ou rouvre le panneau. Largeur et repli sont mémorisés dans ce navigateur. Sur mobile, les couches restent sous la carte.

Les pastilles diminuent progressivement lors d’un zoom avant : taille nominale au zoom 15, environ 84 % au zoom 18 et 74 % au zoom 20 ; les points d’ancrage restent fixes.

La couche « Hubs de transport · rayon 500 m », désactivée initialement, affiche les six cercles simultanément. Son interrupteur, son ordre, son repli et son opacité sont indépendants des transports et du rayon d’une adresse. Les cercles individuels sélectionnés par clic sur les gares restent disponibles lorsque cette couche est masquée.
