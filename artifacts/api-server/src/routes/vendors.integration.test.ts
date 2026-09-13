import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { execFile } from "node:child_process";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

vi.mock("@clerk/express", () => {
  const metadata = new Map<string, Record<string, unknown>>();
  const buildUser = (userId: string) => {
    const publicMetadata = metadata.get(userId) ?? {
      role: userId === "task-13-admin" ? "admin" : undefined,
    };
    return {
      id: userId,
      emailAddresses: [
        { id: "primary", emailAddress: `${userId}@example.com` },
      ],
      primaryEmailAddressId: "primary",
      firstName: "Test",
      lastName: "User",
      publicMetadata,
    };
  };

  return {
    clerkMiddleware:
      () =>
      (_request: unknown, _response: unknown, next: () => void) =>
        next(),
    getAuth: (request: {
      header: (name: string) => string | undefined;
    }) => ({
      userId: request.header("x-test-user-id") ?? null,
    }),
    clerkClient: {
      users: {
        getUser: async (userId: string) => buildUser(userId),
        getUserList: async (params: {
          limit: number;
          offset: number;
          query?: string;
        }) => {
          const allUsers = [
            "task-13-admin",
            "task-21-target",
            "task-22-search-match",
          ].map(buildUser);
          const filteredUsers = params.query
            ? allUsers.filter((user) =>
                [
                  user.id,
                  user.firstName,
                  user.lastName,
                  user.emailAddresses[0]?.emailAddress,
                ]
                  .filter(Boolean)
                  .some((value) =>
                    value
                      ?.toLowerCase()
                      .includes(params.query!.toLowerCase()),
                  ),
              )
            : allUsers;
          return {
            data: filteredUsers.slice(
              params.offset,
              params.offset + params.limit,
            ),
            totalCount: filteredUsers.length,
          };
        },
        updateUserMetadata: async (
          userId: string,
          update: { publicMetadata: Record<string, unknown> },
        ) => {
          metadata.set(userId, update.publicMetadata);
          return buildUser(userId);
        },
      },
    },
  };
});

type ApiResponse = {
  status: number;
  body: Record<string, unknown> | Array<Record<string, unknown>>;
};

type VendorApplication = {
  id: string;
  businessName: string;
  status: string;
};

const runId = crypto.randomUUID();
const testSchemaPrefix = "vendor_permission_";
const testStartedAt = Math.floor(Date.now() / 1000);
const testSchema = `${testSchemaPrefix}${testStartedAt}_${runId.replaceAll("-", "")}`;
const quotedTestSchema = `"${testSchema}"`;
const emailPrefix = `task-13-${runId}`;
const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const execFileAsync = promisify(execFile);
process.env.DB_SCHEMA = testSchema;

const staleSchemaCleanupEnabled =
  process.env.VENDOR_PERMISSION_CLEANUP_STALE === "1";
const staleSchemaMaxAgeSeconds = 24 * 60 * 60;
const staleSchemaCleanupLimit = 10;
const testSchemaPattern = "^vendor_permission_[0-9]{10}_[0-9a-f]{32}$";

let app: typeof import("../app").default;
let db: typeof import("@workspace/db").db;
let pool: typeof import("@workspace/db").pool;
let productsTable: typeof import("@workspace/db").productsTable;
let baseUrl = "";
let server: ReturnType<typeof import("../app").default.listen> | undefined;

const applicationBody = (name: string, email: string) => ({
  businessName: name,
  contactName: "Amina Okafor",
  email,
  phone: "+2348012345678",
  location: "Lagos, Nigeria",
  category: "Textiles",
  plan: "Starter",
  description:
    "Handcrafted African textiles made by independent makers and dyers.",
});

const productBody = (
  overrides: Partial<{
    name: string;
    status: "draft" | "published" | "archived";
  }> = {},
) => ({
  name: "Indigo hand-dyed wrap",
  price: 48,
  originalPrice: null,
  category: "Textiles",
  sizes: ["One size"],
  fabricType: "Cotton",
  description: "A hand-dyed cotton wrap made by independent makers.",
  inventory: 12,
  status: "draft" as const,
  ...overrides,
});

async function request(
  path: string,
  options: {
    method?: string;
    userId?: string;
    body?: unknown;
  } = {},
): Promise<ApiResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.userId ? { "x-test-user-id": options.userId } : {}),
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : {},
  };
}

async function submitApplication(
  userId: string,
  slug: string,
): Promise<VendorApplication> {
  const result = await request("/vendors", {
    method: "POST",
    userId,
    body: applicationBody(
      `Kente House ${slug}`,
      `${emailPrefix}-${slug}@example.com`,
    ),
  });
  expect(result.status).toBe(201);
  return result.body as VendorApplication;
}

async function setStatus(
  vendorId: string,
  status: "approved" | "rejected",
  reviewNote: string | null = null,
) {
  return request(`/vendors/${vendorId}/status`, {
    method: "PATCH",
    userId: "task-13-admin",
    body: { status, reviewNote },
  });
}

async function cleanupStaleTestSchemas() {
  if (!staleSchemaCleanupEnabled) {
    return;
  }

  // The timestamp is part of the schema name so PostgreSQL can identify old
  // run-scoped schemas without metadata outside the database. The strict
  // pattern and prefix ensure this cannot target application schemas.
  const staleBefore = `${testSchemaPrefix}${Math.floor(Date.now() / 1000) - staleSchemaMaxAgeSeconds}_`;
  const candidates = await db.execute<{ schemaName: string }>(sql`
    SELECT nspname AS "schemaName"
    FROM pg_catalog.pg_namespace
    WHERE nspname LIKE ${`${testSchemaPrefix}%`}
      AND nspname ~ ${testSchemaPattern}
      AND nspname < ${staleBefore}
      AND nspname <> ${testSchema}
    ORDER BY nspname
    LIMIT ${staleSchemaCleanupLimit}
  `);

  for (const { schemaName } of candidates.rows) {
    // The value came from pg_namespace and already passed the strict naming
    // filter. sql.identifier still escapes it as a PostgreSQL identifier.
    await db.execute(
      sql`DROP SCHEMA IF EXISTS ${sql.identifier(schemaName)} CASCADE`,
    );
  }
}

async function pushCanonicalSchema() {
  try {
    await execFileAsync(
      "pnpm",
      ["--filter", "@workspace/db", "run", "push-force"],
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
          DB_SCHEMA: testSchema,
        },
        maxBuffer: 10 * 1024 * 1024,
      },
    );
  } catch (error) {
    const output =
      typeof error === "object" && error !== null
        ? "stderr" in error && typeof error.stderr === "string"
          ? error.stderr
          : "message" in error && typeof error.message === "string"
            ? error.message
            : String(error)
        : String(error);
    throw new Error(
      `Failed to bootstrap the canonical Drizzle schema in ${testSchema}. ` +
        `The test schema was not prepared: ${output}`,
      { cause: error },
    );
  }
}

describe("vendor authorization", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run vendor integration tests.");
    }

    // Set DB_SCHEMA before loading the app or database package. The DB package
    // applies it to every pooled connection, keeping all test queries inside
    // this run-scoped schema instead of the shared development schema.
    ({ db, pool, productsTable } = await import("@workspace/db"));
    await cleanupStaleTestSchemas();
    await db.execute(sql.raw(`CREATE SCHEMA ${quotedTestSchema}`));
    await pushCanonicalSchema();

    ({ default: app } = await import("../app"));

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    if (!server) {
      throw new Error("Unable to start the vendor integration test server.");
    }
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api`;
  });

  afterAll(async () => {
    try {
      if (server) {
        await new Promise<void>((resolve, reject) =>
          server?.close((error) => (error ? reject(error) : resolve())),
        );
      }
    } finally {
      try {
        // DROP ... CASCADE removes every table and row created by this run.
        // It is idempotent, so a partially completed setup is safe to clean.
        if (db) {
          await db.execute(
            sql.raw(`DROP SCHEMA IF EXISTS ${quotedTestSchema} CASCADE`),
          );
        }
      } finally {
        if (pool) {
          await pool.end();
        }
      }
    }
  });

  it("rejects anonymous application submission and review attempts", async () => {
    const application = await submitApplication("task-13-anon-target", "anon");

    await expect(
      request("/vendors", {
        method: "POST",
        body: applicationBody(
          "Anonymous House",
          `${emailPrefix}-anonymous@example.com`,
        ),
      }),
    ).resolves.toMatchObject({ status: 401 });

    await expect(request("/vendors", { method: "GET" })).resolves.toMatchObject({
      status: 401,
    });
    await expect(
      request(`/vendors/${application.id}/status`, {
        method: "PATCH",
        body: { status: "approved" },
      }),
    ).resolves.toMatchObject({ status: 401 });
  });

  it("records every reviewer grant and revoke and limits history to admins", async () => {
    const targetUserId = `task-21-target-${runId}`;

    await expect(
      request("/vendor-reviewer-access-history", { userId: targetUserId }),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      request("/vendor-reviewer-access-history", { userId: "task-13-admin" }),
    ).resolves.toMatchObject({ status: 200, body: [] });

    const granted = await request(`/vendor-reviewers/${targetUserId}`, {
      method: "PATCH",
      userId: "task-13-admin",
      body: { enabled: true },
    });
    expect(granted.status).toBe(200);

    const revoked = await request(`/vendor-reviewers/${targetUserId}`, {
      method: "PATCH",
      userId: "task-13-admin",
      body: { enabled: false },
    });
    expect(revoked.status).toBe(200);

    const history = await request("/vendor-reviewer-access-history", {
      userId: "task-13-admin",
    });
    expect(history.status).toBe(200);
    expect(history.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetUserId,
          actorUserId: "task-13-admin",
          action: "grant",
          targetUser: {
            displayName: "Test User",
            email: `${targetUserId}@example.com`,
          },
          actorUser: {
            displayName: "Test User",
            email: "task-13-admin@example.com",
          },
        }),
        expect.objectContaining({
          targetUserId,
          actorUserId: "task-13-admin",
          action: "revoke",
          targetUser: {
            displayName: "Test User",
            email: `${targetUserId}@example.com`,
          },
          actorUser: {
            displayName: "Test User",
            email: "task-13-admin@example.com",
          },
        }),
      ]),
    );
    expect((history.body as Array<Record<string, unknown>>)).toHaveLength(2);
    expect(
      (history.body as Array<Record<string, unknown>>).every(
        (entry) => typeof entry.changedAt === "string",
      ),
    ).toBe(true);
  });

  it("searches and paginates reviewer users with bounded page sizes", async () => {
    const firstPage = await request(
      "/vendor-reviewers?page=1&limit=2",
      { userId: "task-13-admin" },
    );
    expect(firstPage.status).toBe(200);
    expect(firstPage.body).toMatchObject({
      page: 1,
      limit: 2,
      totalCount: 3,
      hasNextPage: true,
    });
    expect((firstPage.body as { items: unknown[] }).items).toHaveLength(2);

    const secondPage = await request(
      "/vendor-reviewers?page=2&limit=2",
      { userId: "task-13-admin" },
    );
    expect(secondPage.status).toBe(200);
    expect(secondPage.body).toMatchObject({
      page: 2,
      limit: 2,
      totalCount: 3,
      hasNextPage: false,
    });
    expect((secondPage.body as { items: Array<{ userId: string }> }).items).toEqual(
      [expect.objectContaining({ userId: "task-22-search-match" })],
    );

    const searchResult = await request(
      "/vendor-reviewers?search=search-match",
      { userId: "task-13-admin" },
    );
    expect(searchResult.status).toBe(200);
    expect(searchResult.body).toMatchObject({
      page: 1,
      limit: 25,
      totalCount: 1,
      hasNextPage: false,
    });
    expect((searchResult.body as { items: Array<{ userId: string }> }).items).toEqual(
      [expect.objectContaining({ userId: "task-22-search-match" })],
    );

    await expect(
      request("/vendor-reviewers?limit=51", { userId: "task-13-admin" }),
    ).resolves.toMatchObject({ status: 400 });
  });

  it("limits application records and edits to the owner or an admin", async () => {
    const ownerId = "task-13-owner";
    const otherUserId = "task-13-other";
    const application = await submitApplication(ownerId, "ownership");

    await expect(
      request("/vendors/me", { userId: ownerId }),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      request(`/vendors/${application.id}`, { userId: ownerId }),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      request("/vendors/me", { userId: otherUserId }),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      request(`/vendors/${application.id}`, { userId: otherUserId }),
    ).resolves.toMatchObject({ status: 403 });

    await expect(
      request(`/vendors/${application.id}`, {
        method: "PATCH",
        userId: ownerId,
        body: { description: "Updated by the storefront owner." },
      }),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      request(`/vendors/${application.id}`, {
        method: "PATCH",
        userId: otherUserId,
        body: { description: "Unauthorized storefront edit attempt." },
      }),
    ).resolves.toMatchObject({ status: 404 });

    await expect(
      request(`/vendors/${application.id}`, {
        userId: "task-13-admin",
      }),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      request(`/vendors/${application.id}`, {
        method: "PATCH",
        userId: "task-13-admin",
        body: { businessName: "Admin Reviewed Kente House" },
      }),
    ).resolves.toMatchObject({ status: 200 });
  });

  it("allows only admins to list applications and change application status", async () => {
    const application = await submitApplication("task-13-review-owner", "review");

    await expect(
      request("/vendors", { userId: "task-13-review-owner" }),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      request(`/vendors/${application.id}/status`, {
        method: "PATCH",
        userId: "task-13-review-owner",
        body: { status: "approved" },
      }),
    ).resolves.toMatchObject({ status: 403 });

    const list = await request("/vendors?status=pending", {
      userId: "task-13-admin",
    });
    expect(list.status).toBe(200);
    expect(
      (list.body as Array<{ id: string }>).some(
        (vendor) => vendor.id === application.id,
      ),
    ).toBe(true);

    const approved = await setStatus(application.id, "approved");
    expect(approved.status).toBe(200);
    expect((approved.body as VendorApplication).status).toBe("approved");
  });

  it("keeps pending and rejected storefronts private while exposing approved ones", async () => {
    const pending = await submitApplication("task-13-pending-owner", "pending");
    const rejected = await submitApplication(
      "task-13-rejected-owner",
      "rejected",
    );
    const approved = await submitApplication(
      "task-13-approved-owner",
      "approved",
    );
    await setStatus(rejected.id, "rejected", "Please provide more business details.");
    await setStatus(approved.id, "approved");

    const [pendingProduct] = await db
      .insert(productsTable)
      .values({
        vendorId: pending.id,
        name: "Pending vendor product",
        category: "Textiles",
        priceCents: 4200,
        originalPriceCents: null,
        imageUrl: null,
        sizes: ["One size"],
        fabricType: "Cotton",
        description: "A product that must remain private while pending.",
        inventory: 4,
        status: "published",
      })
      .returning();
    const [rejectedProduct] = await db
      .insert(productsTable)
      .values({
        vendorId: rejected.id,
        name: "Rejected vendor product",
        category: "Textiles",
        priceCents: 4600,
        originalPriceCents: null,
        imageUrl: null,
        sizes: ["One size"],
        fabricType: "Cotton",
        description: "A product that must remain private after rejection.",
        inventory: 4,
        status: "published",
      })
      .returning();

    for (const vendor of [pending, rejected]) {
      await expect(request(`/storefronts/${vendor.id}`)).resolves.toMatchObject({
        status: 404,
      });
      await expect(
        request(`/vendors/${vendor.id}/products`),
      ).resolves.toMatchObject({ status: 404 });
    }
    await expect(request(`/products/${pendingProduct.id}`)).resolves.toMatchObject({
      status: 404,
    });
    await expect(request(`/products/${rejectedProduct.id}`)).resolves.toMatchObject({
      status: 404,
    });

    await expect(
      request(`/storefronts/${approved.id}`),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      request(`/vendors/${approved.id}/products`),
    ).resolves.toMatchObject({ status: 200, body: [] });
  });

  it("restricts catalog management to the vendor owner or an admin", async () => {
    const ownerId = "task-20-catalog-owner";
    const otherUserId = "task-20-catalog-other";
    const adminId = "task-13-admin";
    const owner = await submitApplication(ownerId, "catalog-owner");
    const other = await submitApplication(otherUserId, "catalog-other");
    await setStatus(owner.id, "approved");
    await setStatus(other.id, "approved");

    const created = await request(`/vendors/${owner.id}/products`, {
      method: "POST",
      userId: ownerId,
      body: productBody(),
    });
    expect(created.status).toBe(201);
    const productId = (created.body as { id: string }).id;

    await expect(
      request(`/vendors/${owner.id}/products/manage`, { userId: ownerId }),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      request(`/vendors/${owner.id}/products/manage`, { userId: otherUserId }),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      request(`/vendors/${owner.id}/products/manage`, { userId: adminId }),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      request(`/vendors/${owner.id}/products/manage`),
    ).resolves.toMatchObject({ status: 401 });

    await expect(
      request(`/vendors/${owner.id}/products`, {
        method: "POST",
        userId: otherUserId,
        body: productBody({ name: "Cross-vendor product" }),
      }),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      request(`/vendors/${owner.id}/products`, {
        method: "POST",
        userId: adminId,
        body: productBody({ name: "Admin catalog product" }),
      }),
    ).resolves.toMatchObject({ status: 201 });
    await expect(
      request(`/vendors/${owner.id}/products`, {
        method: "POST",
        body: productBody({ name: "Anonymous product" }),
      }),
    ).resolves.toMatchObject({ status: 401 });

    await expect(
      request(`/products/${productId}`, {
        method: "PATCH",
        userId: ownerId,
        body: { name: "Owner updated product" },
      }),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      request(`/products/${productId}`, {
        method: "PATCH",
        userId: otherUserId,
        body: { name: "Cross-vendor update" },
      }),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      request(`/products/${productId}`, {
        method: "PATCH",
        userId: adminId,
        body: { name: "Admin updated product" },
      }),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      request(`/products/${productId}`, {
        method: "PATCH",
        body: { name: "Anonymous update" },
      }),
    ).resolves.toMatchObject({ status: 401 });
  });

  it("records product changes and lets owners and reviewers inspect the history", async () => {
    const ownerId = "task-33-history-owner";
    const reviewerId = "task-33-history-reviewer";
    const otherUserId = "task-33-history-other";
    const owner = await submitApplication(ownerId, "history-owner");
    await setStatus(owner.id, "approved");

    const reviewerAccess = await request(`/vendor-reviewers/${reviewerId}`, {
      method: "PATCH",
      userId: "task-13-admin",
      body: { enabled: true },
    });
    expect(reviewerAccess.status).toBe(200);

    const created = await request(`/vendors/${owner.id}/products`, {
      method: "POST",
      userId: ownerId,
      body: productBody(),
    });
    expect(created.status).toBe(201);
    const productId = (created.body as { id: string }).id;

    await expect(
      request(`/products/${productId}/history`, { userId: ownerId }),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      request(`/products/${productId}/history`, { userId: otherUserId }),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      request(`/products/${productId}/history`),
    ).resolves.toMatchObject({ status: 401 });

    await request(`/products/${productId}`, {
      method: "PATCH",
      userId: ownerId,
      body: { name: "Updated indigo wrap" },
    });
    await request(`/products/${productId}`, {
      method: "PATCH",
      userId: ownerId,
      body: { status: "published" },
    });
    await request(`/products/${productId}`, {
      method: "PATCH",
      userId: ownerId,
      body: { status: "archived" },
    });

    const history = await request(`/products/${productId}/history`, {
      userId: reviewerId,
    });
    expect(history.status).toBe(200);
    expect(history.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorUserId: ownerId,
          action: "created",
        }),
        expect.objectContaining({
          actorUserId: ownerId,
          action: "edited",
          changes: expect.objectContaining({
            name: {
              from: "Indigo hand-dyed wrap",
              to: "Updated indigo wrap",
            },
          }),
        }),
        expect.objectContaining({ actorUserId: ownerId, action: "published" }),
        expect.objectContaining({ actorUserId: ownerId, action: "archived" }),
      ]),
    );
    expect((history.body as Array<unknown>)).toHaveLength(4);
  });

  it("does not let unapproved vendors publish products", async () => {
    const pendingOwnerId = "task-20-pending-publisher";
    const rejectedOwnerId = "task-20-rejected-publisher";
    const pending = await submitApplication(pendingOwnerId, "publisher-pending");
    const rejected = await submitApplication(
      rejectedOwnerId,
      "publisher-rejected",
    );
    await setStatus(rejected.id, "rejected", "Please provide more business details.");

    await expect(
      request(`/vendors/${pending.id}/products`, {
        method: "POST",
        userId: pendingOwnerId,
        body: productBody({ status: "published" }),
      }),
    ).resolves.toMatchObject({ status: 403 });
    const pendingDraft = await request(`/vendors/${pending.id}/products`, {
      method: "POST",
      userId: pendingOwnerId,
      body: productBody({ name: "Pending vendor draft" }),
    });
    expect(pendingDraft.status).toBe(201);
    await expect(
      request(`/products/${(pendingDraft.body as { id: string }).id}`, {
        method: "PATCH",
        userId: pendingOwnerId,
        body: { status: "published" },
      }),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      request(`/vendors/${rejected.id}/products`, {
        method: "POST",
        userId: "task-13-admin",
        body: productBody({ status: "published" }),
      }),
    ).resolves.toMatchObject({ status: 403 });
  });

  it("completes sign-up, application, approval, return visit, and storefront editing", async () => {
    // A real Clerk sign-up supplies this stable user id to the API. The test
    // uses the same authenticated HTTP boundary so it does not depend on a
    // live email provider or a shared Clerk test account.
    const signedUpUserId = "task-13-e2e-signed-up";
    const application = await submitApplication(signedUpUserId, "e2e");

    expect(application.status).toBe("pending");
    expect(
      (await request(`/vendors/${application.id}`, {
        userId: signedUpUserId,
      })).status,
    ).toBe(200);

    expect((await setStatus(application.id, "approved")).status).toBe(200);
    expect(
      (await request(`/storefronts/${application.id}`)).status,
    ).toBe(200);

    const edited = await request(`/vendors/${application.id}`, {
      method: "PATCH",
      userId: signedUpUserId,
      body: {
        businessName: "Kente House Returned",
        description: "A refreshed storefront story for returning customers.",
      },
    });
    expect(edited.status).toBe(200);
    expect((edited.body as { businessName: string }).businessName).toBe(
      "Kente House Returned",
    );

    const returnVisit = await request(`/vendors/${application.id}`, {
      userId: signedUpUserId,
    });
    expect(returnVisit.status).toBe(200);
    expect((returnVisit.body as { businessName: string }).businessName).toBe(
      "Kente House Returned",
    );
  });
});