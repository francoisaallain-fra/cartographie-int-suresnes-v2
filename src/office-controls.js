import { $, escapeHTML } from "./presentation.js";
import { runtime, state } from "./state.js";
import { clearSelection, selectOffice } from "./selection.js";
import { updateLayers } from "./layers.js";
import { addPointMarker } from "./point-markers.js";
import {
  addressCandidate,
  toOffice,
  hiddenOfficesKey,
  geocodingEndpoint,
} from "./targeted-offices.js";

import { saveOfficeList } from "./office-list-storage.js";

const status = (message) => {
  $("office-status").textContent = message;
};
function renderOffices() {
  const offices = runtime.data.offices.features;
  offices.forEach((f, i) => {
    f.properties.number = i + 1;
  });
  $("office-undo").hidden = runtime.deletedOffices.length === 0;
  $("office-heading").textContent =
    offices.length === 0
      ? "Aucun immeuble ciblé"
      : offices.length === 1
        ? "1 adresse ciblée"
        : `Les ${offices.length} adresses ciblées`;
  $("office-list").innerHTML = offices
    .map(
      (f) =>
        `<div class="office-row"><input type="checkbox" data-office-toggle="${escapeHTML(f.id)}" aria-label="Afficher ${escapeHTML(f.properties.name)}" ${state.hiddenOffices.has(f.id) ? "" : "checked"}/><button class="office-item" data-id="${escapeHTML(f.id)}" ${state.hiddenOffices.has(f.id) ? "disabled" : ""}><span class="office-number">${f.properties.number}</span><span>${escapeHTML(f.properties.name)}<small>Adresse BAN · vacance non vérifiée</small></span></button><button type="button" class="office-remove" data-office-remove="${escapeHTML(f.id)}" aria-label="Supprimer ${escapeHTML(f.properties.name)}" title="Supprimer cet immeuble ciblé"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button></div>`,
    )
    .join("");
}
function addOffice(candidate) {
  if (
    runtime.data.offices.features.some(
      (f) => f.properties.ban_id === candidate.id,
    )
  ) {
    status("Cette adresse fait déjà partie des immeubles ciblés.");
    return;
  }
  if (
    !runtime.referenceOffices.some(
      (f) => f.properties.ban_id === candidate.id,
    ) &&
    runtime.data.offices.features.filter((f) => f.properties.custom).length >=
      200
  ) {
    status("La limite de 200 adresses ajoutées est atteinte.");
    return;
  }
  const feature =
    runtime.referenceOffices.find(
      (f) => f.properties.ban_id === candidate.id,
    ) ||
    runtime.deletedOffices.find(
      ({ feature: f }) => f.properties.ban_id === candidate.id,
    )?.feature ||
    toOffice(candidate, runtime.data.offices.features.length + 1);
  runtime.deletedOffices = runtime.deletedOffices.filter(
    ({ feature: f }) => f.id !== feature.id,
  );
  runtime.data.offices.features.push(feature);
  runtime.allPoints.push(feature);
  addPointMarker(feature);
  let saved = true;
  try {
    saveOfficeList(
      localStorage,
      runtime.data.offices.features,
      runtime.deletedOffices,
    );
  } catch {
    saved = false;
  }
  renderOffices();
  $("office-results").replaceChildren();
  $("office-address").value = "";
  updateLayers();
  selectOffice(feature);
  status(
    saved
      ? `${candidate.name} ajouté et enregistré dans ce navigateur.`
      : `${candidate.name} ajouté pour cette session seulement : enregistrement indisponible.`,
  );
}
function persistChange(features, removed) {
  try {
    saveOfficeList(localStorage, features, removed);
    return true;
  } catch {
    status(
      "Modification non enregistrée : stockage indisponible. La liste est conservée, réessayez.",
    );
    return false;
  }
}
function removeOffice(id) {
  const offices = runtime.data.offices.features;
  const index = offices.findIndex((f) => f.id === id);
  if (index < 0) return;
  const feature = offices[index];
  const features = offices.filter((f) => f.id !== id);
  const removed = [...runtime.deletedOffices, { feature, index }].slice(-20);
  if (!persistChange(features, removed)) return;
  if (state.selected === id) clearSelection();
  const marker = runtime.markers.get(id);
  if (marker) {
    runtime.groups.offices.removeLayer(marker);
    marker.off().remove();
    runtime.markers.delete(id);
  }
  runtime.allPoints = runtime.allPoints.filter((f) => f.id !== id);
  runtime.data.offices.features = features;
  runtime.deletedOffices = removed;
  renderOffices();
  updateLayers();
  status(
    `${feature.properties.name} supprimé. Vous pouvez annuler cette suppression.`,
  );
  $("office-undo").focus({ preventScroll: true });
}
function undoRemoval() {
  const entry = runtime.deletedOffices.at(-1);
  if (!entry) return;
  const features = [...runtime.data.offices.features];
  if (
    entry.feature.properties.custom &&
    features.filter((f) => f.properties.custom).length >= 200
  ) {
    status("La limite de 200 adresses ajoutées est atteinte.");
    return;
  }
  features.splice(Math.min(entry.index, features.length), 0, entry.feature);
  const removed = runtime.deletedOffices.slice(0, -1);
  if (!persistChange(features, removed)) return;
  runtime.data.offices.features = features;
  runtime.deletedOffices = removed;
  runtime.allPoints.push(entry.feature);
  renderOffices();
  addPointMarker(entry.feature);
  updateLayers();
  status(`${entry.feature.properties.name} rétabli.`);
  $("office-list")
    .querySelector(`[data-office-remove="${entry.feature.id}"]`)
    .focus({ preventScroll: true });
}
export function setupOfficeControls() {
  renderOffices();
  $("office-undo").addEventListener("click", undoRemoval);
  $("office-list").addEventListener("click", (event) => {
    const remove = event.target.closest("[data-office-remove]");
    if (remove) {
      removeOffice(remove.dataset.officeRemove);
      return;
    }
    const button = event.target.closest(".office-item");
    if (button)
      selectOffice(
        runtime.data.offices.features.find((f) => f.id === button.dataset.id),
      );
  });
  $("office-list").addEventListener("change", (event) => {
    const input = event.target.closest("[data-office-toggle]");
    if (!input) return;
    const id = input.dataset.officeToggle;
    if (input.checked) state.hiddenOffices.delete(id);
    else state.hiddenOffices.add(id);
    if (state.selected === id && !input.checked) clearSelection();
    else updateLayers();
    try {
      localStorage.setItem(
        hiddenOfficesKey,
        JSON.stringify([...state.hiddenOffices]),
      );
      status(
        input.checked
          ? "Immeuble activé. Sa pastille apparaît lorsque la couche Immeubles ciblés est active."
          : "Immeuble désactivé.",
      );
    } catch {
      status(
        "Visibilité modifiée pour cette session seulement : enregistrement indisponible.",
      );
    }
  });
  let request = null;
  $("office-address").addEventListener("input", () => {
    request?.abort();
    request = null;
    $("office-results").replaceChildren();
    status("");
  });
  $("office-search").addEventListener("submit", async (event) => {
    event.preventDefault();
    if ($("office-address").value.trim().length < 3) {
      status("Indiquez le numéro et le nom de rue.");
      return;
    }
    request?.abort();
    const controller = new window.AbortController();
    request = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    $("office-results").replaceChildren();
    status("Recherche d’adresses…");
    const url = new URL(geocodingEndpoint);
    for (const [key, value] of Object.entries({
      index: "address",
      type: "housenumber",
      citycode: "92073",
      limit: "5",
      q: $("office-address").value.trim() + " Suresnes",
    }))
      url.searchParams.set(key, value);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Geocoding unavailable");
      const data = await response.json();
      if (controller.signal.aborted || request !== controller) return;
      const candidates = (Array.isArray(data.features) ? data.features : [])
        .map(addressCandidate)
        .filter(Boolean);
      status(
        candidates.length
          ? "Sélectionnez l’adresse exacte à ajouter."
          : "Aucune adresse précise trouvée à Suresnes. Indiquez le numéro et le nom de rue.",
      );
      for (const candidate of candidates) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "office-result";
        button.textContent = `Ajouter ${candidate.address}`;
        button.addEventListener("click", () => addOffice(candidate));
        $("office-results").append(button);
      }
    } catch {
      if (request === controller)
        status(
          "Recherche interrompue ou indisponible. Réessayez dans un instant.",
        );
    } finally {
      window.clearTimeout(timeout);
    }
  });
}
