/** Geographic datasets bundled with the application. */
import { screenOfficePoint } from "./office-screening.js";

export const datasetNames = [
  "commune",
  "plu",
  "plu-maintien-bureaux",
  "transport",
  "schools",
  "nurseries",
  "health",
  "neighborhood",
  "offices",
  "offices-extra",
  "rental-offices",
  "roads",
  "rail",
  "transport-extent",
  "mos-offices",
  "mixed-buildings",
  "mos-pavillonnaire",
  "mos-collectif",
  "mos-activites",
];
/** Reject malformed datasets before constructing Leaflet layers. */
export function validateCollection(value, name) {
  if (
    value?.type !== "Feature" &&
    (value?.type !== "FeatureCollection" || !Array.isArray(value.features))
  )
    throw new Error(`Invalid FeatureCollection: ${name}`);
  const ids = new Set();
  for (const feature of value.type === "Feature" ? [value] : value.features) {
    if (feature.type !== "Feature" || !feature.geometry || !feature.properties)
      throw new Error(`Invalid feature: ${name}`);
    if (feature.id != null) {
      if (ids.has(feature.id))
        throw new Error(`Duplicate id: ${name}/${feature.id}`);
      ids.add(feature.id);
    }
    const walk = (coordinates) => {
      if (!Array.isArray(coordinates) || !coordinates.length)
        throw new Error(`Empty coordinates: ${name}`);
      if (typeof coordinates[0] === "number") {
        if (coordinates.length < 2 || !coordinates.every(Number.isFinite))
          throw new Error(`Invalid coordinates: ${name}`);
      } else coordinates.forEach(walk);
    };
    walk(feature.geometry.coordinates);
  }
  return value;
}
/** Apply a dated review without changing the reference GeoJSON snapshots. */
export function applyAmenityReview(data, review) {
  const seen = new Set();
  for (const entry of review.entries) {
    const key = `${entry.dataset}/${entry.id}`;
    if (seen.has(key)) throw new Error(`Duplicate amenity review: ${key}`);
    seen.add(key);
    const collection = data[entry.dataset];
    const feature = collection?.features.find((item) => item.id === entry.id);
    if (!feature) throw new Error(`Unknown amenity review: ${key}`);
    if (entry.decision === "exclude") {
      collection.features = collection.features.filter(
        (item) => item.id !== entry.id,
      );
      continue;
    }
    if (entry.decision !== "keep")
      throw new Error(`Invalid amenity decision: ${key}`);
    Object.assign(feature.properties, entry.properties || {});
    feature.properties.audit = {
      ...feature.properties.audit,
      date: review.checked_on,
      status: entry.status,
      doubts: entry.remaining_doubts || [],
      notes: [entry.reason],
      sources: [
        ...(feature.properties.audit?.sources || []),
        { label: "Google Maps · contrôle du 02/11/2026", url: entry.maps_url },
        ...(entry.sources || []),
      ],
    };
  }
  return data;
}
export async function loadDatasets(fetcher = fetch) {
  const names = [
    ...datasetNames,
    "sources",
    "radii",
    "radii-extra",
    "amenity-review",
  ];
  const values = await Promise.all(
    names.map(async (name) => {
      const extension = datasetNames.includes(name) ? "geojson" : "json";
      const response = await fetcher(`data/${name}.${extension}`);
      if (!response.ok)
        throw new Error(`Cannot load ${name}: HTTP ${response.status}`);
      const value = await response.json();
      return extension === "geojson" ? validateCollection(value, name) : value;
    }),
  );
  const data = Object.fromEntries(
    names.map((name, index) => [name, values[index]]),
  );
  applyAmenityReview(data, data["amenity-review"]);
  data.sources.crosscheck = {
    ...data.sources.crosscheck,
    vintage: "Revue Google Maps et sources officielles du 02/11/2026",
    note: "19 commerces / activités et 13 pharmacies affichés. Cinq points commerciaux sans boutique suffisamment recoupée sont exclus de l’affichage ; leurs décisions restent dans le fichier de revue. Google Maps ne démontre pas à lui seul l’existence ou l’absence d’une activité.",
  };
  data.offices.features.push(...data["offices-extra"].features);
  Object.assign(data.radii.offices, data["radii-extra"].offices);
  for (const office of [
    ...data.offices.features,
    ...data["rental-offices"].features,
  ])
    office.properties.officeScreening = screenOfficePoint(
      office,
      data.transport.features,
      data["plu-maintien-bureaux"].features,
    );
  data.sources.provided_addresses = {
    ...data.sources.provided_addresses,
    format:
      "Cinq adresses communiquées ; coordonnées du géocodeur Géoplateforme/BAN",
    vintage: "28 octobre et 2 novembre 2026",
    note: "Cinq points au numéro dans Suresnes. Le 39 rue Rouget de Lisle corrige le libellé fourni « Roger de l’isle ». Ces adresses ne prouvent pas la vacance ou la disponibilité de bureaux.",
  };
  return data;
}
