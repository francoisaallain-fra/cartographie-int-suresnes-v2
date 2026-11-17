import { $, escapeHTML } from "./presentation.js";
import { runtime, state } from "./state.js";
import { clearSelection, selectOffice } from "./selection.js";
import { updateLayers } from "./layers.js";
import { addPointMarker } from "./point-markers.js";
import {
  addressCandidate,
  toOffice,
  saveTargetedOffices,
  hiddenOfficesKey,
  geocodingEndpoint,
} from "./targeted-offices.js";

const status = (message) => {
  $("office-status").textContent = message;
};
function renderOffices() {
  const offices = runtime.data.offices.features;
  $("office-heading").textContent = `Les ${offices.length} adresses ciblées`;
  $("office-list").innerHTML = offices
    .map(
      (f) =>
        `<div class="office-row"><input type="checkbox" data-office-toggle="${escapeHTML(f.id)}" aria-label="Afficher ${escapeHTML(f.properties.name)}" ${state.hiddenOffices.has(f.id) ? "" : "checked"}/><button class="office-item" data-id="${escapeHTML(f.id)}" ${state.hiddenOffices.has(f.id) ? "disabled" : ""}><span class="office-number">${f.properties.number}</span><span>${escapeHTML(f.properties.name)}<small>Adresse BAN · vacance non vérifiée</small></span></button></div>`,
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
    runtime.data.offices.features.filter((f) => f.properties.custom).length >=
    200
  ) {
    status("La limite de 200 adresses ajoutées est atteinte.");
    return;
  }
  const feature = toOffice(candidate, runtime.data.offices.features.length + 1);
  runtime.data.offices.features.push(feature);
  runtime.allPoints.push(feature);
  addPointMarker(feature);
  let saved = true;
  try {
    saveTargetedOffices(localStorage, runtime.data.offices.features);
  } catch {
    saved = false;
  }
  renderOffices();
  $("office-results").replaceChildren();
  $("office-address").value = "";
  selectOffice(feature);
  status(
    saved
      ? `${candidate.name} ajouté et enregistré dans ce navigateur.`
      : `${candidate.name} ajouté pour cette session seulement : enregistrement indisponible.`,
  );
}
export function setupOfficeControls() {
  renderOffices();
  $("office-list").addEventListener("click", (event) => {
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
