import { pgSchema, pgTable } from "drizzle-orm/pg-core";
import type { PgTableFn } from "drizzle-orm/pg-core";

const databaseSchema = process.env.DB_SCHEMA?.trim();

if (databaseSchema && !/^[a-z_][a-z0-9_]*$/i.test(databaseSchema)) {
  throw new Error(
    "DB_SCHEMA must be a simple PostgreSQL identifier when provided.",
  );
}

export const table: PgTableFn<string | undefined> = databaseSchema
  ? pgSchema(databaseSchema).table
  : pgTable;