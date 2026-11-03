import { formatSurface } from "./rental-surfaces.js";
import { markerAppearance, serviceBadges } from "./markers.js";
import { groupFor, runtime } from "./state.js";
import { colors, escapeHTML, svg } from "./presentation.js";
export const hiddenCategories = new Set();
const officeLegend = `<p class="transport-scope"><span class="office-screening-swatch" style="background:${colors.office}" aria-hidden="true"></span>Immeubles ciblés : pastilles violettes unies. La proximité d’une gare et la zone de maintien ne changent pas leur couleur.</p>`;
export function categoryKey(p) {
  const a = markerAppearance(p);
  return p.kind === "transport" ? a.icon : a.variant;
}
export function legendItem(p, label) {
  const a = markerAppearance(p),
    key = categoryKey(p);
  return `<button type="button" class="legend-item" data-category="${key}" data-group="${groupFor(
    {
      properties: p,
    },
  )}" aria-pressed="false" aria-label="Afficher ou masquer : ${label}" title="Afficher ou masquer : ${label}"><span class="legend-symbol" style="background:${a.color};color:${a.ink}">${svg(a.icon)}</span>${label}</button>`;
}
export function layerLegend(id) {
  if (id === "rentalOffices")
    return `<details class="rental-address-list"><summary>Voir les ${runtime.data["rental-offices"].features.length} adresses</summary><div>${runtime.data["rental-offices"].features.map((f) => `<button type="button" data-rental-id="${escapeHTML(f.id)}">${escapeHTML(f.properties.name)} <small>· ${formatSurface(f.properties.surface?.value_m2)}</small> <small>· ${f.properties.listings.length} annonce${f.properties.listings.length > 1 ? "s" : ""}</small></button>`).join("")}</div><p id="rental-surface-empty" hidden>Aucune adresse ne correspond aux surfaces choisies.</p></details><p class="transport-scope">Annonces déclaratives, relevées le 03/11/2026. 29 annonces sans adresse précise et 1 commerce ont été écartés.</p>`;
  if (id === "offices") return officeLegend;
  if (id === "transport")
    return `<div class="layer-legend"><button type="button" class="legend-item" data-category="stations" data-group="transport" aria-pressed="true" aria-label="Afficher ou masquer les gares et stations"><span class="legend-symbol" style="background:${colors.transport};color:white">${svg("train")}</span>Gares et stations</button>${runtime.data.rail.features
      .map((f) => {
        const p = f.properties;
        return `<button type="button" class="legend-item" data-category="rail-${p.id}" data-group="transport" aria-pressed="true" aria-label="Afficher ou masquer la ligne ${p.label}">${serviceBadges([p])}${p.mode === "TRAMWAY" ? "Tram" : "Transilien"} ${p.label}</button>`;
      })
      .join("")}${legendItem(
      {
        kind: "road",
      },
      "Grands axes",
    )}</div><p class="transport-scope">Cliquez sur plusieurs gares pour cumuler leurs rayons de 500 m à vol d’oiseau ; recliquez sur une gare pour retirer son rayon. 6 gares et stations, dont 3 SNCF, dans Suresnes et à 500 m de ses limites. Affichage indépendant des lignes.<br>Aucun RER ni métro dans ce périmètre.</p>`;
  const entries =
    id === "transport"
      ? [
          [
            {
              kind: "transport",
              lines: ["METRO"],
            },
            "Métro",
          ],
          [
            {
              kind: "transport",
              lines: ["TRAM"],
            },
            "Tram",
          ],
          [
            {
              kind: "transport",
              lines: ["TRAIN"],
            },
            "Gare",
          ],
          [
            {
              kind: "road",
            },
            "Grands axes",
          ],
        ]
      : id === "equipment"
        ? [
            [
              {
                kind: "nursery",
              },
              "Crèches",
            ],
            [
              {
                kind: "school",
                category: "Ecole",
              },
              "Maternelles / primaires",
            ],
            [
              {
                kind: "school",
                category: "Collège",
              },
              "Collèges",
            ],
            [
              {
                kind: "school",
                category: "Lycée",
              },
              "Lycées",
            ],
            [
              {
                kind: "health",
              },
              "Santé",
            ],
          ]
        : id === "neighborhood"
          ? [
              [{ kind: "grocery" }, "Épiceries / supérettes"],
              [{ kind: "supermarket" }, "Supermarchés"],
              [{ kind: "market" }, "Marchés alimentaires"],
              [
                {
                  kind: "bakery",
                },
                "Boulangeries / pâtisseries",
              ],
              [
                {
                  kind: "pharmacy",
                },
                "Pharmacies",
              ],
              [
                {
                  kind: "tea",
                },
                "Magasin de thé",
              ],
            ]
          : [];
  return entries.length
    ? `<div class="layer-legend">${entries.map(([p, label]) => legendItem(p, label)).join("")}</div>`
    : "";
}
