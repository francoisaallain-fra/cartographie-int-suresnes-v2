import test from "node:test";
import assert from "node:assert/strict";
import {
  addressCandidate,
  toOffice,
  readTargetedOffices,
  saveTargetedOffices,
  targetedOfficesKey,
  readHiddenOffices,
} from "../src/targeted-offices.js";
import {
  circleRing,
  clipLines,
  buildRadiusScenario,
} from "../src/dynamic-radius.js";
import { distanceMeters } from "../src/geometry.js";
const candidate = {
  id: "92073_1495_00010",
  name: "10 Rue Chevreul",
  address: "10 Rue Chevreul 92150 Suresnes",
  coordinates: [2.222938, 48.867021],
};
test("stored addresses round trip, deduplicate and reject malformed records", () => {
  const values = new Map();
  const storage = {
    getItem: (k) => values.get(k),
    setItem: (k, v) => values.set(k, v),
  };
  const office = toOffice(candidate, 6);
  saveTargetedOffices(storage, [office]);
  assert.equal(readTargetedOffices(storage, [])[0].id, office.id);
  assert.equal(readTargetedOffices(storage, [office]).length, 0);
  values.set(
    targetedOfficesKey,
    JSON.stringify([
      {},
      candidate,
      candidate,
      { ...candidate, coordinates: [0, 0] },
    ]),
  );
  assert.equal(readTargetedOffices(storage, []).length, 1);
  values.set(targetedOfficesKey, "invalid");
  assert.deepEqual(readTargetedOffices(storage, []), []);
  assert.equal(
    readHiddenOffices({
      getItem() {
        throw new Error();
      },
    }).size,
    0,
  );
});
test("geocoding accepts numbered Suresnes addresses only", () => {
  const feature = {
    geometry: { type: "Point", coordinates: candidate.coordinates },
    properties: {
      id: candidate.id,
      name: candidate.name,
      label: candidate.address,
      citycode: "92073",
      type: "housenumber",
    },
  };
  assert.deepEqual(addressCandidate(feature), candidate);
  for (const properties of [
    { citycode: "75056" },
    { type: "street" },
    { id: "__proto__" },
    { name: null },
  ])
    assert.equal(
      addressCandidate({
        ...feature,
        properties: { ...feature.properties, ...properties },
      }),
      null,
    );
});
test("dynamic rings stay at the requested radius and clip crossing lines", () => {
  for (const radius of [300, 500, 1000]) {
    const ring = circleRing(candidate.coordinates, radius);
    assert.equal(ring.length, 181);
    for (const point of ring)
      assert.ok(
        Math.abs(distanceMeters(candidate.coordinates, point) - radius) <
          0.00001,
      );
  }
  const ring = [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
    [0, 0],
  ];
  const line = {
    type: "LineString",
    coordinates: [
      [-1, 1],
      [3, 1],
    ],
  };
  assert.deepEqual(clipLines(line, ring).coordinates, [
    [
      [0, 1],
      [2, 1],
    ],
  ]);
  assert.deepEqual(clipLines(line, [...ring].reverse()).coordinates, [
    [
      [0, 1],
      [2, 1],
    ],
  ]);
  assert.equal(
    clipLines(
      {
        type: "LineString",
        coordinates: [
          [-2, -2],
          [-1, -1],
        ],
      },
      ring,
    ),
    null,
  );
  const inside = {
    type: "LineString",
    coordinates: [
      [0.5, 0.5],
      [1, 1],
      [1.5, 1.5],
    ],
  };
  assert.deepEqual(clipLines(inside, ring).coordinates, [inside.coordinates]);
});
test("dynamic amenities exclude distant points and return clipped roads", () => {
  const office = toOffice(candidate, 6),
    near = { ...office, id: "near" },
    far = {
      ...office,
      id: "far",
      geometry: { type: "Point", coordinates: [2.25, 48.9] },
    };
  const data = Object.fromEntries(
    [
      "transport",
      "schools",
      "nurseries",
      "health",
      "neighborhood",
      "roads",
      "rail",
    ].map((k) => [k, { features: [] }]),
  );
  data.transport.features = [near, far];
  const result = buildRadiusScenario(office, 500, data);
  assert.deepEqual(
    result.nearby.map((f) => f.id),
    ["near"],
  );
  assert.equal(result.geometry.type, "Polygon");
});
