import { layerSpecs } from "./catalog.js";
import { $ } from "./presentation.js";
export const layerNamesKey = "suresnes-v2-layer-names";
export const customLayerNames = {};
try {
  const saved = JSON.parse(localStorage.getItem(layerNamesKey));
  if (saved && typeof saved === "object" && !Array.isArray(saved))
    for (const s of layerSpecs) {
      const name = saved[s.id];
      if (typeof name === "string" && name.trim() && name.trim().length <= 64)
        customLayerNames[s.id] = name.trim();
    }
} catch {}
export function layerName(s) {
  return customLayerNames[s.id] || s.label;
}
export function saveLayerName(s, name) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 64) return false;
  if (trimmed === s.label) delete customLayerNames[s.id];
  else customLayerNames[s.id] = trimmed;
  try {
    localStorage.setItem(layerNamesKey, JSON.stringify(customLayerNames));
  } catch {}
  const card = $("layer-controls").querySelector(`[data-layer-id="${s.id}"]`);
  card.querySelector(".layer-name").textContent = layerName(s);
  card
    .querySelector(".layer-expand")
    .setAttribute(
      "aria-label",
      `${card.dataset.collapsed === "true" ? "Déplier" : "Replier"} : ${layerName(s)}`,
    );
  card
    .querySelector(".layer-drag")
    .setAttribute("aria-label", `Déplacer : ${layerName(s)}`);
  card
    .querySelector(".layer-rename")
    .setAttribute("aria-label", `Renommer : ${layerName(s)}`);
  $(`layer-${s.id}`).setAttribute("aria-label", `Afficher ${layerName(s)}`);
  $(`layerOpacity-${s.id}`).setAttribute(
    "aria-label",
    `Opacité : ${layerName(s)}`,
  );
  return true;
}
// Polygon defaults preserve the aerial-photo view while making the slider truthful:
// its percentage is the actual fill opacity, including fully opaque at 100%.
