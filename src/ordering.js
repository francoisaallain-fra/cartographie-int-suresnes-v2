import { $ } from "./presentation.js";
import { runtime } from "./state.js";
import { layerSpecs } from "./catalog.js";
export function syncLayerOrder() {
  const cards = [...$("layer-controls").children];
  cards.forEach((card, i) => {
    const zIndex = 450 + (cards.length - i) * 10;
    runtime.map.getPane("data-" + card.dataset.layerId).style.zIndex = zIndex;
    runtime.map.getPane(
      "data-" + card.dataset.layerId + "-markers",
    ).style.zIndex = zIndex;
  });
  runtime.map.getPane("road-light").style.zIndex =
    Number(runtime.map.getPane("data-transport").style.zIndex) - 1;
  try {
    localStorage.setItem(
      "suresnes-v2-layer-order",
      JSON.stringify(cards.map((c) => c.dataset.layerId)),
    );
  } catch {}
}
export function setupLayerReordering() {
  const list = $("layer-controls");
  try {
    const saved = JSON.parse(localStorage.getItem("suresnes-v2-layer-order"));
    if (
      Array.isArray(saved) &&
      new Set(saved).size === saved.length &&
      saved.every((id) => layerSpecs.some((s) => s.id === id))
    ) {
      const added = layerSpecs
        .map((s) => s.id)
        .filter((id) => !saved.includes(id));
      [...added, ...saved].forEach((id) =>
        list.append(list.querySelector('[data-layer-id="' + id + '"]')),
      );
    }
  } catch {}
  let dragging = null;
  list.addEventListener("dragstart", (e) => {
    const handle = e.target.closest(".layer-drag");
    if (!handle) return;
    dragging = handle.closest(".layer-card");
    dragging.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragging.dataset.layerId);
  });
  list.addEventListener("dragover", (e) => {
    if (!dragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const target = e.target.closest(".layer-card");
    if (!target || target === dragging) return;
    const box = target.getBoundingClientRect();
    list.insertBefore(
      dragging,
      e.clientY < box.top + box.height / 2 ? target : target.nextSibling,
    );
  });
  const finish = () => {
    if (dragging) {
      dragging.classList.remove("dragging");
      dragging = null;
      syncLayerOrder();
    }
  };
  list.addEventListener("drop", (e) => {
    if (dragging) e.preventDefault();
    finish();
  });
  list.addEventListener("dragend", finish);
  list.addEventListener("keydown", (e) => {
    if (
      !e.target.matches(".layer-drag") ||
      !["ArrowUp", "ArrowDown"].includes(e.key)
    )
      return;
    e.preventDefault();
    const card = e.target.closest(".layer-card");
    if (e.key === "ArrowUp" && card.previousElementSibling)
      list.insertBefore(card, card.previousElementSibling);
    else if (e.key === "ArrowDown" && card.nextElementSibling)
      list.insertBefore(card.nextElementSibling, card);
    e.target.focus();
    syncLayerOrder();
  });
  syncLayerOrder();
}
