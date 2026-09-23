import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";

type ClerkUser = { id: string };
type ReviewerFixture = ClerkUser & {
  email: string;
  firstName: string;
  lastName: string;
};

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const reviewerSearchToken = `SearchReviewer${runId.replaceAll("-", "")}`;
const adminEmail = `afrotextile-reviewer-search-admin-${runId}@example.com`;
const fixturePassword = `Afrotextile-${runId}-fixture!`;
const clerkApiUrl = process.env.CLERK_API_URL ?? "https://api.clerk.com/v1";
const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const reviewerCount = 27;

let adminUser: ClerkUser;
let reviewerFixtures: ReviewerFixture[] = [];

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
  firstName: string,
  lastName: string,
  publicMetadata: Record<string, string>,
): Promise<ClerkUser> {
  const response = await clerkApi("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [emailAddress],
      password: fixturePassword,
      first_name: firstName,
      last_name: lastName,
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

function reviewerCard(page: Page, emailAddress: string) {
  return page.getByText(emailAddress, { exact: true }).locator("xpath=../../..");
}

function reviewerRequestPage(url: string) {
  return new URL(url).searchParams.get("page");
}

test.describe("vendor reviewer search and pagination", () => {
  test.beforeAll(async () => {
    adminUser = await createClerkFixture(
      adminEmail,
      "Afrotextile",
      "Search Admin",
      { role: "admin" },
    );

    reviewerFixtures = await Promise.all(
      Array.from({ length: reviewerCount }, async (_, index) => {
        const sequence = String(index + 1).padStart(2, "0");
        const email = `afrotextile-search-reviewer-${sequence}-${runId}@example.com`;
        const firstName = `${reviewerSearchToken}${sequence}`;
        const lastName = "Pagination Fixture";
        const user = await createClerkFixture(
          email,
          firstName,
          lastName,
          {},
        );
        return { ...user, email, firstName, lastName };
      }),
    );
  });

  test.afterAll(async () => {
    await Promise.all([
      deleteClerkFixture(adminUser?.id),
      ...reviewerFixtures.map((reviewer) =>
        deleteClerkFixture(reviewer.id),
      ),
    ]);
  });

  test("lets an administrator search by identity and paginate reviewer actions", async ({
    page,
  }) => {
    const targetReviewer = reviewerFixtures[0];
    if (!targetReviewer) {
      throw new Error("The reviewer browser fixture was not created.");
    }

    await signInFixture(page, adminEmail, adminUser.id);

    let delayedInitialRequest = false;
    let delayedRefreshRequest = false;
    await page.route("**/api/vendor-reviewers*", async (route) => {
      if (!delayedInitialRequest) {
        delayedInitialRequest = true;
        await new Promise((resolve) => setTimeout(resolve, 750));
      } else if (!delayedRefreshRequest) {
        delayedRefreshRequest = true;
        await new Promise((resolve) => setTimeout(resolve, 750));
      }
      await route.continue();
    });

    await test.step("show the reviewer management loading state", async () => {
      await page.goto("/admin/vendors");
      await expect(page.getByText("Loading users…", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Reviewer access" }),
      ).toBeVisible();
      await expect(page.getByText("Page 1 of", { exact: false })).toBeVisible();
    });

    const search = page.getByLabel("Search users");
    const reviewerSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Reviewer access" }) });

    await test.step("show background refresh without hiding reviewer actions", async () => {
      const refreshRequest = page.waitForRequest(
        (request) =>
          request.method() === "GET" &&
          request.url().includes("/api/vendor-reviewers"),
      );
      const refreshResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers"),
      );
      await refreshRequest;
      await expect(
        reviewerSection.getByText("Checking for changes…", { exact: true }),
      ).toBeVisible();
      await expect(
        reviewerSection.getByText("Loading users…", { exact: true }),
      ).toBeHidden();
      await expect(
        reviewerSection
          .getByRole("button", { name: /^(Grant|Revoke)$/ })
          .first(),
      ).toBeVisible();
      expect((await refreshResponse).status()).toBe(200);
    });

    await test.step("search by name, email, and user ID", async () => {
      const nameResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          new URL(response.url()).searchParams.get("search") ===
            targetReviewer.firstName,
      );
      await search.fill(targetReviewer.firstName);
      expect((await nameResponse).status()).toBe(200);
      await expect(reviewerCard(page, targetReviewer.email)).toBeVisible();
      await expect(
        reviewerSection
          .getByText(
            `${targetReviewer.firstName} ${targetReviewer.lastName}`,
            { exact: true },
          )
          .first(),
      ).toBeVisible();

      const emailResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          new URL(response.url()).searchParams.get("search") ===
            targetReviewer.email,
      );
      await search.fill(targetReviewer.email);
      expect((await emailResponse).status()).toBe(200);
      await expect(reviewerCard(page, targetReviewer.email)).toBeVisible();

      const userIdResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          new URL(response.url()).searchParams.get("search") ===
            targetReviewer.id,
      );
      await search.fill(targetReviewer.id);
      expect((await userIdResponse).status()).toBe(200);
      await expect(reviewerCard(page, targetReviewer.email)).toBeVisible();
      expect(new URL(page.url()).searchParams.get("search")).toBe(
        targetReviewer.id,
      );
      expect(new URL(page.url()).searchParams.get("page")).toBeNull();

      const restoredSearchResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          new URL(response.url()).searchParams.get("search") ===
            targetReviewer.id,
      );
      await page.reload();
      expect((await restoredSearchResponse).status()).toBe(200);
      await expect(reviewerCard(page, targetReviewer.email)).toBeVisible();
    });

    await test.step("show a clear no-match state", async () => {
      const noMatch = `no-reviewer-match-${runId}`;
      const noMatchResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          new URL(response.url()).searchParams.get("search") === noMatch,
      );
      await search.fill(noMatch);
      expect((await noMatchResponse).status()).toBe(200);
      await expect(
        page.getByText(`No users match “${noMatch}”.`, { exact: true }),
      ).toBeVisible();
    });

    await test.step("clear a saved search from the second page", async () => {
      const savedSearch = runId;
      const savedSearchResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          new URL(response.url()).searchParams.get("search") === savedSearch &&
          reviewerRequestPage(response.url()) === "1",
      );
      await search.fill(savedSearch);
      expect((await savedSearchResponse).status()).toBe(200);
      await expect(
        reviewerSection.getByText("Page 1 of 2", { exact: true }),
      ).toBeVisible();

      const savedSearchNextResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          new URL(response.url()).searchParams.get("search") === savedSearch &&
          reviewerRequestPage(response.url()) === "2",
      );
      await reviewerSection.getByRole("button", { name: "Next" }).click();
      expect((await savedSearchNextResponse).status()).toBe(200);
      await expect(
        reviewerSection.getByText("Page 2 of 2", { exact: true }),
      ).toBeVisible();
      expect(new URL(page.url()).searchParams.get("search")).toBe(savedSearch);
      expect(new URL(page.url()).searchParams.get("page")).toBe("2");

      const clearButton = reviewerSection.getByRole("button", {
        name: "Clear reviewer search",
      });
      await expect(clearButton).toBeVisible();
      const clearSavedSearchResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          !new URL(response.url()).searchParams.has("search") &&
          reviewerRequestPage(response.url()) === "1",
      );
      await clearButton.click();
      expect((await clearSavedSearchResponse).status()).toBe(200);
      await expect(search).toHaveValue("");
      await expect(
        reviewerSection.getByText("Page 1 of", { exact: false }),
      ).toBeVisible();
      expect(new URL(page.url()).searchParams.get("search")).toBeNull();
      expect(new URL(page.url()).searchParams.get("page")).toBeNull();
      await expect(
        reviewerSection
          .getByRole("button", { name: /^(Grant|Revoke)$/ })
          .first(),
      ).toBeVisible();
      await expect(clearButton).toBeHidden();
    });

    await test.step("request the next page and preserve reviewer actions", async () => {
      await expect(page.getByText("Page 1 of", { exact: false })).toBeVisible();

      const nextResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          reviewerRequestPage(response.url()) === "2",
      );
      await reviewerSection.getByRole("button", { name: "Next" }).click();
      const next = await nextResponse;
      expect(next.status()).toBe(200);
      expect(reviewerRequestPage(next.url())).toBe("2");
      expect(new URL(page.url()).searchParams.get("page")).toBe("2");
      await expect(
        reviewerSection.getByText("Page 2 of", { exact: false }),
      ).toBeVisible();

      const reloadPageResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          !new URL(response.url()).searchParams.has("search") &&
          reviewerRequestPage(response.url()) === "2",
      );
      await page.reload();
      expect((await reloadPageResponse).status()).toBe(200);
      await expect(
        reviewerSection.getByText("Page 2 of", { exact: false }),
      ).toBeVisible();

      await page.goBack();
      await expect(
        reviewerSection.getByText("Page 1 of", { exact: false }),
      ).toBeVisible();
      expect(new URL(page.url()).searchParams.get("page")).toBeNull();

      const forwardResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          reviewerRequestPage(response.url()) === "2",
      );
      await reviewerSection.getByRole("button", { name: "Next" }).click();
      expect((await forwardResponse).status()).toBe(200);
      await expect(
        reviewerSection.getByText("Page 2 of", { exact: false }),
      ).toBeVisible();

      const pageTwoAction = reviewerSection
        .getByRole("button", { name: /^(Grant|Revoke)$/ })
        .first();
      await expect(pageTwoAction).toBeVisible();
      const pageTwoCard = pageTwoAction.locator("xpath=../..");
      const pageTwoEmail = await pageTwoCard.locator("p").nth(1).innerText();
      const grantResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url().includes("/api/vendor-reviewers/"),
      );
      await pageTwoAction.click();
      expect((await grantResponse).status()).toBe(200);
      await expect(pageTwoCard.getByRole("button", { name: "Revoke" })).toBeVisible();

      const previousResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          reviewerRequestPage(response.url()) === "1",
      );
      await reviewerSection
        .getByRole("button", { name: "Previous" })
        .click();
      const previous = await previousResponse;
      expect(previous.status()).toBe(200);
      expect(reviewerRequestPage(previous.url())).toBe("1");
      await expect(
        reviewerSection.getByText("Page 1 of", { exact: false }),
      ).toBeVisible();

      const nextAgainResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          reviewerRequestPage(response.url()) === "2",
      );
      await reviewerSection.getByRole("button", { name: "Next" }).click();
      const nextAgain = await nextAgainResponse;
      expect(nextAgain.status()).toBe(200);
      await expect(
        reviewerSection.getByText("Page 2 of", { exact: false }),
      ).toBeVisible();
      await expect(
        reviewerCard(page, pageTwoEmail).getByRole("button", {
          name: "Revoke",
        }),
      ).toBeVisible();
    });

    await test.step("bound invalid URL page values to a valid page", async () => {
      await page.goto("/admin/vendors?page=10001");
      await expect(page.getByText("Page 1 of", { exact: false })).toBeVisible();
      expect(new URL(page.url()).searchParams.get("page")).toBe("1");

      await page.goto("/admin/vendors?page=not-a-page");
      await expect(page.getByText("Page 1 of", { exact: false })).toBeVisible();
      expect(new URL(page.url()).searchParams.get("page")).toBe("1");
    });
  });

  test("keeps reviewer controls usable on a narrow viewport", async ({
    page,
  }) => {
    const viewport = { width: 360, height: 800 };
    await page.setViewportSize(viewport);
    await signInFixture(page, adminEmail, adminUser.id);

    const savedSearch = reviewerSearchToken;
    const reviewerSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Reviewer access" }) });
    const savedSearchResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes("/api/vendor-reviewers") &&
        new URL(response.url()).searchParams.get("search") === savedSearch &&
        reviewerRequestPage(response.url()) === "2",
    );
    await page.goto(
      `/admin/vendors?search=${encodeURIComponent(savedSearch)}&page=2`,
    );
    expect((await savedSearchResponse).status()).toBe(200);
    await expect(
      reviewerSection.getByText("Page 2 of 2", { exact: true }),
    ).toBeVisible();

    const search = page.getByLabel("Search users");
    const clearButton = reviewerSection.getByRole("button", {
      name: "Clear reviewer search",
    });
    await expect(search).toHaveValue(savedSearch);
    await expect(clearButton).toBeVisible();

    const searchBox = await search.boundingBox();
    const clearButtonBox = await clearButton.boundingBox();
    expect(searchBox).not.toBeNull();
    expect(clearButtonBox).not.toBeNull();
    if (!searchBox || !clearButtonBox) {
      throw new Error("Reviewer search controls are not measurable.");
    }
    expect(searchBox.x + searchBox.width).toBeLessThanOrEqual(viewport.width);
    expect(clearButtonBox.x + clearButtonBox.width).toBeLessThanOrEqual(
      viewport.width,
    );
    expect(clearButtonBox.x).toBeGreaterThan(searchBox.x);
    expect(clearButtonBox.y).toBeGreaterThanOrEqual(searchBox.y);
    expect(clearButtonBox.y + clearButtonBox.height).toBeLessThanOrEqual(
      searchBox.y + searchBox.height,
    );

    for (const name of ["Previous", "Next"]) {
      const button = reviewerSection.getByRole("button", { name });
      await expect(button).toBeVisible();
      const buttonBox = await button.boundingBox();
      expect(buttonBox).not.toBeNull();
      if (!buttonBox) {
        throw new Error(`${name} reviewer pagination control is not measurable.`);
      }
      expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(
        viewport.width,
      );
    }
    expect(
      await reviewerSection.evaluate(
        (section) => section.scrollWidth <= section.clientWidth,
      ),
    ).toBe(true);

    const clearSearchResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes("/api/vendor-reviewers") &&
        !new URL(response.url()).searchParams.has("search") &&
        reviewerRequestPage(response.url()) === "1",
    );
    await clearButton.click();
    expect((await clearSearchResponse).status()).toBe(200);
    await expect(search).toHaveValue("");
    await expect(
      reviewerSection.getByText("Page 1 of", { exact: false }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.get("search")).toBeNull();
    expect(new URL(page.url()).searchParams.get("page")).toBeNull();
    await expect(clearButton).toBeHidden();
  });

  test("preserves a saved reviewer link in another admin session", async ({
    page,
    browser,
  }) => {
    const savedSearch = reviewerSearchToken;

    const otherAdminContext = await browser.newContext();
    const otherAdminPage = await otherAdminContext.newPage();

    try {
      await signInFixture(page, adminEmail, adminUser.id);

      const reviewerSection = page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "Reviewer access" }) });
      const search = page.getByLabel("Search users");

      await page.goto("/admin/vendors");
      const savedSearchResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          new URL(response.url()).searchParams.get("search") === savedSearch &&
          reviewerRequestPage(response.url()) === "1",
      );
      await search.fill(savedSearch);
      expect((await savedSearchResponse).status()).toBe(200);
      await expect(
        reviewerSection.getByText("Page 1 of 2", { exact: true }),
      ).toBeVisible();

      const nextPageResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          new URL(response.url()).searchParams.get("search") === savedSearch &&
          reviewerRequestPage(response.url()) === "2",
      );
      await reviewerSection.getByRole("button", { name: "Next" }).click();
      expect((await nextPageResponse).status()).toBe(200);
      await expect(
        reviewerSection.getByText("Page 2 of 2", { exact: true }),
      ).toBeVisible();
      await expect(
        reviewerSection.getByText(
          /afrotextile-search-reviewer-\d{2}-.*@example\.com/,
        ).first(),
      ).toBeVisible();

      const savedReviewerUrl = new URL(page.url());
      expect(savedReviewerUrl.searchParams.get("search")).toBe(savedSearch);
      expect(savedReviewerUrl.searchParams.get("page")).toBe("2");

      await signInFixture(otherAdminPage, adminEmail, adminUser.id);
      const otherAdminResponse = otherAdminPage.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          new URL(response.url()).searchParams.get("search") === savedSearch &&
          reviewerRequestPage(response.url()) === "2",
      );
      await otherAdminPage.goto(savedReviewerUrl.toString());
      expect((await otherAdminResponse).status()).toBe(200);

      await expect(otherAdminPage.getByLabel("Search users")).toHaveValue(
        savedSearch,
      );
      await expect(
        otherAdminPage.getByText("Page 2 of 2", { exact: true }),
      ).toBeVisible();
      await expect(
        otherAdminPage
          .locator("section")
          .filter({
            has: otherAdminPage.getByRole("heading", {
              name: "Reviewer access",
            }),
          })
          .getByText(/afrotextile-search-reviewer-\d{2}-.*@example\.com/)
          .first(),
      ).toBeVisible();
      expect(new URL(otherAdminPage.url()).searchParams.get("search")).toBe(
        savedSearch,
      );
      expect(new URL(otherAdminPage.url()).searchParams.get("page")).toBe("2");
    } finally {
      await otherAdminContext.close();
    }
  });

  test("refreshes a saved reviewer search when a new match appears", async ({
    page,
  }) => {
    const savedSearch = `${reviewerSearchToken}Refresh`;
    const savedReviewerUrl = `/admin/vendors?search=${encodeURIComponent(
      savedSearch,
    )}&page=1`;
    const newReviewerEmail = `afrotextile-search-refresh-${runId}@example.com`;
    const newReviewerFirstName = savedSearch;
    const newReviewerLastName = "Refresh Fixture";

    await signInFixture(page, adminEmail, adminUser.id);

    const initialResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes("/api/vendor-reviewers") &&
        new URL(response.url()).searchParams.get("search") === savedSearch &&
        reviewerRequestPage(response.url()) === "1",
    );
    await page.goto(savedReviewerUrl);
    const initial = await initialResponse;
    expect(initial.status()).toBe(200);
    expect((await initial.json()).totalCount).toBe(0);
    await expect(
      page.getByText(`No users match “${savedSearch}”.`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Search users")).toHaveValue(savedSearch);
    expect(new URL(page.url()).searchParams.get("search")).toBe(savedSearch);
    expect(new URL(page.url()).searchParams.get("page")).toBe("1");

    const newReviewer = await createClerkFixture(
      newReviewerEmail,
      newReviewerFirstName,
      newReviewerLastName,
      {},
    );
    reviewerFixtures.push({
      ...newReviewer,
      email: newReviewerEmail,
      firstName: newReviewerFirstName,
      lastName: newReviewerLastName,
    });

    const refreshedResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes("/api/vendor-reviewers") &&
        new URL(response.url()).searchParams.get("search") === savedSearch &&
        reviewerRequestPage(response.url()) === "1",
    );
    await page.reload();
    const refreshed = await refreshedResponse;
    expect(refreshed.status()).toBe(200);
    expect((await refreshed.json()).totalCount).toBe(1);
    await expect(reviewerCard(page, newReviewerEmail)).toBeVisible();
    await expect(page.getByLabel("Search users")).toHaveValue(savedSearch);
    await expect(page.getByText("Page 1 of 1", { exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("search")).toBe(savedSearch);
    expect(new URL(page.url()).searchParams.get("page")).toBe("1");
  });

  test("retries a failed saved reviewer page without changing its URL state", async ({
    page,
  }) => {
    const savedSearch = reviewerSearchToken;
    const savedReviewerUrl = `/admin/vendors?search=${encodeURIComponent(
      savedSearch,
    )}&page=2`;
    let failReviewerRequests = true;

    await signInFixture(page, adminEmail, adminUser.id);
    await page.route("**/api/vendor-reviewers*", async (route) => {
      const requestUrl = new URL(route.request().url());
      if (
        requestUrl.searchParams.get("search") === savedSearch &&
        reviewerRequestPage(route.request().url()) === "2" &&
        failReviewerRequests
      ) {
        await route.abort("failed");
        return;
      }
      await route.continue();
    });

    await page.goto(savedReviewerUrl);
    await expect(
      page.getByText("Reviewer access could not be loaded", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: "Retry reviewer results" }),
    ).toBeVisible();
    await expect(page.getByLabel("Search users")).toHaveValue(savedSearch);
    expect(new URL(page.url()).searchParams.get("search")).toBe(savedSearch);
    expect(new URL(page.url()).searchParams.get("page")).toBe("2");

    failReviewerRequests = false;
    const retryResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes("/api/vendor-reviewers") &&
        new URL(response.url()).searchParams.get("search") === savedSearch &&
        reviewerRequestPage(response.url()) === "2",
    );
    await page
      .getByRole("button", { name: "Retry reviewer results" })
      .click();
    const retry = await retryResponse;
    expect(retry.status()).toBe(200);
    expect(new URL(retry.url()).searchParams.get("search")).toBe(savedSearch);
    expect(reviewerRequestPage(retry.url())).toBe("2");
    await expect(
      page.getByText("Reviewer access could not be loaded", { exact: true }),
    ).toBeHidden();
    await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("search")).toBe(savedSearch);
    expect(new URL(page.url()).searchParams.get("page")).toBe("2");
  });

  test("recovers a saved reviewer page after some matching users are removed", async ({
    page,
    browser,
  }) => {
    const savedSearch = reviewerSearchToken;
    const savedReviewerUrl = `/admin/vendors?search=${encodeURIComponent(
      savedSearch,
    )}&page=2`;
    const usersToRemove = reviewerFixtures.slice(0, 2);
    const remainingReviewerCount = reviewerCount - usersToRemove.length;
    const otherAdminContext = await browser.newContext();
    const otherAdminPage = await otherAdminContext.newPage();

    try {
      await signInFixture(page, adminEmail, adminUser.id);
      await signInFixture(otherAdminPage, adminEmail, adminUser.id);

      const initialResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          new URL(response.url()).searchParams.get("search") === savedSearch &&
          reviewerRequestPage(response.url()) === "2",
      );
      await page.goto(savedReviewerUrl);
      const initial = await initialResponse;
      expect(initial.status()).toBe(200);
      expect((await initial.json()).totalCount).toBe(reviewerCount);
      await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
      expect(new URL(page.url()).searchParams.get("search")).toBe(savedSearch);
      expect(new URL(page.url()).searchParams.get("page")).toBe("2");

      const otherAdminResponse = otherAdminPage.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          new URL(response.url()).searchParams.get("search") === savedSearch &&
          reviewerRequestPage(response.url()) === "2",
      );
      await otherAdminPage.goto(savedReviewerUrl);
      expect((await otherAdminResponse).status()).toBe(200);
      await expect(
        otherAdminPage.getByText("Page 2 of 2", { exact: true }),
      ).toBeVisible();

      const reducedCountResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          new URL(response.url()).searchParams.get("search") === savedSearch &&
          reviewerRequestPage(response.url()) === "2",
      );
      const normalizedPageResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          new URL(response.url()).searchParams.get("search") === savedSearch &&
          reviewerRequestPage(response.url()) === "1",
      );
      await Promise.all(
        usersToRemove.map((reviewer) => deleteClerkFixture(reviewer.id)),
      );
      reviewerFixtures = reviewerFixtures.slice(usersToRemove.length);

      const reducedCount = await reducedCountResponse;
      expect(reducedCount.status()).toBe(200);
      expect((await reducedCount.json()).totalCount).toBe(remainingReviewerCount);

      const normalizedPage = await normalizedPageResponse;
      expect(normalizedPage.status()).toBe(200);
      expect((await normalizedPage.json()).totalCount).toBe(
        remainingReviewerCount,
      );

      await expect(page.getByLabel("Search users")).toHaveValue(savedSearch);
      const reviewerPagination = page
        .getByText(
          `Showing 1–${remainingReviewerCount} of ${remainingReviewerCount} users`,
          { exact: true },
        )
        .locator("..");
      await expect(
        reviewerPagination.getByText(`Page 1 of 1`, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /^(Grant|Revoke)$/ }),
      ).toHaveCount(remainingReviewerCount);
      await expect(
        reviewerPagination.getByRole("button", { name: "Previous" }),
      ).toBeDisabled();
      await expect(
        reviewerPagination.getByRole("button", { name: "Next" }),
      ).toBeDisabled();
      expect(new URL(page.url()).searchParams.get("search")).toBe(savedSearch);
      expect(new URL(page.url()).searchParams.get("page")).toBe("1");
    } finally {
      await otherAdminContext.close();
    }
  });
});
