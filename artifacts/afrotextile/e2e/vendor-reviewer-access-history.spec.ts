import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { and, eq, or } from "drizzle-orm";
import { db, pool, vendorReviewerAccessHistoryTable } from "@workspace/db";

type ClerkUser = { id: string };

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const adminEmail = `afrotextile-access-admin-${runId}@example.com`;
const targetEmail = `afrotextile-access-target-${runId}@example.com`;
const observerEmail = `afrotextile-access-observer-${runId}@example.com`;
const fixturePassword = `Afrotextile-${runId}-fixture!`;
const clerkApiUrl = process.env.CLERK_API_URL ?? "https://api.clerk.com/v1";
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

let adminUser: ClerkUser;
let targetUser: ClerkUser;
let observerUser: ClerkUser;

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

function reviewerCard(page: Page, emailAddress: string) {
  const reviewerSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Reviewer access" }),
  });
  return reviewerSection
    .getByText(emailAddress, { exact: true })
    .first()
    .locator("xpath=../../..");
}

test.describe("vendor reviewer access history", () => {
  test.beforeAll(async () => {
    adminUser = await createClerkFixture(adminEmail, { role: "admin" });
    targetUser = await createClerkFixture(targetEmail, {});
    observerUser = await createClerkFixture(observerEmail, {});
  });

  test.afterAll(async () => {
    if (adminUser?.id && targetUser?.id) {
      await db
        .delete(vendorReviewerAccessHistoryTable)
        .where(
          or(
            and(
              eq(vendorReviewerAccessHistoryTable.actorUserId, adminUser.id),
              eq(vendorReviewerAccessHistoryTable.targetUserId, targetUser.id),
            ),
            and(
              eq(vendorReviewerAccessHistoryTable.actorUserId, targetUser.id),
              eq(vendorReviewerAccessHistoryTable.targetUserId, adminUser.id),
            ),
          ),
        );
    }
    await Promise.all([
      deleteClerkFixture(adminUser?.id),
      deleteClerkFixture(targetUser?.id),
      deleteClerkFixture(observerUser?.id),
    ]);
    await pool.end();
  });

  test("persists reviewer grants and revocations with access history after reload", async ({
    page,
  }) => {
    await test.step("open reviewer access management as an administrator", async () => {
      await signInFixture(page, adminEmail);
      await page.goto("/admin/vendors");

      await expect(
        page.getByRole("heading", { name: "Reviewer access" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Access history" }),
      ).toBeVisible();
    });

    await test.step("grant the target user access in the browser", async () => {
      const targetReviewer = reviewerCard(page, targetEmail);
      await expect(targetReviewer).toBeVisible({ timeout: 15_000 });
      await expect(
        targetReviewer.getByRole("button", { name: "Grant" }),
      ).toBeVisible();
      await targetReviewer.getByRole("button", { name: "Grant" }).click();

      await expect(
        page.getByText("Reviewer access updated", { exact: true }),
      ).toBeVisible();
      await expect(
        targetReviewer.getByRole("button", { name: "Revoke" }),
      ).toBeVisible();
    });

    await test.step("show the grant in access history after reload", async () => {
      await page.reload();

      const history = page
        .getByRole("heading", { name: "Access history" })
        .locator("xpath=../../..");
      await expect(history).toBeVisible();

      const historyRow = history
        .locator("div.divide-y > div")
        .filter({ hasText: targetEmail });
      await expect(historyRow).toBeVisible();
      await expect(
        historyRow.getByText(targetEmail, { exact: true }),
      ).toBeVisible();
      await expect(
        historyRow.getByText(adminEmail, { exact: true }),
      ).toBeVisible();
      await expect(
        historyRow.getByText("grant", { exact: true }),
      ).toBeVisible();
      await expect(historyRow.locator("time")).toHaveAttribute(
        "datetime",
        /^\d{4}-\d{2}-\d{2}T/,
      );
    });

    await test.step("revoke the target user's access in the browser", async () => {
      const targetReviewer = reviewerCard(page, targetEmail);
      await expect(
        targetReviewer.getByRole("button", { name: "Revoke" }),
      ).toBeVisible();
      await targetReviewer.getByRole("button", { name: "Revoke" }).click();

      await expect(
        page.getByText("Reviewer access updated", { exact: true }),
      ).toBeVisible();
      await expect(
        targetReviewer.getByRole("button", { name: "Grant" }),
      ).toBeVisible();
    });

    await test.step("show the revoked access and revoke history after reload", async () => {
      await page.reload();

      const targetReviewer = reviewerCard(page, targetEmail);
      await expect(targetReviewer).toBeVisible({ timeout: 15_000 });
      await expect(
        targetReviewer.getByText("No access", { exact: true }),
      ).toBeVisible();
      await expect(
        targetReviewer.getByRole("button", { name: "Grant" }),
      ).toBeVisible();

      const history = page
        .getByRole("heading", { name: "Access history" })
        .locator("xpath=../../..");
      const revokeHistoryRow = history
        .locator("div.divide-y > div")
        .filter({ hasText: targetEmail })
        .filter({ hasText: "revoke" });
      await expect(revokeHistoryRow).toBeVisible();
      await expect(
        revokeHistoryRow.getByText(targetEmail, { exact: true }),
      ).toBeVisible();
      await expect(
        revokeHistoryRow.getByText(adminEmail, { exact: true }),
      ).toBeVisible();
      await expect(
        revokeHistoryRow.getByText("revoke", { exact: true }),
      ).toBeVisible();
      await expect(revokeHistoryRow.locator("time")).toHaveAttribute(
        "datetime",
        /^\d{4}-\d{2}-\d{2}T/,
      );
    });
  });

  test("does not expose reviewer controls or access history to a non-administrator", async ({
    page,
  }) => {
    await signInFixture(page, observerEmail);
    await page.goto("/admin/vendors");

    await expect(
      page.getByRole("heading", { name: "Vendor applications" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Reviewer access" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Access history" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "Search users" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Grant|Revoke|Admin access/ }),
    ).toHaveCount(0);

    const body = page.locator("body");
    await expect(body).not.toContainText(adminEmail);
    await expect(body).not.toContainText(targetEmail);
  });
});
