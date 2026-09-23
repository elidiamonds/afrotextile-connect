import { clerk } from "@clerk/testing/playwright";
import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Request,
  type Route,
} from "@playwright/test";
import { eq } from "drizzle-orm";
import { db, productsTable, vendorsTable } from "@workspace/db";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type ClerkUser = { id: string };

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const vendorEmail = `afrotextile-vendor-${runId}@example.com`;
const adminEmail = `afrotextile-admin-${runId}@example.com`;
const otherVendorEmail = `afrotextile-other-vendor-${runId}@example.com`;
const fixturePassword = `Afrotextile-${runId}-fixture!`;
const browserFixtureBusinessName = `Kente House Browser Fixture ${runId}`;
const returnedBusinessName = `Kente House Returned ${runId}`;
const clerkApiUrl = process.env.CLERK_API_URL ?? "https://api.clerk.com/v1";
const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const fixtureDirectory = dirname(fileURLToPath(import.meta.url));
const firstProductPhoto = join(
  fixtureDirectory,
  "fixtures",
  "product-indigo.svg",
);
const replacementProductPhoto = join(
  fixtureDirectory,
  "fixtures",
  "product-ochre.svg",
);

let vendorUser: ClerkUser;
let adminUser: ClerkUser;
let otherVendorUser: ClerkUser;
let vendorId: string | undefined;

async function clerkApi(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  if (!clerkSecretKey) {
    throw new Error("CLERK_SECRET_KEY is required for the Clerk test fixture.");
  }

  return fetch(`${clerkApiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${clerkSecretKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

async function createClerkFixture(
  emailAddress: string,
  publicMetadata: Record<string, string>,
): Promise<ClerkUser> {
  const response = await clerkApi("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [emailAddress],
      password: fixturePassword,
      first_name: "Afrotextile",
      last_name: "Browser Fixture",
      public_metadata: publicMetadata,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Could not create Clerk browser fixture (${response.status}): ${await response.text()}`,
    );
  }

  return (await response.json()) as ClerkUser;
}

async function deleteClerkFixture(userId: string | undefined) {
  if (!userId) return;
  const response = await clerkApi(`/users/${userId}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Could not delete Clerk browser fixture (${response.status}): ${await response.text()}`,
    );
  }
}

async function waitForAuthenticatedSession(page: Page, expectedUserId: string) {
  await page.waitForFunction(
    async (userId) => {
      try {
        const clerk = window.Clerk;
        if (
          !clerk?.loaded ||
          clerk.user?.id !== userId ||
          !clerk.session
        ) {
          return false;
        }
        return Boolean(await clerk.session.getToken());
      } catch {
        return false;
      }
    },
    expectedUserId,
    { timeout: 15_000 },
  );
}

async function gotoWithAuthenticatedSession(
  page: Page,
  url: string,
  expectedUserId: string,
) {
  await page.goto(url);
  await waitForAuthenticatedSession(page, expectedUserId);
}

async function reloadWithAuthenticatedSession(
  page: Page,
  expectedUserId: string,
) {
  await page.reload();
  await waitForAuthenticatedSession(page, expectedUserId);
}

async function signInFixture(
  page: Page,
  emailAddress: string,
  expectedUserId: string,
) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress });
  await waitForAuthenticatedSession(page, expectedUserId);
  await expect(page.locator("body")).toContainText("Afrotextile");
}

async function sessionToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => window.Clerk?.session?.getToken());
  if (!token) {
    throw new Error("Clerk did not provide a browser session token.");
  }
  return token;
}

async function requestProductImageUpload(page: Page, vendorId: string) {
  return page.evaluate(async (id) => {
    const token = await window.Clerk?.session?.getToken();
    const response = await fetch(
      `/api/vendors/${id}/product-image-upload-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: "browser-upload-check.svg",
          size: 256,
          contentType: "image/svg+xml",
        }),
      },
    );

    return {
      status: response.status,
      body: await response.text(),
    };
  }, vendorId);
}

async function expectLoadedImage(page: Page, imageSelector: string) {
  const image = page.locator(imageSelector);
  await expect(image).toBeVisible();
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      image.evaluate(
        (element) =>
          element instanceof HTMLImageElement &&
          element.complete &&
          element.naturalWidth > 0,
      ),
    )
    .toBe(true);
  return image;
}

async function expectObjectStatus(
  page: Page,
  imageSrc: string,
  expectedStatus: number,
) {
  const imageURL = new URL(imageSrc, page.url()).toString();
  await expect
    .poll(async () => (await page.request.get(imageURL)).status(), {
      timeout: 15_000,
    })
    .toBe(expectedStatus);
}

async function fetchRouteWithBrowserAuth(page: Page, route: Route) {
  const token = await page.evaluate(() => window.Clerk?.session?.getToken());
  return route.fetch({
    headers: {
      ...(await route.request().allHeaders()),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
}

async function clearProductImage(page: Page, productId: string) {
  const token = await sessionToken(page);
  const response = await page.evaluate(
    async ({ id, sessionToken }) => {
      const result = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ imageUrl: "" }),
      });
      return { status: result.status, body: await result.text() };
    },
    { id: productId, sessionToken: token },
  );
  expect(response.status, response.body).toBe(200);
}

async function expectLegacyStorefrontDenied(
  page: Page,
  status: 403 | 404 | 500,
) {
  let storefrontRequestCount = 0;
  await page.route("**/api/storefronts/v1*", async (route) => {
    storefrontRequestCount += 1;
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({
        error:
          status === 404
            ? "Storefront not found."
            : "Storefront unavailable.",
      }),
    });
  });

  await page.goto("/store/v1");
  await expect(
    page.getByText("Vendor not found.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Adunni Couture" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Ankara Co-ord Set", { exact: true }),
  ).toHaveCount(0);
  expect(storefrontRequestCount).toBe(1);
}

test.describe("public storefront visibility", () => {
  test("refreshes an open marketplace after a product is published", async ({
    page,
  }) => {
    const publishedProduct = {
      id: "gid://shopify/Product/fresh-publication",
      handle: "fresh-publication",
      title: "Freshly Published Wrap",
      description: "A newly published wrap.",
      descriptionHtml: "<p>A newly published wrap.</p>",
      vendor: "Fresh Publication Fixture",
      productType: "Textiles",
      tags: ["Cotton"],
      availableForSale: true,
      createdAt: new Date().toISOString(),
      featuredImage: {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500'%3E%3Crect width='100%25' height='100%25' fill='%23d6a63d'/%3E%3C/svg%3E",
        altText: "Freshly published wrap",
      },
      images: {
        nodes: [],
      },
      priceRange: {
        minVariantPrice: { amount: "48", currencyCode: "USD" },
        maxVariantPrice: { amount: "48", currencyCode: "USD" },
      },
      compareAtPriceRange: {
        minVariantPrice: { amount: "0", currencyCode: "USD" },
        maxVariantPrice: { amount: "0", currencyCode: "USD" },
      },
      variants: {
        nodes: [
          {
            id: "gid://shopify/ProductVariant/fresh-publication",
            title: "Default Title",
            availableForSale: true,
            quantityAvailable: 5,
            selectedOptions: [],
            price: { amount: "48", currencyCode: "USD" },
            compareAtPrice: null,
            image: null,
          },
        ],
      },
    };
    let catalogRequestCount = 0;

    await page.route("**/api/shopify/products?*", async (route) => {
      catalogRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          nodes: catalogRequestCount === 1 ? [] : [publishedProduct],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        }),
      });
    });

    await page.clock.install();
    await page.goto("/shop?category=Textiles");
    await expect(
      page.getByTestId("status-shop-results"),
    ).not.toContainText("Searching marketplace…");
    await expect(page.getByText("Freshly Published Wrap", { exact: true })).toHaveCount(0);

    await page.clock.fastForward(30_000);

    await expect(
      page.getByText("Freshly Published Wrap", { exact: true }),
    ).toBeVisible();
    expect(catalogRequestCount).toBe(2);
    expect(new URL(page.url()).searchParams.get("category")).toBe("Textiles");
  });

  test("does not fall back to demo content when a legacy storefront is denied", async ({
    page,
  }) => {
    await expectLegacyStorefrontDenied(page, 404);
  });

  for (const status of [403, 500] as const) {
    test(`does not fall back to demo content when a legacy storefront returns ${status}`, async ({
      page,
    }) => {
      await expectLegacyStorefrontDenied(page, status);
    });
  }
});

test.describe("vendor sign-up and return visits", () => {
  test.beforeAll(async () => {
    vendorUser = await createClerkFixture(vendorEmail, {});
    adminUser = await createClerkFixture(adminEmail, { role: "admin" });
    otherVendorUser = await createClerkFixture(otherVendorEmail, {});
  });

  test.afterAll(async () => {
    if (vendorId) {
      await db.delete(vendorsTable).where(eq(vendorsTable.id, vendorId));
    }
    await Promise.all([
      deleteClerkFixture(vendorUser?.id),
      deleteClerkFixture(adminUser?.id),
      deleteClerkFixture(otherVendorUser?.id),
    ]);
  });

  test("hides archived products from fresh shoppers while keeping vendor restore available", async ({
    page,
    browser,
  }) => {
    test.setTimeout(60_000);

    const archiveVendorName = `Archive visibility fixture ${runId}`;
    const archiveProductName = `Archive visibility wrap ${runId}`;
    const [archiveVendor] = await db
      .insert(vendorsTable)
      .values({
        ownerUserId: vendorUser.id,
        businessName: archiveVendorName,
        contactName: "Archive Visibility Fixture",
        email: vendorEmail,
        phone: "+2348012345678",
        location: "Lagos, Nigeria",
        category: "Fabrics",
        plan: "Starter",
        description: "A browser fixture for archived product visibility.",
        status: "approved",
      })
      .returning({ id: vendorsTable.id });
    if (!archiveVendor) {
      throw new Error("Could not create the archived product vendor fixture.");
    }

    try {
      const [archiveProduct] = await db
        .insert(productsTable)
        .values({
          vendorId: archiveVendor.id,
          name: archiveProductName,
          category: "Textiles",
          priceCents: 4800,
          sizes: ["One size"],
          fabricType: "Cotton",
          description: "A hand-dyed cotton wrap for archive visibility checks.",
          inventory: 12,
          status: "published",
        })
        .returning({ id: productsTable.id });
      if (!archiveProduct) {
        throw new Error("Could not create the archived product fixture.");
      }

      await signInFixture(page, vendorEmail, vendorUser.id);
      await gotoWithAuthenticatedSession(
        page,
        `/vendor/dashboard/${archiveVendor.id}`,
        vendorUser.id,
      );
      const productManager = page
        .locator("section")
        .filter({ hasText: "Products and inventory" });
      const productCard = productManager
        .locator("article")
        .filter({ hasText: archiveProductName });
      await expect(productCard).toContainText("published");

      const archiveResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url().includes(`/api/products/${archiveProduct.id}`),
      );
      await productCard.getByRole("button", { name: "Archive" }).click();
      const archivedResponse = await archiveResponse;
      expect(archivedResponse.status(), await archivedResponse.text()).toBe(
        200,
      );
      await expect(
        page.getByText("Product updated", { exact: true }),
      ).toBeVisible();
      await expect(productCard).toContainText("archived");

      const shopperContext = await browser.newContext();
      const shopperPage = await shopperContext.newPage();
      try {
        const detailResponse = await shopperPage.request.get(
          `/api/products/${archiveProduct.id}`,
        );
        expect(detailResponse.status()).toBe(404);

        const marketplaceResponse = await shopperPage.request.get(
          `/api/products?q=${encodeURIComponent(archiveProductName)}`,
        );
        expect(marketplaceResponse.status()).toBe(200);
        const marketplaceProducts =
          (await marketplaceResponse.json()) as Array<{
            id: string;
            name: string;
          }>;
        expect(marketplaceProducts).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: archiveProduct.id,
              name: archiveProductName,
            }),
          ]),
        );

        const storefrontResponse = await shopperPage.request.get(
          `/api/storefronts/${archiveVendor.id}`,
        );
        expect(storefrontResponse.status()).toBe(200);
        const storefront = (await storefrontResponse.json()) as {
          products: Array<{ id: string; name: string }>;
        };
        expect(storefront.products).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: archiveProduct.id,
              name: archiveProductName,
            }),
          ]),
        );

        await shopperPage.goto("/shop");
        await expect(
          shopperPage.getByTestId("status-shop-results"),
        ).not.toContainText("Searching marketplace…");
        await expect(
          shopperPage.getByText(archiveProductName, { exact: true }),
        ).toHaveCount(0);

        await shopperPage.goto(`/store/${archiveVendor.id}`);
        await expect(
          shopperPage.getByText(archiveProductName, { exact: true }),
        ).toHaveCount(0);

        await shopperPage.goto(`/product/${archiveProduct.id}`);
        await expect(
          shopperPage.getByText("Product not found.", { exact: true }),
        ).toBeVisible({ timeout: 15_000 });
      } finally {
        await shopperContext.close();
      }

      await expect(productCard).toContainText("archived");
      await productCard.getByRole("button", { name: "Edit" }).click();
      await productManager.locator("select").selectOption("published");
      const restoreResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url().includes(`/api/products/${archiveProduct.id}`),
      );
      await productManager
        .getByRole("button", { name: "Save product" })
        .click();
      const restoredResponse = await restoreResponse;
      expect(restoredResponse.status(), await restoredResponse.text()).toBe(
        200,
      );
      await expect(
        page.getByText("Product updated", { exact: true }),
      ).toBeVisible();
      await expect(productCard).toContainText("published");
      await expect(
        productCard.getByRole("button", { name: "Archive" }),
      ).toBeVisible();

      const restoredDetailResponse = await page.request.get(
        `/api/products/${archiveProduct.id}`,
      );
      expect(restoredDetailResponse.status()).toBe(200);
    } finally {
      await db
        .delete(vendorsTable)
        .where(eq(vendorsTable.id, archiveVendor.id));
    }
  });

  test("submits an application, survives approval, and edits the returned storefront", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);

    await test.step("sign in with a disposable Clerk browser fixture", async () => {
      await signInFixture(page, vendorEmail, vendorUser.id);
    });

    await test.step("submit the vendor application in the browser", async () => {
      await gotoWithAuthenticatedSession(
        page,
        "/vendor?apply=true",
        vendorUser.id,
      );
      await expect(
        page.getByRole("heading", { name: "Build your storefront" }),
      ).toBeVisible();

      await page.getByLabel("Business name").fill(browserFixtureBusinessName);
      await page.getByLabel("Contact name").fill("Amina Okafor");
      await page.getByLabel("Business email").fill(vendorEmail);
      await page.getByLabel("Phone").fill("+2348012345678");
      await page.getByLabel("City and country").fill("Lagos, Nigeria");
      await page.getByText("Choose a category").click();
      await page.getByRole("option", { name: "Fabrics" }).click();
      await page
        .getByLabel("Brand story")
        .fill(
          "Handcrafted African textiles made by independent makers and dyers.",
        );
      await page.getByRole("button", { name: "Submit application" }).click();

      await expect(
        page.getByRole("heading", { name: browserFixtureBusinessName }),
      ).toBeVisible();
      await expect(page.getByText("pending", { exact: true })).toBeVisible();
      vendorId = new URL(page.url()).pathname.split("/").pop();
      expect(vendorId).toBeTruthy();
    });

    await test.step("reject image upload requests before approval", async () => {
      const response = await requestProductImageUpload(page, vendorId!);
      expect(response.status).toBe(403);
    });

    await test.step("approve the application through the reviewer browser flow", async () => {
      const adminContext: BrowserContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      try {
        await signInFixture(adminPage, adminEmail, adminUser.id);
        await gotoWithAuthenticatedSession(
          adminPage,
          "/admin/vendors",
          adminUser.id,
        );
        const application = adminPage.locator("article").filter({
          hasText: browserFixtureBusinessName,
        });
        await expect(application).toBeVisible();
        await application.getByRole("button", { name: "Approve" }).click();
        await expect(
          application.getByText("approved", { exact: true }),
        ).toBeVisible();
      } finally {
        await adminContext.close();
      }
    });

    await test.step("reject image upload requests from another signed-in vendor", async () => {
      const otherVendorContext = await browser.newContext();
      const otherVendorPage = await otherVendorContext.newPage();
      try {
        await signInFixture(
          otherVendorPage,
          otherVendorEmail,
          otherVendorUser.id,
        );
        const response = await requestProductImageUpload(
          otherVendorPage,
          vendorId!,
        );
        expect(response.status).toBe(403);
      } finally {
        await otherVendorContext.close();
      }
    });

    await test.step("return to the dashboard and edit storefront details", async () => {
      await reloadWithAuthenticatedSession(page, vendorUser.id);
      await expect(page.getByText("approved", { exact: true })).toBeVisible();
      await expect(page.getByText("Your storefront is live.")).toBeVisible();

      await page.getByLabel("Business name").fill(returnedBusinessName);
      await page
        .getByLabel("Brand story")
        .fill("A refreshed storefront story for returning customers.");
      await page.getByText("Choose a category", { exact: true }).click();
      await page.getByRole("option", { name: "Fabrics" }).click();
      const updateRequest = page.waitForRequest(
        (request) =>
          request.method() === "PATCH" &&
          request.url().includes(`/api/vendors/${vendorId}`),
      );
      const updateResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url().includes(`/api/vendors/${vendorId}`),
      );
      await page.getByRole("button", { name: "Save changes" }).click();
      const request = await updateRequest;
      const response = await updateResponse;
      expect(
        response.status(),
        `Storefront update failed: ${await response.text()} (payload: ${request.postData()})`,
      ).toBe(200);
      await expect(
        page.getByText("Storefront saved", { exact: true }),
      ).toBeVisible();

      await reloadWithAuthenticatedSession(page, vendorUser.id);
      await expect(
        page.getByRole("heading", { name: returnedBusinessName }),
      ).toBeVisible();
      await expect(page.getByLabel("Brand story")).toHaveValue(
        "A refreshed storefront story for returning customers.",
      );
    });

    await test.step("show the edited storefront details to shoppers", async () => {
      const shopperContext = await browser.newContext();
      const shopperPage = await shopperContext.newPage();
      try {
        await shopperPage.goto(`/store/${vendorId}`);
        const storefrontResponse = await shopperPage.request.get(
          `/api/storefronts/${vendorId}`,
        );
        expect(storefrontResponse.status()).toBe(200);
        await expect(
          shopperPage.getByRole("heading", { name: returnedBusinessName }),
        ).toBeVisible();
        await expect(
          shopperPage.getByText(
            "A refreshed storefront story for returning customers.",
            { exact: true },
          ),
        ).toBeVisible();
      } finally {
        await shopperContext.close();
      }
    });

    let productId = "";
    let originalImageSrc = "";
    const productName = `Indigo browser upload wrap ${runId}`;

    await test.step("upload a local product photo as a draft", async () => {
      const productManager = page
        .locator("section")
        .filter({ hasText: "Products and inventory" });

      await productManager.getByLabel("Product name").fill(productName);
      await productManager.getByLabel("Category").fill("Textiles");
      await productManager.getByLabel("Price", { exact: true }).fill("48");
      await productManager.getByLabel("Units in stock").fill("12");
      await productManager.getByLabel("Fabric or material").fill("Cotton");
      await productManager.getByLabel("Sizes").fill("One size");
      await productManager
        .getByLabel("Description")
        .fill("A hand-dyed cotton wrap made by independent makers.");
      await productManager.getByLabel("Visibility").selectOption("draft");
      await page.setViewportSize({ width: 390, height: 844 });
      await productManager.getByLabel("Sizes").focus();
      await page.keyboard.press("Tab");
      const photoInput = productManager.locator('input[type="file"]');
      const photoTrigger = productManager.getByTestId("product-photo-trigger");
      await expect(photoInput).toHaveAttribute("aria-label", "Product photo");
      await expect(photoInput).toBeFocused();
      await expect(photoTrigger).toHaveCSS("box-shadow", /rgb/);

      const delayedUpload = async (route: Route) => {
        if (route.request().method() === "PUT") {
          await new Promise((resolve) => setTimeout(resolve, 750));
        }
        await route.continue();
      };
      await page.route("**/*", delayedUpload);
      await productManager
        .locator('input[type="file"]')
        .setInputFiles(firstProductPhoto);
      const uploadStatus = productManager.locator(
        '[role="status"][aria-busy="true"]',
      );
      await expect(uploadStatus).toContainText("Uploading product photo…");
      await expect(uploadStatus).toHaveAttribute("aria-live", "polite");
      await expect(
        productManager.getByRole("progressbar", {
          name: "Photo upload progress",
        }),
      ).toBeVisible();
      await expect(
        productManager.locator('button[type="submit"]'),
      ).toBeDisabled();
      const uploadStatusBox = await uploadStatus.boundingBox();
      expect(uploadStatusBox).not.toBeNull();
      expect(uploadStatusBox!.x).toBeGreaterThanOrEqual(0);
      expect(uploadStatusBox!.x + uploadStatusBox!.width).toBeLessThanOrEqual(
        390,
      );
      await page.unroute("**/*", delayedUpload);
      await expect(
        page.getByText("Photo uploaded", { exact: true }),
      ).toBeVisible();
      await expect(
        productManager.getByAltText("Product preview"),
      ).toBeVisible();
      await expect(
        productManager.getByText("product-indigo.svg", { exact: true }),
      ).toBeVisible();

      let imageCleanupRequests = 0;
      const recordImageCleanup = (request: Request) => {
        if (
          request.method() === "DELETE" &&
          request.url().includes(`/api/vendors/${vendorId}/product-image`)
        ) {
          imageCleanupRequests += 1;
        }
      };
      page.on("request", recordImageCleanup);

      const failCreateAfterCommit = async (route: Route) => {
        if (route.request().method() === "POST") {
          const upstreamResponse = await fetchRouteWithBrowserAuth(page, route);
          await route.fulfill({
            response: upstreamResponse,
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Temporary catalog outage." }),
          });
          return;
        }
        await route.continue();
      };
      await page.route(
        `**/api/vendors/${vendorId}/products`,
        failCreateAfterCommit,
      );
      let retainedImageSrc = "";
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const failedCreateResponse = page.waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            response.url().includes(`/api/vendors/${vendorId}/products`),
        );
        await productManager.getByRole("button", { name: "Add product" }).click();
        const failedResponse = await failedCreateResponse;
        expect(failedResponse.status(), await failedResponse.text()).toBe(500);
        await expect(
          page.getByText("Could not add product", { exact: true }).last(),
        ).toBeVisible();
        await expect(productManager.getByLabel("Product name")).toHaveValue(
          productName,
        );
        const currentImageSrc = await productManager
          .getByAltText("Product preview")
          .getAttribute("src");
        expect(currentImageSrc).toMatch(/\/api\/storage\/objects\//);
        if (attempt === 0) {
          retainedImageSrc = currentImageSrc!;
        } else {
          expect(currentImageSrc).toBe(retainedImageSrc);
        }
        await expectObjectStatus(page, currentImageSrc!, 200);
      }
      expect(imageCleanupRequests).toBe(0);
      await page.unroute(
        `**/api/vendors/${vendorId}/products`,
        failCreateAfterCommit,
      );
      page.off("request", recordImageCleanup);

      const createResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes(`/api/vendors/${vendorId}/products`),
      );
      await productManager.getByRole("button", { name: "Add product" }).click();
      const response = await createResponse;
      expect(response.status(), await response.text()).toBe(200);
      productId = ((await response.json()) as { id: string }).id;

      await expect(
        productManager.locator("article").filter({ hasText: productName }),
      ).toBeVisible();
      await expect(productManager.locator("article")).toHaveCount(1);
    });

    await test.step("keep the uploaded photo after a dashboard reload", async () => {
      await reloadWithAuthenticatedSession(page, vendorUser.id);
      const productManager = page
        .locator("section")
        .filter({ hasText: "Products and inventory" });
      const productCard = productManager
        .locator("article")
        .filter({ hasText: productName });
      await expect(productCard).toBeVisible();
      const image = productCard.locator("img");
      await expect(image).toBeVisible();
      await expect
        .poll(() =>
          image.evaluate(
            (element) =>
              element instanceof HTMLImageElement &&
              element.complete &&
              element.naturalWidth > 0,
          ),
        )
        .toBe(true);
      originalImageSrc = (await image.getAttribute("src")) ?? "";
      expect(originalImageSrc).toMatch(/\/api\/storage\/objects\//);
    });

    await test.step("keep the draft product out of the public marketplace", async () => {
      const shopperContext = await browser.newContext();
      const shopperPage = await shopperContext.newPage();
      try {
        const detailResponse = await shopperPage.request.get(
          `/api/products/${productId}`,
        );
        expect(detailResponse.status()).toBe(404);

        await shopperPage.goto("/shop");
        await expect(
          shopperPage.getByText(productName, { exact: true }),
        ).toHaveCount(0);

        await shopperPage.goto(`/product/${productId}`);
        await expect(
          shopperPage.getByText("Product not found.", { exact: true }),
        ).toBeVisible({ timeout: 15_000 });
      } finally {
        await shopperContext.close();
      }
    });

    await test.step("publish the product and make it discoverable", async () => {
      await gotoWithAuthenticatedSession(
        page,
        `/vendor/dashboard/${vendorId}`,
        vendorUser.id,
      );
      const productManager = page
        .locator("section")
        .filter({ hasText: "Products and inventory" });
      const productCard = productManager
        .locator("article")
        .filter({ hasText: productName });

      await productCard.getByRole("button", { name: "Edit" }).click();
      await productManager.getByLabel("Visibility").selectOption("published");
      const updateResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url().includes(`/api/products/${productId}`),
      );
      await productManager
        .getByRole("button", { name: "Save product" })
        .click();
      const response = await updateResponse;
      expect(response.status(), await response.text()).toBe(200);
      await expect(
        page.getByText("Product updated", { exact: true }),
      ).toBeVisible();
    });

    await test.step("render the saved photo on the storefront and marketplace", async () => {
      await gotoWithAuthenticatedSession(
        page,
        `/store/${vendorId}`,
        vendorUser.id,
      );
      const storefrontResponse = await page.request.get(
        `/api/storefronts/${vendorId}`,
      );
      expect(storefrontResponse.status(), await storefrontResponse.text()).toBe(
        200,
      );
      const storefront = (await storefrontResponse.json()) as {
        products: Array<{
          id: string;
          status: string;
          images: string[];
        }>;
      };
      expect(storefront.products).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: productId,
            status: "published",
            images: [originalImageSrc],
          }),
        ]),
      );
      await expectLoadedImage(page, `img[alt="${productName}"]`);
      await expect(page.locator(`img[alt="${productName}"]`)).toHaveAttribute(
        "src",
        originalImageSrc,
      );

      const shopperContext = await browser.newContext();
      const shopperPage = await shopperContext.newPage();
      try {
        await shopperPage.goto("/shop");
        await expectLoadedImage(shopperPage, `img[alt="${productName}"]`);
        await expect(
          shopperPage.locator(`img[alt="${productName}"]`),
        ).toHaveAttribute("src", originalImageSrc);
        await expect(
          shopperPage.getByRole("link", {
            name: returnedBusinessName,
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          shopperPage.getByRole("link", {
            name: browserFixtureBusinessName,
            exact: true,
          }),
        ).toHaveCount(0);
      } finally {
        await shopperContext.close();
      }
    });

    await test.step("remove an abandoned photo from a canceled editor", async () => {
      await gotoWithAuthenticatedSession(
        page,
        `/vendor/dashboard/${vendorId}`,
        vendorUser.id,
      );
      const productManager = page
        .locator("section")
        .filter({ hasText: "Products and inventory" });

      await productManager
        .locator('input[type="file"]')
        .setInputFiles(replacementProductPhoto);
      await expect(
        page.getByText("Photo uploaded", { exact: true }),
      ).toBeVisible();
      const canceledImageSrc = await productManager
        .getByAltText("Product preview")
        .getAttribute("src");
      expect(canceledImageSrc).toMatch(/\/api\/storage\/objects\//);
      await expectObjectStatus(page, canceledImageSrc!, 200);

      await productManager.getByRole("button", { name: "Cancel" }).click();
      await expectObjectStatus(page, canceledImageSrc!, 404);
    });

    await test.step("remove an abandoned photo after navigating away", async () => {
      await gotoWithAuthenticatedSession(
        page,
        `/vendor/dashboard/${vendorId}`,
        vendorUser.id,
      );
      const productManager = page
        .locator("section")
        .filter({ hasText: "Products and inventory" });

      await productManager
        .locator('input[type="file"]')
        .setInputFiles(replacementProductPhoto);
      await expect(
        page.getByText("Photo uploaded", { exact: true }),
      ).toBeVisible();
      const abandonedImageSrc = await productManager
        .getByAltText("Product preview")
        .getAttribute("src");
      expect(abandonedImageSrc).toMatch(/\/api\/storage\/objects\//);
      await expectObjectStatus(page, abandonedImageSrc!, 200);

      await gotoWithAuthenticatedSession(page, "/shop", vendorUser.id);
      await expect(page).toHaveURL(/\/shop$/);
      await expectObjectStatus(page, abandonedImageSrc!, 404);
      await expectObjectStatus(page, originalImageSrc, 200);
    });

    await test.step("remove an abandoned photo after browser page exit", async () => {
      const exitPage = await page.context().newPage();
      try {
        await gotoWithAuthenticatedSession(
          exitPage,
          `/vendor/dashboard/${vendorId}`,
          vendorUser.id,
        );
        const productManager = exitPage
          .locator("section")
          .filter({ hasText: "Products and inventory" });

        await productManager
          .locator('input[type="file"]')
          .setInputFiles(replacementProductPhoto);
        await expect(
          exitPage.getByText("Photo uploaded", { exact: true }),
        ).toBeVisible();
        const abandonedImageSrc = await productManager
          .getByAltText("Product preview")
          .getAttribute("src");
        expect(abandonedImageSrc).toMatch(/\/api\/storage\/objects\//);
        await expectObjectStatus(page, abandonedImageSrc!, 200);

        await exitPage.close();
        await expectObjectStatus(page, abandonedImageSrc!, 404);
      } finally {
        if (!exitPage.isClosed()) {
          await exitPage.close();
        }
      }
    });

    await test.step("replace the photo and persist the new image everywhere", async () => {
      await gotoWithAuthenticatedSession(
        page,
        `/vendor/dashboard/${vendorId}`,
        vendorUser.id,
      );
      const productManager = page
        .locator("section")
        .filter({ hasText: "Products and inventory" });
      const productCard = productManager
        .locator("article")
        .filter({ hasText: productName });

      await productCard.getByRole("button", { name: "Edit" }).click();
      await expect(
        productManager.getByRole("button", { name: "Replace photo" }),
      ).toBeVisible();
      await productManager.getByRole("button", { name: "Cancel" }).click();
      await expectObjectStatus(page, originalImageSrc, 200);

      const productCardAfterCancel = productManager
        .locator("article")
        .filter({ hasText: productName });
      await productCardAfterCancel
        .getByRole("button", { name: "Edit" })
        .click();
      await expect(
        productManager.getByRole("button", { name: "Replace photo" }),
      ).toBeVisible();
      const delayedReplacementUpload = async (route: Route) => {
        if (route.request().method() === "PUT") {
          await new Promise((resolve) => setTimeout(resolve, 750));
        }
        await route.continue();
      };
      await page.route("**/*", delayedReplacementUpload);
      await productManager
        .locator('input[type="file"]')
        .setInputFiles(replacementProductPhoto);
      const replacementUploadStatus = productManager.locator(
        '[role="status"][aria-busy="true"]',
      );
      await expect(replacementUploadStatus).toContainText(
        "Uploading product photo…",
      );
      await expect(replacementUploadStatus).toHaveAttribute(
        "aria-live",
        "polite",
      );
      await expect(
        productManager.getByRole("progressbar", {
          name: "Photo upload progress",
        }),
      ).toBeVisible();
      await expect(
        productManager.locator('button[type="submit"]'),
      ).toBeDisabled();
      await page.unroute("**/*", delayedReplacementUpload);
      await expect(
        page.getByText("Photo uploaded", { exact: true }),
      ).toBeVisible();
      await expect(
        productManager.getByText("product-ochre.svg", { exact: true }),
      ).toBeVisible();

      let imageCleanupRequests = 0;
      const recordImageCleanup = (request: Request) => {
        if (
          request.method() === "DELETE" &&
          request.url().includes(`/api/vendors/${vendorId}/product-image`)
        ) {
          imageCleanupRequests += 1;
        }
      };
      page.on("request", recordImageCleanup);

      const failUpdate = async (route: Route) => {
        if (route.request().method() === "PATCH") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Temporary catalog outage." }),
          });
          return;
        }
        await route.continue();
      };
      await page.route(`**/api/products/${productId}`, failUpdate);
      let retainedImageSrc = "";
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const failedUpdateResponse = page.waitForResponse(
          (response) =>
            response.request().method() === "PATCH" &&
            response.url().includes(`/api/products/${productId}`),
        );
        await productManager
          .getByRole("button", { name: "Save product" })
          .click();
        const failedResponse = await failedUpdateResponse;
        expect(failedResponse.status(), await failedResponse.text()).toBe(500);
        await expect(
          page.getByText("Could not update product", { exact: true }).last(),
        ).toBeVisible();
        await expect(productManager.getByLabel("Product name")).toHaveValue(
          productName,
        );
        const currentImageSrc = await productManager
          .getByAltText("Product preview")
          .getAttribute("src");
        expect(currentImageSrc).toMatch(/\/api\/storage\/objects\//);
        if (attempt === 0) {
          retainedImageSrc = currentImageSrc!;
        } else {
          expect(currentImageSrc).toBe(retainedImageSrc);
        }
        await expectObjectStatus(page, currentImageSrc!, 200);
        await expectObjectStatus(page, originalImageSrc, 200);
        await expect(
          productManager
            .locator("article")
            .filter({ hasText: productName })
            .locator("img"),
        ).toHaveAttribute("src", originalImageSrc);
      }
      expect(imageCleanupRequests).toBe(0);
      await page.unroute(`**/api/products/${productId}`, failUpdate);
      page.off("request", recordImageCleanup);

      const updateResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url().includes(`/api/products/${productId}`),
      );
      await productManager
        .getByRole("button", { name: "Save product" })
        .click();
      const response = await updateResponse;
      expect(response.status(), await response.text()).toBe(200);
      await expect(
        page.getByText("Product updated", { exact: true }),
      ).toBeVisible();

      await reloadWithAuthenticatedSession(page, vendorUser.id);
      const updatedManager = page
        .locator("section")
        .filter({ hasText: "Products and inventory" });
      await expect(updatedManager.locator("article")).toHaveCount(1);
      const updatedCard = updatedManager
        .locator("article")
        .filter({ hasText: productName });
      const replacementImage = updatedCard.locator("img");
      await expect(replacementImage).toBeVisible();
      await expect
        .poll(() =>
          replacementImage.evaluate(
            (element) =>
              element instanceof HTMLImageElement &&
              element.complete &&
              element.naturalWidth > 0,
          ),
        )
        .toBe(true);
      const replacementImageSrc = await replacementImage.getAttribute("src");
      expect(replacementImageSrc).toMatch(/\/api\/storage\/objects\//);
      expect(replacementImageSrc).not.toBe(originalImageSrc);
      await expectObjectStatus(page, originalImageSrc, 404);
      await expectObjectStatus(page, replacementImageSrc!, 200);

      await gotoWithAuthenticatedSession(
        page,
        `/store/${vendorId}`,
        vendorUser.id,
      );
      await expectLoadedImage(page, `img[alt="${productName}"]`);
      await expect(page.locator(`img[alt="${productName}"]`)).toHaveAttribute(
        "src",
        replacementImageSrc!,
      );
      await gotoWithAuthenticatedSession(page, "/shop", vendorUser.id);
      await expectLoadedImage(page, `img[alt="${productName}"]`);
      await expect(page.locator(`img[alt="${productName}"]`)).toHaveAttribute(
        "src",
        replacementImageSrc!,
      );

      await clearProductImage(page, productId);
      await expectObjectStatus(page, replacementImageSrc!, 404);
    });

    await test.step("hide the storefront from shoppers after admin rejection", async () => {
      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      try {
        await signInFixture(adminPage, adminEmail, adminUser.id);
        await gotoWithAuthenticatedSession(
          adminPage,
          "/admin/vendors",
          adminUser.id,
        );
        const application = adminPage.locator("article").filter({
          hasText: returnedBusinessName,
        });
        await expect(application).toBeVisible();
        await application.getByRole("button", { name: "Reject" }).click();
        await expect(
          application.getByText("rejected", { exact: true }),
        ).toBeVisible();
      } finally {
        await adminContext.close();
      }

      const shopperContext = await browser.newContext();
      const shopperPage = await shopperContext.newPage();
      try {
        const storefrontResponse = await shopperPage.request.get(
          `/api/storefronts/${vendorId}`,
        );
        expect(storefrontResponse.status()).toBe(404);
        await shopperPage.goto(`/store/${vendorId}`);
        await expect(
          shopperPage.getByText("Vendor not found.", { exact: true }),
        ).toBeVisible();
        await expect(
          shopperPage.getByRole("heading", { name: returnedBusinessName }),
        ).toHaveCount(0);
      } finally {
        await shopperContext.close();
      }
    });

    await sessionToken(page);
  });
});
