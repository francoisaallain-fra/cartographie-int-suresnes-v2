import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { distanceMeters } from "../../src/geometry.js";
const foodAmenities = JSON.parse(
  fs.readFileSync("public/data/food-amenities.geojson"),
).features.filter((f) => f.id !== "osm-node-7149725546");
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
  await expect(page.locator(".layer-card")).toHaveCount(13);
});
test("opening layer layout matches the supplied MOS view", async ({ page }) => {
  const expectedOrder = [
    "transport",
    "transportHubs",
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
    "transportHubs",
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
    ["mosActivities", "75"],
    ["mosOffices", "100"],
  ])
    await expect(page.locator(`#layerOpacity-${id}`)).toHaveValue(opacity);
  await expect(
    page.locator(".leaflet-data-mosActivities-pane path").first(),
  ).toHaveAttribute("fill", "#0080ff");
  await expect(
    page.locator(".leaflet-data-mosActivities-pane path").first(),
  ).toHaveAttribute("fill-opacity", "0.75");
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
  ).toHaveCount(13);
  await expect(page.locator(".layer-body:not([hidden])")).toHaveCount(0);
  await page.locator('[data-layer-id="plu"] .layer-expand').click();
  await page.reload();
  await expect(page.locator('[data-layer-id="plu"] .layer-body')).toBeVisible();
  const newSession = await context.newPage();
  await newSession.goto("/");
  await expect(newSession.locator("#loading")).toBeHidden();
  await expect(
    newSession.locator('.layer-expand[aria-expanded="false"]'),
  ).toHaveCount(13);
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
      const expectedAmenityCount =
        radii.offices[office.id][distance].nearby.filter(
          (item) => !excludedAmenityIds.has(item.id),
        ).length +
        foodAmenities.filter(
          (feature) =>
            distanceMeters(
              office.geometry.coordinates,
              feature.geometry.coordinates,
            ) <= distance,
        ).length;
      await expect(page.locator(".leaflet-popup-content")).toHaveCount(1);
      const rows = page.locator(".leaflet-popup-content .popup-row");
      await expect(rows.first()).toContainText("Surface");
      await expect(rows.nth(1)).toHaveText(
        `Aménités dans le rayon de ${distance === 1000 ? "1 km" : `${distance} m`}${expectedAmenityCount} recensées`,
      );
      await expect(page.locator("#radius-count")).toContainText(
        `${expectedAmenityCount} aménités recensées`,
      );
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
  await expect(
    marker.locator("svg, .address-pin-label, .rental-pin-dot"),
  ).toHaveCount(0);
  await expect(marker.locator(".pin-disc").first()).toHaveCSS(
    "background-color",
    "rgb(35, 118, 183)",
  );
  await expect(marker.locator(".pin-disc").first()).toHaveCSS("width", "20px");
  await expect(marker.locator(".pin-disc").first()).toHaveCSS("height", "20px");
  await expect(marker.locator(".pin-disc").first()).toHaveCSS(
    "border-radius",
    "50%",
  );
  await expect(marker.first()).toHaveCSS("margin-left", "-10px");
  await expect(marker.first()).toHaveCSS("margin-top", "-10px");
  await expect(
    page.locator('.map-pin.rentalOffice .pin-disc[style*="#2376b7"]'),
  ).toHaveCount(rentalOffices.length);
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
  const card = page.locator(".building-card");
  await expect(card).toHaveCount(1);
  await expect(card.locator(".popup-title")).toHaveText(
    rentalOffices[0].properties.address,
  );
  await expect(card).toContainText("350 m²");
  await expect(card).toContainText("Aménités dans le rayon de 500 m");
  await expect(card).not.toContainText(/Loyer|Statut|BUREAUXLOCAUX|Couleur/);
  await expect(card.locator("a, input, button")).toHaveCount(0);
});
test("rental cards show the reviewed areas at the correct address", async ({
  page,
}) => {
  await page.locator('[data-layer-id="rentalOffices"] .layer-expand').click();
  await expect(page.locator('[data-layer-id="rentalOffices"]')).toContainText(
    "27 annonces · 19 adresses",
  );
  await page.locator(".rental-address-list summary").click();
  for (const address of [
    "30 Rue Pasteur",
    "24 Rue des Moulineaux",
    "7 Rue Frédéric Clavel",
  ]) {
    await page.locator("[data-rental-id]").filter({ hasText: address }).click();
    const card = page.locator(".building-card");
    await expect(card).toHaveCount(1);
    await expect(card.locator(".popup-title")).toContainText(address);
    await expect(card).toContainText("Surface annoncée à l’adresse");
    await expect(card).toContainText("Aménités");
    if (address === "30 Rue Pasteur") {
      await expect(card).toContainText("1 387 m²");
      await expect(card).toContainText("cumul de lots distincts");
    }
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
test("PLU starts hidden and existing marker colors remain read-only", async ({
  page,
}) => {
  await page.locator("#layer-plu").check();
  await page.evaluate(
    ({ officeId, rentalId }) => {
      localStorage.setItem(
        "suresnes-v2-office-marker-colors",
        JSON.stringify({
          [`office:${officeId}`]: "#8844ff",
          [`rentalOffice:${rentalId}`]: "#9933ff",
        }),
      );
      localStorage.setItem(
        "suresnes-v2-marker-type-colors",
        JSON.stringify({ supermarket: "#1122cc", rentalOffice: "#ff0000" }),
      );
    },
    { officeId: offices[0].id, rentalId: rentalOffices[0].id },
  );
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(page.locator("#layer-plu")).not.toBeChecked();
  await expect(
    page.locator('.map-pin.office .pin-disc[style*="#8844ff"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.map-pin.rentalOffice .pin-disc[style*="#2376b7"]'),
  ).toHaveCount(rentalOffices.length);
  await page.locator("#layer-neighborhood").check();
  await expect(
    page.locator('.map-pin.supermarket .pin-disc[style*="#1122cc"]'),
  ).toHaveCount(16);
  await page.locator(".office-item").first().click();
  await expect(
    page.locator('.leaflet-popup input[type="color"], .marker-color-control'),
  ).toHaveCount(0);
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
  await expect(page.locator(".map-pin.grocery")).toHaveCount(6);
  await expect(page.locator(".map-pin.supermarket")).toHaveCount(16);
  await expect(page.locator(".map-pin.market")).toHaveCount(2);
  for (const [kind, color, count] of [
    ["grocery", "#ffc2c2", 6],
    ["supermarket", "#ff9e9e", 16],
  ]) {
    await expect(
      page.locator(`.map-pin.${kind} .pin-disc[style*="${color}"]`),
    ).toHaveCount(count);
    await expect(page.locator(`.map-pin.${kind} .pin-disc`).first()).toHaveCSS(
      "color",
      "rgb(117, 41, 41)",
    );
    await expect(
      page.locator(`[data-category="${kind}"] .legend-symbol`),
    ).toHaveAttribute("style", new RegExp(color));
  }

  await page.locator('[data-category="grocery"]').click();
  await expect(page.locator(".map-pin.grocery")).toHaveCount(0);
  await expect(page.locator(".map-pin.supermarket")).toHaveCount(16);
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
test("reviewed neighborhood filters, names and remaining doubts agree with the map", async ({
  page,
}) => {
  await page.locator("#layer-neighborhood").check();
  await page.locator('[data-layer-id="neighborhood"] .layer-expand').click();
  await expect(
    page.locator('.map-pin[title="Coccinelle Express"]'),
  ).toHaveCount(0);
  await expect(page.locator('.map-pin[title="Épicerie Carnot"]')).toHaveCount(
    0,
  );
  await expect(
    page.locator('.map-pin[title="RC – Alimentation Générale"]'),
  ).toHaveCount(1);
  await expect(
    page.locator(".leaflet-data-neighborhood-markers-pane .audit-question"),
  ).toHaveCount(6);
  for (const [kind, count] of [
    ["produce", 2],
    ["organic", 2],
    ["preparedFood", 2],
    ["stationShop", 1],
  ]) {
    await expect(page.locator(`.map-pin.${kind}`)).toHaveCount(count);
    await page.locator(`[data-category="${kind}"]`).click();
    await expect(page.locator(`.map-pin.${kind}`)).toHaveCount(0);
    await expect(page.locator(".map-pin.supermarket")).toHaveCount(16);
    await page.locator(`[data-category="${kind}"]`).click();
    await expect(page.locator(`.map-pin.${kind}`)).toHaveCount(count);
  }
  for (const [name, expected] of [
    ["RC – Alimentation Générale", ["33 rue Carnot", "1/3", "03/11/2026"]],
    [
      "Fin Gourmet",
      ["Magasin de plats préparés", "21 rue du Docteur-Marc-Bombiger"],
    ],
    [
      "Biocoop Suresnes Jaurès",
      ["17 avenue Édouard-Vaillant", "28 avenue Jean-Jaurès", "2/3"],
    ],
    ["Votre Marché", ["numéro non confirmé", "3/3", "octobre 2025"]],
    [
      "TotalEnergies – Relais Suresnes",
      ["Station-service avec boutique", "2/3"],
    ],
  ]) {
    await page.locator(`.map-pin[title="${name}"]`).press("Enter");
    await expect(page.locator(".leaflet-popup-content")).toHaveCount(1);
    for (const text of expected)
      await expect(page.locator(".leaflet-popup-content")).toContainText(text);
    await page.locator(".leaflet-popup-close-button").click();
    await expect(page.locator(".leaflet-popup-content")).toHaveCount(0);
  }
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
  await expect(page.locator(".building-surface-detail:visible")).toContainText(
    "cumul de lots distincts",
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

test("office amenity count ignores hidden layers and does not reopen a closed popup", async ({
  page,
}) => {
  await page.locator(`.office-item[data-id="${offices[0].id}"]`).click();
  const countRow = page.locator(".leaflet-popup-content .popup-row").nth(1);
  const originalCount = await countRow.textContent();
  await page.locator("#layer-neighborhood").uncheck();
  await page.locator(".map-pin.office").first().press("Enter");
  await expect(page.locator(".leaflet-popup-content")).toHaveCount(1);
  await expect(countRow).toHaveText(originalCount);
  await page.locator(".leaflet-popup-close-button").click();
  await expect(page.locator(".leaflet-popup-content")).toHaveCount(0);
  await page.locator("#radius-range").press("ArrowRight");
  await expect(page.locator(".leaflet-popup-content")).toHaveCount(0);
});

test("no point category exposes marker color editing", async ({ page }) => {
  await page.locator("#layer-equipment").check();
  await page.locator("#layer-neighborhood").check();
  const types = [
    "nursery",
    "primary",
    "college",
    "lycee",
    "health",
    "pharmacy",
    "bakery",
    "tea",
    "grocery",
    "supermarket",
    "market",
    "produce",
    "organic",
    "preparedFood",
    "stationShop",
    "office",
    "rentalOffice",
    "transport",
  ];
  for (const type of types) {
    await page.locator(`.map-pin.${type}`).first().press("Enter");
    const popup = page.locator(".leaflet-popup:visible");
    await expect(popup).toHaveCount(1);
    await expect(
      popup.locator(
        'input[type="color"], [data-marker-color], [data-marker-type-color]',
      ),
    ).toHaveCount(0);
    await popup.locator(".leaflet-popup-close-button").click();
  }
});

test("sidebar resizes, collapses and restores without breaking the map", async ({
  page,
}) => {
  const sidebar = page.locator("#sidebar");
  const handle = page.getByRole("separator", {
    name: "Largeur du panneau des couches",
  });
  await handle.focus();
  await page.keyboard.press("End");
  await expect(handle).toHaveAttribute("aria-valuenow", "560");
  expect((await sidebar.boundingBox()).width).toBe(560);
  await page.keyboard.press("Home");
  expect((await sidebar.boundingBox()).width).toBe(240);
  const grip = await handle.boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + 250);
  await page.mouse.down();
  await page.mouse.move(420, grip.y + 250, { steps: 8 });
  await page.mouse.up();
  await expect(handle).toHaveAttribute("aria-valuenow", "420");
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  expect((await sidebar.boundingBox()).width).toBe(420);
  const mapBefore = await page.locator("#map").boundingBox();
  await page
    .getByRole("button", {
      name: "Réduire le panneau des couches",
      exact: true,
    })
    .click();
  await expect(sidebar).toBeHidden();
  expect((await page.locator("#map").boundingBox()).width).toBeGreaterThan(
    mapBefore.width + 400,
  );
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(sidebar).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sidebar).toBeVisible();
  await expect(handle).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(sidebar).toBeHidden();
  await page
    .getByRole("button", {
      name: "Agrandir le panneau des couches",
      exact: true,
    })
    .click();
  await expect(sidebar).toBeVisible();
  expect((await sidebar.boundingBox()).width).toBe(420);
  await page.locator(".leaflet-control-zoom-in").click();
  await expect(page.locator(".map-pin.office")).toHaveCount(5);
});

test("pastilles shrink on zoom while their geographic anchor stays fixed", async ({
  page,
}) => {
  const read = () =>
    page
      .locator(".map-pin.office")
      .first()
      .evaluate((marker) => {
        const body = marker.querySelector(".marker-visual");
        const box = body.getBoundingClientRect();
        const pin = marker.getBoundingClientRect();
        const scale = new window.DOMMatrix(
          window.getComputedStyle(body).transform,
        ).a;
        return {
          scale,
          width: box.width,
          anchorX: box.left + scale - pin.left,
          anchorY: box.top + 39 * scale - pin.top,
        };
      });
  const before = await read();
  const initialZoom = await page.evaluate(
    () => window.suresnesDiagnostics().zoom,
  );
  for (let i = 0; i < 4; i++) {
    await page.locator(".leaflet-control-zoom-in").click();
    await expect
      .poll(() => page.evaluate(() => window.suresnesDiagnostics().zoom))
      .toBe(initialZoom + (i + 1) * 0.5);
    await expect(page.locator(".leaflet-map-pane")).not.toHaveClass(
      /leaflet-zoom-anim/,
    );
  }
  const after = await read();
  expect(after.width).toBeLessThan(before.width * 0.92);
  expect(after.scale).toBeGreaterThanOrEqual(0.72);
  expect(after.anchorX).toBeCloseTo(1, 2);
  expect(after.anchorY).toBeCloseTo(39, 2);
  await page.locator(".office-item").first().click();
  await expect(page.locator(".leaflet-popup-content")).toHaveCount(1);
});

test("independent hub layer shows six exact 500 metre circles", async ({
  page,
}) => {
  const stations = JSON.parse(
    fs.readFileSync("public/data/transport.geojson"),
  ).features;
  await expect(page.locator(".hub-radius")).toHaveCount(0);
  await page.locator("#layer-transportHubs").check();
  await expect(page.locator(".hub-radius")).toHaveCount(6);
  const circles = await page.evaluate(
    () => window.suresnesDiagnostics().hubRadii,
  );
  expect(circles).toEqual(
    stations.map((f) => ({ center: f.geometry.coordinates, radius: 500 })),
  );
  await page.locator("#layer-transport").uncheck();
  await expect(page.locator(".hub-radius")).toHaveCount(6);
  await page.locator(".office-item").first().click();
  await expect(page.locator(".hub-radius")).toHaveCount(6);
  await page.locator('[data-layer-id="transportHubs"] .layer-expand').click();
  await page.locator("#layerOpacity-transportHubs").fill("40");
  await expect(page.locator(".hub-radius").first()).toHaveAttribute(
    "stroke-opacity",
    "0.4",
  );
  await page.locator("#layerOpacity-transportHubs").fill("0");
  await expect(page.locator(".hub-radius").last()).toHaveAttribute(
    "stroke-opacity",
    "0",
  );
  await page.locator("#hide-all").click();
  await expect(page.locator(".hub-radius")).toHaveCount(0);
  await page.locator("#layer-transportHubs").check();
  await page.locator("#layerOpacity-transportHubs").fill("100");
  await expect(page.locator(".hub-radius")).toHaveCount(6);
  await expect(page.locator("#layer-transport")).not.toBeChecked();
  await page.locator("#layer-transportHubs").uncheck();
  await expect(page.locator(".hub-radius")).toHaveCount(0);
});

test("compact building cards show address, reviewed facade, areas and amenities on desktop and mobile", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.locator("#loading")).toBeHidden();
    for (let i = 0; i < offices.length; i++) {
      await page.locator(".office-item").nth(i).click();
      const card = page.locator(".building-card");
      await expect(card).toHaveCount(1);
      await expect(card.locator(".popup-title")).toHaveText(
        offices[i].properties.address,
      );
      await expect(card.locator("section")).toHaveCount(2);
      await expect(card.locator(".building-facade")).toHaveCount(
        [0, 1, 3].includes(i) ? 1 : 0,
      );
      await expect(card.locator(".building-photo-unavailable")).toHaveCount(
        [2, 4].includes(i) ? 1 : 0,
      );
      await expect(card.locator(".building-amenities")).toContainText(
        "recensées",
      );
      await expect(card).not.toContainText(/Statut|vacance|Couleur|Loyer/);
      if ([2, 4].includes(i))
        await expect(card).toContainText("Non renseignée");
      if (i === 3) await expect(card).toContainText("1 387 m²");
      const box = await page.locator(".building-card-popup").boundingBox();
      expect(box.width).toBeLessThanOrEqual(265);
      expect(box.height).toBeLessThan(410);
    }
  }
});

test("rental amenity counts follow the radius and ignore hidden amenity layers", async ({
  page,
}) => {
  await page.locator(".map-pin.rentalOffice").first().press("Enter");
  const total = page.locator(".building-amenities .popup-row");
  const initial = await total.textContent();
  await page.locator("#layer-transport").uncheck();
  await page.locator(".map-pin.rentalOffice").first().press("Enter");
  await expect(total).toHaveText(initial);
  await page.locator("#radius-range").fill("1000");
  await expect(total).toContainText("1 km");
  const count = Number(
    (await total.locator("strong").innerText()).split(" ")[0],
  );
  const original = Number(initial.match(/(\d+) recensées/)[1]);
  expect(count).toBeGreaterThan(original);
  await page.locator(".leaflet-popup-close-button").click();
  await page.locator("#radius-range").fill("500");
  await expect(page.locator(".leaflet-popup-content")).toHaveCount(0);
});

test("targeted facade photos use exact addresses and fail without breaking the card", async ({
  page,
}) => {
  await page.route("https://jll-global-gdim-res.cloudinary.com/**", (route) =>
    route.abort(),
  );
  await page.locator(".office-item").first().click();
  await expect(page.locator(".building-photo-fallback")).toBeVisible();
  await expect(page.locator(".building-facade")).toBeHidden();
  await expect(page.locator(".building-photo a")).toHaveAttribute(
    "href",
    "https://immobilier.jll.fr/location-bureaux/bureaux-a-louer-suresnes-92150-678486",
  );
  await expect(page.locator(".building-surfaces")).toBeVisible();
  await page.locator(".office-item").nth(2).click();
  await expect(page.locator(".building-card")).toHaveCount(1);
  await expect(page.locator(".building-photo-unavailable")).toHaveText(
    "Photo de façade non disponible.",
  );
  await expect(page.locator(".building-facade")).toHaveCount(0);
  await page.locator("#clear-radius").click();
  await page.locator(".map-pin.rentalOffice").first().press("Enter");
  await expect(page.locator(".building-card")).toHaveCount(1);
  await expect(
    page.locator(".building-photo, .building-photo-unavailable"),
  ).toHaveCount(0);
});
