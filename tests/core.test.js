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
test("all 17 geographic collections satisfy their data contract", () => {
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
test("HTML metacharacters are escaped", () =>
  assert.equal(escapeHTML('<img a="x">&'), "&lt;img a=&quot;x&quot;&gt;&amp;"));
test("malformed data fails with an actionable dataset name", () =>
  assert.throws(() => validateCollection({}, "schools"), /schools/));
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
