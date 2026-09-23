import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { and, eq, or } from "drizzle-orm";
import {
  db,
  vendorReviewerAccessHistoryTable,
  vendorsTable,
} from "@workspace/db";

type ClerkUser = { id: string };
type RequestResult = { status: number; body: string };

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const adminEmail = `afrotextile-access-admin-${runId}@example.com`;
const targetEmail = `afrotextile-access-target-${runId}@example.com`;
const archiveEmail = `afrotextile-access-archive-${runId}@example.com`;
const observerEmail = `afrotextile-access-observer-${runId}@example.com`;
const fixturePassword = `Afrotextile-${runId}-fixture!`;
const reviewerVendorName = `Reviewer Access Vendor ${runId}`;
const clerkApiUrl = process.env.CLERK_API_URL ?? "https://api.clerk.com/v1";
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

let adminUser: ClerkUser;
let targetUser: ClerkUser;
let archiveUser: ClerkUser;
let observerUser: ClerkUser;
let reviewerVendorId: string;

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
  publicMetadata: Record<string, unknown>,
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

async function expectReviewerManagementHidden(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Reviewer access", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Access history" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Search users" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /^(Grant|Revoke|Admin access)$/ }),
  ).toHaveCount(0);
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

function reviewerCard(page: Page, emailAddress: string) {
  const reviewerSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Reviewer access", exact: true }),
  });
  return reviewerSection
    .getByText(emailAddress, { exact: true })
    .first()
    .locator("xpath=../../..");
}

function accessHistory(page: Page) {
  return page
    .getByRole("heading", { name: "Access history" })
    .locator("xpath=../../..");
}

async function expectAccessHistory(
  page: Page,
  expectedActions: Array<"grant" | "revoke">,
) {
  const history = accessHistory(page);
  const rows = history
    .locator("div.divide-y > div")
    .filter({ hasText: targetEmail });

  await expect(history).toBeVisible();
  await expect(rows).toHaveCount(expectedActions.length);

  for (const [index, action] of expectedActions.entries()) {
    const row = rows.nth(index);
    await expect(row.getByText(targetEmail, { exact: true })).toBeVisible();
    await expect(row.getByText(adminEmail, { exact: true })).toBeVisible();
    await expect(row.getByText(action, { exact: true })).toBeVisible();
    await expect(row.locator("time")).toHaveAttribute(
      "datetime",
      /^\d{4}-\d{2}-\d{2}T/,
    );
  }
}

test.describe("vendor reviewer access history", () => {
  test.beforeAll(async () => {
    adminUser = await createClerkFixture(adminEmail, { role: "admin" });
    targetUser = await createClerkFixture(targetEmail, {});
    archiveUser = await createClerkFixture(archiveEmail, {});
    observerUser = await createClerkFixture(observerEmail, {
      vendorReviewer: true,
    });
    const [vendor] = await db
      .insert(vendorsTable)
      .values({
        ownerUserId: observerUser.id,
        businessName: reviewerVendorName,
        contactName: "Reviewer Access Fixture",
        email: observerEmail,
        phone: "+2348012345678",
        location: "Lagos, Nigeria",
        category: "Fabrics",
        plan: "Starter",
        description: "A pending application for reviewer access coverage.",
        status: "pending",
      })
      .returning({ id: vendorsTable.id });
    if (!vendor) {
      throw new Error("Could not create the reviewer access vendor fixture.");
    }
    reviewerVendorId = vendor.id;

    await db.insert(vendorReviewerAccessHistoryTable).values(
      Array.from({ length: 26 }, (_, index) => ({
        targetUserId: archiveUser.id,
        actorUserId: adminUser.id,
        action: index % 2 === 0 ? "grant" : "revoke",
        changedAt: new Date(Date.now() - (index + 10) * 60_000),
      })),
    );
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
    if (reviewerVendorId) {
      await db
        .delete(vendorsTable)
        .where(eq(vendorsTable.id, reviewerVendorId));
    }
    if (archiveUser?.id) {
      await db
        .delete(vendorReviewerAccessHistoryTable)
        .where(eq(vendorReviewerAccessHistoryTable.targetUserId, archiveUser.id));
    }
    await Promise.all([
      deleteClerkFixture(adminUser?.id),
      deleteClerkFixture(targetUser?.id),
      deleteClerkFixture(archiveUser?.id),
      deleteClerkFixture(observerUser?.id),
    ]);
  });

  test("persists reviewer grants and revocations with access history after reload", async ({
    page,
  }) => {
    await test.step("open reviewer access management as an administrator", async () => {
      await signInFixture(page, adminEmail, adminUser.id);
      await page.goto("/admin/vendors");

      await expect(
        page.getByRole("heading", { name: "Reviewer access", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Access history" }),
      ).toBeVisible();
      await page
        .getByRole("textbox", { name: "Search users" })
        .fill(targetEmail);
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

    await test.step("show the first grant in access history after reload", async () => {
      await page.reload();

      await expectAccessHistory(page, ["grant"]);
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

      await expectAccessHistory(page, ["revoke", "grant"]);
    });

    await test.step("grant the target user access for the second time", async () => {
      const targetReviewer = reviewerCard(page, targetEmail);
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

    await test.step("revoke the target user's access for the second time", async () => {
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

    await test.step("retain all four changes in access history after reload", async () => {
      await page.reload();

      const targetReviewer = reviewerCard(page, targetEmail);
      await expect(targetReviewer).toBeVisible({ timeout: 15_000 });
      await expect(
        targetReviewer.getByText("No access", { exact: true }),
      ).toBeVisible();
      await expect(
        targetReviewer.getByRole("button", { name: "Grant" }),
      ).toBeVisible();

      await expectAccessHistory(page, ["revoke", "grant", "revoke", "grant"]);
    });
  });

  test("navigates from newest history entries to older entries", async ({
    page,
  }) => {
    await signInFixture(page, adminEmail, adminUser.id);
    await page.goto("/admin/vendors");

    const history = accessHistory(page);
    await expect(history).toBeVisible();
    await expect(
      history.getByText(targetEmail, { exact: true }),
    ).toHaveCount(4);
    await expect(
      history.getByText(archiveEmail, { exact: true }).first(),
    ).toBeVisible();
    await expect(
      history.getByText("Page 1 of 2", { exact: true }),
    ).toBeVisible();

    await history.getByRole("button", { name: "Older", exact: true }).click();

    await expect(page).toHaveURL(/historyPage=2/);
    await expect(
      history.getByText("Page 2 of 2", { exact: true }),
    ).toBeVisible();
    await expect(
      history.getByText(targetEmail, { exact: true }),
    ).toHaveCount(0);
    await expect(
      history.getByText(archiveEmail, { exact: true }).first(),
    ).toBeVisible();

    await history.getByRole("button", { name: "Newer", exact: true }).click();
    await expect(
      history.getByText("Page 1 of 2", { exact: true }),
    ).toBeVisible();
    await expect(
      history.getByText(targetEmail, { exact: true }),
    ).toHaveCount(4);
  });

  test("keeps reviewer access usable while history recovers from a temporary failure", async ({
    page,
  }) => {
    await signInFixture(page, adminEmail, adminUser.id);
    await page.goto("/admin/vendors");

    const search = page.getByRole("textbox", { name: "Search users" });
    await search.fill(targetEmail);

    const targetReviewer = reviewerCard(page, targetEmail);
    await expect(targetReviewer).toBeVisible({ timeout: 15_000 });

    const grantButton = targetReviewer.getByRole("button", { name: "Grant" });
    if (await grantButton.count()) {
      await grantButton.click();
      await expect(
        targetReviewer.getByRole("button", { name: "Revoke" }),
      ).toBeVisible();
    }
    await expect(
      page.getByText("Loading access history…", { exact: true }),
    ).toHaveCount(0);
    await page.reload();
    await search.fill(targetEmail);
    await expect(reviewerCard(page, targetEmail)).toBeVisible({
      timeout: 15_000,
    });
    const targetHistoryRows = () =>
      accessHistory(page)
        .locator("div.divide-y > div")
        .filter({ hasText: targetEmail });
    await expect(targetHistoryRows()).not.toHaveCount(0);
    const expectedTargetHistoryRowCount = await targetHistoryRows().count();

    let historyRequestCount = 0;
    const failTemporaryHistoryRequest = async (route: Route) => {
      historyRequestCount += 1;
      if (historyRequestCount <= 4) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Temporary history outage" }),
        });
        return;
      }

      await route.continue();
    };

    await page.route(
      "**/api/vendor-reviewer-access-history**",
      failTemporaryHistoryRequest,
    );

    try {
      await page.reload();

      await expect(
        page.getByRole("heading", {
          name: "Access history could not be loaded",
        }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByText(
          "Current reviewer access is still available. Please try again to inspect the audit history.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(search).toBeVisible();
      await expect(search).toBeEnabled();
      await expect(
        reviewerCard(page, targetEmail).getByRole("button", {
          name: /^(Grant|Revoke)$/,
        }),
      ).toBeEnabled();
      await expect(
        page.getByText("No reviewer access changes have been recorded.", {
          exact: true,
        }),
      ).toHaveCount(0);
      expect(historyRequestCount).toBe(4);

      await page
        .getByRole("button", {
          name: "Retry access history",
          exact: true,
        })
        .click();
      await expect
        .poll(() => historyRequestCount)
        .toBe(5);

      await expect(targetHistoryRows()).toHaveCount(
        expectedTargetHistoryRowCount,
      );
      await expect(
        page.getByRole("heading", {
          name: "Access history could not be loaded",
        }),
      ).toHaveCount(0);
      expect(historyRequestCount).toBe(5);

      await page.reload();
      await expect(targetHistoryRows()).toHaveCount(
        expectedTargetHistoryRowCount,
      );
      expect(historyRequestCount).toBe(6);

      await page.reload();
      await expect(targetHistoryRows()).toHaveCount(
        expectedTargetHistoryRowCount,
      );
      expect(historyRequestCount).toBe(7);
    } finally {
      await page.unroute(
        "**/api/vendor-reviewer-access-history**",
        failTemporaryHistoryRequest,
      );
    }
  });

  test("lets a vendor reviewer review applications without exposing reviewer management", async ({
    page,
  }) => {
    await signInFixture(page, observerEmail, observerUser.id);
    await page.goto("/admin/vendors");

    await expect(
      page.getByRole("heading", { name: "Vendor applications" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: reviewerVendorName }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Approve" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reject" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Reviewer access", exact: true }),
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
    await expect(body).not.toContainText("Every grant and revoke is retained");
  });

  test("keeps reviewer management hidden when switching from an administrator in one browser", async ({
    page,
  }) => {
    await signInFixture(page, adminEmail, adminUser.id);
    await page.goto("/admin/vendors");

    await expect(
      page.getByRole("heading", { name: "Reviewer access", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Access history" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^(Grant|Revoke|Admin access)$/ }).first(),
    ).toBeVisible();

    let releaseClientRequest = () => {};
    const clientRequestHeld = new Promise<void>((resolve) => {
      releaseClientRequest = resolve;
    });
    let heldClientRequest = false;
    let switchingAccounts = false;

    await page.route("**/v1/client**", async (route) => {
      if (
        switchingAccounts &&
        route.request().method() === "GET" &&
        !heldClientRequest
      ) {
        heldClientRequest = true;
        await clientRequestHeld;
      }
      await route.continue();
    });

    switchingAccounts = true;
    const switchPromise = (async () => {
      await clerk.signOut({ page });
      await clerk.signIn({ page, emailAddress: observerEmail });
      await page.waitForFunction(
        (userId) => window.Clerk?.user?.id === userId,
        observerUser.id,
        { timeout: 15_000 },
      );
    })();

    await expect
      .poll(() => heldClientRequest, {
        message: "Clerk should refresh the account while switching fixtures",
        timeout: 15_000,
      })
      .toBe(true);
    await expectReviewerManagementHidden(page);

    releaseClientRequest();
    await switchPromise;
    await page.goto("/admin/vendors");

    await expect(
      page.getByRole("heading", { name: "Vendor applications" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: reviewerVendorName }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Approve" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reject" }),
    ).toBeVisible();
    await expectReviewerManagementHidden(page);

    await page.unroute("**/v1/client**");
  });

  test("denies direct reviewer-management requests for a vendor reviewer", async ({
    page,
  }) => {
    await signInFixture(page, observerEmail, observerUser.id);

    const reviewerList = await requestAsUser(
      page,
      `/api/vendor-reviewers?search=${encodeURIComponent(targetEmail)}`,
      "GET",
    );
    const accessHistoryResponse = await requestAsUser(
      page,
      "/api/vendor-reviewer-access-history",
      "GET",
    );
    const reviewerUpdate = await requestAsUser(
      page,
      `/api/vendor-reviewers/${encodeURIComponent(targetUser.id)}`,
      "PATCH",
      { enabled: true },
    );

    for (const response of [
      reviewerList,
      accessHistoryResponse,
      reviewerUpdate,
    ]) {
      expect(response.status).toBe(403);
      expect(JSON.parse(response.body)).toEqual({
        error: "Admin access required",
      });
      expect(response.body).not.toContain(adminEmail);
      expect(response.body).not.toContain(targetEmail);
      expect(response.body).not.toContain("items");
    }
  });

  test("keeps reviewer controls hidden while a non-administrator account loads", async ({
    page,
  }) => {
    await signInFixture(page, observerEmail, observerUser.id);

    const loadingPage = await page.context().newPage();
    let releaseClientRequest = () => {};
    const clientRequestHeld = new Promise<void>((resolve) => {
      releaseClientRequest = resolve;
    });
    let heldClientRequest = false;

    await loadingPage.route("**/v1/client**", async (route) => {
      if (route.request().method() === "GET" && !heldClientRequest) {
        heldClientRequest = true;
        await clientRequestHeld;
      }
      await route.continue();
    });

    const navigation = loadingPage.goto("/admin/vendors");
    await expect
      .poll(() => heldClientRequest, {
        message: "Clerk should request account permissions during navigation",
        timeout: 15_000,
      })
      .toBe(true);

    await expect(
      loadingPage.getByText("Loading permissions…", { exact: true }),
    ).toBeVisible();
    await expect(
      loadingPage.getByRole("heading", { name: "Reviewer access", exact: true }),
    ).toHaveCount(0);
    await expect(
      loadingPage.getByRole("heading", { name: "Access history" }),
    ).toHaveCount(0);
    await expect(
      loadingPage.getByRole("textbox", { name: "Search users" }),
    ).toHaveCount(0);

    releaseClientRequest();
    await navigation;

    await expect(
      loadingPage.getByRole("heading", { name: "Vendor applications" }),
    ).toBeVisible();
    await expect(
      loadingPage.getByRole("heading", { name: reviewerVendorName }),
    ).toBeVisible();
    await expect(
      loadingPage.getByRole("button", { name: "Approve" }),
    ).toBeVisible();
    await expect(
      loadingPage.getByRole("button", { name: "Reject" }),
    ).toBeVisible();
    await expect(
      loadingPage.getByText("Loading permissions…", { exact: true }),
    ).toHaveCount(0);
    await expect(
      loadingPage.getByRole("heading", { name: "Reviewer access", exact: true }),
    ).toHaveCount(0);
    await expect(
      loadingPage.getByRole("heading", { name: "Access history" }),
    ).toHaveCount(0);

    await loadingPage.close();
  });
});
