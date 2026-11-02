import { colors, escapeHTML, officeScreeningColor } from "./presentation.js";
import { runtime } from "./state.js";

export const markerColorsKey = "suresnes-v2-office-marker-colors";
const overrides = Object.create(null);
const colorPattern = /^#[0-9a-f]{6}$/i;
const officeKinds = new Set(["office", "rentalOffice"]);

try {
  const saved = JSON.parse(localStorage.getItem(markerColorsKey));
  if (saved && typeof saved === "object" && !Array.isArray(saved))
    for (const [key, value] of Object.entries(saved))
      if (
        /^(office|rentalOffice):.+$/.test(key) &&
        typeof value === "string" &&
        colorPattern.test(value)
      )
        overrides[key] = value.toLowerCase();
} catch {}

const featureKey = (feature) => `${feature.properties.kind}:${feature.id}`;
export const defaultMarkerColor = (feature) =>
  feature.properties.officeScreening?.highlighted
    ? officeScreeningColor
    : colors[feature.properties.kind];

export function markerColor(feature) {
  return overrides[featureKey(feature)] || defaultMarkerColor(feature);
}

export function markerInk(color) {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(color.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance <= 0.183 ? "#ffffff" : "#000000";
}

export function saveMarkerColor(feature, color) {
  if (!officeKinds.has(feature.properties.kind) || !colorPattern.test(color))
    return false;
  const key = featureKey(feature);
  if (color.toLowerCase() === defaultMarkerColor(feature))
    delete overrides[key];
  else overrides[key] = color.toLowerCase();
  try {
    localStorage.setItem(markerColorsKey, JSON.stringify(overrides));
  } catch {}
  return true;
}

export function markerColorControl(feature) {
  const color = markerColor(feature);
  return `<div class="marker-color-control"><label>Couleur de cette pastille <input type="color" data-marker-color="${escapeHTML(feature.id)}" value="${color}" aria-label="Couleur de la pastille : ${escapeHTML(feature.properties.name)}"></label><button type="button" data-marker-color-reset="${escapeHTML(feature.id)}" ${color === defaultMarkerColor(feature) ? "disabled" : ""}>Couleur initiale</button><small>Choix enregistré dans ce navigateur pour cette adresse uniquement.</small></div>`;
}

function officeFeature(id) {
  return runtime.allPoints.find(
    (feature) => feature.id === id && officeKinds.has(feature.properties.kind),
  );
}

function paintMarker(feature) {
  const disc = runtime.markers
    .get(feature.id)
    ?.getElement()
    ?.querySelector(".pin-disc");
  if (!disc) return;
  const color = markerColor(feature);
  disc.style.setProperty("--color", color);
  disc.style.color = markerInk(color);
}

export function bindMarkerColorControls() {
  document.addEventListener(
    "input",
    (event) => {
      const input = event.target.closest("input[data-marker-color]");
      if (!input) return;
      const feature = officeFeature(input.dataset.markerColor);
      if (!feature || !saveMarkerColor(feature, input.value)) return;
      paintMarker(feature);
      input.closest(".marker-color-control").querySelector("button").disabled =
        markerColor(feature) === defaultMarkerColor(feature);
    },
    true,
  );
  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("button[data-marker-color-reset]");
      if (!button) return;
      const feature = officeFeature(button.dataset.markerColorReset);
      if (!feature) return;
      saveMarkerColor(feature, defaultMarkerColor(feature));
      paintMarker(feature);
      button.parentElement.querySelector("input").value = markerColor(feature);
      button.disabled = true;
    },
    true,
  );
}
