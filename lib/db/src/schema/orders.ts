import { sql } from "drizzle-orm";
import { integer, text, timestamp } from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { table } from "./table";
import { vendorsTable } from "./vendors";

export const ordersTable = table("orders", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  customerUserId: text("customer_user_id").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  shippingCents: integer("shipping_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  status: text("status").notNull().default("pending"),
  shippingName: text("shipping_name").notNull(),
  shippingAddressLine1: text("shipping_address_line1").notNull(),
  shippingAddressLine2: text("shipping_address_line2"),
  shippingCity: text("shipping_city").notNull(),
  shippingState: text("shipping_state"),
  shippingPostalCode: text("shipping_postal_code").notNull(),
  shippingCountry: text("shipping_country").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const orderItemsTable = table("order_items", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  orderId: text("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "restrict" }),
  vendorId: text("vendor_id")
    .notNull()
    .references(() => vendorsTable.id, { onDelete: "restrict" }),
  productName: text("product_name").notNull(),
  vendorName: text("vendor_name").notNull(),
  imageUrl: text("image_url"),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer("quantity").notNull(),
  size: text("size").notNull(),
  fulfillmentStatus: text("fulfillment_status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;