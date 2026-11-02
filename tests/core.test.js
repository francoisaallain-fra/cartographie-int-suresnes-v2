import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { pointInRing } from "../src/geometry.js";
import { escapeHTML } from "../src/presentation.js";
import { validateCollection, loadDatasets, datasetNames } from "../src/data.js";
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
  assert.equal(data.features.length, 16);
  assert.equal(
    data.features.reduce((n, f) => n + f.properties.listings.length, 0),
    23,
  );
  assert.equal(quality.cards_seen, 53);
  assert.equal(quality.excluded.length, 30);
  assert.equal(new Set(data.features.map((f) => f.properties.ban_id)).size, 16);
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
test("v2 hosting identity is pinned and independent", () => {
  const manifest = JSON.parse(fs.readFileSync(".openai/hosting.json"));
  assert.equal(manifest.project_id, "appgprj_6ae7236180948191be7fac25a4ba93ec");
  assert.equal(manifest.static.directory, "dist");
});
