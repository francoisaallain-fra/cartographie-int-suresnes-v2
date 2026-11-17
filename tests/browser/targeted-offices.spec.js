import { test, expect } from "@playwright/test";
const feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [2.222938, 48.867021] },
  properties: {
    id: "92073_1495_00010",
    name: "10 Rue Chevreul",
    label: "10 Rue Chevreul 92150 Suresnes",
    citycode: "92073",
    type: "housenumber",
  },
};
const customId = "ban-92073_1495_00010";
const diag = (page) => page.evaluate(() => window.suresnesDiagnostics());
test.beforeEach(async ({ page }) => {
  await page.route("https://data.geopf.fr/geocodage/search**", (route) =>
    route.fulfill({ json: { type: "FeatureCollection", features: [feature] } }),
  );
  await page.goto("/");
  await expect(page.locator("#loading")).toBeHidden();
});
async function add(page) {
  await page
    .getByLabel("Ajouter une adresse à Suresnes")
    .fill("10 rue Chevreul");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Ajouter 10 Rue Chevreul 92150 Suresnes",
      exact: true,
    })
    .click();
}
test("add a chosen address, calculate amenities, persist and reject duplicates", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await add(page);
  await expect(page.locator(".office-item")).toHaveCount(6);
  expect((await diag(page)).selected).toBe(customId);
  await expect(page.locator("#radius-count")).toContainText(
    "aménités recensées",
  );
  for (const radius of [300, 1000]) {
    await page.locator("#radius-range").evaluate((el, value) => {
      el.value = value;
      el.dispatchEvent(new window.Event("input", { bubbles: true }));
    }, String(radius));
    await expect(page.locator("#radius-distance")).toHaveText(
      radius === 1000 ? "1 km" : "300 m",
    );
  }
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(page.locator(".office-item")).toHaveCount(6);
  await add(page);
  await expect(page.locator("#office-status")).toContainText("déjà partie");
  await expect(page.locator(".office-item")).toHaveCount(6);
  expect(errors).toEqual([]);
});
test("individual visibility survives reload and global layer toggles", async ({
  page,
}) => {
  const first = page.locator(".office-item").first();
  const id = await first.getAttribute("data-id");
  await first.click();
  await page.locator(`[data-office-toggle="${id}"]`).uncheck();
  expect((await diag(page)).selected).toBe(null);
  expect((await diag(page)).radius).toBe(false);
  expect((await diag(page)).pointIds).not.toContain(id);
  expect((await diag(page)).counts.offices).toBe(4);
  await expect(first).toBeDisabled();
  await page.locator("#layer-offices").uncheck();
  await page.locator("#layer-offices").check();
  expect((await diag(page)).pointIds).not.toContain(id);
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(page.locator(`[data-office-toggle="${id}"]`)).not.toBeChecked();
  expect((await diag(page)).counts.offices).toBe(4);
  await page.locator(`[data-office-toggle="${id}"]`).check();
  expect((await diag(page)).counts.offices).toBe(5);
});
test("unavailable geocoder keeps the baseline usable and permits retry", async ({
  page,
}) => {
  await page.unroute("https://data.geopf.fr/geocodage/search**");
  await page.route("https://data.geopf.fr/geocodage/search**", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page
    .getByLabel("Ajouter une adresse à Suresnes")
    .fill("10 rue Chevreul");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(page.locator("#office-status")).toContainText("indisponible");
  await expect(page.locator(".office-item")).toHaveCount(5);
  await page.unroute("https://data.geopf.fr/geocodage/search**");
  await page.route("https://data.geopf.fr/geocodage/search**", (route) =>
    route.fulfill({ json: { features: [] } }),
  );
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(page.locator("#office-status")).toContainText(
    "Aucune adresse précise",
  );
});
test("mobile address addition remains within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await add(page);
  await expect(page.locator(".office-item")).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator("#office-heading").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("suresnes-targeted-mobile.png"),
  });
});
test("storage errors are explicit and additions remain usable in session", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.Storage.prototype.setItem = () => {
      throw new Error("quota");
    };
  });
  await add(page);
  await expect(page.locator("#office-status")).toContainText(
    "session seulement",
  );
  expect((await diag(page)).pointIds).toContain(customId);
  await page.locator("#office-heading").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("suresnes-targeted-desktop.png"),
  });
});
