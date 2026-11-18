import test from "node:test";
import assert from "node:assert/strict";
import {
  readOfficeList,
  saveOfficeList,
  officeListKey,
} from "../src/office-list-storage.js";
import { toOffice, saveTargetedOffices } from "../src/targeted-offices.js";
const candidate = {
  id: "92073_1495_00010",
  name: "10 Rue Chevreul",
  address: "10 Rue Chevreul 92150 Suresnes",
  coordinates: [2.222938, 48.867021],
};
const baseline = toOffice({ ...candidate, id: "92073_baseline" }, 1);
delete baseline.properties.custom;
const custom = toOffice(candidate, 2);
function storage() {
  const data = new Map();
  return { getItem: (k) => data.get(k), setItem: (k, v) => data.set(k, v) };
}
test("migrate legacy additions, retain canonical baseline and round trip removals", () => {
  const s = storage();
  saveTargetedOffices(s, [custom]);
  let list = readOfficeList(s, [baseline]);
  assert.deepEqual(list.features, [baseline, custom]);
  saveOfficeList(s, [custom], [{ feature: baseline, index: 0 }]);
  list = readOfficeList(s, [baseline]);
  assert.equal(list.features.length, 1);
  assert.equal(list.removed[0].feature, baseline);
  assert.equal(list.removed[0].index, 0);
  saveOfficeList(s, [], [{ feature: custom, index: 0 }]);
  assert.deepEqual(readOfficeList(s, [baseline]).features, []);
});
test("ignore invalid and duplicate records and cap undo history", () => {
  const s = storage();
  s.setItem(
    officeListKey,
    JSON.stringify({
      items: [candidate, {}, candidate],
      removed: [{ record: candidate, index: 0 }],
    }),
  );
  assert.equal(readOfficeList(s, [baseline]).features.length, 1);
  assert.equal(readOfficeList(s, [baseline]).removed.length, 0);
  saveOfficeList(
    s,
    [],
    Array.from({ length: 25 }, (_, index) => ({
      feature: toOffice({ ...candidate, id: `92073_${index}` }, index),
      index,
    })),
  );
  assert.equal(readOfficeList(s, [baseline]).removed.length, 20);
});
