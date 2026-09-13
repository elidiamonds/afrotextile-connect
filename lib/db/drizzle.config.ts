import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const databaseSchema = process.env.DB_SCHEMA?.trim();

if (databaseSchema && !/^[a-z_][a-z0-9_]*$/i.test(databaseSchema)) {
  throw new Error(
    "DB_SCHEMA must be a simple PostgreSQL identifier when provided.",
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  schemaFilter: databaseSchema ? [databaseSchema] : ["public"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
