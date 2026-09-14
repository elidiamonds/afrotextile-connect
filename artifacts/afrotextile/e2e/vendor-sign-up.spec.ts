import { clerk } from "@clerk/testing/playwright";
import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";
import { eq } from "drizzle-orm";
import { db, pool, vendorsTable } from "@workspace/db";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type ClerkUser = { id: string };

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const vendorEmail = `afrotextile-vendor-${runId}@example.com`;
const adminEmail = `afrotextile-admin-${runId}@example.com`;
const otherVendorEmail = `afrotextile-other-vendor-${runId}@example.com`;
const fixturePassword = `Afrotextile-${runId}-fixture!`;
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

async function signInFixture(page: Page, emailAddress: string) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress });
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
    await pool.end();
  });

  test("submits an application, survives approval, and edits the returned storefront", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);

    await test.step("sign in with a disposable Clerk browser fixture", async () => {
      await signInFixture(page, vendorEmail);
    });

    await test.step("submit the vendor application in the browser", async () => {
      await page.goto("/vendor?apply=true");
      await expect(
        page.getByRole("heading", { name: "Build your storefront" }),
      ).toBeVisible();

      await page
        .getByLabel("Business name")
        .fill("Kente House Browser Fixture");
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
        page.getByRole("heading", { name: "Kente House Browser Fixture" }),
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
        await signInFixture(adminPage, adminEmail);
        await adminPage.goto("/admin/vendors");
        const application = adminPage.locator("article").filter({
          hasText: "Kente House Browser Fixture",
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
        await signInFixture(otherVendorPage, otherVendorEmail);
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
      await page.reload();
      await expect(page.getByText("approved", { exact: true })).toBeVisible();
      await expect(page.getByText("Your storefront is live.")).toBeVisible();

      await page.getByLabel("Business name").fill("Kente House Returned");
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

      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Kente House Returned" }),
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
          shopperPage.getByRole("heading", { name: "Kente House Returned" }),
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
    const productName = "Indigo browser upload wrap";

    await test.step("upload and publish a local product photo", async () => {
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
      await productManager.getByLabel("Visibility").selectOption("published");

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
      await expect(
        productManager.getByRole("progressbar", {
          name: "Photo upload progress",
        }),
      ).toBeVisible();
      await expect(
        productManager.locator('button[type="submit"]'),
      ).toBeDisabled();
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

      const createResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes(`/api/vendors/${vendorId}/products`),
      );
      await productManager.getByRole("button", { name: "Add product" }).click();
      const response = await createResponse;
      expect(response.status(), await response.text()).toBe(201);
      productId = ((await response.json()) as { id: string }).id;

      await expect(
        productManager.locator("article").filter({ hasText: productName }),
      ).toBeVisible();
    });

    await test.step("keep the uploaded photo after a dashboard reload", async () => {
      await page.reload();
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

    await test.step("render the saved photo on the storefront and marketplace", async () => {
      await page.goto(`/store/${vendorId}`);
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
            name: "Kente House Returned",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          shopperPage.getByRole("link", {
            name: "Kente House Browser Fixture",
            exact: true,
          }),
        ).toHaveCount(0);
      } finally {
        await shopperContext.close();
      }
    });

    await test.step("remove an abandoned photo from a canceled editor", async () => {
      await page.goto(`/vendor/dashboard/${vendorId}`);
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

    await test.step("replace the photo and persist the new image everywhere", async () => {
      await page.goto(`/vendor/dashboard/${vendorId}`);
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
      await productManager
        .locator('input[type="file"]')
        .setInputFiles(replacementProductPhoto);
      await expect(
        page.getByText("Photo uploaded", { exact: true }),
      ).toBeVisible();
      await expect(
        productManager.getByText("product-ochre.svg", { exact: true }),
      ).toBeVisible();

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

      await page.reload();
      const updatedManager = page
        .locator("section")
        .filter({ hasText: "Products and inventory" });
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

      await page.goto(`/store/${vendorId}`);
      await expectLoadedImage(page, `img[alt="${productName}"]`);
      await expect(page.locator(`img[alt="${productName}"]`)).toHaveAttribute(
        "src",
        replacementImageSrc!,
      );
      await page.goto("/shop");
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
        await signInFixture(adminPage, adminEmail);
        await adminPage.goto("/admin/vendors");
        const application = adminPage.locator("article").filter({
          hasText: "Kente House Returned",
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
          shopperPage.getByRole("heading", { name: "Kente House Returned" }),
        ).toHaveCount(0);
      } finally {
        await shopperContext.close();
      }
    });

    await sessionToken(page);
  });
});
