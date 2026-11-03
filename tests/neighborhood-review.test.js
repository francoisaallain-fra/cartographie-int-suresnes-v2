import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loadDatasets } from "../src/data.js";
import { groupFor } from "../src/state.js";
import { markerAppearance } from "../src/markers.js";
import { symbols } from "../src/presentation.js";

const read = (name) => JSON.parse(fs.readFileSync(`public/data/${name}`));
const load = () =>
  loadDatasets(async (url) => ({
    ok: true,
    json: async () => JSON.parse(fs.readFileSync(`public/${url}`)),
  }));

test("dated review retains source coordinates, excludes the closed shop and preserves six reservations", async () => {
  const data = await load();
  const original = read("food-amenities.geojson").features;
  const food = data["food-amenities"].features;
  assert.equal(read("neighborhood-review-2026-11-03.json").entries.length, 23);
  assert.equal(food.length, 31);
  assert.equal(data.neighborhood.features.length, 63);
  assert.ok(
    !data.neighborhood.features.some((f) => f.id === "osm-node-7149725546"),
  );
  assert.ok(original.some((f) => f.id === "osm-node-7149725546"));
  for (const feature of food) {
    assert.deepEqual(
      feature.geometry,
      original.find((f) => f.id === feature.id).geometry,
    );
    assert.equal(groupFor(feature), "neighborhood");
    const appearance = markerAppearance(feature.properties);
    assert.ok(appearance.color);
    assert.ok(symbols[appearance.icon]);
  }
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(Object.groupBy(food, (f) => f.properties.kind)).map(
        ([kind, features]) => [kind, features.length],
      ),
    ),
    {
      supermarket: 16,
      produce: 2,
      organic: 2,
      grocery: 6,
      stationShop: 1,
      preparedFood: 2,
      market: 2,
    },
  );
  const doubts = data.neighborhood.features.filter(
    (f) => f.properties.audit?.doubts.length,
  );
  assert.deepEqual(
    doubts.map((f) => f.id).sort(),
    [
      "osm-node-6250448542",
      "osm-node-7178996300",
      "osm-node-7238515314",
      "osm-node-7339991150",
      "osm-node-7340165351",
      "osm-node-11184027949",
    ].sort(),
  );
  for (const office of Object.values(data.radii.offices))
    for (const scenario of Object.values(office))
      assert.ok(!scenario.nearby.some((f) => f.id === "osm-node-7149725546"));
});

test("names, categories and dated evidence reflect the Maps decisions without upgrading uncertain locations", async () => {
  const data = await load();
  const get = (id) =>
    data.neighborhood.features.find((f) => f.id === `osm-node-${id}`)
      .properties;
  assert.equal(get("4141678536").name, "RC – Alimentation Générale");
  assert.equal(get("4405645637").name, "RML Asian Store");
  assert.equal(get("8736545584").category, "Magasin de plats préparés");
  assert.equal(get("9411229459").kind, "preparedFood");
  assert.equal(get("3075148138").kind, "produce");
  assert.equal(get("7339991150").kind, "stationShop");
  assert.equal(
    get("7178996300").address,
    "17 avenue Édouard-Vaillant, 92150 Suresnes",
  );
  assert.equal(get("7340165351").address_status, "divergent");
  assert.match(get("7340165351").precision, /non repositionné/);
  assert.equal(get("7238515314").audit.uncertainty_1_to_3, 3);
  assert.equal(get("7238515314").address_status, "unconfirmed");
  assert.match(get("7238515314").address, /numéro non confirmé/);
  assert.equal(get("1191783376").audit.date, "2026-11-03");
  assert.equal(get("1191783376").audit.doubts.length, 0);
  assert.ok(
    get("1191783376").audit.sources.some(
      (s) => s.label === "Google Maps · contrôle du 03/11/2026",
    ),
  );
  assert.equal(get("3892536583").audit.date, "2026-11-02");
  assert.equal(get("6250448542").audit.date, "2026-11-03");
});
