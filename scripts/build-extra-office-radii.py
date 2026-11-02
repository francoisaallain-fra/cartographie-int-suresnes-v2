"""Build the 15 radius scenarios for newly targeted addresses only.

Uses the same WGS84 geodesic and line clipping method as the historical
Suresnes radius generator. Run with the project's existing Python GIS venv.
"""

import json
from pathlib import Path

from pyproj import Geod
from shapely.geometry import MultiLineString, Polygon, mapping, shape


DATA = Path(__file__).resolve().parents[1] / "public/data"
GEOD = Geod(ellps="WGS84")


def read(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def line_parts(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type == "LineString":
        return [geometry]
    return [line for part in getattr(geometry, "geoms", []) for line in line_parts(part)]


def clip(geometry, polygon):
    lines = line_parts(shape(geometry).intersection(polygon))
    return mapping(MultiLineString(lines)) if lines else None


def main():
    points = sum(
        (read(name + ".geojson")["features"] for name in
         ["transport", "schools", "nurseries", "health", "neighborhood"]),
        [],
    )
    roads = read("roads.geojson")["features"]
    rail = read("rail.geojson")["features"]
    offices = read("offices-extra.geojson")["features"]
    result = {"offices": {}}
    for office in offices:
        lon, lat = office["geometry"]["coordinates"]
        distances = []
        for point in points:
            x, y = point["geometry"]["coordinates"]
            _, _, distance = GEOD.inv(lon, lat, x, y)
            distances.append({"id": point["id"], "distance_m": distance})
        scenarios = {}
        for radius in range(300, 1001, 50):
            ring = [list(GEOD.fwd(lon, lat, angle, radius)[:2])
                    for angle in range(0, 360, 2)]
            ring.append(ring[0])
            polygon = Polygon(ring)
            assert polygon.is_valid
            nearby = sorted(
                ({"id": p["id"], "distance_m": round(p["distance_m"], 2)}
                 for p in distances if p["distance_m"] <= radius),
                key=lambda p: p["distance_m"],
            )
            scenarios[str(radius)] = {
                "geometry": mapping(polygon),
                "nearby": nearby,
                "roads": {feature["id"]: clip(feature["geometry"], polygon)
                          for feature in roads},
                "rail": {feature["id"]: clip(feature["geometry"], polygon)
                         for feature in rail},
            }
        result["offices"][office["id"]] = scenarios
    (DATA / "radii-extra.json").write_text(
        json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(f"{len(offices)} adresse(s), {sum(map(len, result['offices'].values()))} scénarios")


if __name__ == "__main__":
    main()
