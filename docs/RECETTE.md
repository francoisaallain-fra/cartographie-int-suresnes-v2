# Contrat de non-régression

Référence des contrôles : jeux de données et ressources identifiés dans `tests/baseline-sha256.json`. Les nombres ci-dessous décrivent cet instantané.

| Fonction         | Attendu                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Douze couches    | Activation indépendante, tout masquer, ordre visuel correspondant à l'ordre des cartes                            |
| Repli Notion     | Triangle visible ; nom, icône, interrupteur et poignée conservés ; corps masqué ; état persistant                 |
| Personnalisation | Renommer, annuler, nom d'origine ; ordre au clavier et par glisser ; persistance après rechargement               |
| Opacité          | 0 à 100 %, surfaces réellement opaques à 100 %, objets invisibles non interactifs                                 |
| Zonage PLU       | Couche désactivée à chaque ouverture ; réactivation possible par son interrupteur                                 |
| Maintien bureaux | Liseré jaune bordé de rouge, pointillé et sans remplissage ; curseur agissant sur les deux traits                 |
| Bureaux à louer  | Pastilles bleues ; couleur modifiable séparément pour chaque adresse dans sa fiche                                |
| Bureaux ciblés   | Couleur modifiable séparément dans chaque fiche, restaurable et conservée dans ce navigateur                      |
| Sous-catégories  | Gares indépendantes des lignes L/U/T2 ; axes routiers, santé, crèches, niveaux scolaires, commerces et pharmacies |
| Cinq adresses    | Sélection par liste et marqueur, changement d'adresse sans ancien cadrage résiduel                                |
| 75 rayons        | 300 à 1 000 m par pas de 50 ; listes et géométries pré-calculées préservées                                       |
| Six gares        | Clic sur chacune : cercle de 500 m ; remplacement au clic suivant ; retrait au masquage des transports            |
| Retour ville     | Bouton ou clic hors cercle ; restauration des couches antérieures                                                 |
| Rotation         | Ctrl/Commande avant ou après clic, marqueurs utilisables, retour nord                                             |
| Sources          | Dialogue, fermeture Échap et extérieure, liens et téléchargements                                                 |
| Accessibilité    | Libellés accessibles, focus visible, clavier, affichage mobile sans débordement                                   |
| Panne réseau     | Message de chargement et reprise ; erreur de fond IGN distincte des données                                       |

Les tests Node contrôlent les empreintes, les 75 scénarios, la validation des données, l'échappement et l'identité du site. Les tests Playwright du dépôt contrôlent les interactions, les 75 ensembles de points affichés et les six cercles de gare. Les contrôles visuels et gestes de rotation restent à revoir pour toute modification du rendu ou de Leaflet.

## Exécution du 1 novembre 2026

Contrôles locaux réussis : ESLint, Prettier, 8 tests Node et build Vite. Recette dans le navigateur : chargement des 11 couches, 22 activations/masquages, 22 replis/déplis, les 60 valeurs adresse–rayon, retour ville, repli persistant, renommage persistant, déplacement au clavier, opacité 0 %, ouverture/fermeture des sources. Affichage à 390 × 844 contrôlé sans débordement. Aucune erreur console relevée pendant ces parcours. La première exécution GitHub Actions a également réussi : 8 tests Node, 4 tests Playwright, contrôle de format, analyse statique et build. Les tests navigateur vérifient notamment les ensembles de points des 60 scénarios. Preuve : https://github.com/francoisaallain-fra/cartographie-int-suresnes-v2/actions/runs/41303090989. Chaque nouveau commit relance ces contrôles ; leur statut courant figure dans la PR.

Les scripts historiques de collecte n'ont pas été relancés : il s'agit d'une refonte du code de l'application, avec données conservées à l'identique.

## Exécution locale du 2 novembre 2026

Sur la copie de travail incluant les nouvelles annonces, les couleurs MOS, les cercles de gare et la cinquième adresse : `pnpm lint`, `pnpm format:check`, `pnpm test` (10 réussites), `pnpm build` et `pnpm test:e2e` (6 réussites avec Chrome) ont réussi. Ces modifications ont ensuite passé [GitHub Actions](https://github.com/francoisaallain-fra/cartographie-int-suresnes-v2/actions/runs/41418105437) et été publiées sur Sites en version 3.

## Révision du rendu du 2 novembre 2026

Le périmètre « maintien des surfaces de bureau » est affiché en liseré bleu ciel pointillé sans remplissage. Le curseur règle l'opacité du contour ; à 0 %, ce contour ne reçoit plus de clic. Les marqueurs des bureaux à louer reprennent la teinte rose des immeubles ciblés, avec une luminosité plus élevée et des chiffres foncés. Contrôles locaux réussis : ESLint, Prettier, 10 tests Node, build Vite et 7 tests Playwright avec Chrome, dont un contrôle des attributs du contour et des couleurs des marqueurs.

## Couleurs personnelles des pastilles du 2 novembre 2026

Le zonage PLU est masqué à chaque chargement. Les bureaux proposés à la location sont bleus par défaut. Chaque fiche de bureau ciblé ou proposé à la location permet de choisir la couleur de sa propre pastille ou de restaurer la couleur initiale. Les choix sont conservés uniquement dans le navigateur courant, indépendamment des autres pastilles.

Contrôles locaux réussis : ESLint, Prettier, 10 tests Node, build Vite et 8 tests Playwright avec Chrome. Le parcours navigateur vérifie le PLU désactivé après rechargement, les deux familles de pastilles, plusieurs couleurs indépendantes et la restauration de la couleur initiale.

## Liseré de maintien des bureaux du 2 novembre 2026

Le périmètre conserve ses pointillés et l'absence de remplissage. Un trait rouge plus large entoure le trait jaune ; les deux suivent exactement les cinq géométries de la prescription. Le curseur d'opacité et l'interrupteur de couche agissent sur les deux traits ensemble.

Contrôles locaux réussis : ESLint, Prettier, 10 tests Node, build Vite et 8 tests Playwright avec Chrome. Le contrôle du liseré a été relancé après l'ajustement visuel des couleurs et de l'épaisseur.

Le liseré a ensuite été affiné : trait rouge de 4 px et trait jaune de 2,5 px, contre 6 et 4 px auparavant. Les géométries, couleurs, pointillés et l'absence de remplissage sont conservés.

## Cercle des gares du 2 novembre 2026

Le clic sur une gare ajoute un cercle blanc pointillé de 500 m sans remplissage. Il conserve le centre et le zoom de la carte, y compris à l'ouverture de la fiche. Le cercle précédent est remplacé au clic sur une autre gare. Le contrôle navigateur vérifie ces propriétés pour les six gares.
