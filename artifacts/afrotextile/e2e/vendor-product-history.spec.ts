import { clerk } from "@clerk/testing/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db, pool, vendorsTable } from "@workspace/db";

type ClerkUser = { id: string };
type RequestResult = { status: number; body: string };

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const vendorEmail = `afrotextile-history-owner-${runId}@example.com`;
const deniedEmail = `afrotextile-history-denied-${runId}@example.com`;
const fixturePassword = `Afrotextile-${runId}-fixture!`;
const clerkApiUrl = process.env.CLERK_API_URL ?? "https://api.clerk.com/v1";
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

const vendorName = "Indigo History Browser Fixture";
const createdProductName = "Indigo browser history wrap";
const editedProductName = "Updated indigo browser history wrap";

let vendorUser: ClerkUser;
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

async function createClerkFixture(emailAddress: string): Promise<ClerkUser> {
  const response = await clerkApi("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [emailAddress],
      password: fixturePassword,
      first_name: "Afrotextile",
      last_name: "History Fixture",
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
): Promise<RequestResult> {
  return page.evaluate(
    async ({ path, method }) => {
      const token = await window.Clerk?.session?.getToken();
      const response = await fetch(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return { status: response.status, body: await response.text() };
    },
    { path, method },
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

function productManager(page: Page) {
  return page.locator("section").filter({ hasText: "Products and inventory" });
}

function productCard(page: Page, productName: string) {
  return productManager(page)
    .locator("article")
    .filter({ hasText: productName });
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
) {
  const history = productCard(page, productName).locator("details");
  await history.locator("summary").click();
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
    deniedUser = await createClerkFixture(deniedEmail);
    vendorId = await createVendor(vendorUser.id, vendorEmail);
  });

  test.afterAll(async () => {
    if (vendorId) {
      await db.delete(vendorsTable).where(eq(vendorsTable.id, vendorId));
    }
    await Promise.all([
      deleteClerkFixture(vendorUser?.id),
      deleteClerkFixture(deniedUser?.id),
    ]);
    await pool.end();
  });

  test("preserves the owner's product history after a dashboard reload", async ({
    page,
    browser,
  }) => {
    await signInFixture(page, vendorEmail);
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

    await test.step("edit, publish, and archive the product in the browser", async () => {
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
    });

    await test.step("show all four events and field changes when reopened", async () => {
      const history = productCard(page, editedProductName).locator("details");
      await expectHistory(page, editedProductName);
      await history.locator("summary").click();
      await expect(history).not.toHaveAttribute("open", "");
      await expectHistory(page, editedProductName);
    });

    await test.step("reload the dashboard and show the durable history again", async () => {
      await page.reload();
      await expect(productCard(page, editedProductName)).toBeVisible();
      await expectHistory(page, editedProductName);
    });

    await test.step("deny another signed-in user from viewing the history", async () => {
      const deniedContext: BrowserContext = await browser.newContext();
      const deniedPage = await deniedContext.newPage();
      try {
        await signInFixture(deniedPage, deniedEmail);
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
