import { groupFor, runtime } from "./state.js";
import { featureIcon } from "./markers.js";
import { popup } from "./popups.js";
import { frameOfficePopup, selectOffice, selectStation } from "./selection.js";
export function addPointMarker(f) {
  const [x, y] = f.geometry.coordinates;
  const framedPopup = f.properties.kind !== "transport";
  const marker = L.marker([y, x], {
    pane: "data-" + groupFor(f) + "-markers",
    icon: featureIcon(f),
    title: f.properties.kind === "transport" ? "" : f.properties.name,
    alt: f.properties.name,
    keyboard: true,
    zIndexOffset:
      f.properties.kind === "office"
        ? 900
        : f.properties.kind === "transport"
          ? 1200
          : 0,
  }).bindPopup(
    popup(f),
    f.properties.kind === "transport"
      ? {
          className: "station-card-popup",
          autoPan: false,
        }
      : framedPopup
        ? {
            autoPan: false,
            className: ["office", "rentalOffice"].includes(f.properties.kind)
              ? "building-card-popup"
              : "",
          }
        : {},
  );
  if (framedPopup) marker.on("popupopen", () => frameOfficePopup(marker));
  if (f.properties.kind === "office") marker.on("click", () => selectOffice(f));
  if (f.properties.kind === "transport")
    marker.on("click", () => selectStation(f));
  if (f.properties.kind === "transport")
    marker.on("add", () =>
      marker.getElement()?.setAttribute("aria-label", f.properties.name),
    );
  runtime.markers.set(f.id, marker);
}
