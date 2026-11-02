import { layerSpecs } from "./catalog.js";
export const state = {
  radiusMeters: 500,
  selected: null,
  selectedStation: null,
  enabled: {
    mosPavilion: true,
    mosCollective: true,
    mosActivities: true,
    mixedBuildings: false,
    mosOffices: false,
    transport: true,
    offices: true,
    rentalOffices: true,
    pluOfficeRetention: true,
    plu: false,
    equipment: false,
    neighborhood: false,
  },
  beforeSelection: null,
};
// Filled polygons preserve the aerial-photo view while the slider controls
// their fill opacity. The office-retention boundary uses stroke opacity only.
export const polygonDefaultOpacity = {
  mixedBuildings: 25,
  mosOffices: 100,
  mosPavilion: 55,
  mosCollective: 55,
  mosActivities: 50,
  plu: 5,
};
export const layerOpacity = Object.fromEntries(
  layerSpecs.map((s) => [s.id, polygonDefaultOpacity[s.id] ?? 100]),
);
export const polygonOutlineOpacity = (id, base = 1) =>
  Math.min(1, (layerOpacity[id] / polygonDefaultOpacity[id]) * base);
export const amenityGroups = ["transport", "equipment", "neighborhood"];
export function groupFor(f) {
  return f.properties.kind === "rentalOffice"
    ? "rentalOffices"
    : ["transport", "road"].includes(f.properties.kind)
      ? "transport"
      : ["school", "nursery", "health"].includes(f.properties.kind)
        ? "equipment"
        : ["bakery", "tea", "pharmacy"].includes(f.properties.kind)
          ? "neighborhood"
          : "offices";
}
export const runtime = {
  map: null,
  tiles: null,
  bounds: null,
  data: null,
  sources: null,
  groups: {},
  markers: new Map(),
  radiusLayer: null,
  stationRadiusLayer: null,
  zoneLabels: [],
  allPoints: [],
  roadLayers: [],
  railLayers: [],
};
