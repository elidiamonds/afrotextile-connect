import { dropReviewedSchemas } from "../src/lib/legacySchemaCleanup";

const legacySchemaPattern =
  /^vendor_permission_(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{32})$/i;
const legacySchemaSqlPattern =
  "^vendor_permission_(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{32})$";
type DatabasePool = typeof import("@workspace/db").pool;

function usage(): string {
  return `Usage:
  pnpm --filter @workspace/api-server cleanup:legacy-vendor-schemas --list
  pnpm --filter @workspace/api-server cleanup:legacy-vendor-schemas \\
    --drop <schema-name>[,<schema-name>...] --confirm

The default mode is --list. Dropping requires exact schema names from a
reviewed listing and the --confirm flag. A schema removed after review is
reported and skipped. The drop phase is atomic: if a schema drop fails, the
transaction is rolled back and no schemas are removed. The error reports the
schemas attempted; a rollback or commit failure means the final schema state
may be uncertain.`;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function parseArguments(arguments_: string[]): {
  requestedSchemas: string[];
  confirm: boolean;
} {
  let isDropMode = false;
  let confirm = false;
  const requestedSchemas: string[] = [];

  for (const argument of arguments_) {
    if (argument === "--list") {
      if (isDropMode) {
        throw new Error("--list cannot be combined with --drop.");
      }
      continue;
    }
    if (argument === "--confirm") {
      confirm = true;
      continue;
    }
    if (argument === "--drop") {
      if (isDropMode) {
        throw new Error("--drop may only be provided once.");
      }
      isDropMode = true;
      continue;
    }
    if (argument.startsWith("--")) {
      throw new Error(`Unknown option: ${argument}`);
    }
    if (!isDropMode) {
      throw new Error(`Schema names must follow --drop: ${argument}`);
    }
    requestedSchemas.push(
      ...argument
        .split(",")
        .map((schemaName) => schemaName.trim())
        .filter(Boolean),
    );
  }

  if (isDropMode && requestedSchemas.length === 0) {
    throw new Error("--drop requires at least one exact schema name.");
  }
  if (!isDropMode && confirm) {
    throw new Error("--confirm only applies to --drop.");
  }

  return { requestedSchemas, confirm };
}

async function findLegacySchemas(pool: DatabasePool): Promise<string[]> {
  const result = await pool.query<{ schemaName: string }>(
    `SELECT nspname AS "schemaName"
     FROM pg_catalog.pg_namespace
     WHERE nspname ~ $1
     ORDER BY nspname`,
    [legacySchemaSqlPattern],
  );
  return result.rows.map(({ schemaName }) => schemaName);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set.");
  }
  if (process.env.DB_SCHEMA?.trim()) {
    throw new Error(
      "DB_SCHEMA must be unset for this maintenance command. " +
        "It only operates on explicitly reviewed vendor test schemas.",
    );
  }

  const { requestedSchemas, confirm } = parseArguments(process.argv.slice(2));
  const { pool } = await import("@workspace/db");
  try {
    const legacySchemas = await findLegacySchemas(pool);

    if (requestedSchemas.length === 0) {
      console.log(
        legacySchemas.length
          ? `Legacy vendor test schemas found (${legacySchemas.length}):`
          : "No legacy vendor test schemas found.",
      );
      for (const schemaName of legacySchemas) {
        console.log(`- ${schemaName}`);
      }
      console.log(
        "No schemas were changed. Review this list before running --drop " +
          "with the exact names and --confirm.",
      );
      return;
    }

    if (!confirm) {
      throw new Error(
        "Dropping legacy schemas requires --confirm after reviewing --list.",
      );
    }

    const duplicateSchemas = requestedSchemas.filter(
      (schemaName, index) => requestedSchemas.indexOf(schemaName) !== index,
    );
    if (duplicateSchemas.length > 0) {
      throw new Error(
        `Duplicate schema names in allowlist: ${[...new Set(duplicateSchemas)].join(", ")}`,
      );
    }

    for (const schemaName of requestedSchemas) {
      if (!legacySchemaPattern.test(schemaName)) {
        throw new Error(
          `Refusing non-legacy schema name: ${schemaName}. ` +
            "Only vendor_permission_<UUID> names are allowed.",
        );
      }
      if (!legacySchemas.includes(schemaName)) {
        throw new Error(
          `Schema was not present in the reviewed listing: ${schemaName}. ` +
            "It may already have been removed by another cleanup run; " +
            "run --list again and review the current candidates.",
        );
      }
    }

    await dropReviewedSchemas(pool, requestedSchemas);
  } finally {
    await pool.end();
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(usage());
  process.exitCode = 1;
}

export {};