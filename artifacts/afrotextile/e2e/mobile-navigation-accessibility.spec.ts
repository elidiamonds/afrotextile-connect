import { expect, test, type Page, type Route } from "@playwright/test";

const viewport = { width: 390, height: 844 };
const productImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='800' viewBox='0 0 640 800'%3E%3Crect width='640' height='800' fill='%231d4f4a'/%3E%3C/svg%3E";

const product = {
  id: "gid://shopify/Product/indigo-touch-wrap",
  handle: "indigo-touch-wrap",
  title: "Indigo touch wrap",
  description: "A browser fixture for mobile marketplace checks.",
  descriptionHtml: "<p>A browser fixture for mobile marketplace checks.</p>",
  vendor: "Touch Atelier",
  productType: "Textiles",
  tags: ["Cotton"],
  availableForSale: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  featuredImage: { url: productImage, altText: "Indigo touch wrap" },
  images: { nodes: [{ url: productImage, altText: "Indigo touch wrap" }] },
  priceRange: {
    minVariantPrice: { amount: "48.00", currencyCode: "USD" },
    maxVariantPrice: { amount: "48.00", currencyCode: "USD" },
  },
  compareAtPriceRange: {
    minVariantPrice: { amount: "0.00", currencyCode: "USD" },
    maxVariantPrice: { amount: "0.00", currencyCode: "USD" },
  },
  variants: {
    nodes: [
      {
        id: "gid://shopify/ProductVariant/indigo-touch-wrap-one-size",
        title: "One size",
        availableForSale: true,
        quantityAvailable: 8,
        selectedOptions: [{ name: "Size", value: "One size" }],
        price: { amount: "48.00", currencyCode: "USD" },
        compareAtPrice: null,
        image: { url: productImage, altText: "Indigo touch wrap" },
      },
    ],
  },
};

const productsResponse = {
  nodes: [product],
  pageInfo: {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: "start",
    endCursor: "end",
  },
};

const emptyProductsResponse = {
  nodes: [],
  pageInfo: {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  },
};

async function fulfillProducts(route: Route, body = productsResponse) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockProducts(page: Page, body = productsResponse) {
  await page.route("**/api/shopify/products?*", (route) =>
    fulfillProducts(route, body),
  );
}

async function dismissDevelopmentBanner(page: Page) {
  const closeBanner = page.getByRole("button", { name: "Close banner" });
  if (await closeBanner.isVisible().catch(() => false)) {
    await closeBanner.click();
  }
}

function expectWithinViewport(
  box: { x: number; y: number; width: number; height: number } | null,
) {
  expect(box).not.toBeNull();
  if (!box) throw new Error("The control could not be measured.");
  expect(box.width).toBeGreaterThanOrEqual(36);
  expect(box.height).toBeGreaterThanOrEqual(36);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

test.describe("mobile navigation and marketplace quick actions", () => {
  test("opens and closes mobile navigation while keeping active links visible", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockProducts(page);
    await page.goto("/shop");
    await dismissDevelopmentBanner(page);

    const desktopShopLink = page.getByTestId("link-nav-shop");
    await expect(desktopShopLink).toBeVisible();
    await expect(desktopShopLink).toHaveClass(/after:scale-x-100/);

    await page.setViewportSize(viewport);
    const menuButton = page.getByTestId("button-mobile-menu");
    const mobileShopLink = page.getByTestId("link-mobile-shop");
    const mobileMenu = page.locator("#mobile-navigation");
    const backdrop = mobileMenu.locator("..");

    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(mobileMenu).toBeVisible();
    await expect(mobileShopLink).toBeVisible();
    await expect(mobileShopLink).toHaveClass(/bg-muted/);

    await backdrop.dispatchEvent("click");
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(backdrop).toHaveAttribute("aria-hidden", "true");

    await menuButton.click();
    await page.keyboard.press("Escape");
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(backdrop).toHaveAttribute("aria-hidden", "true");

    await menuButton.click();
    const mobileAboutLink = page.getByTestId("link-mobile-about");
    await Promise.all([
      page.waitForURL(/\/about(?:#|$)/),
      mobileAboutLink.click(),
    ]);
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(backdrop).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByRole("heading", { name: /Celebrating African/ })).toBeVisible();
  });

  test("keeps wishlist and add-to-bag controls reachable and labeled on touch viewports", async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockProducts(page);
    await page.goto("/shop");

    const card = page.getByTestId("card-product-indigo-touch-wrap");
    await expect(card).toBeVisible();
    await dismissDevelopmentBanner(page);

    const wishlist = page.getByRole("button", {
      name: "Save Indigo touch wrap to wishlist",
    });
    const addToBag = page.getByRole("button", {
      name: "Add Indigo touch wrap to bag",
    });
    await expect(wishlist).toBeVisible();
    await expect(addToBag).toBeVisible();
    await expect(wishlist).toHaveAttribute("aria-pressed", "false");
    await wishlist.scrollIntoViewIfNeeded();
    await addToBag.scrollIntoViewIfNeeded();
    expectWithinViewport(await wishlist.boundingBox());
    expectWithinViewport(await addToBag.boundingBox());

    await wishlist.click();
    await expect(
      page.getByRole("button", {
        name: "Remove Indigo touch wrap from wishlist",
      }),
    ).toHaveAttribute("aria-pressed", "true");

    await addToBag.click();
    await expect(
      page.getByTestId("link-cart"),
    ).toHaveAttribute("aria-label", "Shopping bag, 1 items");
  });

  test("holds the shop layout while loading and shows a clear empty state", async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    let resolveProducts: (() => void) | undefined;
    const productsReady = new Promise<void>((resolve) => {
      resolveProducts = resolve;
    });

    await page.route("**/api/shopify/products?*", async (route) => {
      await productsReady;
      await fulfillProducts(route);
    });
    await page.goto("/shop");

    const loadingGrid = page.getByTestId("grid-products-loading");
    await expect(loadingGrid).toBeVisible();
    await expect(page.getByTestId("status-shop-results")).toContainText(
      "Searching marketplace…",
    );
    const loadingBox = await loadingGrid.boundingBox();
    expect(loadingBox).not.toBeNull();

    resolveProducts?.();
    await expect(page.getByTestId("card-product-indigo-touch-wrap")).toBeVisible();
    const loadedGrid = page
      .getByTestId("card-product-indigo-touch-wrap")
      .locator("..");
    const loadedBox = await loadedGrid.boundingBox();
    expect(loadedBox).not.toBeNull();
    if (loadingBox && loadedBox) {
      expect(Math.abs(loadedBox.y - loadingBox.y)).toBeLessThanOrEqual(1);
    }

    await page.unroute("**/api/shopify/products?*");
    await mockProducts(page, emptyProductsResponse);
    await page.reload();
    await expect(page.getByTestId("text-shop-empty")).toContainText(
      "Products will appear here",
    );
    await expect(page.getByTestId("status-shop-results")).toContainText(
      "0 products",
    );
  });

  test("lets shoppers retry after a failed marketplace request", async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    let requestCount = 0;
    await page.route("**/api/shopify/products?*", async (route) => {
      requestCount += 1;
      if (requestCount <= 4) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Temporary marketplace outage" }),
        });
        return;
      }
      await fulfillProducts(route);
    });

    await page.goto("/shop");
    await expect(page.getByTestId("state-shop-error")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("status-shop-results")).toContainText(
      "could not be loaded",
    );
    const retry = page.getByTestId("button-retry-shop");
    await expect(retry).toBeVisible();

    await retry.click();
    await expect(page.getByTestId("card-product-indigo-touch-wrap")).toBeVisible();
    await expect(page.getByTestId("state-shop-error")).toBeHidden();
    expect(requestCount).toBe(5);
  });
});