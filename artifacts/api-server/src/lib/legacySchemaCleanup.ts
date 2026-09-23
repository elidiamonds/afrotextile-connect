type DatabasePool = typeof import("@workspace/db").pool;

const legacySchemaCleanupLockSql =
  "SELECT pg_advisory_xact_lock(hashtextextended(" +
  "'afrotextile:legacy-vendor-schema-cleanup', 0))";

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export async function dropReviewedSchemas(
  pool: DatabasePool,
  requestedSchemas: string[],
): Promise<void> {
  const client = await pool.connect();
  const attemptedSchemas: string[] = [];
  let transactionStarted = false;
  let commitAttempted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;
    await client.query(legacySchemaCleanupLockSql);

    console.log("Dropping reviewed legacy vendor test schemas:");
    let droppedSchemaCount = 0;
    let alreadyRemovedSchemaCount = 0;
    for (const schemaName of requestedSchemas) {
      attemptedSchemas.push(schemaName);
      const schemaResult = await client.query<{ schemaExists: boolean }>(
        'SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = $1) AS "schemaExists"',
        [schemaName],
      );
      if (!schemaResult.rows[0]?.schemaExists) {
        alreadyRemovedSchemaCount += 1;
        console.log(`- ${schemaName} (already removed; skipping)`);
        continue;
      }

      console.log(`- ${schemaName}`);
      await client.query(
        `DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`,
      );
      droppedSchemaCount += 1;
    }

    commitAttempted = true;
    await client.query("COMMIT");
    console.log(
      `Dropped ${droppedSchemaCount} schema(s); ` +
        `${alreadyRemovedSchemaCount} already removed.`,
    );
  } catch (error) {
    let rollbackError: unknown;
    if (transactionStarted && !commitAttempted) {
      try {
        await client.query("ROLLBACK");
      } catch (error_) {
        rollbackError = error_;
      }
    }

    const attempted =
      attemptedSchemas.length > 0 ? attemptedSchemas.join(", ") : "none";
    if (commitAttempted) {
      throw new Error(
        "Legacy vendor schema cleanup commit failed. " +
          "The final schema state may be uncertain. " +
          `Schemas attempted: ${attempted}.`,
        { cause: error },
      );
    }
    if (rollbackError) {
      throw new Error(
        "Legacy vendor schema cleanup failed while dropping schemas. " +
          "Rollback also failed; the final schema state may be uncertain. " +
          `Schemas attempted: ${attempted}.`,
        { cause: error },
      );
    }
    if (transactionStarted) {
      throw new Error(
        "Legacy vendor schema cleanup failed while dropping schemas. " +
          "The transaction was rolled back; no schemas were removed. " +
          `Schemas attempted: ${attempted}.`,
        { cause: error },
      );
    }
    throw error;
  } finally {
    client.release();
  }
}
