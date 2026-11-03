import { $ } from "./presentation.js";
import { runtime, state } from "./state.js";
import { matchesRentalSurface } from "./rental-surfaces.js";

export function setupSurfaceControls(onChange) {
  const min = $("rental-surface-min"),
    max = $("rental-surface-max");
  const apply = () => {
    const bounds = {
      min: min.value === "" ? null : min.valueAsNumber,
      max: max.value === "" ? null : max.valueAsNumber,
    };
    const invalid =
      !min.validity.valid ||
      !max.validity.valid ||
      (bounds.min !== null && bounds.max !== null && bounds.min > bounds.max);
    $("rental-surface-error").textContent = invalid
      ? "Saisissez des surfaces positives, avec un minimum inférieur ou égal au maximum. Le filtre précédent reste appliqué."
      : "";
    min.setAttribute("aria-invalid", String(invalid));
    max.setAttribute("aria-invalid", String(invalid));
    if (invalid) return;
    state.rentalSurface = bounds;
    onChange();
  };
  min.addEventListener("input", apply);
  max.addEventListener("input", apply);
  $("rental-surface-reset").addEventListener("click", () => {
    min.value = "";
    max.value = "";
    apply();
  });
}

export function updateSurfaceControls() {
  const features = runtime.data["rental-offices"].features;
  const matching = features.filter((f) =>
    matchesRentalSurface(f, state.rentalSurface),
  );
  const ids = new Set(matching.map((f) => f.id));
  const active =
    state.rentalSurface.min !== null || state.rentalSurface.max !== null;
  const unknown = features.filter(
    (f) => !Number.isFinite(f.properties.surface?.value_m2),
  ).length;
  const count = `${matching.length} / ${features.length} adresses`;
  $("rental-surface-count").textContent =
    `${count} · ${matching.reduce((sum, f) => sum + f.properties.listings.length, 0)} annonces${state.enabled.rentalOffices ? "" : " · couche masquée"}${active && unknown ? ` · ${unknown} sans surface exclue(s)` : ""}`;
  document.querySelectorAll("[data-rental-id]").forEach((button) => {
    button.hidden = !ids.has(button.dataset.rentalId);
  });
  document.querySelector(".rental-address-list summary").textContent = active
    ? `Voir les adresses retenues (${count})`
    : `Voir les ${features.length} adresses`;
  $("rental-surface-empty").hidden = matching.length > 0;
}
