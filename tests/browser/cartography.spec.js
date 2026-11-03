import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { distanceMeters } from "../../src/geometry.js";
const foodAmenities = JSON.parse(
  fs.readFileSync("public/data/food-amenities.geojson"),
).features;
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
  ).toHaveAttribute("fill", "#0055ff");
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
          ...foodAmenities
            .filter(
              (f) =>
                distanceMeters(
                  office.geometry.coordinates,
                  f.geometry.coordinates,
                ) <= distance,
            )
            .map((f) => f.id),
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
  await expect(marker).toHaveCount(rentalOffices.length);
  await expect(marker.locator(".address-pin-shape")).toHaveCount(
    rentalOffices.length,
  );
  await expect(marker.locator(".rental-pin-dot")).toHaveCount(
    rentalOffices.length,
  );
  await expect(marker.locator(".rental-pin-dot").first()).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  expect(await marker.locator(".address-pin-label").allTextContents()).toEqual(
    Array(rentalOffices.length).fill(""),
  );
  await expect(
    page.locator('.map-pin.rentalOffice .pin-disc[style*="#2376b7"]'),
  ).toHaveCount(rentalOffices.length);
  await expect(marker.first()).toHaveCSS("margin-left", "-1px");
  await expect(marker.first()).toHaveCSS("margin-top", "-39px");
  await expect(
    marker.first().locator(".address-pin-shape path"),
  ).toHaveAttribute("d", /L1 39V9/);
  const targeted = page.locator(".map-pin.office");
  await expect(targeted).toHaveCount(5);
  await expect(targeted.locator(".address-pin-shape")).toHaveCount(5);
  await expect(targeted.first()).toHaveCSS("margin-left", "-1px");
  await expect(targeted.first()).toHaveCSS("margin-top", "-39px");
  await expect(
    targeted.first().locator(".address-pin-shape path"),
  ).toHaveAttribute("d", /L1 39V9/);
  await toggle.uncheck();
  await expect(marker).toHaveCount(0);
  await toggle.check();
  await expect(marker).toHaveCount(rentalOffices.length);
  await page.locator('[data-layer-id="rentalOffices"] .layer-expand').click();
  await page.locator(".rental-address-list summary").click();
  await page.locator("[data-rental-id]").first().click();
  await expect(page.locator(".leaflet-popup-content")).toContainText(
    /BUREAUXLOCAUX/i,
  );
  await expect(page.locator(".leaflet-popup-content")).toContainText(
    "Loyer affiché",
  );
  await expect(page.locator(".leaflet-popup-content")).not.toContainText(
    "Repérage vert",
  );
  await expect(page.locator(".leaflet-popup-content")).toContainText(
    "03/11/2026",
  );
  await expect(
    page.locator(
      ".leaflet-popup-content a[href*='bureauxlocaux.com/annonce/']",
    ),
  ).toHaveCount(1);
});
test("refreshed rentals expose the new addresses and all four new listings", async ({
  page,
}) => {
  await page.locator('[data-layer-id="rentalOffices"] .layer-expand').click();
  await expect(page.locator('[data-layer-id="rentalOffices"]')).toContainText(
    "27 annonces · 19 adresses",
  );
  await page.locator(".rental-address-list summary").click();
  for (const [address, ids] of [
    ["30 Rue Pasteur", ["43005791", "36749298"]],
    ["24 Rue des Moulineaux", ["38689730"]],
    ["7 Rue Frédéric Clavel", ["38262835"]],
  ]) {
    await page.locator("[data-rental-id]").filter({ hasText: address }).click();
    await expect(page.locator(".leaflet-popup:visible")).toHaveCount(1);
    for (const id of ids)
      await expect(
        page.locator(
          `.leaflet-popup:visible .leaflet-popup-content a[href$="--${id}"]`,
        ),
      ).toHaveCount(1);
    if (address.startsWith("7 "))
      await expect(
        page.locator(".leaflet-popup:visible .leaflet-popup-content"),
      ).toContainText("Plage de numéros : point représentatif au numéro 7");
  }
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
test("office retention matches the city boundary stroke in fluorescent yellow", async ({
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
  await expect(outline).toHaveAttribute("stroke", "#ffff00");
  await expect(center).toHaveAttribute("stroke", "#ffff00");
  await expect(outline).toHaveAttribute("stroke-width", "2");
  await expect(center).toHaveAttribute("stroke-width", "2");
  await expect(outline).toHaveAttribute("stroke-dasharray", /5[ ,]5/);
  await expect(center).toHaveAttribute("stroke-dasharray", /5[ ,]5/);
  const city = page.locator("path.city-boundary").first();
  for (const attribute of [
    "stroke-width",
    "stroke-dasharray",
    "stroke-linecap",
    "stroke-linejoin",
    "fill",
  ]) {
    await expect(center).toHaveAttribute(
      attribute,
      await city.getAttribute(attribute),
    );
  }
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
  ).toHaveCount(rentalOffices.length - 2);
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(
    page.locator('.map-pin.rentalOffice .pin-disc[style*="#ffcc00"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.map-pin.rentalOffice .pin-disc[style*="#9933ff"]'),
  ).toHaveCount(1);
});
test("previous rental colors reset once without erasing targeted-office colors", async ({
  page,
}) => {
  await page.evaluate(
    ({ officeId, rentalId }) => {
      localStorage.removeItem("suresnes-v2-rental-marker-blue-reset-v1");
      localStorage.setItem(
        "suresnes-v2-office-marker-colors",
        JSON.stringify({
          [`office:${officeId}`]: "#8844ff",
          [`rentalOffice:${rentalId}`]: "#007f3f",
        }),
      );
    },
    { officeId: offices[0].id, rentalId: rentalOffices[0].id },
  );
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(
    page.locator('.map-pin.rentalOffice .pin-disc[style*="#2376b7"]'),
  ).toHaveCount(rentalOffices.length);
  await expect(
    page.locator('.map-pin.office .pin-disc[style*="#8844ff"]'),
  ).toHaveCount(1);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("suresnes-v2-office-marker-colors")),
  );
  expect(Object.keys(saved)).toEqual([`office:${offices[0].id}`]);
});
test("targeted-office markers are solid purple and reset previous colors once", async ({
  page,
}) => {
  await page.evaluate(
    ({ officeId, rentalId }) => {
      localStorage.removeItem("suresnes-v2-targeted-marker-purple-reset-v1");
      localStorage.setItem(
        "suresnes-v2-office-marker-colors",
        JSON.stringify({
          [`office:${officeId}`]: "#007f3f",
          [`rentalOffice:${rentalId}`]: "#9933ff",
        }),
      );
    },
    { officeId: offices[0].id, rentalId: rentalOffices[0].id },
  );
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  const purple = page.locator(
    '.map-pin.office .address-pin-shape path[fill="#d72e83"]',
  );
  await expect(purple).toHaveCount(5);
  await expect(page.locator(".map-pin.office linearGradient")).toHaveCount(0);
  await expect(
    page.locator('.map-pin.rentalOffice .pin-disc[style*="#9933ff"]'),
  ).toHaveCount(1);
  await page.locator(".office-item").nth(2).click();
  const popup = page.locator(".leaflet-popup:visible");
  await expect(popup).not.toContainText("Repérage vert");
  await expect(popup.locator("input[data-marker-color]")).toHaveValue(
    "#d72e83",
  );
  await popup.locator("input[data-marker-color]").fill("#88cc33");
  await expect(purple).toHaveCount(4);
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(
    page.locator('.map-pin.office .address-pin-shape path[fill="#88cc33"]'),
  ).toHaveCount(1);
  await page.locator(".office-item").nth(2).click();
  await page
    .locator(".leaflet-popup:visible button[data-marker-color-reset]")
    .click();
  await expect(purple).toHaveCount(5);
  await expect(page.locator(".map-pin.office linearGradient")).toHaveCount(0);
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
test("food amenities have independent filters and market source popups", async ({
  page,
}) => {
  await page.locator("#layer-neighborhood").check();
  await page.locator('[data-layer-id="neighborhood"] .layer-expand').click();
  await expect(page.locator(".map-pin.grocery")).toHaveCount(23);
  await expect(page.locator(".map-pin.supermarket")).toHaveCount(7);
  await expect(page.locator(".map-pin.market")).toHaveCount(2);
  await page.locator('[data-category="grocery"]').click();
  await expect(page.locator(".map-pin.grocery")).toHaveCount(0);
  await expect(page.locator(".map-pin.supermarket")).toHaveCount(7);
  await expect(page.locator(".map-pin.market")).toHaveCount(2);
  await page.locator('[data-category="grocery"]').click();
  await page.locator("#layer-rentalOffices").uncheck();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.locator('.map-pin.market[title="Marché Zola"]').click();
  await expect(page.locator(".leaflet-popup-content")).toContainText(
    "Mercredi et samedi matin",
  );
  await expect(page.locator(".leaflet-popup-content")).toContainText(
    "Place du Général Leclerc",
  );
  await expect
    .poll(async () => {
      const box = await page.locator(".leaflet-popup").boundingBox();
      const map = await page.locator("#map").boundingBox();
      return box.y >= map.y && box.y + box.height <= map.y + map.height;
    })
    .toBe(true);
  await expect(
    page.locator(
      '.leaflet-popup-content a[href="https://www.suresnes-tourisme.com/un-samedi-au-marche.html"]',
    ),
  ).toHaveCount(1);
  const response = await page.request.get("/data/food-amenities.geojson");
  expect(response.ok()).toBe(true);
  expect((await response.json()).features).toHaveLength(32);
});
test("rental surface filter uses reviewed totals, inclusive bounds and independent layer controls", async ({
  page,
}) => {
  const min = page.locator("#rental-surface-min");
  const max = page.locator("#rental-surface-max");
  const pins = page.locator(".map-pin.rentalOffice");
  await expect(pins).toHaveCount(19);
  const view = await page.evaluate(() => window.suresnesDiagnostics());
  await min.fill("1387");
  await max.fill("1387");
  await expect(pins).toHaveCount(1);
  await expect(page.locator("#rental-surface-count")).toHaveText(
    "1 / 19 adresses · 2 annonces",
  );
  const after = await page.evaluate(() => window.suresnesDiagnostics());
  expect(after.center).toEqual(view.center);
  expect(after.zoom).toEqual(view.zoom);
  expect(after.counts.offices).toBe(5);
  await page.locator('[data-layer-id="rentalOffices"] .layer-expand').click();
  await page.locator(".rental-address-list summary").click();
  await expect(page.locator("[data-rental-id]:visible")).toHaveCount(1);
  await page.locator("[data-rental-id]:visible").click();
  await expect(page.locator(".leaflet-popup:visible")).toHaveCount(1);
  await expect(page.locator(".leaflet-popup:visible")).toContainText(
    "1 387 m²",
  );
  await expect(page.locator(".rental-surface-note:visible")).toContainText(
    "Cumul de lots distincts",
  );
  await min.fill("2000");
  await expect(page.locator("#rental-surface-error")).toContainText(
    "filtre précédent",
  );
  await expect(pins).toHaveCount(1);
  await min.fill("1388");
  await max.fill("1400");
  await expect(pins).toHaveCount(0);
  await expect(page.locator("#rental-surface-empty")).toBeVisible();
  await page.locator("#rental-surface-reset").click();
  await expect(min).toHaveValue("");
  await expect(max).toHaveValue("");
  await expect(pins).toHaveCount(19);
  await min.fill("1000");
  await max.fill("1500");
  await expect(pins).toHaveCount(5);
  await page.locator("#layer-rentalOffices").uncheck();
  await expect(pins).toHaveCount(0);
  await expect(page.locator("#rental-surface-count")).toContainText(
    "couche masquée",
  );
  await page.locator("#layer-rentalOffices").check();
  await expect(pins).toHaveCount(5);
  await page.locator(".office-item").first().click();
  await expect(pins).toHaveCount(5);
  expect((await page.evaluate(() => window.suresnesDiagnostics())).radius).toBe(
    true,
  );
  await page.locator("#clear-radius").click();
  await expect(pins).toHaveCount(5);
  await page.setViewportSize({ width: 390, height: 844 });
  await min.scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await max.fill("1200");
  await expect(pins).toHaveCount(2);
  await page.locator("#rental-surface-reset").click();
  await expect(pins).toHaveCount(19);
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(min).toHaveValue("");
});

test("surface filter explicitly handles a missing advertised area", async ({
  page,
}) => {
  await page.route("**/data/rental-offices.geojson", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.features[0].properties.listings[0].surface_display = "Nous consulter";
    await route.fulfill({ response, json: data });
  });
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(page.locator(".map-pin.rentalOffice")).toHaveCount(19);
  await page.locator("#rental-surface-min").fill("0");
  await expect(page.locator(".map-pin.rentalOffice")).toHaveCount(18);
  await expect(page.locator("#rental-surface-count")).toContainText(
    "1 sans surface exclue(s)",
  );
  await page.locator("#rental-surface-reset").click();
  await expect(page.locator(".map-pin.rentalOffice")).toHaveCount(19);
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
