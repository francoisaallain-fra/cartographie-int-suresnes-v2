import { pointInRing } from "./geometry.js";
import { radiusText, selectedRadius } from "./radius.js";
import { amenityGroups, layerOpacity, runtime, state } from "./state.js";
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
export function clearStationRadius() {
  if (runtime.stationRadiusLayer) {
    runtime.map.removeLayer(runtime.stationRadiusLayer);
    runtime.stationRadiusLayer = null;
  }
  state.selectedStation = null;
  if (!state.selected)
    $("map-context").textContent = "Suresnes · vue communale";
}
export function selectStation(feature) {
  if (state.selected) clearSelection();
  clearStationRadius();
  state.selectedStation = feature.id;
  state.enabled.transport = true;
  updateLayers();
  const [lng, lat] = feature.geometry.coordinates;
  runtime.stationRadiusLayer = L.circle([lat, lng], {
    radius: 500,
    pane: "data-transport",
    className: "station-radius",
    color: "#ffffff",
    weight: 2,
    dashArray: "6 5",
    fill: false,
    opacity: layerOpacity.transport / 100,
    interactive: false,
  }).addTo(runtime.map);
  $("map-context").textContent = `${feature.properties.name} · rayon de 500 m`;
  runtime.markers.get(feature.id).openPopup();
}
export function selectOffice(f) {
  clearStationRadius();
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
  clearStationRadius();
  runtime.map.closePopup();
  runtime.map.stop();
  runtime.map.fitBounds(runtime.bounds, {
    padding: [24, 24],
    animate: false,
  });
}
export function handleMapClick(event) {
  if (!state.selected) {
    if (
      state.selectedStation &&
      runtime.stationRadiusLayer &&
      runtime.map.distance(
        event.latlng,
        runtime.stationRadiusLayer.getLatLng(),
      ) > 500
    )
      showCityView();
    return;
  }
  // Hit-test the same geodesic polygon that draws the selected perimeter.
  const ring = selectedRadius().geometry.coordinates[0];
  const { lng: x, lat: y } = event.latlng;
  const inside = pointInRing([x, y], ring);
  if (!inside) showCityView();
}
