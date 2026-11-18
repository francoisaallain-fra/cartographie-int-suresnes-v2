import { readTargetedOffices, toOffice } from "./targeted-offices.js";

export const officeListKey = "suresnes-v2-office-list-v2";
const record = (f) => ({
  id: f.properties.ban_id,
  name: f.properties.name,
  address: f.properties.address,
  coordinates: f.geometry.coordinates,
});

export function readOfficeList(storage, baseline) {
  try {
    const saved = JSON.parse(storage.getItem(officeListKey));
    if (!Array.isArray(saved?.items) || !Array.isArray(saved?.removed))
      throw new Error("Missing list");
    const known = new Set();
    const decode = (value) => {
      const candidate = toOffice(value, 0);
      if (known.has(candidate.id)) throw new Error("Duplicate address");
      known.add(candidate.id);
      return baseline.find((f) => f.id === candidate.id) || candidate;
    };
    const features = [],
      removed = [];
    for (const value of saved.items.slice(0, baseline.length + 200)) {
      try {
        features.push(decode(value));
      } catch {
        /* Ignore invalid records. */
      }
    }
    for (const value of saved.removed.slice(-20)) {
      try {
        if (!Number.isInteger(value.index) || value.index < 0) continue;
        removed.push({ feature: decode(value.record), index: value.index });
      } catch {
        /* Ignore invalid records. */
      }
    }
    return { features, removed };
  } catch {
    return {
      features: [...baseline, ...readTargetedOffices(storage, baseline)],
      removed: [],
    };
  }
}

export function saveOfficeList(storage, features, removed) {
  storage.setItem(
    officeListKey,
    JSON.stringify({
      items: features.map(record),
      removed: removed
        .slice(-20)
        .map(({ feature, index }) => ({ record: record(feature), index })),
    }),
  );
}
