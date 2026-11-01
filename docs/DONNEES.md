# Données, provenance et reprise

`public/data/sources.json` décrit les producteurs, millésimes et licences. Les journaux `quality.json`, `mos-quality.json`, `mos-groups-quality.json` et `plu-maintien-quality.json` conservent la traçabilité. Les 24 fichiers de données du point de départ sont conservés sans modification, y compris le ZIP téléchargé par l'utilisateur.

Les scripts Python historiques présents dans le ZIP ont été rendus consultables dans `scripts/legacy-data/`. Ils gardent leurs hypothèses de chemins et de jeux sources de 2026 ; ils ne constituent pas une collecte automatiquement actualisée. Leur relance nécessite de lire leurs entrées, vérifier les accès aux producteurs et comparer les résultats. Le ZIP reste un instantané de référence, pas un artefact régénéré silencieusement lors du build.

Pour une mise à jour : conserver les fichiers sources, mettre à jour les scripts concernés, valider les coordonnées/identifiants/géométries, recalculer les 4 × 15 scénarios, actualiser les journaux et textes, puis revoir explicitement les empreintes de référence. Ne jamais actualiser les empreintes pour masquer une différence non expliquée.

Une adresse n'est pas une preuve de vacance. Une emprise Mos n'est pas un bâtiment certifié. Les trois bâtiments mixtes restent des candidats. Les limites territoriales, incertitudes et liens réglementaires de l'interface sont conservés. Les droits sur les données et logos restent ceux des producteurs ; aucune nouvelle licence globale n'est attribuée au dépôt.
