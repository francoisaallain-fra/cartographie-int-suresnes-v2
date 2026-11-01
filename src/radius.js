import { state, runtime } from "./state.js";
export function radiusText() {
  return state.radiusMeters === 1000 ? "1 km" : state.radiusMeters + " m";
}
export function selectedRadius(id = state.selected) {
  return runtime.data.radii.offices[id][state.radiusMeters];
}
export function allowedIds() {
  return state.selected
    ? new Set(selectedRadius().nearby.map((x) => x.id))
    : null;
}
