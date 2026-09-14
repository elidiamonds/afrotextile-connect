import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";

type ClerkUser = { id: string };
type ReviewerFixture = ClerkUser & {
  email: string;
  firstName: string;
  lastName: string;
};

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

async function signInFixture(page: Page, emailAddress: string) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress });
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
        const firstName = `Reviewer${sequence}`;
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

    await signInFixture(page, adminEmail);

    let delayedInitialRequest = false;
    await page.route("**/api/vendor-reviewers*", async (route) => {
      if (!delayedInitialRequest) {
        delayedInitialRequest = true;
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

    await test.step("request the next page and preserve reviewer actions", async () => {
      const clearSearchResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/vendor-reviewers") &&
          !new URL(response.url()).searchParams.has("search") &&
          reviewerRequestPage(response.url()) === "1",
      );
      await search.fill("");
      expect((await clearSearchResponse).status()).toBe(200);
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
});