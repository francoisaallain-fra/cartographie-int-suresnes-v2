import { colors, escapeHTML } from "./presentation.js";
import { runtime } from "./state.js";

// Keep the historical key to preserve existing office preferences.
export const markerColorsKey = "suresnes-v2-office-marker-colors";
export const markerTypeColorsKey = "suresnes-v2-marker-type-colors";
const overrides = Object.create(null);
const typeOverrides = Object.create(null);
const colorPattern = /^#[0-9a-f]{6}$/i;
export const markerTypeLabels = {
  office: "Immeubles ciblés",
  rentalOffice: "Bureaux à louer",
  transport: "Gares et stations",
  primary: "Maternelles / primaires",
  college: "Collèges",
  lycee: "Lycées",
  nursery: "Crèches",
  health: "Structures de soins",
  pharmacy: "Pharmacies",
  bakery: "Boulangeries / pâtisseries",
  tea: "Magasins de thé",
  grocery: "Épiceries / supérettes",
  supermarket: "Supermarchés",
  market: "Marchés alimentaires",
  produce: "Primeurs",
  organic: "Magasins bio",
  preparedFood: "Traiteurs / plats préparés",
  stationShop: "Stations-service avec boutique",
};
export function markerType(properties) {
  if (properties.kind !== "school") return properties.kind;
  return properties.category === "Lycée"
    ? "lycee"
    : properties.category === "Collège"
      ? "college"
      : "primary";
}
const isType = (type) => Object.hasOwn(markerTypeLabels, type);
const baseTypeColor = (type) => colors[type === "primary" ? "school" : type];
function restore(key, target, validKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && typeof saved === "object" && !Array.isArray(saved))
      for (const [id, color] of Object.entries(saved))
        if (
          validKey(id) &&
          typeof color === "string" &&
          colorPattern.test(color)
        )
          target[id] = color.toLowerCase();
  } catch {}
}
restore(markerColorsKey, overrides, (key) => {
  const separator = key.indexOf(":");
  const kind = key.slice(0, separator);
  return (
    separator > 0 &&
    key.length > separator + 1 &&
    (isType(kind) || kind === "school")
  );
});
restore(markerTypeColorsKey, typeOverrides, isType);

// Reset earlier rental colors once, while preserving targeted-office choices.
try {
  const resetKey = "suresnes-v2-rental-marker-blue-reset-v1";
  if (localStorage.getItem(resetKey) !== "1") {
    for (const key of Object.keys(overrides))
      if (key.startsWith("rentalOffice:")) delete overrides[key];
    localStorage.setItem(markerColorsKey, JSON.stringify(overrides));
    localStorage.setItem(resetKey, "1");
  }
} catch {}

// Apply the requested uniform targeted-office color once to existing browsers.
try {
  const resetKey = "suresnes-v2-targeted-marker-purple-reset-v1";
  if (localStorage.getItem(resetKey) !== "1") {
    for (const key of Object.keys(overrides))
      if (key.startsWith("office:")) delete overrides[key];
    localStorage.setItem(markerColorsKey, JSON.stringify(overrides));
    localStorage.setItem(resetKey, "1");
  }
} catch {}

const featureKey = (feature) => `${feature.properties.kind}:${feature.id}`;
export const defaultMarkerColor = (feature) =>
  baseTypeColor(markerType(feature.properties));
export const markerTypeColor = (type) =>
  typeOverrides[type] || baseTypeColor(type);
export const hasTypeColor = (type) => Object.hasOwn(typeOverrides, type);
export function markerColor(feature) {
  return (
    overrides[featureKey(feature)] ||
    markerTypeColor(markerType(feature.properties))
  );
}
export function officePinFill(feature) {
  return markerColor(feature);
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
function persist() {
  try {
    localStorage.setItem(markerColorsKey, JSON.stringify(overrides));
  } catch {}
  try {
    localStorage.setItem(markerTypeColorsKey, JSON.stringify(typeOverrides));
  } catch {}
}
export function saveMarkerColor(feature, color) {
  const type = markerType(feature.properties);
  if (!isType(type) || !colorPattern.test(color)) return false;
  const key = featureKey(feature);
  if (color.toLowerCase() === markerTypeColor(type)) delete overrides[key];
  else overrides[key] = color.toLowerCase();
  persist();
  return true;
}
export function saveMarkerTypeColor(type, color) {
  if (!isType(type) || !colorPattern.test(color)) return false;
  if (color.toLowerCase() === baseTypeColor(type)) delete typeOverrides[type];
  else typeOverrides[type] = color.toLowerCase();
  // A type-wide action explicitly recolors every member, including hidden pins.
  for (const feature of runtime.allPoints)
    if (markerType(feature.properties) === type)
      delete overrides[featureKey(feature)];
  persist();
  return true;
}
export function markerColorControl(feature) {
  const id = escapeHTML(feature.id),
    type = markerType(feature.properties);
  if (!isType(type)) return "";
  const label = escapeHTML(markerTypeLabels[type]);
  return `<div class="marker-color-control" data-color-controls="${id}"><label>Cette pastille uniquement <input type="color" data-marker-color="${id}" value="${markerColor(feature)}" aria-label="Couleur de la pastille : ${escapeHTML(feature.properties.name)}"></label><button type="button" data-marker-color-reset="${id}" ${Object.hasOwn(overrides, featureKey(feature)) ? "" : "disabled"}>Reprendre la couleur du type</button><label class="marker-type-color-label">Toutes les pastilles : ${label} <input type="color" data-marker-type-color="${type}" value="${markerTypeColor(type)}" aria-label="Couleur du type : ${label}"></label><button type="button" data-marker-type-color-reset="${type}">Réinitialiser tout ce type</button><small>Le réglage du type remplace les couleurs individuelles, y compris des pastilles masquées. Choix enregistrés dans ce navigateur.</small></div>`;
}
function pointFeature(id) {
  return runtime.allPoints.find((feature) => feature.id === id);
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
  if (feature.properties.kind === "office")
    disc.querySelector(".address-pin-shape path")?.setAttribute("fill", color);
}
function syncControls() {
  for (const control of document.querySelectorAll("[data-color-controls]")) {
    const feature = pointFeature(control.dataset.colorControls);
    if (!feature) continue;
    control.querySelector("[data-marker-color]").value = markerColor(feature);
    control.querySelector("[data-marker-color-reset]").disabled =
      !Object.hasOwn(overrides, featureKey(feature));
    control.querySelector("[data-marker-type-color]").value = markerTypeColor(
      markerType(feature.properties),
    );
  }
}
function paintType(type) {
  for (const feature of runtime.allPoints)
    if (markerType(feature.properties) === type) paintMarker(feature);
  for (const symbol of document.querySelectorAll("[data-marker-type]")) {
    if (symbol.dataset.markerType !== type) continue;
    symbol.style.background = markerTypeColor(type);
    symbol.style.color = markerInk(markerTypeColor(type));
  }
}
export function bindMarkerColorControls() {
  runtime.map.on("popupopen", syncControls);
  document.addEventListener(
    "input",
    (event) => {
      const input = event.target.closest(
        "input[data-marker-color], input[data-marker-type-color]",
      );
      if (!input) return;
      if (input.dataset.markerTypeColor) {
        const type = input.dataset.markerTypeColor;
        if (!saveMarkerTypeColor(type, input.value)) return;
        paintType(type);
      } else {
        const feature = pointFeature(input.dataset.markerColor);
        if (!feature || !saveMarkerColor(feature, input.value)) return;
        paintMarker(feature);
      }
      syncControls();
    },
    true,
  );
  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(
        "button[data-marker-color-reset], button[data-marker-type-color-reset]",
      );
      if (!button) return;
      if (button.dataset.markerTypeColorReset) {
        const type = button.dataset.markerTypeColorReset;
        saveMarkerTypeColor(type, baseTypeColor(type));
        paintType(type);
      } else {
        const feature = pointFeature(button.dataset.markerColorReset);
        if (!feature) return;
        saveMarkerColor(
          feature,
          markerTypeColor(markerType(feature.properties)),
        );
        paintMarker(feature);
      }
      syncControls();
    },
    true,
  );
}
