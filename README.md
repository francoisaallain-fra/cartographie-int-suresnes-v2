# Cartographie interactive de Suresnes

Dépôt du site statique et de ses données. L’interface se trouve dans `dist/` ; les couches cartographiques et le paquet de données sont dans `dist/data/`.

Pour afficher la carte localement :

```bash
python3 -m http.server 8000 -d dist
```

Ouvrir ensuite `http://localhost:8000/` dans un navigateur. Le fond IGN et certaines ressources externes nécessitent une connexion Internet. Les sources des données sont indiquées dans `dist/data/sources.json`.
