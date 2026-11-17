import { runtime } from "./state.js";

// Gentle reduction at close zooms; keep small symbols legible.
export function markerScale(zoom) {
  return Math.max(0.72, Math.min(1.12, 2 ** ((15 - zoom) * 0.085)));
}
export function setupMarkerZoom() {
  const update = () =>
    runtime.map
      .getContainer()
      .style.setProperty(
        "--marker-scale",
        String(markerScale(runtime.map.getZoom())),
      );
  runtime.map.on("zoom", update);
  update();
}
