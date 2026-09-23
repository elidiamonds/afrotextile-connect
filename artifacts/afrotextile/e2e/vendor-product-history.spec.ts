import { clerk } from "@clerk/testing/playwright";
import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { eq } from "drizzle-orm";
import { db, vendorsTable } from "@workspace/db";

type ClerkUser = { id: string };
type RequestResult = { status: number; body: string };

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const vendorEmail = `afrotextile-history-owner-${runId}@example.com`;
const reviewerEmail = `afrotextile-history-reviewer-${runId}@example.com`;
const deniedEmail = `afrotextile-history-denied-${runId}@example.com`;
const fixturePassword = `Afrotextile-${runId}-fixture!`;
const clerkApiUrl = process.env.CLERK_API_URL ?? "https://api.clerk.com/v1";
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

const vendorName = "Indigo History Browser Fixture";
const createdProductName = "Indigo browser history wrap";
const editedProductName = "Updated indigo browser history wrap";

let vendorUser: ClerkUser;
let reviewerUser: ClerkUser;
let deniedUser: ClerkUser;
let vendorId: string;

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
  publicMetadata: Record<string, unknown> = {},
): Promise<ClerkUser> {
  const response = await clerkApi("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [emailAddress],
      password: fixturePassword,
      first_name: "Afrotextile",
      last_name: "History Fixture",
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
  body?: unknown,
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
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.text() };
    },
    { path, method, body },
  );
}

async function createVendor(ownerUserId: string, email: string) {
  const [vendor] = await db
    .insert(vendorsTable)
    .values({
      ownerUserId,
      businessName: vendorName,
      contactName: "History Browser Fixture",
      email,
      phone: "+2348012345678",
      location: "Lagos, Nigeria",
      category: "Fabrics",
      plan: "Starter",
      description: "A browser fixture for product history coverage.",
      status: "approved",
    })
    .returning({ id: vendorsTable.id });

  if (!vendor) throw new Error("Could not create the vendor browser fixture.");
  return vendor.id;
}

function productManager(
  page: Page,
  heading = "Products and inventory",
): Locator {
  return page.locator("section").filter({ hasText: heading });
}

function productCard(
  page: Page,
  productName: string,
  manager = productManager(page),
) {
  return manager.locator("article").filter({ hasText: productName });
}

function reviewerProductManager(page: Page) {
  const vendorCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: vendorName, exact: true }),
  });
  return vendorCard
    .locator("section")
    .filter({ hasText: "Products and change history" });
}

async function saveProduct(
  page: Page,
  productName: string,
  status: "draft" | "published",
) {
  const manager = productManager(page);
  const card = productCard(page, productName);
  await card.getByRole("button", { name: "Edit" }).click();
  await manager.getByLabel("Visibility").selectOption(status);

  const updateResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().includes("/api/products/"),
  );
  await manager.getByRole("button", { name: "Save product" }).click();
  const response = await updateResponse;
  expect(response.status(), await response.text()).toBe(200);
  await expect(
    page.getByText("Product updated", { exact: true }),
  ).toBeVisible();
}

async function expectHistory(
  page: Page,
  productName: string,
  expectedNameChange = true,
  manager = productManager(page),
) {
  const history = productCard(page, productName, manager).locator("details");
  if ((await history.getAttribute("open")) === null) {
    await history.locator("summary").click();
  }
  await expect(history).toHaveAttribute("open", "");

  const entries = history.locator("div.border-l-2");
  await expect(entries).toHaveCount(4);
  await expect(entries.filter({ hasText: "archived" })).toHaveCount(1);
  await expect(
    entries.filter({ hasText: "Status: published → archived" }),
  ).toHaveCount(1);
  await expect(
    entries.filter({ hasText: "Status: draft → published" }),
  ).toHaveCount(1);
  await expect(entries.filter({ hasText: "edited" })).toHaveCount(1);
  if (expectedNameChange) {
    await expect(
      entries.filter({
        hasText: `Name: ${createdProductName} → ${editedProductName}`,
      }),
    ).toHaveCount(1);
  }
  const createdEntry = entries.filter({ hasText: "created" });
  await expect(createdEntry).toHaveCount(1);
  await expect(createdEntry.locator("span").nth(1)).not.toHaveText("");
}

test.describe("vendor product change history", () => {
  test.beforeAll(async () => {
    vendorUser = await createClerkFixture(vendorEmail);
    reviewerUser = await createClerkFixture(reviewerEmail, {
      vendorReviewer: true,
    });
    deniedUser = await createClerkFixture(deniedEmail);
    vendorId = await createVendor(vendorUser.id, vendorEmail);
  });

  test.afterAll(async () => {
    if (vendorId) {
      await db.delete(vendorsTable).where(eq(vendorsTable.id, vendorId));
    }
    await Promise.all([
      deleteClerkFixture(vendorUser?.id),
      deleteClerkFixture(reviewerUser?.id),
      deleteClerkFixture(deniedUser?.id),
    ]);
  });

  test("preserves the owner's product history after a dashboard reload", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);

    await signInFixture(page, vendorEmail, vendorUser.id);
    await page.goto(`/vendor/dashboard/${vendorId}`);

    const manager = productManager(page);
    await manager.getByLabel("Product name").fill(createdProductName);
    await manager.getByLabel("Category").fill("Textiles");
    await manager.getByLabel("Price", { exact: true }).fill("48");
    await manager.getByLabel("Units in stock").fill("12");
    await manager.getByLabel("Fabric or material").fill("Cotton");
    await manager.getByLabel("Sizes").fill("One size");
    await manager
      .getByLabel("Description")
      .fill("A hand-dyed cotton wrap made by independent makers.");

    const createResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(`/api/vendors/${vendorId}/products`),
    );
    await manager.getByRole("button", { name: "Add product" }).click();
    const createdResponse = await createResponse;
    expect(createdResponse.status(), await createdResponse.text()).toBe(201);
    const productId = ((await createdResponse.json()) as { id: string }).id;
    await expect(productCard(page, createdProductName)).toBeVisible();

    const reviewerContext: BrowserContext = await browser.newContext();
    const reviewerPage = await reviewerContext.newPage();
    try {
      await test.step("open the current catalog and history as a reviewer", async () => {
        await signInFixture(reviewerPage, reviewerEmail, reviewerUser.id);
        await reviewerPage.goto("/admin/vendors");

        const manager = reviewerProductManager(reviewerPage);
        await expect(manager).toBeVisible();
        await expect(
          productCard(reviewerPage, createdProductName, manager),
        ).toContainText("draft");
        await expect(
          manager.getByRole("button", { name: "Edit", exact: true }),
        ).toHaveCount(0);
        await expect(
          manager.getByRole("button", { name: "Archive", exact: true }),
        ).toHaveCount(0);

        const history = productCard(
          reviewerPage,
          createdProductName,
          manager,
        ).locator("details");
        await history.locator("summary").click();
        await expect(history).toHaveAttribute("open", "");
        await expect(history.locator("div.border-l-2")).toHaveCount(1);
      });

      await test.step(
        "edit, publish, and archive the product in the browser",
        async () => {
          await productCard(page, createdProductName)
            .getByRole("button", { name: "Edit" })
            .click();
          await manager.getByLabel("Product name").fill(editedProductName);
          const editResponse = page.waitForResponse(
            (response) =>
              response.request().method() === "PATCH" &&
              response.url().includes(`/api/products/${productId}`),
          );
          await manager.getByRole("button", { name: "Save product" }).click();
          expect((await editResponse).status()).toBe(200);
          await expect(
            page.getByText("Product updated", { exact: true }),
          ).toBeVisible();

          await saveProduct(page, editedProductName, "published");
          await productCard(page, editedProductName)
            .getByRole("button", { name: "Archive" })
            .click();
          await expect(
            page.getByText("Product updated", { exact: true }),
          ).toBeVisible();
          await expect(productCard(page, editedProductName)).toContainText(
            "archived",
          );
        },
      );

      await test.step(
        "refresh the open reviewer catalog and history without a reload",
        async () => {
          const manager = reviewerProductManager(reviewerPage);
          await expect(
            productCard(reviewerPage, editedProductName, manager),
          ).toContainText("archived");
          await expectHistory(reviewerPage, editedProductName, true, manager);
        },
      );

      await test.step(
        "show all four events and field changes when reopened",
        async () => {
          const history = productCard(
            page,
            editedProductName,
          ).locator("details");
          await expectHistory(page, editedProductName);
          await history.locator("summary").click();
          await expect(history).not.toHaveAttribute("open", "");
          await expectHistory(page, editedProductName);
        },
      );

      await test.step(
        "reload the dashboard and show the durable history again",
        async () => {
          await page.reload();
          await expect(productCard(page, editedProductName)).toBeVisible();
          await expectHistory(page, editedProductName);
        },
      );

      await test.step(
        "keep the reviewer read-only after the live refresh",
        async () => {
          const manager = reviewerProductManager(reviewerPage);
          await expect(manager).toBeVisible();
          await expect(
            productCard(reviewerPage, editedProductName, manager),
          ).toContainText("archived");
          await expect(
            manager.getByRole("button", { name: "Edit", exact: true }),
          ).toHaveCount(0);
          await expect(
            manager.getByRole("button", { name: "Archive", exact: true }),
          ).toHaveCount(0);
          await expectHistory(reviewerPage, editedProductName, true, manager);

          await reviewerPage.reload();
          await expect(manager).toBeVisible();
          await expect(
            productCard(reviewerPage, editedProductName, manager),
          ).toBeVisible();
          await expect(
            manager.getByRole("button", { name: "Edit", exact: true }),
          ).toHaveCount(0);
          await expect(
            manager.getByRole("button", { name: "Archive", exact: true }),
          ).toHaveCount(0);
          await expectHistory(reviewerPage, editedProductName, true, manager);

          const editResponse = await requestAsUser(
            reviewerPage,
            `/api/products/${productId}`,
            "PATCH",
            { name: "Reviewer must not edit this product." },
          );
          expect(editResponse.status).toBe(403);
          expect(editResponse.body).toContain(
            "You cannot manage this product.",
          );

          const createResponse = await requestAsUser(
            reviewerPage,
            `/api/vendors/${vendorId}/products`,
            "POST",
            {
              name: "Reviewer must not create this product",
              category: "Textiles",
              price: 48,
              sizes: ["One size"],
              fabricType: "Cotton",
              description: "This reviewer-created product must be rejected.",
              inventory: 1,
              status: "draft",
            },
          );
          expect(createResponse.status).toBe(403);
          expect(createResponse.body).toContain(
            "You cannot manage this vendor catalog.",
          );
        },
      );
    } finally {
      await reviewerContext.close();
    }

    await test.step("deny another signed-in user from viewing the history", async () => {
      const deniedContext: BrowserContext = await browser.newContext();
      const deniedPage = await deniedContext.newPage();
      try {
        await signInFixture(deniedPage, deniedEmail, deniedUser.id);
        const deniedHistory = await requestAsUser(
          deniedPage,
          `/api/products/${productId}/history`,
          "GET",
        );
        expect(deniedHistory.status).toBe(403);
        expect(deniedHistory.body).toContain(
          "Vendor owner or reviewer access required.",
        );

        await deniedPage.goto(`/vendor/dashboard/${vendorId}`);
        await expect(
          deniedPage.getByText("Vendor dashboard not found.", { exact: true }),
        ).toBeVisible();
        await expect(
          deniedPage.getByText("View change history", { exact: true }),
        ).toHaveCount(0);
      } finally {
        await deniedContext.close();
      }
    });
  });
});
