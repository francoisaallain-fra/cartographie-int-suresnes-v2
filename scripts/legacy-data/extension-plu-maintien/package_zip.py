#!/usr/bin/env python3
"""Append the PLU office-retention extension to the existing public data bundle."""

from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED


ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
MOS = ROOT / "recherches" / "mos-suresnes-2026-10-29"
DATA = ROOT / "sites" / "carte-couches-suresnes" / "dist" / "data"
ARCHIVE = DATA / "suresnes-donnees.zip"
TEMP = ARCHIVE.with_suffix(".zip.tmp")
FILES = {
    "processed/quality.json": DATA / "quality.json",
    "processed/sources.json": DATA / "sources.json",
    "processed/plu-maintien-bureaux.geojson": DATA / "plu-maintien-bureaux.geojson",
    "processed/plu-maintien-quality.json": DATA / "plu-maintien-quality.json",
    "extension-plu-maintien/README.md": HERE / "README.md",
    "extension-plu-maintien/extract.py": HERE / "extract.py",
    "extension-plu-maintien/package_zip.py": HERE / "package_zip.py",
    "processed/mos-pavillonnaire.geojson": DATA / "mos-pavillonnaire.geojson",
    "processed/mos-collectif.geojson": DATA / "mos-collectif.geojson",
    "processed/mos-activites.geojson": DATA / "mos-activites.geojson",
    "processed/mos-groups-quality.json": DATA / "mos-groups-quality.json",
    "extension-mos-groupes/prepare_groups.py": MOS / "prepare_groups.py",
    "extension-mos-groupes/mos-6-7-8-2025.json": MOS / "mos-6-7-8-2025.json",
    "extension-mos-groupes/README.md": MOS / "README.md",
}


def main():
    with ZipFile(ARCHIVE) as source, ZipFile(TEMP, "w", compression=ZIP_DEFLATED) as target:
        seen = set()
        for item in source.infolist():
            name = item.filename
            if name in seen:
                raise ValueError(f"Duplicate ZIP entry: {name}")
            seen.add(name)
            target.writestr(item, FILES[name].read_bytes() if name in FILES else source.read(name))
        for name, file in FILES.items():
            if name not in seen:
                target.write(file, name)
    with ZipFile(TEMP) as check:
        assert check.testzip() is None
        assert all(check.read(name) == file.read_bytes() for name, file in FILES.items())
    TEMP.replace(ARCHIVE)
    print(f"Validated {ARCHIVE}")


if __name__ == "__main__":
    main()
