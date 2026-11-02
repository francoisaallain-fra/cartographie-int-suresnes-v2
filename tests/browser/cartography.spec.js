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
const excludedAmenityIds = new Set(
  JSON.parse(fs.readFileSync("public/data/amenity-review.json"))
    .entries.filter((entry) => entry.decision === "exclude")
    .map((entry) => entry.id),
);
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#loading")).toBeHidden();
  await expect(page.locator(".layer-card")).toHaveCount(12);
});
test("opening layer layout matches the supplied MOS view", async ({ page }) => {
  const expectedOrder = [
    "transport",
    "offices",
    "rentalOffices",
    "pluOfficeRetention",
    "mosPavilion",
    "mosCollective",
    "mosActivities",
    "mixedBuildings",
    "mosOffices",
    "plu",
    "equipment",
    "neighborhood",
  ];
  const order = () =>
    page
      .locator(".layer-card")
      .evaluateAll((cards) => cards.map((card) => card.dataset.layerId));
  expect(await order()).toEqual(expectedOrder);
  for (const id of [
    "mosPavilion",
    "mosCollective",
    "mosActivities",
    "transport",
    "offices",
    "rentalOffices",
    "pluOfficeRetention",
  ])
    await expect(page.locator(`#layer-${id}`)).toBeChecked();
  for (const id of [
    "mixedBuildings",
    "mosOffices",
    "plu",
    "equipment",
    "neighborhood",
  ])
    await expect(page.locator(`#layer-${id}`)).not.toBeChecked();
  for (const [id, opacity] of [
    ["mosPavilion", "55"],
    ["mosCollective", "55"],
    ["mosActivities", "50"],
    ["mosOffices", "100"],
  ])
    await expect(page.locator(`#layerOpacity-${id}`)).toHaveValue(opacity);
  await expect(
    page.locator(".leaflet-data-mosActivities-pane path").first(),
  ).toHaveAttribute("fill", "#1f6fb2");
  await expect(
    page.locator(".leaflet-data-mosActivities-pane path").first(),
  ).toHaveAttribute("fill-opacity", "0.5");
  await page.evaluate(() => {
    localStorage.setItem(
      "suresnes-v2-layer-order",
      JSON.stringify(["plu", "mosOffices"]),
    );
    localStorage.setItem(
      "suresnes-v2-layer-order-v2",
      JSON.stringify(["mosPavilion", "mosCollective", "mosActivities"]),
    );
    localStorage.removeItem("suresnes-v2-layer-order-v3");
  });
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  expect(await order()).toEqual(expectedOrder);
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
    await expect(card.locator(".layer-body")).toBeVisible();
    await expect(checkbox).toBeVisible();
    await expect(card.locator(".layer-drag")).toBeVisible();
    await card.locator(".layer-expand").click();
    await expect(card.locator(".layer-body")).toBeHidden();
    await checkbox.setChecked(initial);
  }
});
test("a new session starts with every layer collapsed", async ({
  page,
  context,
}) => {
  await expect(
    page.locator('.layer-expand[aria-expanded="false"]'),
  ).toHaveCount(12);
  await expect(page.locator(".layer-body:not([hidden])")).toHaveCount(0);
  await page.locator('[data-layer-id="plu"] .layer-expand').click();
  await page.reload();
  await expect(page.locator('[data-layer-id="plu"] .layer-body')).toBeVisible();
  const newSession = await context.newPage();
  await newSession.goto("/");
  await expect(newSession.locator("#loading")).toBeHidden();
  await expect(
    newSession.locator('.layer-expand[aria-expanded="false"]'),
  ).toHaveCount(12);
  await expect(newSession.locator(".layer-body:not([hidden])")).toHaveCount(0);
  await newSession.close();
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
          ...radii.offices[office.id][distance].nearby
            .filter((x) => !excludedAmenityIds.has(x.id))
            .map((x) => x.id),
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
test("station circles accumulate and toggle off individually", async ({
  page,
}) => {
  const stations = JSON.parse(
    fs.readFileSync("public/data/transport.geojson"),
  ).features;
  for (let i = 0; i < stations.length; i++) {
    const before = await page.evaluate(() => window.suresnesDiagnostics());
    if (i === 0) await page.locator(".map-pin.transport").first().click();
    else
      await page
        .locator(".map-pin.transport")
        .nth(i)
        .evaluate((el) => el.click());
    const snapshot = await page.evaluate(() => window.suresnesDiagnostics());
    expect(snapshot.center).toEqual(before.center);
    expect(snapshot.zoom).toBe(before.zoom);
    expect(snapshot.selectedStations).toEqual(
      stations.slice(0, i + 1).map((station) => station.id),
    );
    expect(Object.values(snapshot.stationRadiusMeters)).toEqual(
      Array(i + 1).fill(500),
    );
    await expect(page.locator(".station-radius")).toHaveCount(i + 1);
    await expect(page.locator(".station-radius").last()).toHaveAttribute(
      "stroke",
      "#ffffff",
    );
    await expect(page.locator(".station-radius").last()).toHaveAttribute(
      "fill",
      "none",
    );
  }
  await expect(page.locator("#map-context")).toContainText("6 gares");
  await page
    .locator(".map-pin.transport")
    .nth(1)
    .evaluate((el) => el.click());
  let snapshot = await page.evaluate(() => window.suresnesDiagnostics());
  expect(snapshot.selectedStations).not.toContain(stations[1].id);
  expect(snapshot.selectedStations).toHaveLength(5);
  await expect(page.locator(".station-radius")).toHaveCount(5);
  await page
    .locator(".map-pin.transport")
    .nth(1)
    .evaluate((el) => el.click());
  await expect(page.locator(".station-radius")).toHaveCount(6);
  await page.locator("#map").click({ position: { x: 300, y: 300 } });
  await expect(page.locator(".station-radius")).toHaveCount(6);
  await page.locator('[data-layer-id="transport"] .layer-expand').click();
  await page.locator("#layerOpacity-transport").fill("50");
  await expect(page.locator(".station-radius").first()).toHaveAttribute(
    "stroke-opacity",
    "0.5",
  );
  await expect(page.locator(".station-radius").last()).toHaveAttribute(
    "stroke-opacity",
    "0.5",
  );
  await page.locator(".office-item").last().click();
  snapshot = await page.evaluate(() => window.suresnesDiagnostics());
  expect(snapshot.selected).toBe(offices.at(-1).id);
  expect(snapshot.selectedStations).toHaveLength(6);
  await page.locator("#clear-radius").click();
  expect(
    (await page.evaluate(() => window.suresnesDiagnostics())).selectedStations,
  ).toHaveLength(6);
  await page.locator("#layer-transport").uncheck();
  await expect(page.locator(".station-radius")).toHaveCount(0);
  await page.locator("#layer-transport").check();
  snapshot = await page.evaluate(() => window.suresnesDiagnostics());
  expect(snapshot.selectedStations).toEqual([]);
  expect(snapshot.stationRadiusMeters).toEqual({});
});
test("rental listings have their own layer and linked popup", async ({
  page,
}) => {
  const toggle = page.locator("#layer-rentalOffices");
  await expect(toggle).toBeChecked();
  const marker = page.locator(".map-pin.rentalOffice");
  await expect(marker).toHaveCount(16);
  await expect(marker.locator(".rental-pin-shape")).toHaveCount(16);
  await expect(marker.first()).toHaveCSS("margin-left", "-1px");
  await expect(marker.first()).toHaveCSS("margin-top", "-39px");
  await expect(
    marker.first().locator(".rental-pin-shape path"),
  ).toHaveAttribute("d", /L1 39V9/);
  await expect(page.locator(".map-pin.office .rental-pin-shape")).toHaveCount(
    0,
  );
  await toggle.uncheck();
  await expect(marker).toHaveCount(0);
  await toggle.check();
  await expect(marker).toHaveCount(16);
  await page.locator('[data-layer-id="rentalOffices"] .layer-expand').click();
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
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`office popups fit inside the map at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.locator("#loading")).toBeHidden();
    const expectPopupInsideMap = async () => {
      await expect
        .poll(() =>
          page.evaluate((isMobile) => {
            const map = document.querySelector("#map").getBoundingClientRect();
            const popup = document
              .querySelector(".leaflet-popup")
              ?.getBoundingClientRect();
            return (
              popup &&
              popup.left >= map.left + 12 &&
              popup.right <= map.right - 12 &&
              popup.top >= map.top + (isMobile ? 104 : 12) &&
              popup.bottom <= map.bottom - 12
            );
          }, viewport.width <= 720),
        )
        .toBe(true);
    };
    for (let i = 0; i < offices.length; i++) {
      await page.locator(".office-item").nth(i).click();
      await expectPopupInsideMap();
    }
    await page.locator("#clear-radius").click();
    await page
      .locator(".map-pin.office")
      .first()
      .evaluate((el) => el.click());
    await expectPopupInsideMap();
    await page.locator("#clear-radius").click();
    await page
      .locator(".map-pin.rentalOffice")
      .first()
      .evaluate((el) => el.click());
    await expectPopupInsideMap();
    await page.locator('[data-layer-id="rentalOffices"] .layer-expand').click();
    await page.locator(".rental-address-list summary").click();
    await page.locator('[data-rental-id="rental-92073_4121_00022"]').click();
    await expectPopupInsideMap();
    if (viewport.width <= 720)
      await expect
        .poll(() =>
          page.evaluate(() => {
            const popup = document
              .querySelector(".leaflet-popup")
              .getBoundingClientRect();
            return popup.top >= 0 && popup.bottom <= window.innerHeight;
          }),
        )
        .toBe(true);
  });
}
test("office retention has a thin bright red dotted boundary", async ({
  page,
}) => {
  const outline = page
    .locator(
      ".leaflet-data-pluOfficeRetention-pane path.office-retention-outline",
    )
    .first();
  const center = page
    .locator(
      ".leaflet-data-pluOfficeRetention-pane path.office-retention-center",
    )
    .first();
  await expect(outline).toHaveAttribute("fill", "none");
  await expect(center).toHaveAttribute("fill", "none");
  await expect(outline).toHaveAttribute("stroke", "#ff0000");
  await expect(center).toHaveAttribute("stroke", "#ff0000");
  await expect(outline).toHaveAttribute("stroke-width", "3");
  await expect(center).toHaveAttribute("stroke-width", "2");
  await expect(outline).toHaveAttribute("stroke-dasharray", /1[ ,]8/);
  await expect(center).toHaveAttribute("stroke-dasharray", /1[ ,]8/);
  await expect(outline).not.toHaveClass(/leaflet-interactive/);
  await expect(center).toHaveClass(/leaflet-interactive/);
  await page
    .locator('[data-layer-id="pluOfficeRetention"] .layer-expand')
    .click();
  await page.locator("#layerOpacity-pluOfficeRetention").fill("50");
  await expect(outline).toHaveAttribute("stroke-opacity", "0.5");
  await expect(center).toHaveAttribute("stroke-opacity", "0.5");
  await page.locator("#layer-pluOfficeRetention").uncheck();
  await expect(outline).toHaveCount(0);
  await expect(center).toHaveCount(0);
  await page.locator("#layer-pluOfficeRetention").check();

  await expect(
    page.locator(".map-pin.office .pin-disc").first(),
  ).toHaveAttribute("style", /--color:#d72e83/);
  await expect(
    page.locator(".map-pin.rentalOffice .pin-disc").first(),
  ).toHaveAttribute("style", /--color:#2376b7;color:#ffffff/);
  await expect(
    page.locator('[data-layer-id="rentalOffices"] .layer-icon'),
  ).toHaveAttribute("style", /--color:#2376b7/);
});
test("PLU starts hidden and each office marker keeps its own chosen color", async ({
  page,
}) => {
  const plu = page.locator("#layer-plu");
  await expect(plu).not.toBeChecked();
  await plu.check();
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(plu).not.toBeChecked();

  await page.locator(".office-item").first().click();
  await page
    .locator(".leaflet-popup:visible input[data-marker-color]")
    .fill("#88cc33");
  await expect(
    page.locator('.map-pin.office .pin-disc[style*="#88cc33"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.map-pin.office .pin-disc[style*="#d72e83"]'),
  ).toHaveCount(2);
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(
    page.locator('.map-pin.office .pin-disc[style*="#88cc33"]'),
  ).toHaveCount(1);
  await page.locator(".office-item").first().click();
  await expect(
    page.locator(".leaflet-popup:visible input[data-marker-color]"),
  ).toHaveValue("#88cc33");
  await page
    .locator(".leaflet-popup:visible button[data-marker-color-reset]")
    .click();
  await expect(
    page.locator('.map-pin.office .pin-disc[style*="#88cc33"]'),
  ).toHaveCount(0);

  await page.locator('[data-layer-id="rentalOffices"] .layer-expand').click();
  await page.locator(".rental-address-list summary").click();
  await page.locator("[data-rental-id]").first().click();
  await expect(page.locator(".leaflet-popup:visible")).toHaveCount(1);
  await page
    .locator(".leaflet-popup:visible input[data-marker-color]")
    .fill("#ffcc00");
  await page.locator("[data-rental-id]").nth(1).click();
  await expect(page.locator(".leaflet-popup:visible")).toHaveCount(1);
  await page
    .locator(".leaflet-popup:visible input[data-marker-color]")
    .fill("#9933ff");
  await expect(
    page.locator('.map-pin.rentalOffice .pin-disc[style*="#ffcc00"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.map-pin.rentalOffice .pin-disc[style*="#9933ff"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.map-pin.rentalOffice .pin-disc[style*="#2376b7"]'),
  ).toHaveCount(10);
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(
    page.locator('.map-pin.rentalOffice .pin-disc[style*="#ffcc00"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.map-pin.rentalOffice .pin-disc[style*="#9933ff"]'),
  ).toHaveCount(1);
});
test("green office markers meet both spatial criteria and can be recolored", async ({
  page,
}) => {
  await expect(
    page.locator('.map-pin.office .pin-disc[style*="#007f3f"]'),
  ).toHaveCount(2);
  await expect(
    page.locator('.map-pin.rentalOffice .pin-disc[style*="#007f3f"]'),
  ).toHaveCount(4);
  await expect(
    page.locator('.map-pin.office .pin-disc[style*="#007f3f"]').first(),
  ).toHaveCSS("color", "rgb(255, 255, 255)");
  await page.locator(".office-item").nth(2).click();
  const popup = page.locator(".leaflet-popup:visible");
  await expect(popup).toContainText("Les Coteaux");
  await expect(popup).toContainText("hors du périmètre cartographié");
  await expect(popup.locator("input[data-marker-color]")).toHaveValue(
    "#007f3f",
  );
  await popup.locator("input[data-marker-color]").fill("#88cc33");
  await expect(
    page.locator('.map-pin.office .pin-disc[style*="#007f3f"]'),
  ).toHaveCount(1);
  await popup.locator("button[data-marker-color-reset]").click();
  await expect(
    page.locator('.map-pin.office .pin-disc[style*="#007f3f"]'),
  ).toHaveCount(2);
});
test("rename, reorder and collapse survive reload", async ({ page }) => {
  const card = page.locator('[data-layer-id="plu"]');
  await card.locator(".layer-expand").click();
  await card.locator(".layer-rename").click();
  await card.locator("input[type=text]").fill("PLU personnalisé");
  await card.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await card.locator(".layer-drag").press("ArrowUp");
  const order = await page
    .locator(".layer-card")
    .evaluateAll((cards) => cards.map((x) => x.dataset.layerId));
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(card.locator(".layer-name")).toHaveText("PLU personnalisé");
  await expect(card.locator(".layer-body")).toBeVisible();
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
