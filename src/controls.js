import { $, escapeHTML, svg } from "./presentation.js";
import { layerOpacity, runtime, state } from "./state.js";
import { radiusText } from "./radius.js";
import {
  clearSelection,
  clearStationRadii,
  frameOfficePopup,
  redrawRadius,
  scrollMapIntoViewOnMobile,
  selectOffice,
  showCityView,
} from "./selection.js";
import { updateLayers } from "./layers.js";
import { layerSpecs } from "./catalog.js";
import { layerName, saveLayerName } from "./preferences.js";
import { hiddenCategories, layerLegend } from "./legend.js";
import { setupLayerReordering } from "./ordering.js";
import { collapsedLayers, setLayerCollapsed } from "./collapse.js";
import { applyOpacity } from "./opacity.js";
import { setupSurfaceControls } from "./surface-controls.js";
export function buildControls() {
  setupSurfaceControls(updateLayers);
  $("radius-range").addEventListener("input", (e) => {
    state.radiusMeters = Number(e.target.value);
    $("radius-range-value").textContent = radiusText();
    e.target.setAttribute("aria-valuetext", radiusText());
    if (state.selected) {
      const marker = runtime.markers.get(state.selected);
      const wasOpen = marker.isPopupOpen();
      redrawRadius();
      updateLayers();
      if (wasOpen) marker.openPopup();
    }
  });
  $("radius-range").addEventListener("change", () => {
    if (state.selected) {
      const marker = runtime.markers.get(state.selected);
      const wasOpen = marker.isPopupOpen();
      if (!wasOpen) runtime.map.closePopup();
      runtime.map.stop();
      runtime.map.fitBounds(runtime.radiusLayer.getBounds(), {
        padding: [55, 55],
        maxZoom: 17,
        animate: false,
      });
      if (wasOpen) frameOfficePopup(marker);
    }
  });
  $("layer-controls").innerHTML = layerSpecs
    .map(
      (s) =>
        `<div class="layer-card" data-layer-id="${s.id}"><button type="button" class="layer-drag" draggable="true" aria-label="Déplacer : ${escapeHTML(layerName(s))}" title="Glisser pour déplacer · flèches haut/bas au clavier">⠿</button><div class="layer-main"><button type="button" class="layer-expand" aria-expanded="true" aria-controls="layer-body-${s.id}" aria-label="Replier : ${escapeHTML(layerName(s))}" title="Replier les réglages de ${escapeHTML(layerName(s))}"><span class="layer-disclosure" aria-hidden="true"></span><span class="layer-icon ${s.icon}" style="--color:${s.color}">${svg(s.icon)}</span><span class="layer-copy"><strong class="layer-name">${escapeHTML(layerName(s))}</strong><small>${escapeHTML(s.sub)}</small></span></button><input id="layer-${s.id}" type="checkbox" ${state.enabled[s.id] ? "checked" : ""} aria-label="Afficher ${escapeHTML(layerName(s))}"></div><div id="layer-body-${s.id}" class="layer-body"><button type="button" class="layer-rename" aria-label="Renommer : ${escapeHTML(layerName(s))}" aria-expanded="false" aria-controls="rename-form-${s.id}" title="Renommer cette couche">✎</button><form id="rename-form-${s.id}" class="layer-rename-form" hidden><label for="rename-input-${s.id}">Nom de la couche</label><input id="rename-input-${s.id}" type="text" maxlength="64" required autocomplete="off" value="${escapeHTML(layerName(s))}"><div class="layer-rename-actions"><button type="submit">Enregistrer</button><button type="button" class="rename-cancel">Annuler</button><button type="button" class="rename-reset">Nom d’origine</button></div><small>Nom enregistré dans ce navigateur.</small></form>${layerLegend(s.id)}<div class="layerOpacity-control"><div><span id="layerOpacity-label-${s.id}">Opacité</span><output id="layerOpacity-value-${s.id}" for="layerOpacity-${s.id}">100 %</output></div><input type="range" id="layerOpacity-${s.id}" min="0" max="100" step="5" value="100" aria-label="Opacité : ${escapeHTML(layerName(s))}" aria-valuetext="100 % d’opacité"><div class="layerOpacity-scale"><span>Transparent</span><span>Opaque</span></div></div></div></div>`,
    )
    .join("");
  setupLayerReordering();
  for (const s of layerSpecs) {
    const card = $("layer-controls").querySelector(`[data-layer-id="${s.id}"]`);
    const button = card.querySelector(".layer-rename");
    const expand = card.querySelector(".layer-expand");
    const form = card.querySelector(".layer-rename-form");
    const input = form.querySelector("input");
    const close = () => {
      form.hidden = true;
      button.setAttribute("aria-expanded", "false");
      button.focus();
    };
    button.addEventListener("click", () => {
      if (!form.hidden) {
        close();
        return;
      }
      form.hidden = false;
      button.setAttribute("aria-expanded", "true");
      input.value = layerName(s);
      input.focus();
      input.select();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (saveLayerName(s, input.value)) close();
    });
    form.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    });
    form.querySelector(".rename-cancel").addEventListener("click", close);
    form.querySelector(".rename-reset").addEventListener("click", () => {
      saveLayerName(s, s.label);
      close();
    });
    expand.addEventListener("click", () =>
      setLayerCollapsed(card, card.dataset.collapsed !== "true"),
    );
    setLayerCollapsed(card, collapsedLayers.has(s.id));
  }
  for (const s of layerSpecs)
    $(`layer-${s.id}`).addEventListener("change", (e) => {
      state.enabled[s.id] = e.target.checked;
      if (s.id === "transport" && !e.target.checked) clearStationRadii();
      if (s.id === "offices" && !e.target.checked && state.selected) {
        clearSelection(false);
        runtime.map.fitBounds(runtime.bounds, {
          padding: [24, 24],
        });
      } else updateLayers();
    });
  for (const s of layerSpecs)
    $("layerOpacity-" + s.id).addEventListener("input", (e) => {
      layerOpacity[s.id] = Number(e.target.value);
      applyOpacity(s.id);
    });
  document.querySelectorAll("[data-rental-id]").forEach((button) =>
    button.addEventListener("click", () => {
      const feature = runtime.data["rental-offices"].features.find(
        (f) => f.id === button.dataset.rentalId,
      );
      state.enabled.rentalOffices = true;
      updateLayers();
      const [lng, lat] = feature.geometry.coordinates;
      runtime.map.setView([lat, lng], 18, { animate: false });
      runtime.markers.get(feature.id).openPopup();
      scrollMapIntoViewOnMobile();
    }),
  );
  document.querySelectorAll("[data-category]").forEach((el) =>
    el.addEventListener("click", () => {
      const key = el.dataset.category,
        group = el.dataset.group;
      if (!state.enabled[group]) return;
      if (hiddenCategories.has(key)) hiddenCategories.delete(key);
      else hiddenCategories.add(key);
      updateLayers();
    }),
  );
  $("office-list").innerHTML = runtime.data.offices.features
    .map(
      (f) =>
        `<button class="office-item" data-id="${escapeHTML(f.id)}"><span class="office-number">${f.properties.number}</span><span>${escapeHTML(f.properties.name)}<small>Adresse BAN · vacance non vérifiée</small></span></button>`,
    )
    .join("");
  document
    .querySelectorAll(".office-item")
    .forEach((el) =>
      el.addEventListener("click", () =>
        selectOffice(
          runtime.data.offices.features.find((f) => f.id === el.dataset.id),
        ),
      ),
    );
  $("clear-radius").addEventListener("click", showCityView);
  $("hide-all").addEventListener("click", () => {
    if (state.selected) clearSelection(false);
    clearStationRadii();
    for (const key in state.enabled) state.enabled[key] = false;
    updateLayers();
  });
  $("reset-view").addEventListener("click", showCityView);
}
