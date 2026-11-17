import { distanceMeters } from "./geometry.js";

/** Spherical 180-sided circle, with points exactly at the requested distance. */
export function circleRing([lng, lat], radius) {
  const rad = Math.PI / 180,
    phi = lat * rad,
    lambda = lng * rad;
  const delta = radius / 6371000;
  const ring = Array.from({ length: 180 }, (_, index) => {
    const bearing = -index * 2 * rad;
    const y = Math.asin(
      Math.sin(phi) * Math.cos(delta) +
        Math.cos(phi) * Math.sin(delta) * Math.cos(bearing),
    );
    const x =
      lambda +
      Math.atan2(
        Math.sin(bearing) * Math.sin(delta) * Math.cos(phi),
        Math.cos(delta) - Math.sin(phi) * Math.sin(y),
      );
    return [x / rad, y / rad];
  });
  return [...ring, ring[0]];
}

/** Clip each line segment against a convex ring; retain crossing segments too. */
export function clipLines(geometry, ring) {
  const lines =
    geometry.type === "LineString"
      ? [geometry.coordinates]
      : geometry.type === "MultiLineString"
        ? geometry.coordinates
        : [];
  const area = ring
    .slice(0, -1)
    .reduce(
      (sum, p, i) => sum + p[0] * ring[i + 1][1] - ring[i + 1][0] * p[1],
      0,
    );
  const direction = area >= 0 ? 1 : -1;
  const parts = [];
  for (const line of lines) {
    let current = null;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1],
        b = line[i];
      let start = 0,
        end = 1;
      for (let j = 1; j < ring.length; j++) {
        const p = ring[j - 1],
          q = ring[j];
        const cross = (v) =>
          direction *
          ((q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0]));
        const ca = cross(a),
          cb = cross(b),
          change = cb - ca;
        if (Math.abs(change) < 1e-18) {
          if (ca < -1e-15) {
            end = -1;
            break;
          }
        } else if (change > 0) start = Math.max(start, -ca / change);
        else end = Math.min(end, -ca / change);
        if (start > end) break;
      }
      if (start >= end) {
        current = null;
        continue;
      }
      const at = (t) => a.map((value, axis) => value + (b[axis] - value) * t);
      const from = at(start),
        to = at(end);
      if (
        current &&
        current[current.length - 1].every(
          (v, axis) => Math.abs(v - from[axis]) < 1e-12,
        )
      )
        current.push(to);
      else {
        current = [from, to];
        parts.push(current);
      }
    }
  }
  return parts.length ? { type: "MultiLineString", coordinates: parts } : null;
}

export function buildRadiusScenario(office, radius, data) {
  const ring = circleRing(office.geometry.coordinates, radius);
  const amenities = [
    "transport",
    "schools",
    "nurseries",
    "health",
    "neighborhood",
  ].flatMap((key) => data[key].features);
  const nearby = amenities
    .map((feature) => ({
      id: feature.id,
      distance_m: distanceMeters(
        office.geometry.coordinates,
        feature.geometry.coordinates,
      ),
    }))
    .filter((item) => item.distance_m <= radius)
    .sort((a, b) => a.distance_m - b.distance_m);
  const clipped = (key) =>
    Object.fromEntries(
      data[key].features.map((f) => [f.id, clipLines(f.geometry, ring)]),
    );
  return {
    geometry: { type: "Polygon", coordinates: [ring] },
    nearby,
    roads: clipped("roads"),
    rail: clipped("rail"),
  };
}
