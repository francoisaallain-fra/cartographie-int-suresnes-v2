import { test, expect } from "@playwright/test";
async function png(page, width, height) {
  const data = await page.evaluate(
    ({ width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f3b239";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#2376b7";
      ctx.fillRect(width * 0.25, height * 0.25, width * 0.5, height * 0.5);
      return canvas.toDataURL("image/png");
    },
    { width, height },
  );
  return {
    name: "facade.png",
    mimeType: "image/png",
    buffer: Buffer.from(data.split(",")[1], "base64"),
  };
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#loading")).toBeHidden();
});
test("landscape and portrait uploads normalize, persist per address and restore the original", async ({
  page,
}) => {
  const first = page.locator(".office-item").first();
  await first.click();
  const original = await page.locator(".building-facade").getAttribute("src");
  const wide = await png(page, 1600, 600);
  await page
    .getByLabel("Importer une photo", { exact: true })
    .setInputFiles(wide);
  await expect(page.locator(".photo-upload-status")).toHaveText(
    "Photo enregistrée dans ce navigateur.",
  );
  await expect(page.locator(".building-facade")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await expect
    .poll(() =>
      page
        .locator(".building-facade")
        .evaluate((img) => [img.naturalWidth, img.naturalHeight]),
    )
    .toEqual([920, 480]);
  await expect(page.locator(".building-photo-frame")).toHaveCSS(
    "height",
    "120px",
  );
  await expect(page.locator(".building-photo-frame")).toHaveCSS(
    "width",
    "230px",
  );
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await first.click();
  await expect(page.locator(".building-facade")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await page
    .getByRole("button", { name: "Supprimer 25 Quai Gallieni", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await page.locator("#office-undo").click();
  await first.click();
  await expect(page.locator(".building-facade")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await page
    .getByLabel("Remplacer la photo", { exact: true })
    .setInputFiles(await png(page, 600, 1600));
  await expect(page.locator(".photo-upload-status")).toHaveText(
    "Photo enregistrée dans ce navigateur.",
  );
  await expect
    .poll(() =>
      page
        .locator(".building-facade")
        .evaluate((img) => [img.naturalWidth, img.naturalHeight]),
    )
    .toEqual([920, 480]);
  await page.locator(".office-item").nth(2).click();
  await expect(page.locator(".building-card")).toHaveCount(1);
  await expect(page.locator(".building-facade")).toHaveCount(0);
  await page
    .getByLabel("Importer une photo", { exact: true })
    .setInputFiles(wide);
  await expect(page.locator(".photo-upload-status")).toHaveText(
    "Photo enregistrée dans ce navigateur.",
  );
  await first.click();
  await expect(page.locator(".building-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Retirer ma photo", exact: true })
    .click();
  await expect(page.locator(".building-facade")).toHaveAttribute(
    "src",
    original,
  );
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await first.click();
  await expect(page.locator(".building-facade")).toHaveAttribute(
    "src",
    original,
  );
  await page.locator(".office-item").nth(2).click();
  await expect(page.locator(".building-card")).toHaveCount(1);
  await expect(page.locator(".building-facade")).toHaveAttribute(
    "src",
    /^blob:/,
  );
});
test("invalid files and unavailable storage preserve the previous photo", async ({
  page,
}) => {
  await page.locator(".office-item").first().click();
  const original = await page.locator(".building-facade").getAttribute("src");
  const input = () => page.getByLabel("Importer une photo", { exact: true });
  await input().setInputFiles({
    name: "wrong.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("invalid"),
  });
  await expect(page.locator(".photo-upload-status")).toContainText(
    "Choisissez une photo JPG, PNG ou WebP",
  );
  await input().setInputFiles({
    name: "broken.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("broken"),
  });
  await expect(page.locator(".photo-upload-status")).toContainText("illisible");
  await expect(page.locator(".building-facade")).toHaveAttribute(
    "src",
    original,
  );
  await page.evaluate(() => {
    window.IDBObjectStore.prototype.put = () => {
      throw new Error("Stockage indisponible");
    };
  });
  await input().setInputFiles(await png(page, 400, 400));
  await expect(page.locator(".photo-upload-status")).toContainText(
    "enregistrée",
  );
  await expect(page.locator(".building-facade")).toHaveAttribute(
    "src",
    original,
  );
});
test("upload controls and the normalized photo fit on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".office-item").nth(2).click();
  await page
    .getByLabel("Importer une photo", { exact: true })
    .setInputFiles(await png(page, 600, 1200));
  await expect(page.locator(".photo-upload-status")).toHaveText(
    "Photo enregistrée dans ce navigateur.",
  );
  await expect
    .poll(() =>
      page.locator(".building-facade").evaluate((img) => img.naturalWidth),
    )
    .toBe(920);
  await expect
    .poll(async () => {
      const card = await page.locator(".building-card-popup").boundingBox();
      return (
        card &&
        card.x >= 0 &&
        card.x + card.width <= 390 &&
        card.y >= 0 &&
        card.y + card.height <= 844
      );
    })
    .toBe(true);
});

test("a manually added building keeps its own uploaded photo after reload", async ({
  page,
}) => {
  await page.route("https://data.geopf.fr/geocodage/search**", (route) =>
    route.fulfill({
      json: {
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [2.222938, 48.867021] },
            properties: {
              id: "92073_1495_00010",
              name: "10 Rue Chevreul",
              label: "10 Rue Chevreul 92150 Suresnes",
              citycode: "92073",
              type: "housenumber",
            },
          },
        ],
      },
    }),
  );
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
  await page
    .getByLabel("Importer une photo", { exact: true })
    .setInputFiles(await png(page, 1200, 800));
  await expect(page.locator(".photo-upload-status")).toHaveText(
    "Photo enregistrée dans ce navigateur.",
  );
  await page.reload();
  await expect(page.locator("#loading")).toBeHidden();
  await page.locator('.office-item[data-id="ban-92073_1495_00010"]').click();
  await expect(page.locator(".building-facade")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await expect
    .poll(() =>
      page
        .locator(".building-facade")
        .evaluate((img) => [img.naturalWidth, img.naturalHeight]),
    )
    .toEqual([920, 480]);
});
