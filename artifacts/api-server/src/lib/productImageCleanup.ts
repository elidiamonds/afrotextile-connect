import { and, asc, eq, lte, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import {
  db,
  productImageCleanupTable,
  productsTable,
} from "@workspace/db";
import { objectStorageService } from "./objectStorage";
import { logger } from "./logger";

export const PRODUCT_IMAGE_CLEANUP_INTERVAL_MS = 60_000;
export const PRODUCT_IMAGE_CLEANUP_BATCH_SIZE = 25;
const PRODUCT_IMAGE_CLEANUP_LEASE_MS = 5 * 60_000;
const PRODUCT_IMAGE_CLEANUP_MAX_BACKOFF_MS = 6 * 60 * 60_000;

type CleanupLogger = {
  warn: (object: object, message: string) => void;
  error?: (object: object, message: string) => void;
};

type ProductImageQueryExecutor = Pick<
  typeof db,
  "delete" | "execute" | "select"
>;

export function isManagedProductImageReference(
  imageReference: string | null | undefined,
): imageReference is string {
  return Boolean(imageReference?.startsWith("/objects/uploads/"));
}

export function getProductImageCleanupId(imageReference: string): string {
  return createHash("sha256").update(imageReference).digest("hex");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sanitizeCleanupErrorMessage(message: string | null): string | null {
  if (!message) {
    return null;
  }

  return message
    .replace(/https?:\/\/[^\s)"']+/gi, "[redacted storage URL]")
    .replace(/\/objects\/uploads\/[^\s)"']+/g, "[redacted object path]")
    .replace(
      /\b(authorization|access[_-]?key|secret[_-]?key|signature|token|credential|password)\s*[:=]\s*\S+/gi,
      "$1=[redacted]",
    )
    .trim()
    .slice(0, 500);
}

function retryDelayMs(attempts: number): number {
  return Math.min(
    PRODUCT_IMAGE_CLEANUP_MAX_BACKOFF_MS,
    60_000 * 2 ** Math.max(0, attempts - 1),
  );
}

export async function isProductImageReferenced(
  imageReference: string,
  executor: ProductImageQueryExecutor = db,
): Promise<boolean> {
  const [reference] = await executor
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.imageUrl, imageReference))
    .limit(1);
  return Boolean(reference);
}

export async function lockProductImageReference(
  imageReference: string | null | undefined,
  executor: ProductImageQueryExecutor = db,
): Promise<void> {
  if (!isManagedProductImageReference(imageReference)) {
    return;
  }

  // A transaction-scoped advisory lock lets product saves and cleanup share
  // one serialization point without adding a lock column to the schema.
  await executor.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${imageReference}, 0))`,
  );
}

export async function clearPendingProductImageCleanup(
  imageReference: string | null | undefined,
  executor: ProductImageQueryExecutor = db,
): Promise<void> {
  if (!isManagedProductImageReference(imageReference)) {
    return;
  }

  await executor
    .delete(productImageCleanupTable)
    .where(eq(productImageCleanupTable.imagePath, imageReference));
}

async function recordCleanupFailure(
  imageReference: string,
  error: unknown,
): Promise<void> {
  const now = new Date();
  const message = errorMessage(error);
  const [existing] = await db
    .select({ attempts: productImageCleanupTable.attempts })
    .from(productImageCleanupTable)
    .where(eq(productImageCleanupTable.imagePath, imageReference));
  const attempts = (existing?.attempts ?? 0) + 1;

  await db
    .insert(productImageCleanupTable)
    .values({
      imagePath: imageReference,
      attempts,
      nextAttemptAt: new Date(now.getTime() + retryDelayMs(attempts)),
      lastAttemptAt: now,
      lastError: message,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: productImageCleanupTable.imagePath,
      set: {
        attempts,
        nextAttemptAt: new Date(now.getTime() + retryDelayMs(attempts)),
        lastAttemptAt: now,
        lastError: message,
        updatedAt: now,
      },
    });
}

export async function recordProductImageCleanupFailure(
  imageReference: string | null | undefined,
  error: unknown,
): Promise<void> {
  if (!isManagedProductImageReference(imageReference)) {
    return;
  }

  await recordCleanupFailure(imageReference, error);
}

export async function getProductImageCleanupStatus() {
  const rows = await db
    .select({
      imagePath: productImageCleanupTable.imagePath,
      attempts: productImageCleanupTable.attempts,
      nextAttemptAt: productImageCleanupTable.nextAttemptAt,
      lastAttemptAt: productImageCleanupTable.lastAttemptAt,
      lastError: productImageCleanupTable.lastError,
      createdAt: productImageCleanupTable.createdAt,
    })
    .from(productImageCleanupTable)
    .orderBy(asc(productImageCleanupTable.createdAt));

  const oldestRetryAt = rows[0]?.createdAt ?? null;
  const oldestRetryAgeSeconds = oldestRetryAt
    ? Math.max(0, Math.floor((Date.now() - oldestRetryAt.getTime()) / 1000))
    : null;

  return {
    pendingCount: rows.length,
    oldestRetryAt,
    oldestRetryAgeSeconds,
    failures: rows.map((row) => ({
      id: getProductImageCleanupId(row.imagePath),
      attempts: row.attempts,
      nextAttemptAt: row.nextAttemptAt,
      lastAttemptAt: row.lastAttemptAt,
      lastError: sanitizeCleanupErrorMessage(row.lastError),
      createdAt: row.createdAt,
    })),
  };
}

export type ProductImageCleanupAttemptResult =
  | "cleaned"
  | "already-resolved"
  | "failed";

async function attemptProductImageCleanup(
  imageReference: string,
  cleanupLogger: CleanupLogger,
  reason: string,
  requirePendingEntry = false,
): Promise<ProductImageCleanupAttemptResult> {
  try {
    return await db.transaction(async (tx) => {
      // Keep the lock until the storage operation and cleanup-row removal
      // finish. A save that is already attaching this path must commit before
      // cleanup can decide whether the object is safe to delete.
      await lockProductImageReference(imageReference, tx);
      if (requirePendingEntry) {
        const [pending] = await tx
          .select({ imagePath: productImageCleanupTable.imagePath })
          .from(productImageCleanupTable)
          .where(eq(productImageCleanupTable.imagePath, imageReference))
          .limit(1);
        if (!pending) {
          return "already-resolved";
        }
      }

      if (await isProductImageReferenced(imageReference, tx)) {
        await clearPendingProductImageCleanup(imageReference, tx);
        return "already-resolved";
      }

      await objectStorageService.deleteObjectEntity(imageReference);
      await clearPendingProductImageCleanup(imageReference, tx);
      return "cleaned";
    });
  } catch (error) {
    try {
      await recordProductImageCleanupFailure(imageReference, error);
    } catch (recordError) {
      cleanupLogger.error?.(
        { err: recordError, imageReference, reason },
        "Could not record product image cleanup retry",
      );
    }

    cleanupLogger.warn(
      { err: error, imageReference, reason },
      "Could not clean up an unreferenced product image",
    );
    return "failed";
  }
}

export async function cleanupUnreferencedProductImage(
  imageReference: string | null | undefined,
  cleanupLogger: CleanupLogger,
  reason: string,
): Promise<void> {
  if (!isManagedProductImageReference(imageReference)) {
    return;
  }

  await attemptProductImageCleanup(imageReference, cleanupLogger, reason);
}

export async function retryProductImageCleanup(
  cleanupId: string,
  cleanupLogger: CleanupLogger,
): Promise<ProductImageCleanupAttemptResult | "not-found"> {
  const rows = await db
    .select({ imagePath: productImageCleanupTable.imagePath })
    .from(productImageCleanupTable);
  const row = rows.find(
    ({ imagePath }) => getProductImageCleanupId(imagePath) === cleanupId,
  );

  if (!row) {
    return "not-found";
  }

  return attemptProductImageCleanup(
    row.imagePath,
    cleanupLogger,
    "manual administrator product image cleanup retry",
    true,
  );
}

async function claimPendingCleanup(
  imagePath: string,
  now: Date,
): Promise<boolean> {
  const [claimed] = await db
    .update(productImageCleanupTable)
    .set({
      nextAttemptAt: new Date(now.getTime() + PRODUCT_IMAGE_CLEANUP_LEASE_MS),
      updatedAt: now,
    })
    .where(
      and(
        eq(productImageCleanupTable.imagePath, imagePath),
        lte(productImageCleanupTable.nextAttemptAt, now),
      ),
    )
    .returning({ imagePath: productImageCleanupTable.imagePath });
  return Boolean(claimed);
}

export async function processPendingProductImageCleanups(): Promise<void> {
  const now = new Date();
  const pending = await db
    .select({ imagePath: productImageCleanupTable.imagePath })
    .from(productImageCleanupTable)
    .where(lte(productImageCleanupTable.nextAttemptAt, now))
    .orderBy(asc(productImageCleanupTable.nextAttemptAt))
    .limit(PRODUCT_IMAGE_CLEANUP_BATCH_SIZE);

  for (const { imagePath } of pending) {
    if (!(await claimPendingCleanup(imagePath, now))) {
      continue;
    }

    await attemptProductImageCleanup(
      imagePath,
      logger,
      "scheduled product image cleanup",
      true,
    );
  }
}

export function startProductImageCleanupWorker(): NodeJS.Timeout {
  const timer = setInterval(() => {
    void processPendingProductImageCleanups().catch((error) => {
      logger.error?.({ err: error }, "Product image cleanup worker failed");
    });
  }, PRODUCT_IMAGE_CLEANUP_INTERVAL_MS);
  timer.unref();

  void processPendingProductImageCleanups().catch((error) => {
    logger.error?.({ err: error }, "Product image cleanup worker failed");
  });

  return timer;
}