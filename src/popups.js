import { formatSurface, parseAdvertisedSurface } from "./rental-surfaces.js";
import { escapeHTML, typeLabels } from "./presentation.js";
import { isSncfStation, serviceBadges, stationServices } from "./markers.js";
import { nearbyAmenities, radiusText, selectedRadius } from "./radius.js";

import { runtime, state, groupFor } from "./state.js";
import { distanceMeters } from "./geometry.js";
export function row(label, value) {
  return `<div class="popup-row"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`;
}
/** Compact address card. Advertised areas never stand for total building area. */
export function buildingPopup(f) {
  const p = f.properties;
  const rental =
    p.kind === "rentalOffice"
      ? f
      : runtime.data["rental-offices"].features.find(
          (item) => p.ban_id && item.properties.ban_id === p.ban_id,
        );
  const surface = rental?.properties.surface;
  const areas = [
    ...new Set(
      (rental?.properties.listings || []).map(
        (listing) => listing.surface_display,
      ),
    ),
  ];
  const singleArea =
    areas.length === 1 ? parseAdvertisedSurface(areas[0]) : null;
  const detail =
    singleArea?.min === singleArea?.max && areas.length === 1
      ? ""
      : areas.join(" · ");
  const amenities =
    p.kind === "office"
      ? nearbyAmenities(f.id)
      : runtime.allPoints.filter(
          (item) =>
            ["transport", "equipment", "neighborhood"].includes(
              groupFor(item),
            ) &&
            distanceMeters(f.geometry.coordinates, item.geometry.coordinates) <=
              state.radiusMeters,
        );
  const count = (group) =>
    amenities.filter((item) => groupFor(item) === group).length;
  const method =
    surface?.method === "sum_distinct"
      ? " · cumul de lots distincts"
      : surface?.method === "maximum"
        ? " · maximum, sans doublon"
        : "";
  return `<div class="building-card"><h3 class="popup-title">${escapeHTML(p.address || p.name)}</h3><section class="building-surfaces">${row(rental ? "Surface annoncée à l’adresse" : "Surface", formatSurface(surface?.value_m2))}${detail ? `<p class="building-surface-detail">${escapeHTML(detail)}${escapeHTML(method)}</p>` : ""}</section><section class="building-amenities">${row(`Aménités dans le rayon de ${radiusText()}`, `${amenities.length} recensées`)}<p class="building-amenity-detail">${count("transport")} transports · ${count("equipment")} équipements<br>${count("neighborhood")} commerces et services<br><span>À vol d’oiseau</span></p></section></div>`;
}
export function popup(f) {
  const p = f.properties;
  if (["office", "rentalOffice"].includes(p.kind)) return buildingPopup(f);
  if (p.kind === "transport")
    return `<div class="station-card"><strong class="station-card-name">${escapeHTML(p.name)}</strong><div class="station-card-services">${serviceBadges(stationServices(p))}${isSncfStation(p) ? '<img class="station-card-sncf" src="https://upload.wikimedia.org/wikipedia/fr/a/a1/Logo_SNCF_%282011%29.svg" alt="SNCF" width="63" height="32" referrerpolicy="no-referrer">' : ""}</div><small>Rayon de 500 m à vol d’oiseau depuis le point IDFM. Recliquez sur cette gare pour retirer son cercle.</small></div>`;
  let body = `<div class="popup-tag">${escapeHTML(typeLabels[p.kind])}</div><h3 class="popup-title">${escapeHTML(p.name)}</h3><div class="popup-address">${escapeHTML(p.address || p.lines?.join(" · ") || "")}</div>`;
  body += row("Catégorie", p.category || p.lines?.join(" · "));
  if (p.market_days) body += row("Jours de marché", p.market_days);
  if (
    [
      "grocery",
      "supermarket",
      "market",
      "produce",
      "organic",
      "preparedFood",
      "stationShop",
    ].includes(p.kind)
  ) {
    body += row("Relevé des sources", p.retrieved_at);
    body += row("Dernière modification OSM", p.source_updated_at?.slice(0, 10));
  }
  if (p.kind === "transport")
    body +=
      `<div class="popup-services">${serviceBadges(p.services)}</div>` +
      row(
        "Situation",
        p.inside_city
          ? "Dans Suresnes"
          : `À ${p.distance_city_m} m des limites de Suresnes`,
      );
  if (isSncfStation(p))
    body +=
      '<img class="station-operator" src="https://upload.wikimedia.org/wikipedia/fr/a/a1/Logo_SNCF_%282011%29.svg" alt="SNCF" width="32" height="17" referrerpolicy="no-referrer">' +
      row("Réseau ferroviaire", "Transilien SNCF") +
      `<a class="popup-link" href="https://www.transilien.com/fr/page-lignes/ligne-l" target="_blank" rel="noopener noreferrer">Source SNCF · gares de la ligne L ↗</a>`;
  if (p.kind === "nursery") {
    const shared = runtime.data.nurseries.features.filter((x) =>
      x.geometry.coordinates.every((v, i) => v === f.geometry.coordinates[i]),
    );
    if (shared.length > 1)
      body += `<p class="popup-notice">À ce même point : ${shared.map((x) => escapeHTML(x.properties.name)).join(" · ")}.</p>`;
    body += row("Millésime de la source", p.source_vintage);
  }
  if (state.selected && p.kind !== "office") {
    const near = selectedRadius().nearby.find((x) => x.id === f.id);
    if (near)
      body += row(
        "Distance au bureau",
        `${Math.round(near.distance_m)} m à vol d’oiseau`,
      );
  }
  if (p.audit) {
    const a = p.audit;
    body += `<div class="audit-popup"><span class="audit-status ${a.doubts.length ? "is-uncertain" : ""}">${escapeHTML(a.status)}</span>`;
    if (a.uncertainty_1_to_3)
      body += row(
        "Incertitude restante",
        `${a.uncertainty_1_to_3}/3 · indice qualitatif`,
      );
    if (a.address_checked && a.address_checked !== p.address)
      body += row("Adresse recoupée", a.address_checked);
    if (a.doubts.length)
      body += `<div class="audit-warning"><strong>Points à vérifier</strong><ul>${a.doubts.map((d) => `<li>${escapeHTML(d)}</li>`).join("")}</ul></div>`;
    if (a.notes.length)
      body += a.notes
        .map((n) => `<p class="audit-note">${escapeHTML(n)}</p>`)
        .join("");
    if (a.sources.length)
      body += `<details class="audit-evidence"><summary>Sources du croisement · ${escapeHTML(a.date)}</summary>${a.sources.map((s) => `<a class="popup-link" href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.label)} ↗</a>`).join("")}</details>`;
    body += "</div>";
  }
  body += `<small>${escapeHTML(p.precision)}</small><br><a class="popup-link" href="${escapeHTML(p.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(runtime.sources[p.source].name)} ↗</a>`;
  return body;
}
export function mosOfficePopup(f) {
  const p = f.properties;
  return `<div class="popup-tag">MOS 2025 · POSTE 45</div><h3 class="popup-title">Emprise de bureaux</h3>${row("Surface cartographiée", `${p.area_m2.toLocaleString("fr-FR")} m²`)}<p>Classification « Bureaux » du Mode d’occupation du sol 2025 de L’Institut Paris Region. Ce poste concerne les bureaux de plus de 5 000 m².</p><p class="popup-notice">Le contour décrit une occupation du sol, pas nécessairement un bâtiment unique. Il ne renseigne ni la vacance ni la disponibilité.</p><a class="popup-link" href="${runtime.sources.mos.url}" target="_blank" rel="noopener noreferrer">Source Mos 2025 ↗</a>`;
}
export function mosGroupPopup(f) {
  const p = f.properties;
  return `<div class="popup-tag">MOS 2025 · CATÉGORIE ${p.group_code}</div><h3 class="popup-title">${escapeHTML(p.group_name)}</h3>${row("Poste détaillé", `${p.class_code} · ${p.class_name}`)}${row("Surface cartographiée", `${p.area_m2.toLocaleString("fr-FR")} m²`)}<p class="popup-notice">Emprise d’occupation du sol en 2025, pas contour certifié d’un bâtiment ni preuve de son usage actuel.${p.group_code === 8 ? " Cette catégorie inclut les bureaux déjà affichés dans la couche dédiée." : ""}</p><a class="popup-link" href="${runtime.sources.mos.url}" target="_blank" rel="noopener noreferrer">Source Mos 2025 ↗</a>`;
}
export function mixedBuildingPopup(f) {
  const p = f.properties;
  return `<div class="popup-tag">CROISEMENT MOS · BDNB · INSEE BPE</div><h3 class="popup-title">Bâtiment mixte potentiel</h3>${row("Commerce repéré", p.bpe_shops.map((shop) => shop.name).join(" · "))}${row("Adresse du commerce", p.bpe_shops[0].address)}${row("Emprise bâtie", `${p.footprint_m2.toLocaleString("fr-FR")} m²`)}${row("Mos 2025", "Bureaux · poste 45")}${row("BDNB", "Usage principal tertiaire")}<p class="popup-notice">${escapeHTML(p.uncertainty)}</p><a class="popup-link" href="${runtime.sources.mos.url}" target="_blank" rel="noopener noreferrer">Mos ↗</a> · <a class="popup-link" href="${runtime.sources.bdnb.url}" target="_blank" rel="noopener noreferrer">BDNB ↗</a> · <a class="popup-link" href="${runtime.sources.bpe.url}" target="_blank" rel="noopener noreferrer">BPE ↗</a>`;
}
export function pluOfficeRetentionPopup(f) {
  const p = f.properties;
  return `<div class="popup-tag">PLU DE SURESNES · PRESCRIPTION GRAPHIQUE</div><h3 class="popup-title">Maintien des surfaces de bureau</h3>${row("Périmètre cartographié", `${p.area_m2.toLocaleString("fr-FR")} m²`)}${row("Règle", "Dispositions générales · article 14")}<p>Dans ce secteur, le changement de destination des <strong>surfaces de bureaux existantes</strong> est limité aux destinations énumérées par le PLU. Un logement ou hébergement n’est admis que s’il reste minoritaire dans la surface de plancher du projet et intrinsèquement lié à l’activité principale du bâtiment.</p><p class="popup-notice">Certains commerces, services, équipements et activités restent autorisés. Les surfaces existantes de moins de 100 m² ne sont pas concernées par cette disposition. Le périmètre ne prouve pas la présence de bureaux sur chaque parcelle.</p><a class="popup-link" href="${p.rule_url}" target="_blank" rel="noopener noreferrer">Article 14 · règlement ↗</a> · <a class="popup-link" href="${p.plan_url}" target="_blank" rel="noopener noreferrer">Plan de zonage ↗</a>`;
}
