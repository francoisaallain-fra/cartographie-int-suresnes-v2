import { test, expect } from "@playwright/test";
import fs from "node:fs";
const radii = JSON.parse(fs.readFileSync("public/data/radii.json"));
Object.assign(
  radii.offices,
  JSON.parse(fs.readFileSync("public/data/radii-extra.json")).offices,
);
const offices = [
  ...JSON.parse(fs.readFileSync("public/data/offices.geojson")).features,
  ...JSON.parse(fs.readFileSync("public/data/offices-extra.geojson")).features,
];
const rentalOffices = JSON.parse(
  fs.readFileSync("public/data/rental-offices.geojson"),
).features;
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#loading")).toBeHidden();
  await expect(page.locator(".layer-card")).toHaveCount(12);
});
test("all layer toggles and disclosure controls remain independent", async ({
  page,
}) => {
  for (const card of await page.locator(".layer-card").all()) {
    const checkbox = card.locator("input[type=checkbox]");
    const initial = await checkbox.isChecked();
    await checkbox.setChecked(!initial);
    await expect(checkbox).toBeChecked({ checked: !initial });
    await card.locator(".layer-expand").click();
    await expect(card.locator(".layer-body")).toBeHidden();
    await expect(checkbox).toBeVisible();
    await expect(card.locator(".layer-drag")).toBeVisible();
    await card.locator(".layer-expand").click();
    await checkbox.setChecked(initial);
  }
});
test("all 75 radius scenarios preserve the visible points", async ({
  page,
}) => {
  for (const office of offices) {
    await page.locator(`.office-item[data-id="${office.id}"]`).click();
    await page.locator("#radius-range").press("Home");
    for (let distance = 300; distance <= 1000; distance += 50) {
      const state = await page.evaluate(() => window.suresnesDiagnostics());
      expect(state.radiusMeters).toBe(distance);
      expect([...state.pointIds].sort()).toEqual(
        [
          ...radii.offices[office.id][distance].nearby.map((x) => x.id),
          ...offices.map((x) => x.id),
          ...rentalOffices.map((x) => x.id),
        ].sort(),
      );
      if (distance < 1000)
        await page.locator("#radius-range").press("ArrowRight");
    }
    await page.locator("#clear-radius").click();
    await expect(page.locator("#radius-panel")).toBeHidden();
  }
});
test("every station opens a 500 m circle, replaced on the next selection", async ({
  page,
}) => {
  const stations = JSON.parse(
    fs.readFileSync("public/data/transport.geojson"),
  ).features;
  for (let i = 0; i < stations.length; i++) {
    if (i === 0) await page.locator(".map-pin.transport").first().click();
    else
      await page
        .locator(".map-pin.transport")
        .nth(i)
        .evaluate((el) => el.click());
    const snapshot = await page.evaluate(() => window.suresnesDiagnostics());
    expect(snapshot.selectedStation).toBe(stations[i].id);
    expect(snapshot.stationRadiusMeters).toBe(500);
    await expect(page.locator(".station-radius")).toHaveCount(1);
    await expect(page.locator("#map-context")).toContainText(
      stations[i].properties.name,
    );
  }
  await page.locator("#layerOpacity-transport").fill("50");
  await expect(page.locator(".station-radius")).toHaveAttribute(
    "stroke-opacity",
    "0.5",
  );
  await page.locator("#layer-transport").uncheck();
  await expect(page.locator(".station-radius")).toHaveCount(0);
  await page.locator("#layer-transport").check();
  await page
    .locator(".map-pin.transport")
    .first()
    .evaluate((el) => el.click());
  await page.locator(".office-item").last().click();
  const snapshot = await page.evaluate(() => window.suresnesDiagnostics());
  expect(snapshot.selectedStation).toBeNull();
  expect(snapshot.selected).toBe(offices.at(-1).id);
  await expect(page.locator(".station-radius")).toHaveCount(0);
});
test("rental listings have their own layer and linked popup", async ({
  page,
}) => {
  const toggle = page.locator("#layer-rentalOffices");
  await expect(toggle).toBeChecked();
  const marker = page.locator(".map-pin.rentalOffice");
  await expect(marker).toHaveCount(16);
  await toggle.uncheck();
  await expect(marker).toHaveCount(0);
  await toggle.check();
  await expect(marker).toHaveCount(16);
  await page.locator(".rental-address-list summary").click();
  await page.locator("[data-rental-id]").first().click();
  await expect(page.locator(".leaflet-popup-content")).toContainText(
    /BUREAUXLOCAUX/i,
  );
  await expect(page.locator(".leaflet-popup-content")).toContainText(
    "Loyer affiché",
  );
  await expect(
    page.locator(
      ".leaflet-popup-content a[href*='bureauxlocaux.com/annonce/']",
    ),
  ).toHaveCount(1);
});
test("office retention is a dotted boundary and rental offices use a lighter pink", async ({
  page,
}) => {
  const boundary = page
    .locator(".leaflet-data-pluOfficeRetention-pane path")
    .first();
  await expect(boundary).toHaveAttribute("fill", "none");
  await expect(boundary).toHaveAttribute("stroke", "#53bfe9");
  await expect(boundary).toHaveAttribute("stroke-dasharray", /1[ ,]6/);
  await page.locator("#layerOpacity-pluOfficeRetention").fill("50");
  await expect(boundary).toHaveAttribute("stroke-opacity", "0.5");
  await expect(boundary).toHaveAttribute("fill", "none");

  await expect(
    page.locator(".map-pin.office .pin-disc").first(),
  ).toHaveAttribute("style", /--color:#d72e83/);
  await expect(
    page.locator(".map-pin.rentalOffice .pin-disc").first(),
  ).toHaveAttribute("style", /--color:#eb7fb4;color:#4e1736/);
  await expect(
    page.locator('[data-layer-id="rentalOffices"] .layer-icon'),
  ).toHaveAttribute("style", /--color:#eb7fb4/);
});
test("rename, reorder and collapse survive reload", async ({ page }) => {
  const card = page.locator('[data-layer-id="plu"]');
  await card.locator(".layer-rename").click();
  await card.locator("input[type=text]").fill("PLU personnalisé");
  await card.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await card.locator(".layer-drag").press("ArrowUp");
  const order = await page
    .locator(".layer-card")
    .evaluateAll((cards) => cards.map((x) => x.dataset.layerId));
  await card.locator(".layer-expand").click();
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(card.locator(".layer-name")).toHaveText("PLU personnalisé");
  await expect(card.locator(".layer-body")).toBeHidden();
  expect(
    await page
      .locator(".layer-card")
      .evaluateAll((cards) => cards.map((x) => x.dataset.layerId)),
  ).toEqual(order);
});
test("sources, downloads and mobile layout", async ({ page }) => {
  await page.locator("#sources-open").click();
  await expect(page.locator("#sources-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#sources-dialog")).not.toBeVisible();
  const response = await page.request.get("/data/suresnes-donnees.zip");
  expect(response.ok()).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
