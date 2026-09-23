import { text, timestamp } from "drizzle-orm/pg-core";
import { vendorsTable } from "./vendors";
import { table } from "./table";

export const shopifyVendorProductsTable = table("shopify_vendor_products", {
  productId: text("product_id").primaryKey(),
  vendorId: text("vendor_id").notNull().references(() => vendorsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shopifyVendorProductHistoryTable = table("shopify_vendor_product_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text("product_id").notNull().references(() => shopifyVendorProductsTable.productId),
  actorUserId: text("actor_user_id").notNull(),
  action: text("action").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});