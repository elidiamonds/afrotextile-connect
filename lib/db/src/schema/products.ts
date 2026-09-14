import { sql } from "drizzle-orm";
import { integer, text, timestamp } from "drizzle-orm/pg-core";
import { vendorsTable } from "./vendors";
import { table } from "./table";

export const productsTable = table("products", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  vendorId: text("vendor_id")
    .notNull()
    .references(() => vendorsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  priceCents: integer("price_cents").notNull(),
  originalPriceCents: integer("original_price_cents"),
  imageUrl: text("image_url"),
  sizes: text("sizes")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  fabricType: text("fabric_type").notNull(),
  description: text("description").notNull(),
  inventory: integer("inventory").notNull().default(0),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Product = typeof productsTable.$inferSelect;

export const productImageCleanupTable = table("product_image_cleanup", {
  imagePath: text("image_path").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ProductImageCleanup = typeof productImageCleanupTable.$inferSelect;