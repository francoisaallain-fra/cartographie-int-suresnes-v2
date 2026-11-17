import { colors } from "./presentation.js";

// Read earlier choices without exposing any editing or persistence controls.
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
