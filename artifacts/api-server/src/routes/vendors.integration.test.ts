import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { execFile } from "node:child_process";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dropReviewedSchemas } from "../lib/legacySchemaCleanup";

vi.mock("@clerk/express", () => {
  const metadata = new Map<string, Record<string, unknown>>();
  const buildUser = (userId: string) => {
    const defaultMetadata =
      userId === "task-13-admin" ||
      userId === "task-133-admin-a" ||
      userId === "task-133-admin-b"
        ? { role: "admin" }
        : userId === "task-136-vendor-reviewer"
          ? { vendorReviewer: true }
          : {};
    const publicMetadata = metadata.get(userId) ?? defaultMetadata;
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
            ...(params.query?.includes("task-133-concurrent-target")
              ? ["task-133-concurrent-target"]
              : []),
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
let assertDatabaseSchema: typeof import("@workspace/db").assertDatabaseSchema;
let productsTable: typeof import("@workspace/db").productsTable;
let productImageCleanupTable: typeof import("@workspace/db").productImageCleanupTable;
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
    imageUrl: string | null;
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

  let removedSchemaCount = 0;
  for (const { schemaName } of candidates.rows) {
    // The value came from pg_namespace and already passed the strict naming
    // filter. sql.identifier still escapes it as a PostgreSQL identifier.
    await db.execute(
      sql`DROP SCHEMA IF EXISTS ${sql.identifier(schemaName)} CASCADE`,
    );
    removedSchemaCount += 1;
  }

  console.log(
    `Vendor test schema cleanup: selected ${candidates.rows.length}, ` +
      `removed ${removedSchemaCount}.`,
  );
  if (candidates.rows.length === staleSchemaCleanupLimit) {
    console.warn(
      `Vendor test schema cleanup reached its safety cap of ` +
        `${staleSchemaCleanupLimit}; additional stale schemas may remain. ` +
        "Rerun cleanup to remove them.",
    );
  }
}

async function createSchema(schemaName: string) {
  await db.execute(sql`CREATE SCHEMA ${sql.identifier(schemaName)}`);
}

async function dropSchema(schemaName: string) {
  await db.execute(
    sql`DROP SCHEMA IF EXISTS ${sql.identifier(schemaName)} CASCADE`,
  );
}

async function runLegacySchemaCleanup(arguments_: string[]) {
  const { DB_SCHEMA: _dbSchema, ...environment } = process.env;
  try {
    return await execFileAsync(
      "pnpm",
      [
        "--filter",
        "@workspace/api-server",
        "cleanup:legacy-vendor-schemas",
        ...arguments_,
      ],
      {
        cwd: workspaceRoot,
        env: environment,
        maxBuffer: 10 * 1024 * 1024,
      },
    );
  } catch (error) {
    const commandError = error as {
      message?: string;
      stderr?: string;
    };
    throw new Error(
      `${commandError.message ?? String(error)}\n${commandError.stderr ?? ""}`,
      { cause: error },
    );
  }
}

async function schemaNames(names: string[]) {
  const result = await db.execute<{ schemaName: string }>(sql`
    SELECT nspname AS "schemaName"
    FROM pg_catalog.pg_namespace
    WHERE nspname IN (
      ${sql.join(
        names.map((schemaName) => sql`${schemaName}`),
        sql`, `,
      )}
    )
    ORDER BY nspname
  `);
  return result.rows.map(({ schemaName }) => schemaName);
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
    ({
      assertDatabaseSchema,
      db,
      pool,
      productsTable,
      productImageCleanupTable,
    } = await import("@workspace/db"));

    // Creating this uniquely named schema is the only bootstrap DDL before
    // the guard. The assertion must be the first operation after creation,
    // before stale-schema cleanup, canonical schema setup, or fixture writes.
    await createSchema(testSchema);
    await assertDatabaseSchema(testSchema);
    await cleanupStaleTestSchemas();
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

  it("lists only supported legacy vendor schema formats", async () => {
    const fixtureRunId = crypto.randomUUID().replaceAll("-", "");
    const legacyUuidSchema = `${testSchemaPrefix}${crypto.randomUUID()}`;
    const legacyCompactSchema = `${testSchemaPrefix}${crypto
      .randomUUID()
      .replaceAll("-", "")}`;
    const nonLegacySchema = `${testSchemaPrefix}active_${fixtureRunId}`;
    const applicationSchema = `afrotextile_application_${fixtureRunId}`;
    const fixtureSchemaNames = [
      legacyUuidSchema,
      legacyCompactSchema,
      nonLegacySchema,
      applicationSchema,
    ];

    try {
      for (const schemaName of fixtureSchemaNames) {
        await createSchema(schemaName);
      }

      const cleanupResult = await runLegacySchemaCleanup(["--list"]);

      expect(cleanupResult.stdout).toContain(legacyUuidSchema);
      expect(cleanupResult.stdout).toContain(legacyCompactSchema);
      expect(cleanupResult.stdout).not.toContain(nonLegacySchema);
      expect(cleanupResult.stdout).not.toContain(applicationSchema);
      expect(await schemaNames(fixtureSchemaNames)).toEqual(
        [...fixtureSchemaNames].sort(),
      );
    } finally {
      for (const schemaName of fixtureSchemaNames) {
        await dropSchema(schemaName);
      }
    }
  });

  it("rejects unsafe legacy schema allowlists without dropping anything", async () => {
    const reviewedSchema = `${testSchemaPrefix}${crypto.randomUUID()}`;
    const secondReviewedSchema = `${testSchemaPrefix}${crypto
      .randomUUID()
      .replaceAll("-", "")}`;
    const nonLegacySchema = `afrotextile_application_${crypto
      .randomUUID()
      .replaceAll("-", "")}`;
    const staleSchema = `${testSchemaPrefix}${crypto.randomUUID()}`;
    const fixtureSchemaNames = [
      reviewedSchema,
      secondReviewedSchema,
      nonLegacySchema,
    ];
    const staleCleanupError =
      `Schema was not present in the reviewed listing: ${staleSchema}.`;

    try {
      for (const schemaName of fixtureSchemaNames) {
        await createSchema(schemaName);
      }

      await expect(
        runLegacySchemaCleanup(["--drop", reviewedSchema]),
      ).rejects.toThrow(
        "Dropping legacy schemas requires --confirm after reviewing --list.",
      );
      await expect(
        runLegacySchemaCleanup(["--drop", nonLegacySchema, "--confirm"]),
      ).rejects.toThrow(`Refusing non-legacy schema name: ${nonLegacySchema}.`);
      await expect(
        runLegacySchemaCleanup([
          "--drop",
          `${reviewedSchema},${reviewedSchema}`,
          "--confirm",
        ]),
      ).rejects.toThrow(
        `Duplicate schema names in allowlist: ${reviewedSchema}`,
      );
      await expect(
        runLegacySchemaCleanup([
          "--drop",
          `${reviewedSchema},${staleSchema}`,
          "--confirm",
        ]),
      ).rejects.toThrow(staleCleanupError);

      expect(await schemaNames(fixtureSchemaNames)).toEqual(
        [...fixtureSchemaNames].sort(),
      );
    } finally {
      for (const schemaName of [...fixtureSchemaNames, staleSchema]) {
        await dropSchema(schemaName);
      }
    }
  });

  it("drops only the approved exact legacy schema allowlist", async () => {
    const approvedUuidSchema = `${testSchemaPrefix}${crypto.randomUUID()}`;
    const approvedCompactSchema = `${testSchemaPrefix}${crypto
      .randomUUID()
      .replaceAll("-", "")}`;
    const unapprovedLegacySchema = `${testSchemaPrefix}${crypto.randomUUID()}`;
    const applicationSchema = `afrotextile_application_${crypto
      .randomUUID()
      .replaceAll("-", "")}`;
    const fixtureSchemaNames = [
      approvedUuidSchema,
      approvedCompactSchema,
      unapprovedLegacySchema,
      applicationSchema,
    ];

    try {
      for (const schemaName of fixtureSchemaNames) {
        await createSchema(schemaName);
      }

      const listing = await runLegacySchemaCleanup(["--list"]);
      expect(listing.stdout).toContain(approvedUuidSchema);
      expect(listing.stdout).toContain(approvedCompactSchema);
      expect(listing.stdout).toContain(unapprovedLegacySchema);

      const cleanupResult = await runLegacySchemaCleanup([
        "--drop",
        `${approvedUuidSchema},${approvedCompactSchema}`,
        "--confirm",
      ]);

      expect(cleanupResult.stdout).toContain(approvedUuidSchema);
      expect(cleanupResult.stdout).toContain(approvedCompactSchema);
      expect(await schemaNames(fixtureSchemaNames)).toEqual(
        [applicationSchema, unapprovedLegacySchema].sort(),
      );
    } finally {
      for (const schemaName of fixtureSchemaNames) {
        await dropSchema(schemaName);
      }
    }
  });

  it("coordinates concurrent cleanup runs and reports overlapping schemas as already removed", async () => {
    const sharedSchema = `${testSchemaPrefix}${crypto.randomUUID()}`;
    const firstOnlySchema = `${testSchemaPrefix}${crypto.randomUUID()}`;
    const secondOnlySchema = `${testSchemaPrefix}${crypto
      .randomUUID()
      .replaceAll("-", "")
      .slice(0, 32)}`;
    const unapprovedLegacySchema = `${testSchemaPrefix}${crypto.randomUUID()}`;
    const applicationSchema = `afrotextile_application_${crypto
      .randomUUID()
      .replaceAll("-", "")}`;
    const fixtureSchemaNames = [
      sharedSchema,
      firstOnlySchema,
      secondOnlySchema,
      unapprovedLegacySchema,
      applicationSchema,
    ];
    const cleanupLockSql =
      "SELECT pg_advisory_lock(hashtextextended(" +
      "'afrotextile:legacy-vendor-schema-cleanup', 0))";
    const cleanupUnlockSql =
      "SELECT pg_advisory_unlock(hashtextextended(" +
      "'afrotextile:legacy-vendor-schema-cleanup', 0))";
    const lockClient = await pool.connect();
    let cleanupLockHeld = false;

    try {
      for (const schemaName of fixtureSchemaNames) {
        await createSchema(schemaName);
      }

      await lockClient.query(cleanupLockSql);
      cleanupLockHeld = true;
      const cleanups = Promise.all([
        runLegacySchemaCleanup([
          "--drop",
          `${sharedSchema},${firstOnlySchema}`,
          "--confirm",
        ]),
        runLegacySchemaCleanup([
          "--drop",
          `${sharedSchema},${secondOnlySchema}`,
          "--confirm",
        ]),
      ]);
      // Both subprocesses review the allowlist before waiting for this lock.
      await new Promise<void>((resolve) => setTimeout(resolve, 10_000));
      await lockClient.query(cleanupUnlockSql);
      cleanupLockHeld = false;
      const [firstCleanup, secondCleanup] = await cleanups;

      const combinedOutput = firstCleanup.stdout + secondCleanup.stdout;
      expect(combinedOutput).toContain("already removed");
      expect(await schemaNames(fixtureSchemaNames)).toEqual(
        [applicationSchema, unapprovedLegacySchema].sort(),
      );
    } finally {
      if (cleanupLockHeld) {
        await lockClient.query(cleanupUnlockSql);
      }
      lockClient.release();
      for (const schemaName of fixtureSchemaNames) {
        await dropSchema(schemaName);
      }
    }
  });

  it("fails fast when the connection is pointed at the wrong schema", async () => {
    await expect(assertDatabaseSchema("public")).rejects.toThrow(
      new RegExp(
        `Database schema mismatch: expected current_schema\\(\\) to be "public" but got "${testSchema}"`,
      ),
    );
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

  it.skipIf(!staleSchemaCleanupEnabled)(
    "cleans only stale vendor-permission schemas within the configured limit",
    async () => {
      const fixtureRunId = crypto.randomUUID().replaceAll("-", "");
      // Use an old, valid timestamp so these fixtures sort before unrelated
      // stale schemas and deterministically exercise the cleanup limit.
      const staleTimestamp = 1_000_000_000;
      const staleSchemaNames = Array.from(
        { length: staleSchemaCleanupLimit + 2 },
        (_, index) =>
          `${testSchemaPrefix}${staleTimestamp}_${fixtureRunId.slice(0, 30)}${(
            index + 1
          )
            .toString(16)
            .padStart(2, "0")}`,
      );
      const freshSchemaName = `${testSchemaPrefix}${Math.floor(
        Date.now() / 1000,
      )}_${fixtureRunId}`;
      const legacySchemaName = `${testSchemaPrefix}${crypto
        .randomUUID()
        .replaceAll("-", "")}`;
      const activeShapedSchemaName = `${testSchemaPrefix}active_${fixtureRunId}`;
      const applicationShapedSchemaName = `afrotextile_application_${fixtureRunId}`;
      const fixtureSchemaNames = [
        ...staleSchemaNames,
        freshSchemaName,
        legacySchemaName,
        activeShapedSchemaName,
        applicationShapedSchemaName,
      ];

      try {
        for (const schemaName of fixtureSchemaNames) {
          await createSchema(schemaName);
        }

        const cleanupLog = vi
          .spyOn(console, "log")
          .mockImplementation(() => undefined);
        const cleanupWarning = vi
          .spyOn(console, "warn")
          .mockImplementation(() => undefined);
        try {
          await cleanupStaleTestSchemas();
          expect(cleanupLog).toHaveBeenCalledWith(
            `Vendor test schema cleanup: selected ${staleSchemaCleanupLimit}, ` +
              `removed ${staleSchemaCleanupLimit}.`,
          );
          expect(cleanupWarning).toHaveBeenCalledWith(
            `Vendor test schema cleanup reached its safety cap of ` +
              `${staleSchemaCleanupLimit}; additional stale schemas may remain. ` +
              "Rerun cleanup to remove them.",
          );
        } finally {
          cleanupLog.mockRestore();
          cleanupWarning.mockRestore();
        }

        const remainingSchemas = await db.execute<{ schemaName: string }>(sql`
          SELECT nspname AS "schemaName"
          FROM pg_catalog.pg_namespace
          WHERE nspname IN (
            ${sql.join(
              fixtureSchemaNames.map((schemaName) => sql`${schemaName}`),
              sql`, `,
            )}
          )
          ORDER BY nspname
        `);
        const remainingSchemaNames = remainingSchemas.rows.map(
          ({ schemaName }) => schemaName,
        );
        const expectedRemainingSchemaNames = [
          ...staleSchemaNames.slice(staleSchemaCleanupLimit),
          freshSchemaName,
          legacySchemaName,
          activeShapedSchemaName,
          applicationShapedSchemaName,
        ].sort();

        expect(remainingSchemaNames).toEqual(expectedRemainingSchemaNames);
        expect(remainingSchemaNames).not.toContain(
          staleSchemaNames[staleSchemaCleanupLimit - 1],
        );
        expect(remainingSchemaNames).toContain(
          staleSchemaNames[staleSchemaCleanupLimit],
        );
      } finally {
        for (const schemaName of fixtureSchemaNames) {
          await dropSchema(schemaName);
        }
      }
    },
  );

  it.skipIf(!staleSchemaCleanupEnabled)(
    "fails visibly without reporting a failed stale schema as removed",
    async () => {
      const failedSchemaName = `${testSchemaPrefix}1000000000_${crypto
        .randomUUID()
        .replaceAll("-", "")}`;
      const cleanupLog = vi
        .spyOn(console, "log")
        .mockImplementation(() => undefined);
      const cleanupExecute = vi.spyOn(db, "execute");

      cleanupExecute
        .mockResolvedValueOnce({
          rows: [{ schemaName: failedSchemaName }],
        } as never)
        .mockRejectedValueOnce(new Error("simulated schema drop failure"));

      try {
        await expect(cleanupStaleTestSchemas()).rejects.toThrow(
          "simulated schema drop failure",
        );
        expect(cleanupExecute).toHaveBeenCalledTimes(2);
        expect(cleanupLog).not.toHaveBeenCalled();
        expect(cleanupLog).not.toHaveBeenCalledWith(
          `Vendor test schema cleanup: selected 1, removed 1.`,
        );
      } finally {
        cleanupExecute.mockRestore();
        cleanupLog.mockRestore();
      }
    },
  );

  it("rolls back reviewed schema cleanup and reports attempted schemas on a database error", async () => {
    const firstSchema = `${testSchemaPrefix}${crypto.randomUUID()}`;
    const failedSchema = `${testSchemaPrefix}${crypto
      .randomUUID()
      .replaceAll("-", "")}`;
    const thirdSchema = `${testSchemaPrefix}${crypto.randomUUID()}`;
    const attemptedStatements: string[] = [];
    const schemaExistsSql =
      'SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = $1) AS "schemaExists"';
    const client = {
      query: vi.fn(async (statement: string) => {
        attemptedStatements.push(statement);
        if (statement.includes(`DROP SCHEMA IF EXISTS "${failedSchema}"`)) {
          throw new Error("simulated schema drop failure");
        }
        if (statement === schemaExistsSql) {
          return { rows: [{ schemaExists: true }] };
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
    };

    await expect(
      dropReviewedSchemas(pool as never, [
        firstSchema,
        failedSchema,
        thirdSchema,
      ]),
    ).rejects.toThrow(
      "The transaction was rolled back; no schemas were removed. " +
        `Schemas attempted: ${firstSchema}, ${failedSchema}.`,
    );

    expect(attemptedStatements).toEqual([
      "BEGIN",
      "SELECT pg_advisory_xact_lock(hashtextextended('afrotextile:legacy-vendor-schema-cleanup', 0))",
      schemaExistsSql,
      `DROP SCHEMA IF EXISTS "${firstSchema}" CASCADE`,
      schemaExistsSql,
      `DROP SCHEMA IF EXISTS "${failedSchema}" CASCADE`,
      "ROLLBACK",
    ]);
    expect(attemptedStatements).not.toContain(
      `DROP SCHEMA "${thirdSchema}" CASCADE`,
    );
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("records every reviewer grant and revoke and limits history to admins", async () => {
    const targetUserId = `task-21-target-${runId}`;

    await expect(
      request("/vendor-reviewer-access-history", { userId: targetUserId }),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      request("/vendor-reviewer-access-history", { userId: "task-13-admin" }),
    ).resolves.toMatchObject({
      status: 200,
      body: {
        items: [],
        page: 1,
        limit: 25,
        totalCount: 0,
        hasNextPage: false,
      },
    });

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
    expect((history.body as { items: Array<Record<string, unknown>> }).items).toEqual(
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
    expect((history.body as { items: Array<Record<string, unknown>> }).items).toHaveLength(2);
    expect(
      (history.body as { items: Array<Record<string, unknown>> }).items.every(
        (entry) => typeof entry.changedAt === "string",
      ),
    ).toBe(true);

    const firstHistoryPage = await request(
      "/vendor-reviewer-access-history?page=1&limit=1",
      { userId: "task-13-admin" },
    );
    expect(firstHistoryPage.status).toBe(200);
    expect(firstHistoryPage.body).toMatchObject({
      page: 1,
      limit: 1,
      totalCount: 2,
      hasNextPage: true,
    });
    expect(
      (firstHistoryPage.body as { items: Array<Record<string, unknown>> }).items,
    ).toHaveLength(1);

    const secondHistoryPage = await request(
      "/vendor-reviewer-access-history?page=2&limit=1",
      { userId: "task-13-admin" },
    );
    expect(secondHistoryPage.status).toBe(200);
    expect(secondHistoryPage.body).toMatchObject({
      page: 2,
      limit: 1,
      totalCount: 2,
      hasNextPage: false,
    });
    expect(
      (secondHistoryPage.body as { items: Array<Record<string, unknown>> }).items,
    ).toHaveLength(1);
    expect(
      (
        firstHistoryPage.body as {
          items: Array<{ id: string }>;
        }
      ).items[0]?.id,
    ).not.toBe(
      (
        secondHistoryPage.body as {
          items: Array<{ id: string }>;
        }
      ).items[0]?.id,
    );

    await expect(
      request("/vendor-reviewer-access-history?limit=51", {
        userId: "task-13-admin",
      }),
    ).resolves.toMatchObject({ status: 400 });
  });

  it("denies vendor reviewers all reviewer management endpoints", async () => {
    const vendorReviewerId = "task-136-vendor-reviewer";
    const targetUserId = `task-136-target-${runId}`;
    const historyBefore = await request("/vendor-reviewer-access-history", {
      userId: "task-13-admin",
    });
    expect(historyBefore.status).toBe(200);
    const historyBeforeCount = (
      historyBefore.body as { totalCount: number }
    ).totalCount;

    const reviewerList = await request(
      `/vendor-reviewers?search=${targetUserId}`,
      { userId: vendorReviewerId },
    );
    expect(reviewerList).toEqual({
      status: 403,
      body: { error: "Admin access required" },
    });

    const accessHistory = await request("/vendor-reviewer-access-history", {
      userId: vendorReviewerId,
    });
    expect(accessHistory).toEqual({
      status: 403,
      body: { error: "Admin access required" },
    });

    const reviewerUpdate = await request(`/vendor-reviewers/${targetUserId}`, {
      method: "PATCH",
      userId: vendorReviewerId,
      body: { enabled: true },
    });
    expect(reviewerUpdate).toEqual({
      status: 403,
      body: { error: "Admin access required" },
    });

    const historyAfter = await request("/vendor-reviewer-access-history", {
      userId: "task-13-admin",
    });
    expect(historyAfter.status).toBe(200);
    expect(
      (historyAfter.body as { totalCount: number }).totalCount,
    ).toBe(historyBeforeCount);
    expect(
      (historyAfter.body as { items: Array<{ actorUserId: string }> }).items,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ actorUserId: vendorReviewerId }),
      ]),
    );
  });

  it("does not duplicate audit entries when access history is requested repeatedly", async () => {
    const targetUserId = `task-135-history-recovery-${runId}`;

    const granted = await request(`/vendor-reviewers/${targetUserId}`, {
      method: "PATCH",
      userId: "task-13-admin",
      body: { enabled: true },
    });
    expect(granted.status).toBe(200);

    const repeatedHistoryRequests = await Promise.all(
      Array.from({ length: 3 }, () =>
        request("/vendor-reviewer-access-history?limit=50", {
          userId: "task-13-admin",
        }),
      ),
    );
    const targetEntriesByRequest = repeatedHistoryRequests.map((response) => {
      expect(response.status).toBe(200);
      return (
        response.body as {
          items: Array<{ id: string; targetUserId: string }>;
        }
      ).items.filter((entry) => entry.targetUserId === targetUserId);
    });

    expect(targetEntriesByRequest).toHaveLength(3);
    for (const targetEntries of targetEntriesByRequest) {
      expect(targetEntries).toHaveLength(1);
    }
    expect(
      targetEntriesByRequest.map((entries) => entries[0]?.id),
    ).toEqual([
      targetEntriesByRequest[0]![0]!.id,
      targetEntriesByRequest[0]![0]!.id,
      targetEntriesByRequest[0]![0]!.id,
    ]);
  });

  it("serializes concurrent reviewer mutations without losing actor history", async () => {
    const targetUserId = "task-133-concurrent-target";
    const mutations = [
      {
        actorUserId: "task-133-admin-a",
        enabled: true,
        action: "grant" as const,
      },
      {
        actorUserId: "task-133-admin-b",
        enabled: false,
        action: "revoke" as const,
      },
    ];
    const startedAt = Date.now();
    const completed: Array<{
      actorUserId: string;
      enabled: boolean;
      completedAt: number;
      response: ApiResponse;
    }> = [];

    await Promise.all(
      mutations.map(async ({ actorUserId, enabled }) => {
        const response = await request(`/vendor-reviewers/${targetUserId}`, {
          method: "PATCH",
          userId: actorUserId,
          body: { enabled },
        });
        completed.push({
          actorUserId,
          enabled,
          completedAt: Date.now(),
          response,
        });
      }),
    );

    expect(completed).toHaveLength(mutations.length);
    expect(completed.every(({ response }) => response.status === 200)).toBe(
      true,
    );

    const history = await request("/vendor-reviewer-access-history?limit=50", {
      userId: "task-133-admin-a",
    });
    expect(history.status).toBe(200);

    const entries = (
      history.body as {
        items: Array<{
          id: string;
          targetUserId: string;
          actorUserId: string;
          action: "grant" | "revoke";
          changedAt: string;
        }>;
      }
    ).items.filter((entry) => entry.targetUserId === targetUserId);
    expect(entries).toHaveLength(mutations.length);

    for (const mutation of mutations) {
      const matchingEntries = entries.filter(
        (entry) =>
          entry.actorUserId === mutation.actorUserId &&
          entry.action === mutation.action,
      );
      expect(matchingEntries).toHaveLength(1);

      const completedMutation = completed.find(
        ({ actorUserId }) => actorUserId === mutation.actorUserId,
      );
      const changedAt = Date.parse(matchingEntries[0]!.changedAt);
      expect(Number.isNaN(changedAt)).toBe(false);
      expect(changedAt).toBeGreaterThanOrEqual(startedAt);
      expect(changedAt).toBeLessThanOrEqual(completedMutation!.completedAt);
    }

    const lastCompleted = completed.at(-1)!;
    const finalReviewer = await request(`/vendor-reviewers?search=${targetUserId}`, {
      userId: "task-133-admin-a",
    });
    expect(finalReviewer.status).toBe(200);
    expect(finalReviewer.body).toMatchObject({
      items: [
        {
          userId: targetUserId,
          vendorReviewer: lastCompleted.enabled,
          updatedByUserId: lastCompleted.actorUserId,
        },
      ],
    });
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

  it("records owner and administrator storefront edits in vendor history", async () => {
    const ownerId = "task-127-owner";
    const otherUserId = "task-127-other";
    const adminId = "task-13-admin";
    const application = await submitApplication(ownerId, "audit");
    await setStatus(application.id, "approved");

    await expect(
      request(`/vendors/${application.id}/history`, { userId: ownerId }),
    ).resolves.toMatchObject({ status: 200, body: [] });
    await expect(
      request(`/vendors/${application.id}/history`, { userId: otherUserId }),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      request(`/vendors/${application.id}/history`),
    ).resolves.toMatchObject({ status: 401 });

    const ownerUpdate = await request(`/vendors/${application.id}`, {
      method: "PATCH",
      userId: ownerId,
      body: { description: "The owner refreshed this storefront story." },
    });
    expect(ownerUpdate.status).toBe(200);

    const adminUpdate = await request(`/vendors/${application.id}`, {
      method: "PATCH",
      userId: adminId,
      body: {
        businessName: "Administrator Reviewed Audit House",
        phone: "+2348098765432",
      },
    });
    expect(adminUpdate.status).toBe(200);

    const history = await request(`/vendors/${application.id}/history`, {
      userId: adminId,
    });
    expect(history.status).toBe(200);
    expect(history.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          vendorId: application.id,
          actorUserId: ownerId,
          action: "edited",
          changes: {
            description: {
              from: applicationBody("ignored", "ignored").description,
              to: "The owner refreshed this storefront story.",
            },
          },
        }),
        expect.objectContaining({
          vendorId: application.id,
          actorUserId: adminId,
          action: "edited",
          changes: {
            businessName: {
              from: "Kente House audit",
              to: "Administrator Reviewed Audit House",
            },
            phone: {
              from: "+2348012345678",
              to: "+2348098765432",
            },
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

    const reviewerCatalog = await request(
      `/vendors/${owner.id}/products/review`,
      { userId: reviewerId },
    );
    expect(reviewerCatalog.status).toBe(200);
    expect(reviewerCatalog.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: productId, status: "draft" }),
      ]),
    );
    await expect(
      request(`/vendors/${owner.id}/products/review`, {
        userId: otherUserId,
      }),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      request(`/vendors/${owner.id}/products/review`),
    ).resolves.toMatchObject({ status: 401 });

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
    const archivedCatalog = await request(
      `/vendors/${owner.id}/products/review`,
      { userId: reviewerId },
    );
    expect(archivedCatalog.status).toBe(200);
    expect(archivedCatalog.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: productId, status: "archived" }),
      ]),
    );
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

  it("records and retries a temporary product-image cleanup failure", async () => {
    const { objectStorageService } = await import("../lib/objectStorage");
    const { cleanupUnreferencedProductImage, processPendingProductImageCleanups } =
      await import("../lib/productImageCleanup");
    const imagePath = `/objects/uploads/retry-${runId}`;
    const deleteObject = vi
      .spyOn(objectStorageService, "deleteObjectEntity")
      .mockRejectedValueOnce(new Error("temporary storage outage"))
      .mockResolvedValue(undefined);
    const cleanupLogger = {
      warn: vi.fn(),
      error: vi.fn(),
    };

    try {
      await cleanupUnreferencedProductImage(
        imagePath,
        cleanupLogger,
        "integration test",
      );

      const [pending] = await db
        .select()
        .from(productImageCleanupTable)
        .where(eq(productImageCleanupTable.imagePath, imagePath));
      expect(pending).toMatchObject({
        imagePath,
        attempts: 1,
        lastError: "temporary storage outage",
      });

      await db
        .update(productImageCleanupTable)
        .set({ nextAttemptAt: new Date(0) })
        .where(eq(productImageCleanupTable.imagePath, imagePath));
      await processPendingProductImageCleanups();

      expect(deleteObject).toHaveBeenCalledTimes(2);
      await expect(
        db
          .select()
          .from(productImageCleanupTable)
          .where(eq(productImageCleanupTable.imagePath, imagePath)),
      ).resolves.toEqual([]);
    } finally {
      deleteObject.mockRestore();
      await db
        .delete(productImageCleanupTable)
        .where(eq(productImageCleanupTable.imagePath, imagePath));
    }
  });

  it("claims a pending image cleanup only once across overlapping workers", async () => {
    const { objectStorageService } = await import("../lib/objectStorage");
    const { processPendingProductImageCleanups } =
      await import("../lib/productImageCleanup");
    const imagePath = `/objects/uploads/concurrent-${runId}`;
    await db.insert(productImageCleanupTable).values({
      imagePath,
      attempts: 1,
      nextAttemptAt: new Date(0),
      lastAttemptAt: new Date(0),
      lastError: "temporary storage outage",
    });

    let releaseDelete!: () => void;
    const deletionMayFinish = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });
    let deletionStarted!: () => void;
    const deletionHasStarted = new Promise<void>((resolve) => {
      deletionStarted = resolve;
    });
    const deleteObject = vi
      .spyOn(objectStorageService, "deleteObjectEntity")
      .mockImplementation(async () => {
        deletionStarted();
        await deletionMayFinish;
      });

    try {
      const workers = [
        processPendingProductImageCleanups(),
        processPendingProductImageCleanups(),
      ];

      // Keep the first worker inside its transaction so the second call
      // overlaps the lease claim instead of running after cleanup finishes.
      await deletionHasStarted;
      expect(deleteObject).toHaveBeenCalledTimes(1);
      releaseDelete();
      await Promise.all(workers);

      expect(deleteObject).toHaveBeenCalledTimes(1);
      await expect(
        db
          .select()
          .from(productImageCleanupTable)
          .where(eq(productImageCleanupTable.imagePath, imagePath)),
      ).resolves.toEqual([]);
    } finally {
      releaseDelete();
      deleteObject.mockRestore();
      await db
        .delete(productImageCleanupTable)
        .where(eq(productImageCleanupTable.imagePath, imagePath));
    }
  });

  it("limits product-image cleanup status to admins and redacts storage details", async () => {
    const imagePath = `/objects/uploads/status-${runId}-private`;
    const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const lastAttemptAt = new Date(Date.now() - 30 * 60 * 1000);
    const nextAttemptAt = new Date(Date.now() + 30 * 60 * 1000);

    await db.insert(productImageCleanupTable).values({
      imagePath,
      attempts: 3,
      createdAt,
      lastAttemptAt,
      nextAttemptAt,
      lastError:
        "DELETE failed for /objects/uploads/status-private " +
        "at https://storage.example.test/private?token=secret-value",
    });

    try {
      await expect(request("/product-image-cleanup")).resolves.toMatchObject({
        status: 401,
      });
      await expect(
        request("/product-image-cleanup", { userId: "task-69-operator" }),
      ).resolves.toMatchObject({ status: 403 });

      const result = await request("/product-image-cleanup", {
        userId: "task-13-admin",
      });
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({
        pendingCount: 1,
        oldestRetryAgeSeconds: expect.any(Number),
        failures: [
          {
            attempts: 3,
            lastAttemptAt: lastAttemptAt.toISOString(),
            nextAttemptAt: nextAttemptAt.toISOString(),
            createdAt: createdAt.toISOString(),
          },
        ],
      });
      const body = result.body as {
        failures: Array<{ lastError: string | null }>;
      };
      expect(body.failures[0]?.lastError).toContain(
        "DELETE failed for [redacted object path]",
      );
      expect(body.failures[0]?.lastError).toContain(
        "[redacted storage URL]",
      );
      expect(body.failures[0]?.lastError).not.toContain(imagePath);
      expect(body.failures[0]?.lastError).not.toContain("secret-value");
    } finally {
      await db
        .delete(productImageCleanupTable)
        .where(eq(productImageCleanupTable.imagePath, imagePath));
    }
  });

  it("lets administrators retry one cleanup entry without exposing its object path", async () => {
    const { objectStorageService } = await import("../lib/objectStorage");
    const imagePath = `/objects/uploads/manual-retry-${runId}-private`;
    await db.insert(productImageCleanupTable).values({
      imagePath,
      attempts: 2,
      nextAttemptAt: new Date(Date.now() + 60 * 60 * 1000),
      lastAttemptAt: new Date(),
      lastError: "temporary storage outage",
    });
    const deleteObject = vi
      .spyOn(objectStorageService, "deleteObjectEntity")
      .mockResolvedValue(undefined);

    try {
      await expect(
        request(
          `/product-image-cleanup/${"a".repeat(64)}/retry`,
          { method: "POST" },
        ),
      ).resolves.toMatchObject({ status: 401 });
      await expect(
        request(
          `/product-image-cleanup/${"a".repeat(64)}/retry`,
          { method: "POST", userId: "task-69-operator" },
        ),
      ).resolves.toMatchObject({ status: 403 });

      const status = await request("/product-image-cleanup", {
        userId: "task-13-admin",
      });
      expect(status.status).toBe(200);
      const failure = (
        status.body as {
          failures: Array<{ id: string }>;
        }
      ).failures[0];
      expect(failure?.id).toMatch(/^[a-f0-9]{64}$/);
      expect(JSON.stringify(status.body)).not.toContain(imagePath);

      const retry = await request(
        `/product-image-cleanup/${failure?.id}/retry`,
        { method: "POST", userId: "task-13-admin" },
      );
      expect(retry).toMatchObject({
        status: 200,
        body: {
          status: "cleaned",
          message: "Product photo cleanup completed.",
        },
      });
      expect(deleteObject).toHaveBeenCalledWith(imagePath);
      await expect(
        db
          .select()
          .from(productImageCleanupTable)
          .where(eq(productImageCleanupTable.imagePath, imagePath)),
      ).resolves.toEqual([]);
    } finally {
      deleteObject.mockRestore();
      await db
        .delete(productImageCleanupTable)
        .where(eq(productImageCleanupTable.imagePath, imagePath));
    }
  });

  it("reports a failed administrator cleanup retry while keeping it queued", async () => {
    const { objectStorageService } = await import("../lib/objectStorage");
    const imagePath = `/objects/uploads/manual-retry-failure-${runId}`;
    await db.insert(productImageCleanupTable).values({
      imagePath,
      attempts: 1,
      nextAttemptAt: new Date(Date.now() + 60 * 60 * 1000),
      lastAttemptAt: new Date(),
    });
    const deleteObject = vi
      .spyOn(objectStorageService, "deleteObjectEntity")
      .mockRejectedValue(new Error("temporary storage outage"));

    try {
      const status = await request("/product-image-cleanup", {
        userId: "task-13-admin",
      });
      const failure = (
        status.body as {
          failures: Array<{ id: string }>;
        }
      ).failures.find((entry) => entry.id);
      if (!failure) {
        throw new Error("Cleanup entry was not returned by the status endpoint");
      }

      const retry = await request(
        `/product-image-cleanup/${failure.id}/retry`,
        { method: "POST", userId: "task-13-admin" },
      );
      expect(retry).toMatchObject({
        status: 200,
        body: {
          status: "failed",
          message:
            "Product photo cleanup failed and remains queued for another retry.",
        },
      });

      const [pending] = await db
        .select()
        .from(productImageCleanupTable)
        .where(eq(productImageCleanupTable.imagePath, imagePath));
      expect(pending).toMatchObject({
        imagePath,
        attempts: 2,
        lastError: "temporary storage outage",
      });
      expect(JSON.stringify(retry.body)).not.toContain(imagePath);
    } finally {
      deleteObject.mockRestore();
      await db
        .delete(productImageCleanupTable)
        .where(eq(productImageCleanupTable.imagePath, imagePath));
    }
  });

  it("does not delete an image reused while a cleanup retry is pending", async () => {
    const { objectStorageService } = await import("../lib/objectStorage");
    const { processPendingProductImageCleanups } =
      await import("../lib/productImageCleanup");
    const ownerId = `task-68-cleanup-race-owner-${runId}`;
    const vendor = await submitApplication(ownerId, "cleanup-race");
    await expect(setStatus(vendor.id, "approved")).resolves.toMatchObject({
      status: 200,
    });

    const imagePath = `/objects/uploads/reused-${runId}`;
    const original = await request(`/vendors/${vendor.id}/products`, {
      method: "POST",
      userId: ownerId,
      body: productBody({
        name: "Original reused image",
        imageUrl: imagePath,
      }),
    });
    expect(original.status).toBe(201);

    await db.insert(productImageCleanupTable).values({
      imagePath,
      attempts: 1,
      nextAttemptAt: new Date(0),
      lastAttemptAt: new Date(0),
      lastError: "temporary storage outage",
    });

    const deleteObject = vi
      .spyOn(objectStorageService, "deleteObjectEntity")
      .mockResolvedValue(undefined);
    let productId: string | undefined;

    try {
      const savePromise = request(`/vendors/${vendor.id}/products`, {
        method: "POST",
        userId: ownerId,
        body: productBody({
          name: "Reused cleanup-race image",
          imageUrl: imagePath,
        }),
      });

      // Start the retry while the real product save is in flight. The save
      // overlaps the worker's final reference check for the same object path.
      await new Promise<void>((resolve) => setImmediate(resolve));
      const cleanupPromise = processPendingProductImageCleanups();
      const [saved] = await Promise.all([savePromise, cleanupPromise]);

      expect(saved.status).toBe(201);
      productId = (saved.body as { id: string }).id;
      expect(deleteObject).not.toHaveBeenCalled();

      await expect(
        db
          .select()
          .from(productImageCleanupTable)
          .where(eq(productImageCleanupTable.imagePath, imagePath)),
      ).resolves.toEqual([]);
      await expect(
        db
          .select({ imageUrl: productsTable.imageUrl })
          .from(productsTable)
          .where(eq(productsTable.id, productId)),
      ).resolves.toEqual([{ imageUrl: imagePath }]);
    } finally {
      deleteObject.mockRestore();
      if (productId) {
        await db.delete(productsTable).where(eq(productsTable.id, productId));
      }
      await db
        .delete(productImageCleanupTable)
        .where(eq(productImageCleanupTable.imagePath, imagePath));
    }
  });

  it("waits for an overlapping product save before deleting its image", async () => {
    const { objectStorageService } = await import("../lib/objectStorage");
    const { lockProductImageReference, processPendingProductImageCleanups } =
      await import("../lib/productImageCleanup");
    const ownerId = `task-109-cleanup-race-owner-${runId}`;
    const vendor = await submitApplication(ownerId, "cleanup-race-save");
    await expect(setStatus(vendor.id, "approved")).resolves.toMatchObject({
      status: 200,
    });

    const imagePath = `/objects/uploads/save-in-flight-${runId}`;
    await db.insert(productImageCleanupTable).values({
      imagePath,
      attempts: 1,
      nextAttemptAt: new Date(0),
      lastAttemptAt: new Date(0),
      lastError: "temporary storage outage",
    });

    const deleteObject = vi
      .spyOn(objectStorageService, "deleteObjectEntity")
      .mockResolvedValue(undefined);
    let releaseSave!: () => void;
    const saveMayCommit = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    let saveHasLocked!: () => void;
    const saveLocked = new Promise<void>((resolve) => {
      saveHasLocked = resolve;
    });
    let productId: string | undefined;
    const savePromise = db.transaction(async (tx) => {
      await lockProductImageReference(imagePath, tx);
      saveHasLocked();
      const [saved] = await tx
        .insert(productsTable)
        .values({
          vendorId: vendor.id,
          name: "Image attached during cleanup",
          category: "Textiles",
          priceCents: 4800,
          originalPriceCents: null,
          imageUrl: imagePath,
          sizes: ["One size"],
          fabricType: "Cotton",
          description: "A product save that overlaps image cleanup.",
          inventory: 1,
          status: "draft",
        })
        .returning({ id: productsTable.id });
      productId = saved.id;
      await saveMayCommit;
    });
    let cleanupPromise: Promise<void> | undefined;

    try {
      await saveLocked;
      cleanupPromise = processPendingProductImageCleanups();

      // Wait until the worker has claimed the retry. At this point it is
      // blocked on the same advisory lock held by the uncommitted save.
      const claimDeadline = Date.now() + 5_000;
      while (Date.now() < claimDeadline) {
        const [pending] = await db
          .select({ nextAttemptAt: productImageCleanupTable.nextAttemptAt })
          .from(productImageCleanupTable)
          .where(eq(productImageCleanupTable.imagePath, imagePath));
        if (pending && pending.nextAttemptAt.getTime() > Date.now()) {
          break;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
      }
      const [claimed] = await db
        .select({ nextAttemptAt: productImageCleanupTable.nextAttemptAt })
        .from(productImageCleanupTable)
        .where(eq(productImageCleanupTable.imagePath, imagePath));
      expect(claimed?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
      expect(deleteObject).not.toHaveBeenCalled();

      releaseSave();
      await Promise.all([savePromise, cleanupPromise]);
      expect(deleteObject).not.toHaveBeenCalled();
      const savedProductId = productId;
      if (!savedProductId) {
        throw new Error("Product save did not return an ID");
      }
      await expect(
        db
          .select({ imageUrl: productsTable.imageUrl })
          .from(productsTable)
          .where(eq(productsTable.id, savedProductId)),
      ).resolves.toEqual([{ imageUrl: imagePath }]);
      await expect(
        db
          .select()
          .from(productImageCleanupTable)
          .where(eq(productImageCleanupTable.imagePath, imagePath)),
      ).resolves.toEqual([]);
    } finally {
      releaseSave();
      await savePromise.catch(() => undefined);
      await cleanupPromise?.catch(() => undefined);
      deleteObject.mockRestore();
      if (productId) {
        await db.delete(productsTable).where(eq(productsTable.id, productId));
      }
      await db
        .delete(productImageCleanupTable)
        .where(eq(productImageCleanupTable.imagePath, imagePath));
    }
  });
});
