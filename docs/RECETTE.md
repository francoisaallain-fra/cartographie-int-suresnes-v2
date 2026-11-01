# Contrat de non-régression

Référence : contenu GitHub v1 au commit 1e34b1e, copié dans v2 au commit 14ba244. Les nombres ci-dessous décrivent cet instantané.

| Fonction         | Attendu                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Onze couches     | Activation indépendante, tout masquer, ordre visuel correspondant à l'ordre des cartes                            |
| Repli Notion     | Triangle visible ; nom, icône, interrupteur et poignée conservés ; corps masqué ; état persistant                 |
| Personnalisation | Renommer, annuler, nom d'origine ; ordre au clavier et par glisser ; persistance après rechargement               |
| Opacité          | 0 à 100 %, surfaces réellement opaques à 100 %, objets invisibles non interactifs                                 |
| Sous-catégories  | Gares indépendantes des lignes L/U/T2 ; axes routiers, santé, crèches, niveaux scolaires, commerces et pharmacies |
| Quatre adresses  | Sélection par liste et marqueur, changement d'adresse sans ancien cadrage résiduel                                |
| Soixante rayons  | 300 à 1 000 m par pas de 50 ; listes et géométries pré-calculées préservées                                       |
| Retour ville     | Bouton ou clic hors cercle ; restauration des couches antérieures                                                 |
| Rotation         | Ctrl/Commande avant ou après clic, marqueurs utilisables, retour nord                                             |
| Sources          | Dialogue, fermeture Échap et extérieure, liens et téléchargements                                                 |
| Accessibilité    | Libellés accessibles, focus visible, clavier, affichage mobile sans débordement                                   |
| Panne réseau     | Message de chargement et reprise ; erreur de fond IGN distincte des données                                       |

Les tests Node contrôlent les empreintes, les 60 scénarios, la validation des données, l'échappement et l'identité du site. Les tests Playwright du dépôt contrôlent les interactions et les 60 ensembles de points affichés. Les contrôles visuels et gestes de rotation restent à revoir pour toute modification du rendu ou de Leaflet.

## Exécution du 1 novembre 2026

Contrôles locaux réussis : ESLint, Prettier, 8 tests Node et build Vite. Recette dans le navigateur : chargement des 11 couches, 22 activations/masquages, 22 replis/déplis, les 60 valeurs adresse–rayon, retour ville, repli persistant, renommage persistant, déplacement au clavier, opacité 0 %, ouverture/fermeture des sources. Affichage à 390 × 844 contrôlé sans débordement. Aucune erreur console relevée pendant ces parcours. La première exécution GitHub Actions a également réussi : 8 tests Node, 4 tests Playwright, contrôle de format, analyse statique et build. Les tests navigateur vérifient notamment les ensembles de points des 60 scénarios. Preuve : https://github.com/francoisaallain-fra/cartographie-int-suresnes-v2/actions/runs/41303090989. Chaque nouveau commit relance ces contrôles ; leur statut courant figure dans la PR.

Les scripts historiques de collecte n'ont pas été relancés : il s'agit d'une refonte du code de l'application, avec données conservées à l'identique.
