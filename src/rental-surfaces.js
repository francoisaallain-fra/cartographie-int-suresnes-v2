/** Surface used for address-level filtering, never a minimum divisible lot. */
export function parseAdvertisedSurface(display) {
  const match = String(display ?? "")
    .replace(/\s/g, "")
    .match(/^(\d+(?:[.,]\d+)?)(?:à(\d+(?:[.,]\d+)?))?m[²2]$/i);
  if (!match) return null;
  const min = Number(match[1].replace(",", "."));
  const max = Number((match[2] ?? match[1]).replace(",", "."));
  return Number.isFinite(max) && min > 0 && max >= min ? { min, max } : null;
}

export function rentalSurface(properties, review) {
  const listings = properties.listings ?? [];
  const surfaces = listings.map((l) =>
    parseAdvertisedSurface(l.surface_display),
  );
  const precise = /^\d+\s/.test(properties.address ?? "") && properties.ban_id;
  if (!precise || !listings.length || surfaces.some((s) => !s))
    return {
      value_m2: null,
      method: "unknown",
      note: "Adresse précise ou surface exploitable manquante.",
    };
  const result = {
    value_m2: Math.max(...surfaces.map((s) => s.max)),
    method: "maximum",
    note:
      listings.length === 1
        ? "Surface maximale de l’annonce ; les subdivisions ne sont pas additionnées."
        : "Plus grande surface annoncée, sans cumul : les lots distincts ne sont pas établis.",
  };
  if (!review) return result;
  // A review must match the entire dated group. New/changed advertisements
  // invalidate any sum, rather than silently applying an old decision.
  const valid =
    review.address === properties.address &&
    review.listings.length === listings.length &&
    new Set(review.listings.map((l) => l.id)).size === listings.length &&
    review.listings.every((r) =>
      listings.some(
        (l) =>
          l.id === r.id &&
          l.surface_display === r.surface_display &&
          l.address_display === r.address_display &&
          l.url === r.url,
      ),
    );
  if (!valid)
    return {
      ...result,
      note: "Revue des lots à actualiser : plus grande surface annoncée, sans cumul.",
    };
  if (review.method === "sum_distinct") {
    const components = review.components;
    if (
      !Array.isArray(components) ||
      components.length !== listings.length ||
      new Set(components.map((c) => c.listing_id)).size !== listings.length ||
      !components.every(
        (c) =>
          c.lots?.length &&
          listings.some(
            (l) =>
              l.id === c.listing_id &&
              parseAdvertisedSurface(l.surface_display).max === c.area_m2,
          ),
      )
    )
      throw new Error("Invalid distinct-lot surface review");
    return {
      value_m2: components.reduce((sum, c) => sum + c.area_m2, 0),
      method: "sum_distinct",
      note: review.note,
      reviewed_on: review.checked_on,
    };
  }
  if (review.method !== "overlap")
    throw new Error("Invalid surface review method");
  return { ...result, note: review.note, reviewed_on: review.checked_on };
}

export function applyRentalSurfaces(features, review) {
  for (const feature of features)
    feature.properties.surface = rentalSurface(
      feature.properties,
      review.entries.find(
        (entry) => entry.address === feature.properties.address,
      ),
    );
}

export function matchesRentalSurface(feature, { min, max }) {
  if (
    feature.properties.kind !== "rentalOffice" ||
    (min === null && max === null)
  )
    return true;
  const area = feature.properties.surface?.value_m2;
  return (
    Number.isFinite(area) &&
    area > 0 &&
    (min === null || area >= min) &&
    (max === null || area <= max)
  );
}

export function formatSurface(value) {
  return Number.isFinite(value)
    ? `${value.toLocaleString("fr-FR")} m²`
    : "Non renseignée";
}
