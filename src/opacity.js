import {
  groupFor,
  layerOpacity,
  polygonOutlineOpacity,
  runtime,
} from "./state.js";
import { $ } from "./presentation.js";
export function applyOpacity(id) {
  const opacity = layerOpacity[id] / 100;
  if (id === "plu") {
    runtime.groups.plu.setStyle({
      opacity: polygonOutlineOpacity(id, 0.95),
      fillOpacity: opacity,
    });
    runtime.groups.plu.eachLayer((layer) => {
      if (layer.getElement())
        layer.getElement().style.pointerEvents = opacity === 0 ? "none" : "";
    });
    for (const { marker } of runtime.zoneLabels)
      marker.setOpacity(polygonOutlineOpacity(id));
  } else if (id === "pluOfficeRetention") {
    runtime.groups[id].eachLayer((group) => {
      group.setStyle({ opacity });
      group.eachLayer((layer) => {
        if (layer.getElement())
          layer.getElement().style.pointerEvents =
            opacity === 0 || !layer.options.interactive ? "none" : "";
      });
    });
  } else if (
    id === "mosOffices" ||
    id === "mixedBuildings" ||
    id === "mosPavilion" ||
    id === "mosCollective" ||
    id === "mosActivities"
  ) {
    const isMixed = id === "mixedBuildings";
    runtime.groups[id].setStyle({
      opacity: polygonOutlineOpacity(id, isMixed ? 0.98 : 1),
      fillOpacity: opacity,
    });
    runtime.groups[id].eachLayer((layer) => {
      if (layer.getElement())
        layer.getElement().style.pointerEvents = opacity === 0 ? "none" : "";
    });
  } else {
    for (const f of runtime.allPoints.filter((f) => groupFor(f) === id)) {
      const marker = runtime.markers.get(f.id);
      marker.setOpacity(opacity);
      const el = marker.getElement();
      if (el) {
        el.style.pointerEvents = opacity === 0 ? "none" : "";
        el.tabIndex = opacity === 0 ? -1 : 0;
      }
    }
  }
  if (id === "transport")
    for (const road of runtime.roadLayers) {
      road.halo.setStyle({
        opacity: opacity * 0.4,
      });
      road.line.setStyle({
        opacity,
      });
      road.line.eachLayer((layer) => {
        if (layer.getElement())
          layer.getElement().style.pointerEvents = opacity === 0 ? "none" : "";
      });
    }
  if (id === "transport")
    for (const rail of runtime.railLayers)
      for (const part of rail.parts) {
        part.setStyle({
          opacity,
        });
        const el = part.getElement();
        if (el && part.options.interactive)
          el.style.pointerEvents = opacity === 0 ? "none" : "";
      }
  if (id === "transport" && runtime.stationRadiusLayer)
    runtime.stationRadiusLayer.setStyle({
      opacity,
    });
  const control = $("layerOpacity-" + id);
  control.value = layerOpacity[id];
  control.setAttribute("aria-valuetext", layerOpacity[id] + " % d’opacité");
  $("layerOpacity-value-" + id).textContent = layerOpacity[id] + " %";
}
