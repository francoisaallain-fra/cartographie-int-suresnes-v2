# Contrat de non-régression

Référence des contrôles : jeux de données et ressources identifiés dans `tests/baseline-sha256.json`. Les nombres ci-dessous décrivent cet instantané.

| Fonction         | Attendu                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Douze couches    | Activation indépendante, tout masquer, ordre visuel correspondant à l'ordre des cartes                                                                   |
| Repli Notion     | Triangle visible ; nom, icône, interrupteur et poignée conservés ; corps masqué ; état persistant                                                        |
| Personnalisation | Renommer, annuler, nom d'origine ; ordre au clavier et par glisser ; persistance après rechargement                                                      |
| Opacité          | 0 à 100 %, surfaces réellement opaques à 100 %, objets invisibles non interactifs                                                                        |
| Zonage PLU       | Couche désactivée à chaque ouverture ; réactivation possible par son interrupteur                                                                        |
| Maintien bureaux | Liseré rouge vif, fin, pointillé et sans remplissage ; curseur agissant sur les deux traits                                                              |
| Bureaux à louer  | Pastilles bleues hors repérage vert ; couleur modifiable séparément pour chaque adresse dans sa fiche                                                    |
| Bureaux ciblés   | Couleur modifiable séparément dans chaque fiche, restaurable et conservée dans ce navigateur                                                             |
| Repérage vert    | Deux couches de points : gare à 500 m ou moins et point hors maintien PLU ; 2 adresses ciblées et 4 à louer, avec couleur manuelle prioritaire           |
| Sous-catégories  | Gares indépendantes des lignes L/U/T2 ; axes routiers, santé, crèches, niveaux scolaires, commerces et pharmacies                                        |
| Cinq adresses    | Sélection par liste et marqueur, changement d'adresse sans ancien cadrage résiduel                                                                       |
| 75 rayons        | 300 à 1 000 m par pas de 50 ; listes et géométries pré-calculées préservées                                                                              |
| Six gares        | Clic sur chacune : cercle de 500 m cumulable ; second clic sur la même gare : retrait individuel ; masquage des transports : retrait de tous les cercles |
| Retour ville     | Bouton ou clic hors cercle ; restauration des couches antérieures                                                                                        |
| Rotation         | Ctrl/Commande avant ou après clic, marqueurs utilisables, retour nord                                                                                    |
| Sources          | Dialogue, fermeture Échap et extérieure, liens et téléchargements                                                                                        |
| Accessibilité    | Libellés accessibles, focus visible, clavier, affichage mobile sans débordement                                                                          |
| Panne réseau     | Message de chargement et reprise ; erreur de fond IGN distincte des données                                                                              |

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

Le clic sur une gare ajoute un cercle blanc pointillé de 500 m sans remplissage. Il conserve le centre et le zoom de la carte, y compris à l'ouverture de la fiche. La version initiale remplaçait le cercle précédent au clic sur une autre gare ; ce comportement a été révisé ci-dessous.

## Cumul des rayons des gares · 2 novembre 2026

Les six cercles peuvent être affichés ensemble. Recliquez sur une gare pour retirer uniquement son cercle ; les autres restent en place. Les clics sur le fond de carte et l'exploration d'un bureau ne les effacent pas. Masquer la couche Transports ou utiliser « Tout masquer » retire tous les cercles. Le curseur d'opacité de la couche Transports agit sur chacun d'eux. Le clic sur une gare ne modifie ni le centre ni le zoom.

Contrôles locaux réussis : ESLint, Prettier, 11 tests Node, build Vite et 12 parcours Playwright avec Chrome. Le parcours des gares vérifie le cumul des six cercles, le retrait d'un seul, leur maintien après un clic sur la carte et un bureau, l'opacité commune et leur retrait au masquage des transports.

## Fiches des bureaux du 2 novembre 2026

À l'ouverture d'un bureau ciblé ou d'un bureau à louer, la carte se décale si nécessaire pour afficher toute la fenêtre. Sur un écran bas, la fiche peut défiler à l'intérieur de sa fenêtre. Sur mobile, une sélection depuis la liste ramène aussi la carte à l'écran. Le cadrage des cinq bureaux ciblés et d'une annonce regroupant quatre lots est vérifié sur ordinateur et mobile.

## Repli des couches du 2 novembre 2026

Les douze cartes de la colonne de gauche sont repliées à l'ouverture d'une nouvelle session. Les choix de dépliage sont conservés pendant la session, y compris après rechargement de l'onglet, puis réinitialisés à la session suivante.

## Revue des aménités du 2 novembre 2026

Quatorze points incertains ont été recherchés par nom et adresse dans Google Maps et rapprochés des sources conservées. Le collège est affiché sous le nom Hubert Germain ; Berty Albrecht et Le Fournil de Verdun sont harmonisés. Tea o’clock est présenté comme magasin de thé. Cinq points commerciaux sans boutique suffisamment corroborée sont retirés de l'affichage, tout en restant dans les données de référence et le [journal de revue](AMENITES_REVIEW.md). La divergence d'adresse de L'Atelier de Flo et la position de l'hôpital de jour restent signalées.

Contrôles locaux : ESLint, Prettier, 11 tests Node, build Vite et 11 tests Playwright avec Chrome réussis. Le test des 75 scénarios de rayon compare les points affichés après l'exclusion documentée, sans modifier les scénarios historiques.

## Configuration d'ouverture des couches · 2 novembre 2026

Les couches Mos 6, 7 et 8 ouvrent la liste, actives à 55 %, 55 % et 50 % d'opacité. Le Mos 8 Activités est bleu. Suivent les bâtiments mixtes et les bureaux Mos, désactivés ; puis transports, immeubles ciblés, bureaux proposés à la location et maintien des surfaces de bureau, activés. Le zonage PLU, les équipements et les aménités de quartier restent désactivés à l'ouverture. Les douze réglages restent repliés pour une nouvelle session. L'ancienne clé d'ordre local est remplacée une fois, afin que ce nouvel ordre soit visible aussi dans les navigateurs déjà utilisés.

Contrôles locaux réussis : ESLint, Prettier, 11 tests Node, build Vite et 12 parcours Playwright avec Chrome. Le nouveau parcours vérifie l'ordre complet, les neuf interrupteurs montrés, les quatre valeurs d'opacité visibles et le bleu du Mos 8, y compris après migration de l'ancienne clé d'ordre.

## Ordre de la colonne de gauche · 2 novembre 2026

À l'ouverture, les quatre premières couches sont, dans cet ordre : Transports structurants, Immeubles ciblés, Bureaux proposés à la location, Maintien des surfaces de bureau · PLU. Les couches Mos 6, 7 et 8 puis les autres couches suivent dans leur ordre relatif précédent. La clé d'ordre local passe à sa troisième version pour appliquer cette disposition aux navigateurs déjà utilisés ; les déplacements effectués ensuite restent persistants.

## Repérage jaune des bureaux · 2 novembre 2026

Les pastilles des deux couches de points deviennent jaunes lorsque l’adresse est à 500 m ou moins d’une des six gares et hors des cinq périmètres de maintien des surfaces de bureau. Le calcul est indépendant de la visibilité des couches Transports et Maintien. Sur cet instantané, 2 adresses ciblées et 4 adresses de location sont jaunes. Les autres gardent leur couleur d’origine ; une couleur personnalisée reste prioritaire et le bouton « Couleur initiale » restaure le jaune pour les adresses éligibles. La légende et la fiche expliquent que ce repérage au point ne valide pas le bâtiment ni sa faisabilité.

Contrôles locaux réussis : ESLint, Prettier, 13 tests Node, build Vite et 13 parcours Playwright avec Chrome. Les nouveaux tests vérifient le seuil de 500 m, les limites et trous des polygones, les six identifiants retenus, le nombre de pastilles jaunes et la restauration après changement individuel de couleur. Les ressources de référence n’ont pas été modifiées.

## Correction des couleurs · 2 novembre 2026

Sur demande de François, les six pastilles de repérage précédemment jaunes sont maintenant vertes (`#00c853`). Les couleurs choisies individuellement restent prioritaires et « Couleur initiale » revient au vert pour les points éligibles. Le liseré de maintien est entièrement rouge vif (`#ff0000`), toujours pointillé et sans remplissage ; son trait extérieur passe de 4 à 3 px. Les deux traits gardent le même réglage d’opacité. Les critères spatiaux et les données sont inchangés.

## Ajustement du vert · 3 novembre 2026

Le vert de repérage passe de `#00c853` à `#00a846`, légèrement plus sombre. Les six points éligibles, le liseré rouge et la priorité des couleurs choisies individuellement restent inchangés.

## Second ajustement du vert · 3 novembre 2026

Le vert de repérage passe de `#00a846` à `#007f3f`, plus sombre et accompagné de chiffres blancs pour préserver leur lisibilité. Les critères spatiaux, les six points concernés et les autres couches ne changent pas.
