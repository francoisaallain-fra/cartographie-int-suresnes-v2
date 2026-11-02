/** Tests point containment in a WGS84 polygon using ray casting. */
export function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i],
      [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function pointOnRing([x, y], ring) {
  for (let i = 0; i < ring.length - 1; i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[i + 1];
    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
    if (
      Math.abs(cross) <= 1e-12 &&
      x >= Math.min(ax, bx) - 1e-12 &&
      x <= Math.max(ax, bx) + 1e-12 &&
      y >= Math.min(ay, by) - 1e-12 &&
      y <= Math.max(ay, by) + 1e-12
    )
      return true;
  }
  return false;
}

/** Includes the outer boundary and the boundaries of holes. */
export function pointInPolygonGeometry(point, geometry) {
  const polygons =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [];
  return polygons.some(
    ([outer, ...holes]) =>
      (pointInRing(point, outer) || pointOnRing(point, outer)) &&
      holes.every(
        (hole) => !pointInRing(point, hole) || pointOnRing(point, hole),
      ),
  );
}

/** Spherical distance in metres, matching Leaflet's 500 m station circles. */
export function distanceMeters([lonA, latA], [lonB, latB]) {
  const rad = Math.PI / 180;
  const deltaLat = (latB - latA) * rad;
  const deltaLon = (lonB - lonA) * rad;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA * rad) * Math.cos(latB * rad) * Math.sin(deltaLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(a)));
}
