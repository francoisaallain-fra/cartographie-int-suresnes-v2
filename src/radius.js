import { state, runtime, amenityGroups, groupFor } from "./state.js";
export function radiusText() {
  return state.radiusMeters === 1000 ? "1 km" : state.radiusMeters + " m";
}
export function selectedRadius(id = state.selected) {
  return runtime.data.radii.offices[id][state.radiusMeters];
}
/** Count the reviewed amenities, independently of display filters. */
export function nearbyAmenities(id = state.selected) {
  const ids = new Set(selectedRadius(id).nearby.map((item) => item.id));
  return runtime.allPoints.filter(
    (feature) =>
      ids.has(feature.id) && amenityGroups.includes(groupFor(feature)),
  );
}
export function allowedIds() {
  return state.selected
    ? new Set(selectedRadius().nearby.map((x) => x.id))
    : null;
}
