import { getTableConfig, type AnyPgTable } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

const testDatabaseUrl = "postgresql://namespace-regression.invalid/database";
const isolatedSchema = "task_49_isolated";

type SchemaModule = {
  vendorsTable: AnyPgTable;
  productsTable: AnyPgTable;
  productHistoryTable: AnyPgTable;
  orderItemsTable: AnyPgTable;
};

const drizzleConfigUrl = new URL(
  "../../../lib/db/drizzle.config.ts",
  import.meta.url,
).href;
const schemaUrl = new URL(
  "../../../lib/db/src/schema/index.ts",
  import.meta.url,
).href;

async function loadDatabaseMode(schemaName?: string) {
  vi.resetModules();
  process.env.DATABASE_URL = testDatabaseUrl;

  if (schemaName) {
    process.env.DB_SCHEMA = schemaName;
  } else {
    delete process.env.DB_SCHEMA;
  }

  const [{ default: drizzleConfig }, schema] = await Promise.all([
    import(drizzleConfigUrl),
    import(schemaUrl),
  ]);

  return {
    config: drizzleConfig,
    schema: schema as SchemaModule,
  };
}

function assertTableAndForeignKeyNamespaces(
  schema: SchemaModule,
  expectedSchema: string,
) {
  const representativeTables: Array<[string, AnyPgTable]> = [
    ["vendors", schema.vendorsTable],
    ["products", schema.productsTable],
    ["product_history", schema.productHistoryTable],
    ["order_items", schema.orderItemsTable],
  ];

  for (const [tableName, table] of representativeTables) {
    const tableConfig = getTableConfig(table);
    const actualSchema = tableConfig.schema ?? "public";

    expect(
      actualSchema,
      `Unsafe schema target for table "${tableName}": expected "${expectedSchema}" but got "${actualSchema}".`,
    ).toBe(expectedSchema);

    if (expectedSchema === "public") {
      expect(
        tableConfig.schema,
        `Unsafe schema target for table "${tableName}": normal tables must remain unqualified for public.`,
      ).toBeUndefined();
    } else {
      expect(
        tableConfig.schema,
        `Unsafe schema target for table "${tableName}": test tables must use "${expectedSchema}".`,
      ).toBe(expectedSchema);
    }

    for (const foreignKey of tableConfig.foreignKeys) {
      const reference = foreignKey.reference();
      const referencedTable = getTableConfig(
        reference.foreignColumns[0]!.table,
      );
      const referencedSchema = referencedTable.schema ?? "public";

      expect(
        referencedSchema,
        `Unsafe schema target for foreign key from "${tableName}" to "${referencedTable.name}": expected "${expectedSchema}" but got "${referencedSchema}".`,
      ).toBe(expectedSchema);
    }
  }
}

describe("database namespace configuration", () => {
  it("keeps normal pushes on public and run-scoped pushes isolated", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalSchema = process.env.DB_SCHEMA;

    try {
      const normalMode = await loadDatabaseMode();
      expect(normalMode.config.schemaFilter).toEqual(["public"]);
      assertTableAndForeignKeyNamespaces(normalMode.schema, "public");

      const isolatedMode = await loadDatabaseMode(isolatedSchema);
      expect(isolatedMode.config.schemaFilter).toEqual([isolatedSchema]);
      assertTableAndForeignKeyNamespaces(isolatedMode.schema, isolatedSchema);
    } finally {
      if (originalDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = originalDatabaseUrl;
      }

      if (originalSchema === undefined) {
        delete process.env.DB_SCHEMA;
      } else {
        process.env.DB_SCHEMA = originalSchema;
      }
    }
  });
});