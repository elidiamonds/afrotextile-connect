import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db, productImageCleanupTable } from "@workspace/db";

type ClerkUser = { id: string };
type CleanupRequestResult = { status: number; body: string };
type CleanupStatus = {
  pendingCount: number;
  oldestRetryAgeSeconds: number | null;
  failures: Array<{
    attempts: number;
    lastError: string | null;
  }>;
};

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const adminEmail = `afrotextile-cleanup-admin-${runId}@example.com`;
const memberEmail = `afrotextile-cleanup-member-${runId}@example.com`;
const fixturePassword = `Afrotextile-${runId}-fixture!`;
const imagePath = `/objects/uploads/cleanup-browser-${runId}-private`;
const rawError =
  `DELETE failed for ${imagePath} ` +
  "at https://storage.example.test/private?token=secret-value";
const sanitizedError =
  "DELETE failed for [redacted object path] at [redacted storage URL]";
const clerkApiUrl = process.env.CLERK_API_URL ?? "https://api.clerk.com/v1";
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

let adminUser: ClerkUser;
let memberUser: ClerkUser;

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
      last_name: "Cleanup Fixture",
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

async function requestCleanupStatus(page: Page): Promise<CleanupRequestResult> {
  return page.evaluate(async () => {
    const token = await window.Clerk?.session?.getToken();
    const response = await fetch("/api/product-image-cleanup", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return { status: response.status, body: await response.text() };
  });
}

test.describe("product image cleanup status", () => {
  test.beforeAll(async () => {
    [adminUser, memberUser] = await Promise.all([
      createClerkFixture(adminEmail, { role: "admin" }),
      createClerkFixture(memberEmail),
    ]);

    await db.insert(productImageCleanupTable).values({
      imagePath,
      attempts: 3,
      createdAt: new Date(Date.now() - 90 * 60 * 1000),
      lastAttemptAt: new Date(Date.now() - 30 * 60 * 1000),
      nextAttemptAt: new Date(Date.now() + 30 * 60 * 1000),
      lastError: rawError,
    });
  });

  test.afterAll(async () => {
    await db
      .delete(productImageCleanupTable)
      .where(eq(productImageCleanupTable.imagePath, imagePath));
    await Promise.all([
      deleteClerkFixture(adminUser?.id),
      deleteClerkFixture(memberUser?.id),
    ]);
  });

  test("shows seeded cleanup failures to an administrator after sign-in", async ({
    page,
  }) => {
    await signInFixture(page, adminEmail, adminUser.id);
    await page.goto("/admin/vendors");

    const cleanupSection = page.locator("section").filter({
      has: page.getByRole("heading", {
        name: "Product photo cleanup",
        exact: true,
      }),
    });
    await expect(cleanupSection).toBeVisible();
    await expect(
      cleanupSection.getByText("Pending retries", { exact: true }),
    ).toBeVisible();
    await expect(
      cleanupSection
        .getByText("Pending retries", { exact: true })
        .locator(".."),
    ).toHaveText(/1/);
    await expect(
      cleanupSection.getByText(/^1h \d+m$/, { exact: true }),
    ).toBeVisible();
    await expect(
      cleanupSection.getByText("3 cleanup attempts failed", { exact: true }),
    ).toBeVisible();
    await expect(
      cleanupSection.getByText(sanitizedError, { exact: true }),
    ).toBeVisible();
    await expect(cleanupSection).not.toContainText(imagePath);
    await expect(cleanupSection).not.toContainText("secret-value");

    const response = await requestCleanupStatus(page);
    expect(response.status).toBe(200);
    const status = JSON.parse(response.body) as CleanupStatus;
    expect(status.pendingCount).toBe(1);
    expect(status.oldestRetryAgeSeconds).toBeGreaterThanOrEqual(90 * 60);
    expect(status.failures).toEqual([
      expect.objectContaining({
        attempts: 3,
        lastError: sanitizedError,
      }),
    ]);
    expect(response.body).not.toContain(imagePath);
    expect(response.body).not.toContain("secret-value");
  });

  test("does not expose cleanup status to a non-administrator after sign-in", async ({
    page,
  }) => {
    await signInFixture(page, memberEmail, memberUser.id);
    await page.goto("/admin/vendors");

    await expect(
      page.getByRole("heading", {
        name: "Product photo cleanup",
        exact: true,
      }),
    ).toHaveCount(0);

    const response = await requestCleanupStatus(page);
    expect(response.status).toBe(403);
    expect(response.body).not.toContain(imagePath);
    expect(response.body).not.toContain(sanitizedError);
  });

  test("does not expose cleanup status to an anonymous browser", async ({
    page,
  }) => {
    await page.goto("/");
    const response = await requestCleanupStatus(page);

    expect(response.status).toBe(401);
    expect(response.body).not.toContain(imagePath);
    expect(response.body).not.toContain(sanitizedError);
  });
});
