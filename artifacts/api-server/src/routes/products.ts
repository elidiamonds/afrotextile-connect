import { Router, type IRouter, type Request } from "express";
import { and, asc, desc, eq, gt, gte, ilike, lte, or, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { clerkClient, getAuth } from "@clerk/express";
import {
  db,
  productHistoryTable,
  productsTable,
  vendorsTable,
  type Product,
} from "@workspace/db";
import {
  CreateProductBody,
  CreateProductResponse,
  GetProductImageCleanupStatusResponse,
  RetryProductImageCleanupParams,
  RetryProductImageCleanupResponse,
  GetVendorParams,
  GetProductParams,
  GetProductResponse,
  ListProductsResponse,
  ListProductsQueryParams,
  ListStorefrontProductsParams,
  ListStorefrontProductsResponse,
  ListVendorProductsParams,
  ListVendorProductsResponse,
  type ProductUpdate,
  UpdateProductBody,
  UpdateProductParams,
  UpdateProductResponse,
  RequestProductImageUploadBody,
  RequestProductImageUploadResponse,
  ListProductHistoryResponse,
} from "@workspace/api-zod";
import { objectStorageService } from "./storage";
import {
  cleanupUnreferencedProductImage,
  clearPendingProductImageCleanup,
  getProductImageCleanupStatus,
  isManagedProductImageReference,
  isProductImageReferenced,
  lockProductImageReference,
  recordProductImageCleanupFailure,
  retryProductImageCleanup,
} from "../lib/productImageCleanup";
import { hasAdministratorAccess } from "../lib/adminAccess";

const router: IRouter = Router();

function authenticatedUserId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

async function isAdmin(userId: string): Promise<boolean> {
  const user = await clerkClient.users.getUser(userId);
  return hasAdministratorAccess(user);
}

async function isVendorReviewer(userId: string): Promise<boolean> {
  const user = await clerkClient.users.getUser(userId);
  return (
    hasAdministratorAccess(user) ||
    user.publicMetadata.role === "vendor_reviewer" ||
    user.publicMetadata.role === "vendor-reviewer" ||
    user.publicMetadata.vendorReviewer === true
  );
}

router.get("/product-image-cleanup", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (!(await isAdmin(userId))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  res.json(
    GetProductImageCleanupStatusResponse.parse(
      await getProductImageCleanupStatus(),
    ),
  );
});

router.post(
  "/product-image-cleanup/:cleanupId/retry",
  async (req, res): Promise<void> => {
    const userId = authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Sign in required" });
      return;
    }
    if (!(await isAdmin(userId))) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const params = RetryProductImageCleanupParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const result = await retryProductImageCleanup(params.data.cleanupId, req.log);
    if (result === "not-found") {
      res.status(404).json({ error: "Cleanup entry is no longer pending." });
      return;
    }

    res.json(
      RetryProductImageCleanupResponse.parse({
        status: result,
        message:
          result === "cleaned"
            ? "Product photo cleanup completed."
            : result === "already-resolved"
              ? "Product photo cleanup was already resolved."
              : "Product photo cleanup failed and remains queued for another retry.",
      }),
    );
  },
);

export function toApiProduct(product: Product, vendorName: string) {
  return {
    id: product.id,
    vendorId: product.vendorId,
    name: product.name,
    price: product.priceCents / 100,
    originalPrice:
      product.originalPriceCents === null
        ? null
        : product.originalPriceCents / 100,
    images: product.imageUrl ? [toProductImageUrl(product.imageUrl)] : [],
    category: product.category,
    vendor: vendorName,
    sizes: product.sizes,
    fabricType: product.fabricType,
    description: product.description,
    rating: 0,
    reviews: 0,
    inStock: product.inventory > 0,
    inventory: product.inventory,
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export function toProductImageUrl(imageReference: string): string {
  return imageReference.startsWith("/objects/")
    ? `/api/storage${imageReference}`
    : imageReference;
}

async function getProductWithVendor(id: string) {
  const [row] = await db
    .select({ product: productsTable, vendorName: vendorsTable.businessName })
    .from(productsTable)
    .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(eq(productsTable.id, id));
  return row;
}

async function getVendor(id: string) {
  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.id, id));
  return vendor;
}

async function canManageVendor(
  req: Request,
  vendorOwnerUserId: string,
): Promise<boolean> {
  const userId = authenticatedUserId(req);
  return Boolean(userId && (userId === vendorOwnerUserId || (await isAdmin(userId))));
}

async function canViewProductHistory(
  req: Request,
  vendorOwnerUserId: string,
): Promise<boolean> {
  const userId = authenticatedUserId(req);
  return Boolean(
    userId &&
      (userId === vendorOwnerUserId || (await isVendorReviewer(userId))),
  );
}

type ProductHistoryAction = "created" | "edited" | "published" | "archived";

const productHistoryFields = [
  "name",
  "price",
  "originalPrice",
  "imageUrl",
  "category",
  "sizes",
  "fabricType",
  "description",
  "inventory",
  "status",
] as const;

function productHistoryValues(product: Product): Record<string, unknown> {
  return {
    name: product.name,
    price: product.priceCents / 100,
    originalPrice:
      product.originalPriceCents === null
        ? null
        : product.originalPriceCents / 100,
    imageUrl: product.imageUrl,
    category: product.category,
    sizes: product.sizes,
    fabricType: product.fabricType,
    description: product.description,
    inventory: product.inventory,
    status: product.status,
  };
}

function buildProductHistoryChanges(
  before: Product | null,
  after: Product,
  fields: readonly string[] = productHistoryFields,
): Record<string, { from: unknown; to: unknown }> {
  const beforeValues = before ? productHistoryValues(before) : {};
  const afterValues = productHistoryValues(after);
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const field of fields) {
    const from = beforeValues[field] ?? null;
    const to = afterValues[field] ?? null;
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[field] = { from, to };
    }
  }

  return changes;
}

function productHistoryAction(
  before: Product | null,
  after: Product,
): ProductHistoryAction {
  if (!before) return "created";
  if (before.status !== after.status && after.status === "published") {
    return "published";
  }
  if (before.status !== after.status && after.status === "archived") {
    return "archived";
  }
  return "edited";
}

function idempotentProductId(vendorId: string, idempotencyKey: string): string {
  return createHash("sha256")
    .update(`${vendorId}:${idempotencyKey}`)
    .digest("hex");
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (typeof current === "object" && current !== null) {
    if (
      "code" in current &&
      (current as { code?: unknown }).code === "23505"
    ) {
      return true;
    }
    current =
      "cause" in current
        ? (current as { cause?: unknown }).cause
        : undefined;
  }
  return false;
}

function productUpdateMatches(product: Product, update: ProductUpdate): boolean {
  return (
    (update.name === undefined || update.name === product.name) &&
    (update.category === undefined || update.category === product.category) &&
    (update.price === undefined ||
      Math.round(update.price * 100) === product.priceCents) &&
    (update.originalPrice === undefined ||
      (update.originalPrice === null
        ? product.originalPriceCents === null
        : Math.round(update.originalPrice * 100) === product.originalPriceCents)) &&
    (update.imageUrl === undefined ||
      (update.imageUrl || null) === product.imageUrl) &&
    (update.sizes === undefined ||
      JSON.stringify(update.sizes) === JSON.stringify(product.sizes)) &&
    (update.fabricType === undefined ||
      update.fabricType === product.fabricType) &&
    (update.description === undefined ||
      update.description === product.description) &&
    (update.inventory === undefined ||
      update.inventory === product.inventory) &&
    (update.status === undefined || update.status === product.status)
  );
}

router.get("/products", async (req, res): Promise<void> => {
  const parsedQuery = ListProductsQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({ error: parsedQuery.error.message });
    return;
  }

  const {
    q,
    category,
    fabricType,
    location,
    minPrice,
    maxPrice,
    inStock,
    sort,
    page,
    limit,
  } = parsedQuery.data;

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    res.status(400).json({ error: "minPrice cannot be greater than maxPrice." });
    return;
  }

  const conditions = [
    eq(productsTable.status, "published"),
    eq(vendorsTable.status, "approved"),
  ];
  const normalizedSearch = q?.trim();
  const normalizedLocation = location?.trim();

  if (normalizedSearch) {
    const searchTerm = `%${normalizedSearch}%`;
    conditions.push(
      or(
        ilike(productsTable.name, searchTerm),
        ilike(productsTable.description, searchTerm),
        ilike(vendorsTable.businessName, searchTerm),
      )!,
    );
  }
  if (category?.trim()) {
    conditions.push(ilike(productsTable.category, category.trim()));
  }
  if (fabricType?.trim()) {
    conditions.push(ilike(productsTable.fabricType, fabricType.trim()));
  }
  if (normalizedLocation) {
    conditions.push(ilike(vendorsTable.location, `%${normalizedLocation}%`));
  }
  if (minPrice !== undefined) {
    conditions.push(gte(productsTable.priceCents, Math.round(minPrice * 100)));
  }
  if (maxPrice !== undefined) {
    conditions.push(lte(productsTable.priceCents, Math.round(maxPrice * 100)));
  }
  if (inStock !== undefined) {
    conditions.push(
      inStock ? gt(productsTable.inventory, 0) : eq(productsTable.inventory, 0),
    );
  }

  const orderBy =
    sort === "price-asc"
      ? asc(productsTable.priceCents)
      : sort === "price-desc"
        ? desc(productsTable.priceCents)
        : desc(productsTable.createdAt);

  const rows = await db
    .select({ product: productsTable, vendorName: vendorsTable.businessName })
    .from(productsTable)
    .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit + 1)
    .offset((page - 1) * limit);

  const hasNextPage = rows.length > limit;
  const visibleRows = hasNextPage ? rows.slice(0, limit) : rows;
  res.setHeader("X-Has-Next-Page", String(hasNextPage));

  res.json(
    ListProductsResponse.parse(
      visibleRows.map(({ product, vendorName }) =>
        toApiProduct(product, vendorName),
      ),
    ),
  );
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const row = await getProductWithVendor(params.data.id);
  if (
    !row ||
    row.product.status !== "published"
  ) {
    res.status(404).json({ error: "Published product not found" });
    return;
  }

  const [vendor] = await db
    .select({ status: vendorsTable.status })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, row.product.vendorId));
  if (!vendor || vendor.status !== "approved") {
    res.status(404).json({ error: "Published product not found" });
    return;
  }

  res.json(GetProductResponse.parse(toApiProduct(row.product, row.vendorName)));
});

router.get("/vendors/:id/products", async (req, res): Promise<void> => {
  const params = ListStorefrontProductsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const vendor = await getVendor(params.data.id);
  if (!vendor || vendor.status !== "approved") {
    res.status(404).json({ error: "Approved storefront not found" });
    return;
  }

  const rows = await db
    .select({ product: productsTable, vendorName: vendorsTable.businessName })
    .from(productsTable)
    .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(
      and(
        eq(productsTable.vendorId, params.data.id),
        eq(productsTable.status, "published"),
      ),
    )
    .orderBy(desc(productsTable.createdAt));

  res.json(
    ListStorefrontProductsResponse.parse(
      rows.map(({ product, vendorName }) => toApiProduct(product, vendorName)),
    ),
  );
});

router.post(
  "/vendors/:id/product-image-upload-url",
  async (req, res): Promise<void> => {
    const params = GetVendorParams.safeParse(req.params);
    const body = RequestProductImageUploadBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "A valid image file is required." });
      return;
    }

    if (!authenticatedUserId(req)) {
      res.status(401).json({ error: "Sign in required" });
      return;
    }

    const vendor = await getVendor(params.data.id);
    if (!vendor) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    if (vendor.status !== "approved") {
      res.status(403).json({ error: "Only approved vendors can upload product images." });
      return;
    }
    if (!(await canManageVendor(req, vendor.ownerUserId))) {
      res.status(403).json({ error: "You cannot manage this vendor catalog." });
      return;
    }

    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json(
        RequestProductImageUploadResponse.parse({
          uploadURL,
          objectPath: objectStorageService.normalizeObjectEntityPath(uploadURL),
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Error generating product image upload URL");
      res.status(500).json({ error: "Could not prepare image upload." });
    }
  },
);

router.delete(
  "/vendors/:id/product-image",
  async (req, res): Promise<void> => {
    const params = GetVendorParams.safeParse(req.params);
    const objectPath =
      typeof req.body?.objectPath === "string" ? req.body.objectPath : "";
    if (!params.success || !isManagedProductImageReference(objectPath)) {
      res.status(400).json({ error: "A valid product image path is required." });
      return;
    }

    if (!authenticatedUserId(req)) {
      res.status(401).json({ error: "Sign in required" });
      return;
    }

    const vendor = await getVendor(params.data.id);
    if (!vendor) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    if (!(await canManageVendor(req, vendor.ownerUserId))) {
      res.status(403).json({ error: "You cannot manage this vendor catalog." });
      return;
    }

    let deleted = false;
    try {
      deleted = await db.transaction(async (tx) => {
        await lockProductImageReference(objectPath, tx);
        if (await isProductImageReferenced(objectPath, tx)) {
          return false;
        }

        await objectStorageService.deleteObjectEntity(objectPath);
        try {
          await clearPendingProductImageCleanup(objectPath, tx);
        } catch (error) {
          req.log.warn(
            { err: error, imageReference: objectPath },
            "Could not clear pending product image cleanup after deletion",
          );
        }
        return true;
      });
      if (!deleted) {
        res.status(409).json({
          deleted: false,
          reason: "Product image is still referenced by a product.",
        });
        return;
      }
    } catch (error) {
      try {
        await recordProductImageCleanupFailure(objectPath, error);
      } catch (recordError) {
        req.log.error(
          { err: recordError, imageReference: objectPath },
          "Could not record product image cleanup retry",
        );
      }
      req.log.error({ err: error, objectPath }, "Error deleting product image");
      res.status(500).json({ error: "Could not delete product image." });
      return;
    }

    res.status(204).end();
  },
);

router.get("/vendors/:id/products/manage", async (req, res): Promise<void> => {
  if (!authenticatedUserId(req)) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }

  const params = ListVendorProductsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const vendor = await getVendor(params.data.id);
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  if (!(await canManageVendor(req, vendor.ownerUserId))) {
    res.status(403).json({ error: "You cannot manage this vendor catalog." });
    return;
  }

  const rows = await db
    .select({ product: productsTable, vendorName: vendorsTable.businessName })
    .from(productsTable)
    .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(eq(productsTable.vendorId, params.data.id))
    .orderBy(desc(productsTable.createdAt));

  res.json(
    ListVendorProductsResponse.parse(
      rows.map(({ product, vendorName }) => toApiProduct(product, vendorName)),
    ),
  );
});

router.get("/vendors/:id/products/review", async (req, res): Promise<void> => {
  if (!authenticatedUserId(req)) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }

  const params = ListVendorProductsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const vendor = await getVendor(params.data.id);
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  if (!(await canViewProductHistory(req, vendor.ownerUserId))) {
    res.status(403).json({ error: "Vendor owner or reviewer access required." });
    return;
  }

  const rows = await db
    .select({ product: productsTable, vendorName: vendorsTable.businessName })
    .from(productsTable)
    .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(eq(productsTable.vendorId, params.data.id))
    .orderBy(desc(productsTable.createdAt));

  res.json(
    ListVendorProductsResponse.parse(
      rows.map(({ product, vendorName }) => toApiProduct(product, vendorName)),
    ),
  );
});

router.get("/products/:id/history", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }

  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const row = await getProductWithVendor(params.data.id);
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const vendor = await getVendor(row.product.vendorId);
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  if (!(await canViewProductHistory(req, vendor.ownerUserId))) {
    res.status(403).json({ error: "Vendor owner or reviewer access required." });
    return;
  }

  const history = await db
    .select()
    .from(productHistoryTable)
    .where(eq(productHistoryTable.productId, row.product.id))
    .orderBy(desc(productHistoryTable.changedAt));

  res.json(ListProductHistoryResponse.parse(history));
});

router.post("/vendors/:id/products", async (req, res): Promise<void> => {
  const actorUserId = authenticatedUserId(req);
  if (!actorUserId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }

  const params = ListStorefrontProductsParams.safeParse(req.params);
  const body = CreateProductBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const vendor = await getVendor(params.data.id);
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  if (!(await canManageVendor(req, vendor.ownerUserId))) {
    res.status(403).json({ error: "You cannot manage this vendor catalog." });
    return;
  }
  if (body.data.status === "published" && vendor.status !== "approved") {
    res.status(403).json({ error: "Only approved vendors can publish products." });
    return;
  }

  const idempotencyKey = req.get("Idempotency-Key")?.trim();
  const requestedProductId = idempotencyKey
    ? idempotentProductId(vendor.id, idempotencyKey)
    : undefined;
  let product: Product;
  let replayed = false;
  try {
    product = await db.transaction(async (tx) => {
      await lockProductImageReference(body.data.imageUrl, tx);
      const [created] = await tx
        .insert(productsTable)
        .values({
          ...(requestedProductId ? { id: requestedProductId } : {}),
          vendorId: vendor.id,
          name: body.data.name,
          category: body.data.category,
          priceCents: Math.round(body.data.price * 100),
          originalPriceCents:
            body.data.originalPrice == null
              ? null
              : Math.round(body.data.originalPrice * 100),
          imageUrl: body.data.imageUrl || null,
          sizes: body.data.sizes ?? [],
          fabricType: body.data.fabricType,
          description: body.data.description,
          inventory: body.data.inventory,
          status: body.data.status ?? "draft",
        })
        .returning();
      await tx.insert(productHistoryTable).values({
        productId: created.id,
        actorUserId,
        action: "created",
        changes: buildProductHistoryChanges(null, created),
      });
      return created;
    });
  } catch (error) {
    if (requestedProductId && isUniqueViolation(error)) {
      const existing = await getProductWithVendor(requestedProductId);
      if (existing?.product.vendorId === vendor.id) {
        product = existing.product;
        replayed = true;
      } else {
        req.log.error(
          { err: error, vendorId: vendor.id },
          "Idempotency key collided with an existing product",
        );
        res.status(409).json({ error: "This save request cannot be replayed." });
        return;
      }
    } else {
      req.log.error({ err: error }, "Error creating product");
      res.status(500).json({ error: "Could not save product." });
      return;
    }
  }

  try {
    await clearPendingProductImageCleanup(product.imageUrl);
  } catch (error) {
    req.log.warn(
      { err: error, imageReference: product.imageUrl },
      "Could not clear pending product image cleanup after save",
    );
  }

  res
    .status(replayed ? 200 : 201)
    .json(CreateProductResponse.parse(toApiProduct(product, vendor.businessName)));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const actorUserId = authenticatedUserId(req);
  if (!actorUserId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }

  const params = UpdateProductParams.safeParse(req.params);
  const body = UpdateProductBody.safeParse(req.body);
  if (!params.success || !body.success || Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "Provide at least one valid product field." });
    return;
  }

  const ifMatch = req.get("If-Match")?.trim();
  let expectedUpdatedAt: Date | undefined;
  if (ifMatch) {
    const parsedIfMatch = new Date(ifMatch);
    if (Number.isNaN(parsedIfMatch.getTime())) {
      res.status(400).json({ error: "If-Match must be a valid product timestamp." });
      return;
    }
    expectedUpdatedAt = parsedIfMatch;
  }

  const row = await getProductWithVendor(params.data.id);
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const vendor = await getVendor(row.product.vendorId);
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  if (!(await canManageVendor(req, vendor.ownerUserId))) {
    res.status(403).json({ error: "You cannot manage this product." });
    return;
  }
  if (body.data.status === "published" && vendor.status !== "approved") {
    res.status(403).json({ error: "Only approved vendors can publish products." });
    return;
  }

  const update = body.data;
  let product: Product;
  let replayed = false;
  try {
    const updated = await db.transaction(async (tx) => {
      await lockProductImageReference(update.imageUrl, tx);
      const [updatedProduct] = await tx
        .update(productsTable)
        .set({
          ...(update.name === undefined ? {} : { name: update.name }),
          ...(update.category === undefined ? {} : { category: update.category }),
          ...(update.price === undefined
            ? {}
            : { priceCents: Math.round(update.price * 100) }),
          ...(update.originalPrice === undefined
            ? {}
            : {
                originalPriceCents:
                  update.originalPrice === null
                    ? null
                    : Math.round(update.originalPrice * 100),
              }),
          ...(update.imageUrl === undefined
            ? {}
            : { imageUrl: update.imageUrl || null }),
          ...(update.sizes === undefined ? {} : { sizes: update.sizes }),
          ...(update.fabricType === undefined
            ? {}
            : { fabricType: update.fabricType }),
          ...(update.description === undefined
            ? {}
            : { description: update.description }),
          ...(update.inventory === undefined
            ? {}
            : { inventory: update.inventory }),
          ...(update.status === undefined ? {} : { status: update.status }),
        })
        .where(
          expectedUpdatedAt
            ? and(
                eq(productsTable.id, params.data.id),
                sql`date_trunc('milliseconds', ${productsTable.updatedAt}) = ${expectedUpdatedAt}`,
              )
            : eq(productsTable.id, params.data.id),
        )
        .returning();

      if (!updatedProduct) return null;

      await tx.insert(productHistoryTable).values({
        productId: updatedProduct.id,
        actorUserId,
        action: productHistoryAction(row.product, updatedProduct),
        changes: buildProductHistoryChanges(
          row.product,
          updatedProduct,
          Object.keys(update),
        ),
      });
      return updatedProduct;
    });

    if (updated) {
      product = updated;
    } else {
      const latest = await getProductWithVendor(params.data.id);
      if (!latest) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      if (!productUpdateMatches(latest.product, update)) {
        res.status(409).json({
          error: "Product changed since it was loaded. Refresh before saving.",
        });
        return;
      }
      product = latest.product;
      replayed = true;
    }
  } catch (error) {
    req.log.error({ err: error }, "Error updating product");
    res.status(500).json({ error: "Could not save product." });
    return;
  }

  try {
    await clearPendingProductImageCleanup(product.imageUrl);
  } catch (error) {
    req.log.warn(
      { err: error, imageReference: product.imageUrl },
      "Could not clear pending product image cleanup after save",
    );
  }

  if (!replayed && update.imageUrl !== undefined && update.imageUrl !== row.product.imageUrl) {
    await cleanupUnreferencedProductImage(
      row.product.imageUrl,
      req.log,
      "product image replaced",
    );
  }

  res.json(UpdateProductResponse.parse(toApiProduct(product, vendor.businessName)));
});

export default router;