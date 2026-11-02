import { layerSpecs } from "./catalog.js";
export const collapsedLayersKey = "suresnes-v2-collapsed-layers";
export let collapsedLayers = new Set(layerSpecs.map((s) => s.id));
try {
  const saved = JSON.parse(window.sessionStorage.getItem(collapsedLayersKey));
  if (Array.isArray(saved))
    collapsedLayers = new Set(
      saved.filter((id) => layerSpecs.some((s) => s.id === id)),
    );
} catch {}
export function setLayerCollapsed(card, collapsed) {
  const button = card.querySelector(".layer-expand");
  const body = card.querySelector(".layer-body");
  const rename = card.querySelector(".layer-rename");
  const name = card.querySelector(".layer-name").textContent;
  card.dataset.collapsed = String(collapsed);
  button.setAttribute("aria-expanded", String(!collapsed));
  button.setAttribute(
    "aria-label",
    `${collapsed ? "Déplier" : "Replier"} : ${name}`,
  );
  button.title = `${collapsed ? "Déplier" : "Replier"} les réglages de ${name}`;
  body.hidden = collapsed;
  if (collapsed) {
    body.querySelector(".layer-rename-form").hidden = true;
    rename.setAttribute("aria-expanded", "false");
    collapsedLayers.add(card.dataset.layerId);
  } else collapsedLayers.delete(card.dataset.layerId);
  try {
    window.sessionStorage.setItem(
      collapsedLayersKey,
      JSON.stringify([...collapsedLayers]),
    );
  } catch {}
}
