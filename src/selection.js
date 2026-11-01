import { pointInRing } from "./geometry.js";
import { radiusText, selectedRadius } from "./radius.js";
import { amenityGroups, runtime, state } from "./state.js";
import { $ } from "./presentation.js";
import { updateLayers } from "./layers.js";
export function redrawRadius() {
  if (runtime.radiusLayer) runtime.map.removeLayer(runtime.radiusLayer);
  runtime.radiusLayer = L.geoJSON(selectedRadius().geometry, {
    style: {
      color: "#b4f1d2",
      weight: 2,
      dashArray: "6 5",
      fillColor: "#7cdbbd",
      fillOpacity: 0.1,
    },
    interactive: false,
  }).addTo(runtime.map);
  $("radius-distance").textContent = radiusText();
  const office = runtime.data.offices.features.find(
    (f) => f.id === state.selected,
  );
  $("map-context").textContent =
    `Adresse ${office.properties.number} · rayon de ${radiusText()}`;
}
export function selectOffice(f) {
  if (!state.selected)
    state.beforeSelection = {
      ...state.enabled,
    };
  state.selected = f.id;
  state.enabled.offices = true;
  for (const id of amenityGroups) state.enabled[id] = true;
  redrawRadius();
  $("radius-panel").hidden = false;
  $("radius-name").textContent = f.properties.name;
  updateLayers();
  runtime.map.fitBounds(runtime.radiusLayer.getBounds(), {
    padding: [55, 55],
    maxZoom: 17,
    animate: false,
  });
  runtime.markers.get(f.id).openPopup();
  if (window.innerWidth <= 720)
    $("map").scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
}
export function clearSelection(restore = true) {
  if (runtime.radiusLayer) {
    runtime.map.removeLayer(runtime.radiusLayer);
    runtime.radiusLayer = null;
  }
  state.selected = null;
  if (restore && state.beforeSelection)
    state.enabled = {
      ...state.beforeSelection,
    };
  state.beforeSelection = null;
  $("radius-panel").hidden = true;
  $("map-context").textContent = "Suresnes · vue communale";
  runtime.map.closePopup();
  updateLayers();
}
export function showCityView() {
  if (state.selected) clearSelection();
  runtime.map.stop();
  runtime.map.fitBounds(runtime.bounds, {
    padding: [24, 24],
    animate: false,
  });
}
export function handleMapClick(event) {
  if (!state.selected) return;
  // Hit-test the same geodesic polygon that draws the selected perimeter.
  const ring = selectedRadius().geometry.coordinates[0];
  const { lng: x, lat: y } = event.latlng;
  const inside = pointInRing([x, y], ring);
  if (!inside) showCityView();
}
