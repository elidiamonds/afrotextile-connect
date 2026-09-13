import {
  Router,
  type IRouter,
  type Request,
  type Response,
} from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { clerkClient, getAuth } from "@clerk/express";
import {
  db,
  orderItemsTable,
  ordersTable,
  productsTable,
  vendorsTable,
  type Order,
  type OrderItem,
} from "@workspace/db";
import {
  CreateOrderBody,
  CreateOrderResponse,
  GetOrderParams,
  GetOrderResponse,
  ListOrdersResponse,
  ListVendorOrdersParams,
  ListVendorOrdersResponse,
  UpdateOrderItemStatusBody,
  UpdateOrderItemStatusParams,
  UpdateOrderItemStatusResponse,
} from "@workspace/api-zod";
import { toProductImageUrl } from "./products";

const router: IRouter = Router();

const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

function authenticatedUserId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

async function isAdmin(userId: string): Promise<boolean> {
  const user = await clerkClient.users.getUser(userId);
  return user.publicMetadata.role === "admin";
}

async function canManageVendor(
  req: Request,
  vendorOwnerUserId: string,
): Promise<boolean> {
  const userId = authenticatedUserId(req);
  return Boolean(userId && (userId === vendorOwnerUserId || (await isAdmin(userId))));
}

function requireUser(req: Request, res: Response) {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return null;
  }
  return userId;
}

function toShippingAddress(order: Order) {
  return {
    name: order.shippingName,
    addressLine1: order.shippingAddressLine1,
    addressLine2: order.shippingAddressLine2,
    city: order.shippingCity,
    state: order.shippingState,
    postalCode: order.shippingPostalCode,
    country: order.shippingCountry,
  };
}

function toApiOrderItem(item: OrderItem) {
  return {
    id: item.id,
    productId: item.productId,
    vendorId: item.vendorId,
    productName: item.productName,
    vendorName: item.vendorName,
    imageUrl: item.imageUrl ? toProductImageUrl(item.imageUrl) : null,
    unitPrice: item.unitPriceCents / 100,
    quantity: item.quantity,
    size: item.size,
    fulfillmentStatus: item.fulfillmentStatus,
  };
}

function deriveOrderStatus(items: OrderItem[]): (typeof ORDER_STATUSES)[number] {
  if (items.length === 0) return "pending";
  if (items.every((item) => item.fulfillmentStatus === "cancelled")) {
    return "cancelled";
  }
  if (items.every((item) => item.fulfillmentStatus === "delivered")) {
    return "delivered";
  }
  if (items.some((item) => item.fulfillmentStatus === "shipped" || item.fulfillmentStatus === "delivered")) {
    return "shipped";
  }
  if (items.some((item) => item.fulfillmentStatus === "processing")) {
    return "processing";
  }
  return "pending";
}

function toApiOrder(order: Order, items: OrderItem[]) {
  return {
    id: order.id,
    status: deriveOrderStatus(items),
    subtotal: order.subtotalCents / 100,
    shipping: order.shippingCents / 100,
    total: order.totalCents / 100,
    shippingAddress: toShippingAddress(order),
    items: items.map(toApiOrderItem),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

class InventoryUnavailableError extends Error {}

async function getOrderWithItems(orderId: string, customerUserId?: string) {
  const orderConditions = customerUserId
    ? and(eq(ordersTable.id, orderId), eq(ordersTable.customerUserId, customerUserId))
    : eq(ordersTable.id, orderId);
  const [order] = await db.select().from(ordersTable).where(orderConditions);
  if (!order) return null;
  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, order.id));
  return { order, items };
}

router.get("/orders", async (req, res): Promise<void> => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.customerUserId, userId))
    .orderBy(desc(ordersTable.createdAt));
  const results = await Promise.all(
    orders.map(async (order) => {
      const items = await db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, order.id));
      return toApiOrder(order, items);
    }),
  );
  res.json(ListOrdersResponse.parse(results));
});

router.post("/orders", async (req, res): Promise<void> => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const body = CreateOrderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  try {
    const created = await db.transaction(async (tx) => {
      const productIds = [...new Set(body.data.items.map((item) => item.productId))];
      const productRows = await tx
        .select({
          product: productsTable,
          vendorName: vendorsTable.businessName,
          vendorStatus: vendorsTable.status,
        })
        .from(productsTable)
        .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
        .where(inArray(productsTable.id, productIds));
      const products = new Map(productRows.map((row) => [row.product.id, row]));
      const quantities = new Map<string, number>();

      for (const item of body.data.items) {
        const row = products.get(item.productId);
        if (
          !row ||
          row.product.status !== "published" ||
          row.vendorStatus !== "approved"
        ) {
          throw new InventoryUnavailableError("One or more products are no longer available.");
        }
        if (row.product.sizes.length > 0 && !row.product.sizes.includes(item.size)) {
          throw new InventoryUnavailableError(`Size ${item.size} is not available for ${row.product.name}.`);
        }
        quantities.set(
          item.productId,
          (quantities.get(item.productId) ?? 0) + item.quantity,
        );
      }

      const updatedProducts = new Map<string, typeof productsTable.$inferSelect>();
      for (const [productId, quantity] of quantities) {
        const [updated] = await tx
          .update(productsTable)
          .set({
            inventory: sql`${productsTable.inventory} - ${quantity}`,
          })
          .where(
            and(
              eq(productsTable.id, productId),
              eq(productsTable.status, "published"),
              sql`${productsTable.inventory} >= ${quantity}`,
            ),
          )
          .returning();
        if (!updated) {
          const product = products.get(productId)?.product;
          throw new InventoryUnavailableError(
            product ? `${product.name} does not have enough inventory.` : "Inventory is no longer available.",
          );
        }
        updatedProducts.set(productId, updated);
      }

      const subtotalCents = body.data.items.reduce((total, item) => {
        const product = products.get(item.productId)!.product;
        return total + product.priceCents * item.quantity;
      }, 0);
      const shippingCents = subtotalCents >= 20_000 ? 0 : 1_500;
      const [order] = await tx
        .insert(ordersTable)
        .values({
          customerUserId: userId,
          subtotalCents,
          shippingCents,
          totalCents: subtotalCents + shippingCents,
          shippingName: body.data.shippingAddress.name,
          shippingAddressLine1: body.data.shippingAddress.addressLine1,
          shippingAddressLine2: body.data.shippingAddress.addressLine2 ?? null,
          shippingCity: body.data.shippingAddress.city,
          shippingState: body.data.shippingAddress.state ?? null,
          shippingPostalCode: body.data.shippingAddress.postalCode,
          shippingCountry: body.data.shippingAddress.country,
        })
        .returning();

      const items = await tx
        .insert(orderItemsTable)
        .values(
          body.data.items.map((item) => {
            const row = products.get(item.productId)!;
            return {
              orderId: order.id,
              productId: item.productId,
              vendorId: row.product.vendorId,
              productName: row.product.name,
              vendorName: row.vendorName,
              imageUrl: row.product.imageUrl,
              unitPriceCents: row.product.priceCents,
              quantity: item.quantity,
              size: item.size,
            };
          }),
        )
        .returning();

      return { order, items, updatedProducts };
    });

    res.status(201).json(CreateOrderResponse.parse(toApiOrder(created.order, created.items)));
  } catch (error) {
    if (error instanceof InventoryUnavailableError) {
      res.status(409).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await getOrderWithItems(params.data.id, userId);
  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(GetOrderResponse.parse(toApiOrder(result.order, result.items)));
});

router.get("/vendors/:id/orders/manage", async (req, res): Promise<void> => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const params = ListVendorOrdersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.id, params.data.id));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  if (!(await canManageVendor(req, vendor.ownerUserId))) {
    res.status(403).json({ error: "You cannot manage this vendor's orders." });
    return;
  }

  const rows = await db
    .select({ order: ordersTable, item: orderItemsTable })
    .from(ordersTable)
    .innerJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(eq(orderItemsTable.vendorId, vendor.id))
    .orderBy(desc(ordersTable.createdAt));
  const grouped = new Map<string, { order: Order; items: OrderItem[] }>();
  for (const row of rows) {
    const existing = grouped.get(row.order.id);
    if (existing) existing.items.push(row.item);
    else grouped.set(row.order.id, { order: row.order, items: [row.item] });
  }
  res.json(
    ListVendorOrdersResponse.parse(
      [...grouped.values()].map(({ order, items }) => toApiOrder(order, items)),
    ),
  );
});

router.patch(
  "/vendors/:vendorId/orders/:orderId/items/:itemId/status",
  async (req, res): Promise<void> => {
    const userId = requireUser(req, res);
    if (!userId) return;
    const params = UpdateOrderItemStatusParams.safeParse(req.params);
    const body = UpdateOrderItemStatusBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "A valid fulfillment status is required." });
      return;
    }
    const [vendor] = await db
      .select()
      .from(vendorsTable)
      .where(eq(vendorsTable.id, params.data.vendorId));
    if (!vendor) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    if (!(await canManageVendor(req, vendor.ownerUserId))) {
      res.status(403).json({ error: "You cannot manage this vendor's orders." });
      return;
    }

    const updatedOrder = await db.transaction(async (tx) => {
      const [item] = await tx
        .update(orderItemsTable)
        .set({ fulfillmentStatus: body.data.status })
        .where(
          and(
            eq(orderItemsTable.id, params.data.itemId),
            eq(orderItemsTable.orderId, params.data.orderId),
            eq(orderItemsTable.vendorId, params.data.vendorId),
          ),
        )
        .returning();
      if (!item) return null;
      const items = await tx
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, params.data.orderId));
      const [order] = await tx
        .update(ordersTable)
        .set({
          status: deriveOrderStatus(items),
          updatedAt: new Date(),
        })
        .where(eq(ordersTable.id, params.data.orderId))
        .returning();
      return order ? { order, items } : null;
    });
    if (!updatedOrder) {
      res.status(404).json({ error: "Order item not found" });
      return;
    }
    res.json(
      UpdateOrderItemStatusResponse.parse(
        toApiOrder(updatedOrder.order, updatedOrder.items),
      ),
    );
  },
);

export default router;