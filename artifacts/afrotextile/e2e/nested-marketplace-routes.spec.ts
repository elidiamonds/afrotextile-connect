import { expect, test } from "@playwright/test";

const nestedMarketplaceRoutes = [
  { name: "product", path: "/product/1" },
  { name: "vendor", path: "/store/v1" },
] as const;

test.describe("nested marketplace routes", () => {
  for (const route of nestedMarketplaceRoutes) {
    test(`${route.name} route serves the branded app shell`, async ({ page }) => {
      if (route.name === "vendor") {
        await page.route("**/api/storefronts/v1", async (requestRoute) => {
          await requestRoute.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              id: "v1",
              businessName: "Route Check Atelier",
              description: "A storefront fixture for the nested route smoke check.",
              location: "Lagos, Nigeria",
              status: "approved",
              products: [],
            }),
          });
        });
      }

      const response = await page.goto(route.path, {
        waitUntil: "domcontentloaded",
      });

      expect(response, `${route.path} should return a document`).not.toBeNull();
      expect(response?.status(), `${route.path} should serve successfully`).toBe(
        200,
      );
      expect(response?.headers()["content-type"]).toContain("text/html");

      await expect(page.locator("#root")).toBeVisible();
      await expect(page.locator("body")).toContainText("Afrotextile");

      await expect(
        page.locator('link[rel="icon"][sizes="any"]'),
      ).toHaveAttribute("href", /\/brand\/favicon\.ico$/);
      await expect(
        page.locator('link[rel="icon"][type="image/svg+xml"]'),
      ).toHaveAttribute("href", /\/brand\/official-icon\.png$/);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        "content",
        "Afrotextile – Global African Fashion Marketplace",
      );
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        /\/brand\/opengraph\.png$/,
      );
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
        "content",
        /\/brand\/opengraph\.png$/,
      );
    });
  }
});