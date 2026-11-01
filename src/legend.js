import { markerAppearance, serviceBadges } from "./markers.js";
import { groupFor, runtime } from "./state.js";
import { colors, svg } from "./presentation.js";
export const hiddenCategories = new Set();
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
    )}</div><p class="transport-scope">6 gares et stations, dont 3 SNCF, dans Suresnes et à 500 m de ses limites. Affichage indépendant des lignes.<br>Aucun RER ni métro dans ce périmètre.</p>`;
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
            ]
          : [];
  return entries.length
    ? `<div class="layer-legend">${entries.map(([p, label]) => legendItem(p, label)).join("")}</div>`
    : "";
}
