import { and, asc, eq, lte } from "drizzle-orm";
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

export function isManagedProductImageReference(
  imageReference: string | null | undefined,
): imageReference is string {
  return Boolean(imageReference?.startsWith("/objects/uploads/"));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function retryDelayMs(attempts: number): number {
  return Math.min(
    PRODUCT_IMAGE_CLEANUP_MAX_BACKOFF_MS,
    60_000 * 2 ** Math.max(0, attempts - 1),
  );
}

export async function isProductImageReferenced(
  imageReference: string,
): Promise<boolean> {
  const [reference] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.imageUrl, imageReference))
    .limit(1);
  return Boolean(reference);
}

export async function clearPendingProductImageCleanup(
  imageReference: string | null | undefined,
): Promise<void> {
  if (!isManagedProductImageReference(imageReference)) {
    return;
  }

  await db
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

async function attemptProductImageCleanup(
  imageReference: string,
  cleanupLogger: CleanupLogger,
  reason: string,
): Promise<void> {
  try {
    // This check is intentionally immediately before the storage delete. A
    // failed request can be retried after another product starts using the
    // same object path.
    if (await isProductImageReferenced(imageReference)) {
      await clearPendingProductImageCleanup(imageReference);
      return;
    }

    await objectStorageService.deleteObjectEntity(imageReference);
    await clearPendingProductImageCleanup(imageReference);
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