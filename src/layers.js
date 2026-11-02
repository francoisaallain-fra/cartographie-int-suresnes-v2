import { allowedIds, radiusText } from "./radius.js";

import { layerSpecs } from "./catalog.js";
import { groupFor, polygonOutlineOpacity, runtime, state } from "./state.js";
import { updateRail, updateRoads } from "./transport.js";
import { featureIcon } from "./markers.js";
import { popup } from "./popups.js";
import { categoryKey, hiddenCategories } from "./legend.js";
import { $ } from "./presentation.js";
import { applyOpacity } from "./opacity.js";
export function updateLayers() {
  const allowed = allowedIds();
  let visible = 0;
  for (const spec of layerSpecs) {
    const group = runtime.groups[spec.id];
    if (
      ![
        "plu",
        "pluOfficeRetention",
        "mosOffices",
        "mixedBuildings",
        "mosPavilion",
        "mosCollective",
        "mosActivities",
      ].includes(spec.id)
    ) {
      group.clearLayers();
      if (spec.id === "transport") {
        updateRoads();
        updateRail();
      }
      for (const f of runtime.allPoints.filter(
        (f) => groupFor(f) === spec.id,
      )) {
        const marker = runtime.markers.get(f.id);
        marker.setIcon(featureIcon(f));
        marker.setPopupContent(popup(f));
        if (
          (f.properties.kind === "transport"
            ? !hiddenCategories.has("stations")
            : !hiddenCategories.has(categoryKey(f.properties))) &&
          (["offices", "rentalOffices"].includes(spec.id) ||
            !allowed ||
            allowed.has(f.id))
        ) {
          group.addLayer(marker);
          if (state.enabled[spec.id]) visible++;
        }
      }
    }
    if (state.enabled[spec.id]) group.addTo(runtime.map);
    else runtime.map.removeLayer(group);
    $(`layer-${spec.id}`).checked = state.enabled[spec.id];
  }
  document.querySelectorAll("[data-category]").forEach((el) => {
    const active =
      state.enabled[el.dataset.group] &&
      !hiddenCategories.has(el.dataset.category);
    el.setAttribute("aria-pressed", String(active));
    el.disabled = !state.enabled[el.dataset.group];
  });
  updateZoneLabels();
  for (const s of layerSpecs) applyOpacity(s.id);
  $("visible-count").textContent =
    `${visible} points affichés${state.enabled.pluOfficeRetention ? " · 5 périmètres maintien bureaux" : ""}${state.enabled.mosOffices ? " · 25 emprises bureaux" : ""}${state.enabled.mixedBuildings ? " · 3 mixtes potentiels" : ""}${[
      "mosPavilion",
      "mosCollective",
      "mosActivities",
    ]
      .map((id) =>
        state.enabled[id]
          ? " · " +
            runtime.groups[id].getLayers().length +
            " emprises " +
            layerSpecs
              .find((s) => s.id === id)
              .label.split(" · ")[1]
              .toLowerCase()
          : "",
      )
      .join(
        "",
      )}${state.enabled.transport && runtime.roadLayers.length ? " · " + runtime.roadLayers.length + " axes" : ""}${state.enabled.transport && runtime.railLayers.length ? " · " + runtime.railLayers.length + " lignes" : ""}${state.selected ? " · aménités à " + radiusText() : ""}`;
  document
    .querySelectorAll(".office-item")
    .forEach((el) =>
      el.classList.toggle("active", el.dataset.id === state.selected),
    );
  if (state.selected) {
    const nearby = runtime.allPoints.filter((f) => allowed.has(f.id));
    $("radius-count").textContent =
      `${nearby.length} aménités recensées : ${nearby.filter((f) => f.properties.kind === "transport").length} transport(s), ${nearby.filter((f) => ["school", "nursery", "health"].includes(f.properties.kind)).length} santé / crèche / école, ${nearby.filter((f) => ["bakery", "tea", "pharmacy"].includes(f.properties.kind)).length} de quartier.`;
  }
}
export function updateZoneLabels() {
  if (!runtime.map) return;
  for (const { marker, area } of runtime.zoneLabels) {
    marker.setOpacity(polygonOutlineOpacity("plu"));
    if (state.enabled.plu && (runtime.map.getZoom() >= 16 || area >= 20000))
      marker.addTo(runtime.map);
    else runtime.map.removeLayer(marker);
  }
}
