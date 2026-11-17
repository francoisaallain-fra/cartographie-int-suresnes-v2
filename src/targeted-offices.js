/** Address validation and browser-local records, separate from map rendering. */
export const targetedOfficesKey = "suresnes-v2-targeted-offices-v1";
export const hiddenOfficesKey = "suresnes-v2-hidden-offices-v1";
export const geocodingEndpoint = "https://data.geopf.fr/geocodage/search";

export function addressCandidate(feature) {
  const p = feature?.properties,
    point = feature?.geometry?.coordinates;
  if (
    feature?.geometry?.type !== "Point" ||
    !Array.isArray(point) ||
    point.length !== 2 ||
    !point.every(Number.isFinite) ||
    point[0] < 2.15 ||
    point[0] > 2.3 ||
    point[1] < 48.8 ||
    point[1] > 48.95 ||
    p?.citycode !== "92073" ||
    p.type !== "housenumber" ||
    typeof p.id !== "string" ||
    !/^92073_[a-zA-Z0-9_]+$/.test(p.id) ||
    typeof p.label !== "string" ||
    p.label.length > 240 ||
    !p.label.trim() ||
    typeof p.name !== "string" ||
    p.name.length > 180 ||
    !p.name.trim()
  )
    return null;
  return { id: p.id, name: p.name, address: p.label, coordinates: [...point] };
}
export function toOffice(candidate, number) {
  const checked = addressCandidate({
    geometry: { type: "Point", coordinates: candidate?.coordinates },
    properties: {
      id: candidate?.id,
      label: candidate?.address,
      name: candidate?.name,
      citycode: "92073",
      type: "housenumber",
    },
  });
  if (!checked) throw new Error("Adresse enregistrée invalide.");
  return {
    type: "Feature",
    id: `ban-${checked.id}`,
    geometry: { type: "Point", coordinates: checked.coordinates },
    properties: {
      kind: "office",
      number,
      name: checked.name,
      address: checked.address,
      ban_id: checked.id,
      custom: true,
      source: "provided_addresses",
      source_url: geocodingEndpoint,
      precision: "Point d’adresse BAN ; emprise et disponibilité non vérifiées",
    },
  };
}
export function readTargetedOffices(storage, baseline) {
  const features = [],
    known = new Set(baseline.map((f) => f.properties.ban_id));
  try {
    const records = JSON.parse(storage.getItem(targetedOfficesKey));
    if (!Array.isArray(records)) return features;
    for (const record of records.slice(0, 200)) {
      try {
        const feature = toOffice(record, baseline.length + features.length + 1);
        if (!known.has(feature.properties.ban_id)) {
          features.push(feature);
          known.add(feature.properties.ban_id);
        }
      } catch {
        /* Ignore only the malformed record. */
      }
    }
  } catch {
    /* Storage unavailable or corrupt: baseline remains usable. */
  }
  return features;
}
export function saveTargetedOffices(storage, features) {
  storage.setItem(
    targetedOfficesKey,
    JSON.stringify(
      features
        .filter((f) => f.properties.custom)
        .map((f) => ({
          id: f.properties.ban_id,
          name: f.properties.name,
          address: f.properties.address,
          coordinates: f.geometry.coordinates,
        })),
    ),
  );
}
export function readHiddenOffices(storage) {
  try {
    const ids = JSON.parse(storage.getItem(hiddenOfficesKey));
    return new Set(
      Array.isArray(ids)
        ? ids.filter((id) => typeof id === "string" && id.startsWith("ban-"))
        : [],
    );
  } catch {
    return new Set();
  }
}
