# Architecture et décisions

## Organisation

| Module                                         | Responsabilité                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| main                                           | Chargement, création de Leaflet, construction des couches et démarrage               |
| data                                           | Chargement HTTP et validation des géométries avant affichage                         |
| state                                          | État partagé de la session et références Leaflet, sans variables globales implicites |
| catalog                                        | Définition des douze couches                                                         |
| layers, opacity                                | Synchronisation de visibilité, transparence et libellés                              |
| transport                                      | Routes, halo et décalage graphique des voies L/U                                     |
| radius, geometry                               | Accès aux scénarios et calcul d'appartenance au cercle affiché                       |
| selection                                      | Sélection d'une adresse ou d'une gare, cercles et restauration de la vue ville       |
| controls                                       | Assemblage des contrôles et événements de l'interface                                |
| ordering, collapse, preferences                | Ordre, repli et noms personnalisés, persistés séparément                             |
| markers, legend, popups, sources, presentation | Symboles, fiches, légendes et textes                                                 |
| rotation                                       | Geste Ctrl/Commande et boussole                                                      |

Les modules utilisent des imports explicites. `runtime` regroupe les objets Leaflet mutables ; `state` contient les choix utilisateur. Les fonctions de rendu restent impératives pour préserver l'ordre des opérations Leaflet. Le catalogue et les fonctions géométriques sont séparés des événements DOM. Le diagnostic `window.suresnesDiagnostics()` reste en lecture seule pour la recette navigateur.

## Choix techniques

JavaScript en modules ES, formaté avec Prettier et contrôlé par ESLint. Vite produit un site statique avec des assets nommés par empreinte. Les versions sont verrouillées dans `pnpm-lock.yaml`. Leaflet et son extension de rotation restent vendus localement avec leurs licences : leur mise à niveau constitue un chantier séparé, particulièrement pour les méthodes internes utilisées par le décalage L/U.

Le typage TypeScript intégral n'a pas été introduit dans cette refonte : il demanderait de typer également les extensions Leaflet. Les frontières de données sont validées à l'exécution et les comportements couverts par des tests. Les prochaines modifications peuvent ajouter du typage par module sans changer le format des données.

## Revue

Lire d'abord les tests et le catalogue, puis suivre `main → data → controls/layers`. Les données et bibliothèques sont identiques octet par octet à la référence initiale (empreintes dans `tests/baseline-sha256.json`). Les clés localStorage et l'identité Sites sont propres à v2. Le build `dist` n'est jamais édité à la main.

`rental-surfaces` analyse les surfaces annoncées, applique une revue des lots liée aux signatures exactes des annonces et expose un prédicat de filtrage pur. `surface-controls` gère les bornes en session, leur validation, le compteur et la liste d’adresses. `layers` applique ce prédicat uniquement aux locations, sans modifier la vue, le rayon des aménités ou les bureaux ciblés. Le chargement calcule les valeurs avant de construire les fiches et contrôles.
