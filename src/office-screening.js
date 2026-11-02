import { distanceMeters, pointInPolygonGeometry } from "./geometry.js";

export const stationDistanceLimitMeters = 500;

/** Address-point screening; it does not establish a building's full footprint. */
export function screenOfficePoint(office, stations, retentionZones) {
  const point = office.geometry.coordinates;
  const nearest = stations.reduce((best, station) => {
    const distance = distanceMeters(point, station.geometry.coordinates);
    return !best || distance < best.distance ? { station, distance } : best;
  }, null);
  const outsideRetention = !retentionZones.some((zone) =>
    pointInPolygonGeometry(point, zone.geometry),
  );
  return {
    stationId: nearest?.station.id ?? null,
    stationName: nearest?.station.properties.name ?? null,
    distanceMeters: nearest?.distance ?? null,
    outsideRetention,
    highlighted:
      outsideRetention &&
      nearest !== null &&
      nearest.distance <= stationDistanceLimitMeters,
  };
}
