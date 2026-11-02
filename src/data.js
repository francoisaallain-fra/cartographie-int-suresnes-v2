/** Geographic datasets bundled with the application. */
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
export async function loadDatasets(fetcher = fetch) {
  const names = [...datasetNames, "sources", "radii", "radii-extra"];
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
  data.offices.features.push(...data["offices-extra"].features);
  Object.assign(data.radii.offices, data["radii-extra"].offices);
  data.sources.provided_addresses = {
    ...data.sources.provided_addresses,
    format:
      "Cinq adresses communiquées ; coordonnées du géocodeur Géoplateforme/BAN",
    vintage: "28 octobre et 2 novembre 2026",
    note: "Cinq points au numéro dans Suresnes. Le 39 rue Rouget de Lisle corrige le libellé fourni « Roger de l’isle ». Ces adresses ne prouvent pas la vacance ou la disponibilité de bureaux.",
  };
  return data;
}
