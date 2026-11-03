import fs from "node:fs";
import { pointInPolygonGeometry } from "../src/geometry.js";

const read = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const write = (path, value) =>
  fs.writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
const input = read("scripts/sources/food-amenities-input.json");
const review = read("scripts/sources/food-amenities-review.json");
const commune = read("public/data/commune.geojson");
const boundary = commune.geometry || commune.features[0].geometry;
const features = [];
const excluded = [];
for (const shop of input.shops) {
  const p = shop.properties;
  const id = `osm-${p.osm_type}-${p.osm_id}`;
  if (!pointInPolygonGeometry(shop.geometry.coordinates, boundary)) {
    excluded.push({ id, reason: "Point hors de la commune de Suresnes" });
    continue;
  }
  const correction = review[id] || {};
  const kind =
    correction.kind || (p.shop === "supermarket" ? "supermarket" : "grocery");
  const sourceAddress = p["addr-street"]
    ? [p["addr-housenumber"], p["addr-street"], "92150 Suresnes"]
        .filter(Boolean)
        .join(" ")
    : null;
  const address = correction.address || sourceAddress;
  const sourceUrl = `https://www.openstreetmap.org/${p.osm_type}/${p.osm_id}`;
  features.push({
    type: "Feature",
    id,
    geometry: shop.geometry,
    properties: {
      kind,
      name: p.name || "Commerce alimentaire sans nom renseigné",
      address: address || "Suresnes — adresse non renseignée dans la source",
      address_status: correction.doubt
        ? "uncertain"
        : address
          ? "reported"
          : "missing",
      category:
        kind === "supermarket"
          ? "Supermarché"
          : p.shop === "deli"
            ? "Épicerie fine / traiteur"
            : "Épicerie / supérette",
      osm_shop: p.shop,
      source: "food_osm",
      source_url: sourceUrl,
      retrieved_at: input.checked_on,
      source_updated_at: p.osm_timestamp,
      precision:
        "Point OpenStreetMap conservé ; présence et ouverture actuelle non vérifiées sur le terrain. La catégorie décrit la source, sans mesure de surface de vente.",
      audit: {
        date: input.checked_on,
        status: "Recensé dans OpenStreetMap",
        doubts: correction.doubt
          ? [correction.doubt]
          : address
            ? []
            : [
                "Adresse postale absente d’OSM ; localisation conservée au point cartographié, sans attribuer un numéro voisin.",
              ],
        notes: correction.note ? [correction.note] : [],
        sources: correction.source_url
          ? [
              {
                label: "Adresse / catégorie recoupée",
                url: correction.source_url,
              },
              ...(correction.sources || []),
            ]
          : [],
      },
    },
  });
}
for (const market of input.markets) {
  const ring =
    market.geometry.type === "Polygon" ? market.geometry.coordinates[0] : null;
  const coordinates = ring
    ? [0, 1].map(
        (i) =>
          (Math.min(...ring.map((p) => p[i])) +
            Math.max(...ring.map((p) => p[i]))) /
          2,
      )
    : market.geometry.coordinates;
  if (!pointInPolygonGeometry(coordinates, boundary))
    throw new Error(`Market outside Suresnes: ${market.id}`);
  if (ring && !pointInPolygonGeometry(coordinates, market.geometry))
    throw new Error(`Market point outside its hall: ${market.id}`);
  features.push({
    type: "Feature",
    id: market.id,
    geometry: { type: "Point", coordinates },
    properties: {
      kind: "market",
      name: market.name,
      address: market.address,
      address_status: "reported",
      category: "Marché alimentaire régulier",
      market_days: market.days,
      source: "markets_suresnes",
      source_url: market.source_url,
      retrieved_at: input.checked_on,
      source_updated_at: market.osm_updated,
      precision: ring
        ? "Point au centre de l’emprise OSM de la halle ; pas une entrée ni le contour complet du marché."
        : "Point OSM du marché ; ne représente pas l’étendue des étals.",
      audit: {
        date: input.checked_on,
        status: "Lieu et jours confirmés par l’Office de tourisme",
        doubts: [],
        notes: [
          "Horaires exceptionnels et annulations non suivis automatiquement.",
        ],
        sources: [{ label: "Localisation OpenStreetMap", url: market.osm_url }],
      },
    },
  });
}
const ids = features.map((f) => f.id);
if (new Set(ids).size !== ids.length) throw new Error("Duplicate food amenity");
const originalIds = new Set(
  read("public/data/neighborhood.geojson").features.map((f) => f.id),
);
if (ids.some((id) => originalIds.has(id)))
  throw new Error("Duplicate existing amenity");
write("public/data/food-amenities.geojson", {
  type: "FeatureCollection",
  features,
});
write("public/data/food-amenities-quality.json", {
  checked_on: input.checked_on,
  bbox: input.bbox,
  candidate_shops: input.shops.length,
  counts: Object.fromEntries(
    ["grocery", "supermarket", "market"].map((kind) => [
      kind,
      features.filter((f) => f.properties.kind === kind).length,
    ]),
  ),
  missing_addresses: features
    .filter((f) => f.properties.address_status === "missing")
    .map((f) => f.id),
  uncertain_addresses: features
    .filter((f) => f.properties.address_status === "uncertain")
    .map((f) => f.id),
  excluded,
  limitations: [
    "Couverture OSM non exhaustive ; pas une certification d’ouverture actuelle.",
    "Marchés réguliers uniquement, hors événements temporaires.",
    "Pas de géocodage inverse au numéro pour combler les adresses absentes.",
  ],
});
write("public/data/food-amenities-sources.json", {
  food_osm: {
    name: "OpenStreetMap · extrait Magellium (magOSM)",
    url: "https://www.data.gouv.fr/datasets/localisations-des-magasins-dans-openstreetmap",
    format: "WFS magosm:shops_point → sélection dans la commune → GeoJSON",
    license: input.license,
    vintage: `Extrait le ${input.checked_on}`,
    note: "Épiceries, supérettes, épiceries fines et supermarchés. Base contributive non exhaustive ; dates OSM et adresses manquantes signalées dans les fiches. Pas de suivi automatique des fermetures.",
  },
  markets_suresnes: {
    name: "Office de tourisme de Suresnes · marchés réguliers",
    url: input.markets[0].source_url,
    format: "Lieux et jours relevés sur page publique ; coordonnées OSM",
    license:
      "Coordonnées OSM : ODbL ; faits de la page publique, sans licence ouverte identifiée pour la page",
    vintage: `Consulté le ${input.checked_on}`,
    note: "Deux marchés : Zola place du Général Leclerc (mercredi et samedi matin), Caron place Jean Jaurès (jeudi et dimanche matin). Un point par marché ; pas de suivi des exceptions.",
  },
});
console.log(
  `${features.length} points alimentaires générés ; ${excluded.length} commerces hors commune exclus.`,
);
