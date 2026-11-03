import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  distanceMeters,
  pointInPolygonGeometry,
  pointInRing,
} from "../src/geometry.js";
import { screenOfficePoint } from "../src/office-screening.js";
import { escapeHTML } from "../src/presentation.js";
import {
  validateCollection,
  loadDatasets,
  datasetNames,
  applyAmenityReview,
} from "../src/data.js";
const read = (name) =>
  JSON.parse(fs.readFileSync(`public/data/${name}`, "utf8"));
test("all original data, assets and vendor files retain their exact bytes", () => {
  const manifest = JSON.parse(fs.readFileSync("tests/baseline-sha256.json"));
  for (const [path, sha] of Object.entries(manifest))
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync("public/" + path))
        .digest("hex"),
      sha,
      path,
    );
});
test("all geographic collections satisfy their data contract", () => {
  for (const name of datasetNames)
    validateCollection(read(name + ".geojson"), name);
});
test("the amenity review corrects names and omits unsupported shop pins", () => {
  const review = read("amenity-review.json");
  assert.equal(review.entries.length, 14);
  const data = Object.fromEntries(
    ["schools", "health", "neighborhood"].map((name) => [
      name,
      read(`${name}.geojson`),
    ]),
  );
  applyAmenityReview(data, review);
  assert.equal(
    data.schools.features.find((f) => f.id === "0920884L").properties.name,
    "Collège Hubert Germain",
  );
  assert.equal(
    data.neighborhood.features.find((f) => f.id === "audit-tea").properties
      .kind,
    "tea",
  );
  assert.equal(data.neighborhood.features.length, 32);
  assert.ok(!data.neighborhood.features.some((f) => f.id === "audit-perlin"));
  for (const name of ["schools", "health", "neighborhood"])
    validateCollection(data[name], name);
});
test("point containment handles inside, outside and either ring orientation", () => {
  const ring = [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
    [0, 0],
  ];
  assert.equal(pointInRing([1, 1], ring), true);
  assert.equal(pointInRing([3, 1], ring), false);
  assert.equal(pointInRing([1, 1], [...ring].reverse()), true);
});
test("office screening respects 500 m and polygon holes and boundaries", () => {
  const zone = {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
        [
          [0.5, 0.5],
          [1.5, 0.5],
          [1.5, 1.5],
          [0.5, 1.5],
          [0.5, 0.5],
        ],
      ],
    ],
  };
  assert.equal(pointInPolygonGeometry([0, 1], zone), true);
  assert.equal(pointInPolygonGeometry([1, 1], zone), false);
  assert.equal(pointInPolygonGeometry([0.5, 1], zone), true);
  assert.equal(pointInPolygonGeometry([3, 1], zone), false);
  const station = {
    id: "station",
    geometry: { coordinates: [0, 0] },
    properties: { name: "Gare" },
  };
  const officeAt = (metres) => ({
    geometry: {
      coordinates: [0, (metres / 6371000) * (180 / Math.PI)],
    },
  });
  assert.ok(
    Math.abs(distanceMeters([0, 0], officeAt(500).geometry.coordinates) - 500) <
      1e-8,
  );
  assert.equal(
    screenOfficePoint(officeAt(500), [station], []).highlighted,
    true,
  );
  assert.equal(
    screenOfficePoint(officeAt(501), [station], []).highlighted,
    false,
  );
  assert.equal(
    screenOfficePoint(
      officeAt(500),
      [station],
      [
        {
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
      ],
    ).highlighted,
    false,
  );
});
test("screening only applies to targeted offices, never rentals", async () => {
  const data = await loadDatasets(async (url) => ({
    ok: true,
    json: async () => JSON.parse(fs.readFileSync(`public/${url}`)),
  }));
  const highlighted = data.offices.features
    .filter((office) => office.properties.officeScreening.highlighted)
    .map((office) => office.id);
  assert.deepEqual(highlighted, [
    "ban-92073_8131_00002",
    "ban-92073_3o60ni_00039",
  ]);
  for (const rental of data["rental-offices"].features)
    assert.equal(rental.properties.officeScreening, undefined);
});
test("all 60 address/radius scenarios contain their origin and monotonic nearby sets", () => {
  const radii = read("radii.json");
  const offices = read("offices.geojson");
  assert.equal(offices.features.length, 4);
  let count = 0;
  for (const office of offices.features) {
    let previous = new Set();
    for (let distance = 300; distance <= 1000; distance += 50) {
      const scenario = radii.offices[office.id][distance];
      assert.ok(scenario);
      assert.ok(
        pointInRing(
          office.geometry.coordinates,
          scenario.geometry.coordinates[0],
        ),
      );
      const ids = new Set(scenario.nearby.map((x) => x.id));
      assert.equal(ids.size, scenario.nearby.length);
      for (const id of previous) assert.ok(ids.has(id));
      previous = ids;
      count++;
    }
  }
  assert.equal(count, 60);
});
test("new targeted address has 15 complete geodesic scenarios", () => {
  const office = read("offices-extra.geojson").features[0];
  const radii = read("radii-extra.json").offices[office.id];
  assert.equal(office.properties.ban_id, "92073_3o60ni_00039");
  assert.equal(Object.keys(radii).length, 15);
  let previous = new Set();
  for (let distance = 300; distance <= 1000; distance += 50) {
    const scenario = radii[distance];
    assert.ok(
      pointInRing(
        office.geometry.coordinates,
        scenario.geometry.coordinates[0],
      ),
    );
    const ids = new Set(scenario.nearby.map((x) => x.id));
    for (const id of previous) assert.ok(ids.has(id));
    previous = ids;
    assert.deepEqual(Object.keys(scenario.roads), [
      "road-quais",
      "road-henri-sellier",
      "road-washington",
      "road-franklin-roosevelt",
    ]);
    assert.equal(Object.keys(scenario.rail).length, 3);
  }
});
test("HTML metacharacters are escaped", () =>
  assert.equal(escapeHTML('<img a="x">&'), "&lt;img a=&quot;x&quot;&gt;&amp;"));
test("malformed data fails with an actionable dataset name", () =>
  assert.throws(() => validateCollection({}, "schools"), /schools/));
test("rental-office snapshot maps numbered addresses without hiding exclusions", () => {
  const data = read("rental-offices.geojson");
  const quality = read("rental-offices-quality.json");
  assert.equal(data.features.length, 19);
  assert.equal(
    data.features.reduce((n, f) => n + f.properties.listings.length, 0),
    27,
  );
  assert.equal(quality.cards_seen, 57);
  assert.equal(quality.excluded.length, 30);
  assert.equal(quality.heading_count, quality.cards_seen);
  assert.equal(quality.mapped_listings, 27);
  assert.equal(quality.mapped_address_points, 19);
  assert.equal(quality.retrieved_at, "2026-11-03");
  assert.equal(
    new URL(quality.source_page).searchParams.get("location_type"),
    "city",
  );
  const source = fs.readFileSync(
    "data-source/bureauxlocaux-2026-11-03.tsv",
    "utf8",
  );
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    quality.source_sha256,
  );
  const sourceIds = source
    .trim()
    .split("\n")
    .slice(1)
    .map((row) => row.split("\t")[0]);
  const mapped = data.features.flatMap((f) => f.properties.listings);
  const excludedIds = quality.excluded.map((f) => f.id);
  assert.deepEqual(
    [...mapped.map((f) => f.id), ...excludedIds].sort(),
    sourceIds.sort(),
  );
  assert.equal(new Set([...mapped.map((f) => f.id), ...excludedIds]).size, 57);
  assert.equal(
    quality.excluded.filter((f) => f.reason === "Numéro de rue non publié")
      .length,
    29,
  );
  assert.deepEqual(
    quality.excluded
      .filter((f) => f.reason === "Annonce classée commerce")
      .map((f) => f.id),
    ["39776861"],
  );
  assert.ok(mapped.every((f) => f.type !== "commerce"));
  for (const id of ["36749298", "38262835", "38689730", "43005791"])
    assert.ok(mapped.some((f) => f.id === id));
  const commune = read("commune.geojson");
  for (const feature of data.features) {
    assert.ok(
      pointInPolygonGeometry(
        feature.geometry.coordinates,
        commune.geometry || commune.features[0].geometry,
      ),
    );
    assert.match(feature.properties.name, /^\d+ /);
    assert.equal(feature.properties.retrieved_at, "2026-11-03");
  }
  assert.equal(new Set(data.features.map((f) => f.properties.ban_id)).size, 19);
  assert.ok(
    data.features.every((f) =>
      f.properties.listings.every(
        (listing) =>
          listing.url.startsWith("https://www.bureauxlocaux.com/annonce/") &&
          listing.rent_display,
      ),
    ),
  );
});
test("HTTP failures identify the failed resource", async () => {
  await assert.rejects(
    loadDatasets(async () => ({ ok: false, status: 503 })),
    /Cannot load commune: HTTP 503/,
  );
});
test("food amenities are sourced, inside Suresnes and included in radius exploration", async () => {
  const data = await loadDatasets(async (url) => ({
    ok: true,
    json: async () => JSON.parse(fs.readFileSync(`public/${url}`)),
  }));
  const food = data["food-amenities"].features;
  const quality = read("food-amenities-quality.json");
  const boundary = data.commune.geometry || data.commune.features[0].geometry;
  assert.deepEqual(quality.counts, { grocery: 23, supermarket: 7, market: 2 });
  assert.equal(data.neighborhood.features.length, 63);
  assert.equal(new Set(data.neighborhood.features.map((f) => f.id)).size, 63);
  for (const f of food) {
    assert.ok(pointInPolygonGeometry(f.geometry.coordinates, boundary), f.id);
    assert.ok(data.sources[f.properties.source]);
    assert.match(f.properties.source_url, /^https:\/\//);
    if (f.properties.address_status !== "reported")
      assert.ok(f.properties.audit.doubts.length);
  }
  assert.equal(
    food.find((f) => f.id === "osm-node-2364399609").properties.market_days,
    "Mercredi et samedi matin",
  );
  assert.equal(
    food.find((f) => f.id === "osm-way-70961879").properties.market_days,
    "Jeudi et dimanche matin",
  );
  const scenarios = data.radii.offices["ban-92073_7160_00030"];
  assert.ok(scenarios[500].nearby.some((f) => f.id === "osm-node-7340165351"));
  assert.ok(!scenarios[500].nearby.some((f) => f.id === "osm-node-2364399609"));
});
test("v2 hosting identity is pinned and independent", () => {
  const manifest = JSON.parse(fs.readFileSync(".openai/hosting.json"));
  assert.equal(manifest.project_id, "appgprj_6ae7236180948191be7fac25a4ba93ec");
  assert.equal(manifest.static.directory, "dist");
});
