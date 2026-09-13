import { sql } from "drizzle-orm";
import { text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { table } from "./table";

export const vendorsTable = table("vendors", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  ownerUserId: text("owner_user_id").notNull().unique(),
  businessName: text("business_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  location: text("location").notNull(),
  category: text("category").notNull(),
  plan: text("plan").notNull().default("Starter"),
  description: text("description").notNull(),
  logoUrl: text("logo_url"),
  status: text("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertVendorSchema = createInsertSchema(vendorsTable).omit({
  id: true,
  reviewNote: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;
