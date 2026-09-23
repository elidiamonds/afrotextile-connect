import { clerk } from "@clerk/testing/playwright";
import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { db, productsTable, vendorsTable } from "@workspace/db";

type ClerkUser = { id: string };
type RequestResult = { status: number; body: string };

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const firstVendorEmail = `afrotextile-catalog-owner-${runId}@example.com`;
const secondVendorEmail = `afrotextile-catalog-other-${runId}@example.com`;
const adminEmail = `afrotextile-catalog-admin-${runId}@example.com`;
const fixturePassword = `Afrotextile-${runId}-fixture!`;
const clerkApiUrl = process.env.CLERK_API_URL ?? "https://api.clerk.com/v1";
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

const firstVendorName = "Indigo Makers Browser Fixture";
const secondVendorName = "Ochre Looms Browser Fixture";
const firstProductName = "Indigo ownership-check wrap";
const secondProductName = "Ochre ownership-check cloth";
const editedProductName = "Indigo ownership-check wrap edited";
const adminEditedProductName = "Indigo administrator-managed wrap";

let firstVendorUser: ClerkUser;
let secondVendorUser: ClerkUser;
let adminUser: ClerkUser;
let firstVendorId: string;
let secondVendorId: string;
let firstProductId: string;

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
  publicMetadata: Record<string, string> = {},
): Promise<ClerkUser> {
  const response = await clerkApi("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [emailAddress],
      password: fixturePassword,
      first_name: "Afrotextile",
      last_name: "Catalog Fixture",
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

async function signInFixture(
  page: Page,
  emailAddress: string,
  expectedUserId: string,
) {
  await page.goto("/");
  await clerk.signOut({ page });
  await clerk.signIn({ page, emailAddress });
  await page.waitForFunction(
    (userId) => window.Clerk?.user?.id === userId,
    expectedUserId,
    { timeout: 15_000 },
  );
  await expect(page.locator("body")).toContainText("Afrotextile");
}

async function requestAsUser(
  page: Page,
  path: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<RequestResult> {
  return page.evaluate(
    async ({ path, method, body }) => {
      const token = await window.Clerk?.session?.getToken();
      const response = await fetch(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, body: await response.text() };
    },
    { path, method, body },
  );
}

async function createVendor(
  ownerUserId: string,
  email: string,
  businessName: string,
) {
  const [vendor] = await db
    .insert(vendorsTable)
    .values({
      ownerUserId,
      businessName,
      contactName: "Catalog Browser Fixture",
      email,
      phone: "+2348012345678",
      location: "Lagos, Nigeria",
      category: "Fabrics",
      plan: "Starter",
      description: `${businessName} browser catalog fixture.`,
      status: "approved",
    })
    .returning({ id: vendorsTable.id });

  if (!vendor)
    throw new Error(`Could not create vendor fixture ${businessName}.`);
  return vendor.id;
}

async function createProduct(vendorId: string, name: string, status: string) {
  const [product] = await db
    .insert(productsTable)
    .values({
      vendorId,
      name,
      category: "Textiles",
      priceCents: 4800,
      sizes: ["One size"],
      fabricType: "Cotton",
      description: `${name} made by an independent textile maker.`,
      inventory: 12,
      status,
    })
    .returning({ id: productsTable.id });

  if (!product) throw new Error(`Could not create product fixture ${name}.`);
  return product.id;
}

test.describe("vendor catalog ownership", () => {
  test.beforeAll(async () => {
    firstVendorUser = await createClerkFixture(firstVendorEmail);
    secondVendorUser = await createClerkFixture(secondVendorEmail);
    adminUser = await createClerkFixture(adminEmail, { role: "admin" });
    firstVendorId = await createVendor(
      firstVendorUser.id,
      firstVendorEmail,
      firstVendorName,
    );
    secondVendorId = await createVendor(
      secondVendorUser.id,
      secondVendorEmail,
      secondVendorName,
    );
    firstProductId = await createProduct(
      firstVendorId,
      firstProductName,
      "draft",
    );
    await createProduct(secondVendorId, secondProductName, "published");
  });

  test.afterAll(async () => {
    if (firstVendorId) {
      await db.delete(vendorsTable).where(eq(vendorsTable.id, firstVendorId));
    }
    if (secondVendorId) {
      await db.delete(vendorsTable).where(eq(vendorsTable.id, secondVendorId));
    }
    await Promise.all([
      deleteClerkFixture(firstVendorUser?.id),
      deleteClerkFixture(secondVendorUser?.id),
      deleteClerkFixture(adminUser?.id),
    ]);
  });

  test("keeps catalog views and mutations scoped to the signed-in vendor", async ({
    page,
    browser,
  }) => {
    await test.step("the vendor can view, edit, and publish its own product", async () => {
      await signInFixture(page, firstVendorEmail, firstVendorUser.id);
      await page.goto(`/vendor/dashboard/${firstVendorId}`);

      await expect(
        page.getByRole("heading", { name: firstVendorName }),
      ).toBeVisible();
      const productManager = page
        .locator("section")
        .filter({ hasText: "Products and inventory" });
      const productCard = productManager
        .locator("article")
        .filter({ hasText: firstProductName });
      await expect(productCard).toBeVisible();
      await expect(productManager).not.toContainText(secondProductName);

      await productCard.getByRole("button", { name: "Edit" }).click();
      await productManager.getByLabel("Product name").fill(editedProductName);
      await productManager.getByLabel("Visibility").selectOption("published");
      const updateResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url().includes(`/api/products/${firstProductId}`),
      );
      await productManager
        .getByRole("button", { name: "Save product" })
        .click();
      const response = await updateResponse;
      expect(response.status(), await response.text()).toBe(200);
      await expect(
        page.getByText("Product updated", { exact: true }),
      ).toBeVisible();
      await expect(
        productManager
          .locator("article")
          .filter({ hasText: editedProductName }),
      ).toContainText("published");
    });

    await test.step("an administrator can inspect and update the approved vendor catalog", async () => {
      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      try {
        await signInFixture(adminPage, adminEmail, adminUser.id);
        await adminPage.goto(`/vendor/dashboard/${firstVendorId}`);

        await expect(
          adminPage.getByRole("heading", { name: firstVendorName }),
        ).toBeVisible();
        const adminProductManager = adminPage
          .locator("section")
          .filter({ hasText: "Products and inventory" });
        const adminProductCard = adminProductManager
          .locator("article")
          .filter({ hasText: editedProductName });
        await expect(adminProductCard).toBeVisible();

        await adminProductCard.getByRole("button", { name: "Edit" }).click();
        await adminProductManager
          .getByLabel("Product name")
          .fill(adminEditedProductName);
        const updateResponse = adminPage.waitForResponse(
          (response) =>
            response.request().method() === "PATCH" &&
            response.url().includes(`/api/products/${firstProductId}`),
        );
        await adminProductManager
          .getByRole("button", { name: "Save product" })
          .click();
        const response = await updateResponse;
        expect(response.status(), await response.text()).toBe(200);
        await expect(
          adminProductManager
            .locator("article")
            .filter({ hasText: adminEditedProductName }),
        ).toContainText("published");
      } finally {
        await adminContext.close();
      }
    });

    await test.step("the second vendor can see only its own catalog", async () => {
      const secondVendorContext = await browser.newContext();
      const secondVendorPage = await secondVendorContext.newPage();
      try {
        await signInFixture(
          secondVendorPage,
          secondVendorEmail,
          secondVendorUser.id,
        );
        await secondVendorPage.goto(`/vendor/dashboard/${secondVendorId}`);
        await expect(
          secondVendorPage.getByRole("heading", { name: secondVendorName }),
        ).toBeVisible();
        const secondProductManager = secondVendorPage
          .locator("section")
          .filter({ hasText: "Products and inventory" });
        await expect(
          secondProductManager
            .locator("article")
            .filter({ hasText: secondProductName }),
        ).toBeVisible();
        await expect(secondProductManager).not.toContainText(
          adminEditedProductName,
        );
      } finally {
        await secondVendorContext.close();
      }
    });

    await test.step("the second vendor cannot view, edit, or publish the first vendor's products", async () => {
      const secondVendorContext = await browser.newContext();
      const secondVendorPage = await secondVendorContext.newPage();
      try {
        await signInFixture(
          secondVendorPage,
          secondVendorEmail,
          secondVendorUser.id,
        );
        let deniedVendorRequestCount = 0;
        const countDeniedVendorRequests = (request: Request) => {
          if (
            request.method() === "GET" &&
            request.url().includes(`/api/vendors/${firstVendorId}`)
          ) {
            deniedVendorRequestCount += 1;
          }
        };
        secondVendorPage.on("request", countDeniedVendorRequests);
        const deniedVendorResponse = secondVendorPage.waitForResponse(
          (response) =>
            response.request().method() === "GET" &&
            response.url().includes(`/api/vendors/${firstVendorId}`),
        );
        await secondVendorPage.goto(`/vendor/dashboard/${firstVendorId}`);
        expect((await deniedVendorResponse).status()).toBe(403);
        expect(deniedVendorRequestCount).toBe(1);
        await expect(
          secondVendorPage.getByText("Vendor dashboard not found.", {
            exact: true,
          }),
        ).toBeVisible({ timeout: 10_000 });

        const manageResponse = await requestAsUser(
          secondVendorPage,
          `/api/vendors/${firstVendorId}/products/manage`,
          "GET",
        );
        expect(manageResponse.status).toBe(403);
        expect(manageResponse.body).toContain(
          "You cannot manage this vendor catalog.",
        );

        const editResponse = await requestAsUser(
          secondVendorPage,
          `/api/products/${firstProductId}`,
          "PATCH",
          { name: "Cross-vendor edit", status: "published" },
        );
        expect(editResponse.status).toBe(403);
        expect(editResponse.body).toContain("You cannot manage this product.");

        const publishResponse = await requestAsUser(
          secondVendorPage,
          `/api/vendors/${firstVendorId}/products`,
          "POST",
          {
            name: "Cross-vendor publish",
            category: "Textiles",
            price: 48,
            sizes: ["One size"],
            fabricType: "Cotton",
            description: "This product must not enter another vendor catalog.",
            inventory: 1,
            status: "published",
          },
        );
        expect(publishResponse.status).toBe(403);
        expect(publishResponse.body).toContain(
          "You cannot manage this vendor catalog.",
        );
      } finally {
        await secondVendorContext.close();
      }
    });

    await test.step("anonymous visitors enter the sign-in flow", async () => {
      const anonymousContext: BrowserContext = await browser.newContext();
      const anonymousPage = await anonymousContext.newPage();
      try {
        await anonymousPage.goto(`/vendor/dashboard/${firstVendorId}`);
        await expect(anonymousPage).toHaveURL(/\/sign-in/);
        await expect(anonymousPage.locator("body")).toContainText("Sign in");
        await expect(anonymousPage.locator("body")).not.toContainText(
          editedProductName,
        );
      } finally {
        await anonymousContext.close();
      }
    });
  });

  test("lets vendors retry temporary dashboard failures but not forbidden requests", async ({
    page,
    browser,
  }) => {
    await signInFixture(page, firstVendorEmail, firstVendorUser.id);

    let dashboardRequestCount = 0;
    const failFirstDashboardRequest = async (route: Route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }

      dashboardRequestCount += 1;
      if (dashboardRequestCount <= 4) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Temporary dashboard outage" }),
        });
        return;
      }

      await route.continue();
    };

    await page.route(
      `**/api/vendors/${firstVendorId}`,
      failFirstDashboardRequest,
    );
    try {
      await page.goto(`/vendor/dashboard/${firstVendorId}`);
      await expect(
        page.getByTestId("state-vendor-dashboard-error"),
      ).toContainText("The dashboard could not be loaded.", {
        timeout: 20_000,
      });
      await expect(page.getByRole("alert")).toContainText(
        "The dashboard could not be loaded.",
      );
      const retryButton = page.getByTestId("button-retry-vendor-dashboard");
      await expect(retryButton).toBeVisible();
      await expect(retryButton).toHaveAccessibleName(
        "Try again to reload the dashboard",
      );
      expect(dashboardRequestCount).toBe(4);

      await retryButton.focus();
      await expect(retryButton).toBeFocused();
      await retryButton.press("Enter");
      await expect(
        page.getByRole("heading", { name: firstVendorName }),
      ).toBeVisible();
      expect(dashboardRequestCount).toBe(5);
    } finally {
      await page.unroute(
        `**/api/vendors/${firstVendorId}`,
        failFirstDashboardRequest,
      );
    }

    const deniedContext = await browser.newContext();
    const deniedPage = await deniedContext.newPage();
    try {
      await signInFixture(
        deniedPage,
        secondVendorEmail,
        secondVendorUser.id,
      );
      let deniedRequestCount = 0;
      deniedPage.on("request", (request) => {
        if (
          request.method() === "GET" &&
          request.url().includes(`/api/vendors/${firstVendorId}`)
        ) {
          deniedRequestCount += 1;
        }
      });
      const deniedResponse = deniedPage.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes(`/api/vendors/${firstVendorId}`),
      );

      await deniedPage.goto(`/vendor/dashboard/${firstVendorId}`);
      expect((await deniedResponse).status()).toBe(403);
      expect(deniedRequestCount).toBe(1);
      await expect(
        deniedPage.getByText("Vendor dashboard not found.", { exact: true }),
      ).toBeVisible();
    } finally {
      await deniedContext.close();
    }
  });

  test("lets vendors retry catalog and orders independently after section failures", async ({
    page,
  }) => {
    await signInFixture(page, firstVendorEmail, firstVendorUser.id);

    let catalogRequestCount = 0;
    let orderRequestCount = 0;
    const failCatalogRequests = async (route: Route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }

      catalogRequestCount += 1;
      if (catalogRequestCount <= 4) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Temporary catalog outage" }),
        });
        return;
      }

      await route.continue();
    };
    const failOrderRequests = async (route: Route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }

      orderRequestCount += 1;
      if (orderRequestCount <= 4) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Temporary orders outage" }),
        });
        return;
      }

      await route.continue();
    };

    await page.route(
      `**/api/vendors/${firstVendorId}/products/manage`,
      failCatalogRequests,
    );
    await page.route(
      `**/api/vendors/${firstVendorId}/orders/manage`,
      failOrderRequests,
    );

    try {
      await page.goto(`/vendor/dashboard/${firstVendorId}`);

      const catalogSection = page
        .locator("section")
        .filter({ hasText: "Products and inventory" });
      await expect(
        catalogSection.getByText("Your catalog could not be loaded.", {
          exact: true,
        }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        catalogSection.getByRole("button", { name: "Retry catalog" }),
      ).toBeVisible();

      const orderSection = page.getByTestId("vendor-orders-section");
      await expect(orderSection).toBeVisible({ timeout: 20_000 });
      await expect(
        orderSection.getByRole("button", { name: "Retry orders" }),
      ).toBeVisible();
      expect(catalogRequestCount).toBe(4);
      expect(orderRequestCount).toBe(4);

      const unsavedProductName = "Unsaved catalog edit";
      await catalogSection.getByLabel("Product name").fill(unsavedProductName);
      await catalogSection
        .getByRole("button", { name: "Retry catalog" })
        .click();
      await expect(
        catalogSection.getByText(firstProductName, { exact: true }),
      ).toBeVisible();
      await expect(catalogSection.getByLabel("Product name")).toHaveValue(
        unsavedProductName,
      );
      await expect(
        catalogSection.getByText("Your catalog could not be loaded.", {
          exact: true,
        }),
      ).toHaveCount(0);
      expect(catalogRequestCount).toBe(5);
      expect(orderRequestCount).toBe(4);

      await orderSection
        .getByRole("button", { name: "Retry orders" })
        .click();
      await expect(orderSection.getByText("No orders yet")).toBeVisible();
      await expect(orderSection).not.toContainText(
        "Orders could not be loaded",
      );
      expect(catalogRequestCount).toBe(5);
      expect(orderRequestCount).toBe(5);
    } finally {
      await page.unroute(
        `**/api/vendors/${firstVendorId}/products/manage`,
        failCatalogRequests,
      );
      await page.unroute(
        `**/api/vendors/${firstVendorId}/orders/manage`,
        failOrderRequests,
      );
    }
  });

  test("lets a vendor recover from a failed photo upload without duplicating the product", async ({
    page,
  }) => {
    const productName = "Indigo upload recovery wrap";
    const category = "Recovery textiles";
    const price = "64";
    const inventory = "7";
    const fabric = "Handwoven cotton";
    const sizes = "One size";
    const description =
      "A handwoven cotton wrap used to verify photo upload recovery.";
    const photo = {
      name: "upload-recovery.png",
      mimeType: "image/png",
      buffer: Buffer.from("browser upload recovery fixture"),
    };

    await signInFixture(page, firstVendorEmail, firstVendorUser.id);
    await page.goto(`/vendor/dashboard/${firstVendorId}`);

    const productManager = page
      .locator("section")
      .filter({ hasText: "Products and inventory" });
    await expect(
      productManager.getByRole("heading", { name: "Products and inventory" }),
    ).toBeVisible();

    await productManager.getByLabel("Product name").fill(productName);
    await productManager.getByLabel("Category").fill(category);
    await productManager.getByLabel("Price", { exact: true }).fill(price);
    await productManager.getByLabel("Units in stock").fill(inventory);
    await productManager.getByLabel("Fabric or material").fill(fabric);
    await productManager.getByLabel("Sizes").fill(sizes);
    await productManager.getByLabel("Description").fill(description);

    let createRequestCount = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().includes(`/api/vendors/${firstVendorId}/products`)
      ) {
        createRequestCount += 1;
      }
    });

    let failedUploadCount = 0;
    const failFirstStorageUpload = async (route: Route) => {
      if (
        failedUploadCount === 0 &&
        route.request().method() === "PUT" &&
        route.request().url().includes("storage.googleapis.com")
      ) {
        failedUploadCount += 1;
        await route.abort("failed");
        return;
      }
      await route.continue();
    };
    await page.route("**/*", failFirstStorageUpload);

    try {
      await productManager.locator('input[type="file"]').setInputFiles(photo);

      const failedUploadAlert = productManager
        .getByRole("alert")
        .filter({ hasText: "Photo upload failed" });
      await expect(failedUploadAlert).toBeVisible();
      await expect(failedUploadAlert).toContainText(
        "Your product details are still here.",
      );
      await expect(
        productManager.getByRole("button", { name: "Retry this photo" }),
      ).toBeVisible();
      await expect(productManager.getByLabel("Product name")).toHaveValue(
        productName,
      );
      await expect(productManager.getByLabel("Category")).toHaveValue(category);
      await expect(
        productManager.getByLabel("Price", { exact: true }),
      ).toHaveValue(price);
      await expect(productManager.getByLabel("Units in stock")).toHaveValue(
        inventory,
      );
      await expect(productManager.getByLabel("Fabric or material")).toHaveValue(
        fabric,
      );
      await expect(productManager.getByLabel("Sizes")).toHaveValue(sizes);
      await expect(productManager.getByLabel("Description")).toHaveValue(
        description,
      );
      expect(createRequestCount).toBe(0);

      await productManager
        .getByRole("button", { name: "Retry this photo" })
        .click();
      await expect(
        page.getByText("Photo uploaded", { exact: true }),
      ).toBeVisible();
      await expect(
        productManager.getByText(photo.name, { exact: true }),
      ).toBeVisible();

      const createResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes(`/api/vendors/${firstVendorId}/products`),
      );
      await productManager.getByRole("button", { name: "Add product" }).click();
      const response = await createResponse;
      expect(response.status(), await response.text()).toBe(201);
      expect(createRequestCount).toBe(1);

      await expect(
        productManager.locator("article").filter({ hasText: productName }),
      ).toHaveCount(1);

      const [createdProducts] = await Promise.all([
        db
          .select({ id: productsTable.id })
          .from(productsTable)
          .where(
            and(
              eq(productsTable.vendorId, firstVendorId),
              eq(productsTable.name, productName),
            ),
          ),
      ]);
      expect(createdProducts).toHaveLength(1);
    } finally {
      await page.unroute("**/*", failFirstStorageUpload);
    }
  });

  test("lets a vendor cancel an in-progress photo upload without losing product details", async ({
    page,
  }) => {
    const productName = "Indigo canceled upload wrap";
    const category = "Cancellation textiles";
    const price = "58";
    const inventory = "5";
    const fabric = "Handwoven cotton";
    const sizes = "One size";
    const description =
      "A handwoven cotton wrap used to verify photo upload cancellation.";
    const photo = {
      name: "canceled-upload.png",
      mimeType: "image/png",
      buffer: Buffer.from("browser canceled upload fixture"),
    };

    await signInFixture(page, firstVendorEmail, firstVendorUser.id);
    await page.goto(`/vendor/dashboard/${firstVendorId}`);

    const productManager = page
      .locator("section")
      .filter({ hasText: "Products and inventory" });
    await productManager.getByLabel("Product name").fill(productName);
    await productManager.getByLabel("Category").fill(category);
    await productManager.getByLabel("Price", { exact: true }).fill(price);
    await productManager.getByLabel("Units in stock").fill(inventory);
    await productManager.getByLabel("Fabric or material").fill(fabric);
    await productManager.getByLabel("Sizes").fill(sizes);
    await productManager.getByLabel("Description").fill(description);

    const delayStorageUpload = async (route: Route) => {
      if (
        route.request().method() === "PUT" &&
        route.request().url().includes("storage.googleapis.com")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
      await route.continue();
    };
    await page.route("**/*", delayStorageUpload);

    try {
      await productManager.locator('input[type="file"]').setInputFiles(photo);
      await expect(
        productManager.locator('[role="status"][aria-busy="true"]'),
      ).toContainText("Uploading product photo…");
      const cancelButton = productManager.getByRole("button", {
        name: "Cancel photo upload",
      });
      await expect(cancelButton).toBeVisible();

      const cleanupResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "DELETE" &&
          response
            .url()
            .includes(`/api/vendors/${firstVendorId}/product-image`),
      );
      await cancelButton.focus();
      await cancelButton.press("Enter");
      expect((await cleanupResponse).status()).toBe(204);

      await expect(
        productManager.locator('button[type="submit"]'),
      ).toBeEnabled();
      await expect(
        productManager
          .getByRole("alert")
          .filter({ hasText: "Photo upload failed" }),
      ).toHaveCount(0);
      await expect(
        productManager.getByRole("button", { name: "Retry this photo" }),
      ).toHaveCount(0);
      await expect(productManager.getByLabel("Product name")).toHaveValue(
        productName,
      );
      await expect(productManager.getByLabel("Category")).toHaveValue(category);
      await expect(
        productManager.getByLabel("Price", { exact: true }),
      ).toHaveValue(price);
      await expect(productManager.getByLabel("Units in stock")).toHaveValue(
        inventory,
      );
      await expect(productManager.getByLabel("Fabric or material")).toHaveValue(
        fabric,
      );
      await expect(productManager.getByLabel("Sizes")).toHaveValue(sizes);
      await expect(productManager.getByLabel("Description")).toHaveValue(
        description,
      );
    } finally {
      await page.unroute("**/*", delayStorageUpload);
    }
  });

  test("lets a vendor recover when the photo upload URL request fails", async ({
    page,
  }) => {
    const productName = "Indigo upload URL recovery wrap";
    const category = "Recovery textiles";
    const price = "66";
    const inventory = "8";
    const fabric = "Handwoven cotton";
    const sizes = "One size";
    const description =
      "A handwoven cotton wrap used to verify upload URL recovery.";
    const photo = {
      name: "upload-url-recovery.png",
      mimeType: "image/png",
      buffer: Buffer.from("browser upload URL recovery fixture"),
    };

    await signInFixture(page, firstVendorEmail, firstVendorUser.id);
    await page.goto(`/vendor/dashboard/${firstVendorId}`);

    const productManager = page
      .locator("section")
      .filter({ hasText: "Products and inventory" });
    await expect(
      productManager.getByRole("heading", { name: "Products and inventory" }),
    ).toBeVisible();

    await productManager.getByLabel("Product name").fill(productName);
    await productManager.getByLabel("Category").fill(category);
    await productManager.getByLabel("Price", { exact: true }).fill(price);
    await productManager.getByLabel("Units in stock").fill(inventory);
    await productManager.getByLabel("Fabric or material").fill(fabric);
    await productManager.getByLabel("Sizes").fill(sizes);
    await productManager.getByLabel("Description").fill(description);

    let createRequestCount = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().includes(`/api/vendors/${firstVendorId}/products`)
      ) {
        createRequestCount += 1;
      }
    });

    let uploadUrlRequestCount = 0;
    const failFirstUploadUrlRequest = async (route: Route) => {
      const request = route.request();
      if (
        request.method() === "POST" &&
        request
          .url()
          .includes(`/api/vendors/${firstVendorId}/product-image-upload-url`)
      ) {
        uploadUrlRequestCount += 1;
        if (uploadUrlRequestCount === 1) {
          await route.abort("failed");
          return;
        }
      }
      await route.continue();
    };
    await page.route("**/*", failFirstUploadUrlRequest);

    try {
      await productManager.locator('input[type="file"]').setInputFiles(photo);

      const failedUploadAlert = productManager
        .getByRole("alert")
        .filter({ hasText: "Photo upload failed" });
      await expect(failedUploadAlert).toBeVisible();
      await expect(failedUploadAlert).toContainText(
        "Could not prepare the photo upload.",
      );
      await expect(failedUploadAlert).toContainText(
        "Your product details are still here.",
      );
      await expect(
        productManager.getByRole("button", { name: "Retry this photo" }),
      ).toBeVisible();
      await expect(productManager.getByLabel("Product name")).toHaveValue(
        productName,
      );
      await expect(productManager.getByLabel("Category")).toHaveValue(category);
      await expect(
        productManager.getByLabel("Price", { exact: true }),
      ).toHaveValue(price);
      await expect(productManager.getByLabel("Units in stock")).toHaveValue(
        inventory,
      );
      await expect(productManager.getByLabel("Fabric or material")).toHaveValue(
        fabric,
      );
      await expect(productManager.getByLabel("Sizes")).toHaveValue(sizes);
      await expect(productManager.getByLabel("Description")).toHaveValue(
        description,
      );
      expect(uploadUrlRequestCount).toBe(1);
      expect(createRequestCount).toBe(0);

      await productManager
        .getByRole("button", { name: "Retry this photo" })
        .click();
      await expect(
        page.getByText("Photo uploaded", { exact: true }),
      ).toBeVisible();
      await expect(
        productManager.getByText(photo.name, { exact: true }),
      ).toBeVisible();
      expect(uploadUrlRequestCount).toBe(2);

      const createResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes(`/api/vendors/${firstVendorId}/products`),
      );
      await productManager.getByRole("button", { name: "Add product" }).click();
      const response = await createResponse;
      expect(response.status(), await response.text()).toBe(201);
      expect(createRequestCount).toBe(1);

      await expect(
        productManager.locator("article").filter({ hasText: productName }),
      ).toHaveCount(1);
    } finally {
      await page.unroute("**/*", failFirstUploadUrlRequest);
    }
  });

  test("lets a vendor replace a failed photo upload before saving once", async ({
    page,
  }) => {
    const productName = "Indigo replacement recovery wrap";
    const category = "Recovery textiles";
    const price = "68";
    const inventory = "9";
    const fabric = "Handwoven cotton";
    const sizes = "One size";
    const description =
      "A handwoven cotton wrap used to verify replacement photo recovery.";
    const failedPhoto = {
      name: "replacement-failed.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#263b73"/></svg>',
      ),
    };
    const replacementPhoto = {
      name: "replacement-success.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#a85b2a"/></svg>',
      ),
    };

    await signInFixture(page, firstVendorEmail, firstVendorUser.id);
    await page.goto(`/vendor/dashboard/${firstVendorId}`);

    const productManager = page
      .locator("section")
      .filter({ hasText: "Products and inventory" });
    await expect(
      productManager.getByRole("heading", { name: "Products and inventory" }),
    ).toBeVisible();

    await productManager.getByLabel("Product name").fill(productName);
    await productManager.getByLabel("Category").fill(category);
    await productManager.getByLabel("Price", { exact: true }).fill(price);
    await productManager.getByLabel("Units in stock").fill(inventory);
    await productManager.getByLabel("Fabric or material").fill(fabric);
    await productManager.getByLabel("Sizes").fill(sizes);
    await productManager.getByLabel("Description").fill(description);

    let createRequestCount = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().includes(`/api/vendors/${firstVendorId}/products`)
      ) {
        createRequestCount += 1;
      }
    });

    let storageUploadCount = 0;
    const failFirstStorageUpload = async (route: Route) => {
      if (
        storageUploadCount === 0 &&
        route.request().method() === "PUT" &&
        route.request().url().includes("storage.googleapis.com")
      ) {
        storageUploadCount += 1;
        await route.abort("failed");
        return;
      }
      if (
        route.request().method() === "PUT" &&
        route.request().url().includes("storage.googleapis.com")
      ) {
        storageUploadCount += 1;
      }
      await route.continue();
    };
    await page.route("**/*", failFirstStorageUpload);

    try {
      const firstUploadUrlResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response
            .url()
            .includes(`/api/vendors/${firstVendorId}/product-image-upload-url`),
      );
      await productManager
        .locator('input[type="file"]')
        .setInputFiles(failedPhoto);
      const firstUpload = await firstUploadUrlResponse;
      const firstUploadBody = (await firstUpload.json()) as {
        objectPath: string;
      };

      const failedUploadAlert = productManager
        .getByRole("alert")
        .filter({ hasText: "Photo upload failed" });
      await expect(failedUploadAlert).toBeVisible();
      await expect(failedUploadAlert).toContainText(
        "Your product details are still here.",
      );
      await expect(
        productManager.getByRole("button", {
          name: "Choose a different photo",
        }),
      ).toBeVisible();
      await expect(productManager.getByLabel("Product name")).toHaveValue(
        productName,
      );
      await expect(productManager.getByLabel("Category")).toHaveValue(category);
      await expect(
        productManager.getByLabel("Price", { exact: true }),
      ).toHaveValue(price);
      await expect(productManager.getByLabel("Units in stock")).toHaveValue(
        inventory,
      );
      await expect(productManager.getByLabel("Fabric or material")).toHaveValue(
        fabric,
      );
      await expect(productManager.getByLabel("Sizes")).toHaveValue(sizes);
      await expect(productManager.getByLabel("Description")).toHaveValue(
        description,
      );
      expect(createRequestCount).toBe(0);

      const replacementUploadUrlResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response
            .url()
            .includes(`/api/vendors/${firstVendorId}/product-image-upload-url`),
      );
      await productManager
        .locator('input[type="file"]')
        .setInputFiles(replacementPhoto);
      const replacementUpload = await replacementUploadUrlResponse;
      const replacementUploadBody = (await replacementUpload.json()) as {
        objectPath: string;
      };

      expect(replacementUploadBody.objectPath).not.toBe(
        firstUploadBody.objectPath,
      );
      await expect(failedUploadAlert).toHaveCount(0);
      await expect(
        page.getByText("Photo uploaded", { exact: true }),
      ).toBeVisible();
      await expect(
        productManager.getByText(replacementPhoto.name, { exact: true }),
      ).toBeVisible();
      expect(storageUploadCount).toBe(2);

      const createRequest = page.waitForRequest(
        (request) =>
          request.method() === "POST" &&
          request.url().includes(`/api/vendors/${firstVendorId}/products`),
      );
      const createResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes(`/api/vendors/${firstVendorId}/products`),
      );
      await productManager.getByRole("button", { name: "Add product" }).click();
      const request = await createRequest;
      const response = await createResponse;
      expect(response.status(), await response.text()).toBe(201);
      expect(createRequestCount).toBe(1);
      expect(JSON.parse(request.postData() ?? "{}")).toMatchObject({
        name: productName,
        imageUrl: replacementUploadBody.objectPath,
      });

      await expect(
        productManager.locator("article").filter({ hasText: productName }),
      ).toHaveCount(1);

      const createdProducts = await db
        .select({
          id: productsTable.id,
          imageUrl: productsTable.imageUrl,
        })
        .from(productsTable)
        .where(
          and(
            eq(productsTable.vendorId, firstVendorId),
            eq(productsTable.name, productName),
          ),
        );
      expect(createdProducts).toHaveLength(1);
      expect(createdProducts[0]?.imageUrl).toBe(
        replacementUploadBody.objectPath,
      );
    } finally {
      await page.unroute("**/*", failFirstStorageUpload);
    }
  });

  test("lets an administrator update storefront details without widening vendor access", async ({
    browser,
  }) => {
    const editedBusinessName = "Indigo Makers Administrator Fixture";
    const editedDescription =
      "An administrator-approved storefront story for browser coverage.";

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    try {
      await signInFixture(adminPage, adminEmail, adminUser.id);
      await adminPage.goto(`/vendor/dashboard/${firstVendorId}`);

      await expect(
        adminPage.getByRole("heading", { name: firstVendorName }),
      ).toBeVisible();
      await adminPage.getByLabel("Business name").fill(editedBusinessName);
      await adminPage.getByLabel("Brand story").fill(editedDescription);
      await adminPage.getByText("Choose a category", { exact: true }).click();
      await adminPage.getByRole("option", { name: "Fabrics" }).click();

      const updateRequest = adminPage.waitForRequest(
        (request) =>
          request.method() === "PATCH" &&
          request.url().includes(`/api/vendors/${firstVendorId}`),
      );
      const updateResponse = adminPage.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url().includes(`/api/vendors/${firstVendorId}`),
      );
      await adminPage.getByRole("button", { name: "Save changes" }).click();
      const request = await updateRequest;
      const response = await updateResponse;
      expect(
        response.status(),
        `Storefront update failed: ${await response.text()} (payload: ${request.postData()})`,
      ).toBe(200);
      await expect(
        adminPage.getByText("Storefront saved", { exact: true }),
      ).toBeVisible();

      await adminPage.reload();
      await expect(
        adminPage.getByRole("heading", { name: editedBusinessName }),
      ).toBeVisible();
      await expect(adminPage.getByLabel("Brand story")).toHaveValue(
        editedDescription,
      );

      const [savedVendor] = await db
        .select({
          businessName: vendorsTable.businessName,
          description: vendorsTable.description,
        })
        .from(vendorsTable)
        .where(eq(vendorsTable.id, firstVendorId));
      expect(savedVendor).toMatchObject({
        businessName: editedBusinessName,
        description: editedDescription,
      });
    } finally {
      await adminContext.close();
    }

    const secondVendorContext = await browser.newContext();
    const secondVendorPage = await secondVendorContext.newPage();
    try {
      await signInFixture(
        secondVendorPage,
        secondVendorEmail,
        secondVendorUser.id,
      );
      const deniedResponse = await requestAsUser(
        secondVendorPage,
        `/api/vendors/${firstVendorId}`,
        "PATCH",
        {
          businessName: "Unauthorized storefront edit",
          description: "This storefront change must not be persisted.",
        },
      );
      expect(deniedResponse.status).toBe(404);
      expect(deniedResponse.body).toContain("Vendor not found");

      const [unchangedVendor] = await db
        .select({
          businessName: vendorsTable.businessName,
          description: vendorsTable.description,
        })
        .from(vendorsTable)
        .where(eq(vendorsTable.id, firstVendorId));
      expect(unchangedVendor).toMatchObject({
        businessName: editedBusinessName,
        description: editedDescription,
      });
    } finally {
      await secondVendorContext.close();
    }
  });

  test("explains rejected storefront saves without overwriting saved details", async ({
    browser,
  }) => {
    const [savedBefore] = await db
      .select({
        businessName: vendorsTable.businessName,
        description: vendorsTable.description,
      })
      .from(vendorsTable)
      .where(eq(vendorsTable.id, firstVendorId));
    if (!savedBefore)
      throw new Error("Could not load storefront test fixture.");

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    try {
      await signInFixture(adminPage, adminEmail, adminUser.id);
      await adminPage.goto(`/vendor/dashboard/${firstVendorId}`);
      await expect(
        adminPage.getByRole("heading", { name: savedBefore.businessName }),
      ).toBeVisible();

      await adminPage.route(
        `**/api/vendors/${firstVendorId}`,
        async (route) => {
          if (route.request().method() !== "PATCH") {
            await route.continue();
            return;
          }

          const payload = JSON.parse(
            route.request().postData() ?? "{}",
          ) as Record<string, unknown>;
          payload.businessName = "x";
          await route.continue({ postData: JSON.stringify(payload) });
        },
      );
      try {
        const updateResponse = adminPage.waitForResponse(
          (response) =>
            response.request().method() === "PATCH" &&
            response.url().includes(`/api/vendors/${firstVendorId}`),
        );
        await adminPage.getByRole("button", { name: "Save changes" }).click();
        expect((await updateResponse).status()).toBe(422);
        await expect(
          adminPage.getByText("Business name must be at least 2 characters.", {
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          adminPage.getByRole("heading", { name: savedBefore.businessName }),
        ).toBeVisible();
      } finally {
        await adminPage.unroute(`**/api/vendors/${firstVendorId}`);
      }

      const [savedVendor] = await db
        .select({
          businessName: vendorsTable.businessName,
          description: vendorsTable.description,
        })
        .from(vendorsTable)
        .where(eq(vendorsTable.id, firstVendorId));
      expect(savedVendor).toEqual(savedBefore);
    } finally {
      await adminContext.close();
    }
  });
});
