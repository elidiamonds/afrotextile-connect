import { clerk } from "@clerk/testing/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db, pool, productsTable, vendorsTable } from "@workspace/db";

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

async function signInFixture(page: Page, emailAddress: string) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress });
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
    await pool.end();
  });

  test("keeps catalog views and mutations scoped to the signed-in vendor", async ({
    page,
    browser,
  }) => {
    await test.step("the vendor can view, edit, and publish its own product", async () => {
      await signInFixture(page, firstVendorEmail);
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
        await signInFixture(adminPage, adminEmail);
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
        await signInFixture(secondVendorPage, secondVendorEmail);
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
        await signInFixture(secondVendorPage, secondVendorEmail);
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
});
