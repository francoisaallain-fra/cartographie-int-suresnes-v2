import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  parseAdvertisedSurface,
  rentalSurface,
  applyRentalSurfaces,
  matchesRentalSurface,
} from "../src/rental-surfaces.js";
const read = (name) =>
  JSON.parse(fs.readFileSync(`public/data/${name}`, "utf8"));

test("advertised surface parsing accepts French units but rejects missing and malformed areas", () => {
  assert.deepEqual(parseAdvertisedSurface("541 à 5\u202f674 m²"), {
    min: 541,
    max: 5674,
  });
  assert.deepEqual(parseAdvertisedSurface("105,5 m²"), {
    min: 105.5,
    max: 105.5,
  });
  for (const value of [
    null,
    "Nous consulter",
    "15 postes",
    "0 m²",
    "-20 m²",
    "100 à 50 m²",
    "100 m² + 50 m²",
  ])
    assert.equal(parseAdvertisedSurface(value), null);
});

test("review sums distinct Pasteur floors and does not multiply broker duplicates", () => {
  const features = read("rental-offices.geojson").features;
  const review = read("rental-surface-review.json");
  assert.equal(review.entries.length, 5);
  assert.equal(
    review.entries.reduce((n, r) => n + r.listings.length, 0),
    13,
  );
  applyRentalSurfaces(features, review);
  const byName = (name) =>
    features.find((f) => f.properties.name === name).properties.surface;
  assert.equal(byName("30 Rue Pasteur").value_m2, 1387);
  assert.equal(byName("30 Rue Pasteur").method, "sum_distinct");
  assert.equal(byName("10 Rue Chevreul").value_m2, 1456);
  assert.equal(byName("22 Quai Gallieni").value_m2, 1099);
  assert.equal(byName("40 Boulevard Henri Sellier").value_m2, 532);
  assert.equal(byName("48 Rue Carnot").value_m2, 5674);
  assert.equal(byName("25 Quai Gallieni").value_m2, 105);
  assert.equal(
    features.filter((f) => f.properties.surface.method === "sum_distinct")
      .length,
    1,
  );
  assert.equal(
    features.filter((f) => Number.isFinite(f.properties.surface.value_m2))
      .length,
    19,
  );
});

test("a sum requires exact source signatures and the complete reviewed address group", () => {
  const original = read("rental-offices.geojson").features.find(
    (f) => f.properties.name === "30 Rue Pasteur",
  ).properties;
  const review = read("rental-surface-review.json").entries.find(
    (e) => e.address === original.address,
  );
  for (const mutate of [
    (p) => {
      p.address = "32 Rue Pasteur 92150 Suresnes";
    },
    (p) => {
      p.listings[0].address_display = "Suresnes";
    },
    (p) => {
      p.listings[0].surface_display = "136 à 600 m²";
    },
    (p) => {
      p.listings.push({ ...p.listings[0], id: "new" });
    },
  ]) {
    const properties = JSON.parse(JSON.stringify(original));
    mutate(properties);
    assert.equal(rentalSurface(properties, review).method, "maximum");
  }
  const missing = JSON.parse(JSON.stringify(original));
  missing.listings[0].surface_display = "Nous consulter";
  assert.equal(rentalSurface(missing, review).value_m2, null);
  missing.address = "Rue Pasteur, Suresnes";
  assert.equal(rentalSurface(missing, review).method, "unknown");
  const badReview = JSON.parse(JSON.stringify(review));
  badReview.components[0].area_m2 = 1131; // Do not count both the total and its subdivisions.
  assert.throws(
    () => rentalSurface(original, badReview),
    /Invalid distinct-lot/,
  );
});

test("surface bounds are inclusive, exclude unknowns only when active and never filter targeted offices", () => {
  const feature = (kind, value) => ({
    properties: { kind, surface: { value_m2: value } },
  });
  assert.ok(
    matchesRentalSurface(feature("rentalOffice", 1387), {
      min: 1387,
      max: 1387,
    }),
  );
  assert.ok(
    !matchesRentalSurface(feature("rentalOffice", 1386), {
      min: 1387,
      max: null,
    }),
  );
  assert.ok(
    !matchesRentalSurface(feature("rentalOffice", 1388), {
      min: null,
      max: 1387,
    }),
  );
  assert.ok(
    !matchesRentalSurface(feature("rentalOffice", null), { min: 0, max: null }),
  );
  assert.ok(
    matchesRentalSurface(feature("rentalOffice", null), {
      min: null,
      max: null,
    }),
  );
  assert.ok(
    matchesRentalSurface(feature("office", null), { min: 500, max: 1000 }),
  );
});
