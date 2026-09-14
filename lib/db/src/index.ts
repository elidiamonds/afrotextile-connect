import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseSchema = process.env.DB_SCHEMA?.trim();
const simplePostgresIdentifier = /^[a-z_][a-z0-9_]*$/i;

if (databaseSchema && !simplePostgresIdentifier.test(databaseSchema)) {
  throw new Error(
    "DB_SCHEMA must be a simple PostgreSQL identifier when provided.",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(databaseSchema
    ? { options: `-c search_path=${databaseSchema},public` }
    : {}),
});
export const db = drizzle(pool, { schema });

export async function assertDatabaseSchema(expectedSchema: string) {
  const normalizedExpectedSchema = expectedSchema.trim();

  if (!simplePostgresIdentifier.test(normalizedExpectedSchema)) {
    throw new Error(
      "Expected database schema must be a simple PostgreSQL identifier.",
    );
  }

  const result = await pool.query<{ schemaName: string | null }>(
    'SELECT current_schema() AS "schemaName"',
  );
  const actualSchema = result.rows[0]?.schemaName ?? null;

  if (actualSchema !== normalizedExpectedSchema) {
    throw new Error(
      `Database schema mismatch: expected current_schema() to be ` +
        `"${normalizedExpectedSchema}" but got "${actualSchema ?? "null"}". ` +
        "Refusing to continue; verify DB_SCHEMA is set before importing @workspace/db.",
    );
  }
}

export * from "./schema";
