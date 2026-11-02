import { markerAppearance, serviceBadges } from "./markers.js";
import { groupFor, runtime } from "./state.js";
import {
  colors,
  escapeHTML,
  officeScreeningColor,
  svg,
} from "./presentation.js";
export const hiddenCategories = new Set();
const officeScreeningLegend = `<p class="transport-scope"><span class="office-screening-swatch" style="background:${officeScreeningColor}" aria-hidden="true"></span>Pastille jaune : point d’adresse à 500 m ou moins d’une gare, hors du périmètre cartographié de maintien des surfaces de bureau. Une couleur personnalisée reste prioritaire.</p>`;
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
    return `<details class="rental-address-list"><summary>Voir les 16 adresses</summary><div>${runtime.data["rental-offices"].features.map((f) => `<button type="button" data-rental-id="${escapeHTML(f.id)}">${escapeHTML(f.properties.name)} <small>· ${f.properties.listings.length} annonce${f.properties.listings.length > 1 ? "s" : ""}</small></button>`).join("")}</div></details>${officeScreeningLegend}<p class="transport-scope">Annonces déclaratives, relevées le 02/11/2026. Les 29 fiches sans numéro de rue ne sont pas placées sur la carte.</p>`;
  if (id === "offices") return officeScreeningLegend;
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
