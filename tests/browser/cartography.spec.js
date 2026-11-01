import { test, expect } from "@playwright/test";
import fs from "node:fs";
const radii = JSON.parse(fs.readFileSync("public/data/radii.json"));
const offices = JSON.parse(
  fs.readFileSync("public/data/offices.geojson"),
).features;
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#loading")).toBeHidden();
  await expect(page.locator(".layer-card")).toHaveCount(11);
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
test("all 60 radius scenarios preserve the original visible points", async ({
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
        ].sort(),
      );
      if (distance < 1000)
        await page.locator("#radius-range").press("ArrowRight");
    }
    await page.locator("#clear-radius").click();
    await expect(page.locator("#radius-panel")).toBeHidden();
  }
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
