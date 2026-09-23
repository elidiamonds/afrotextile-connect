import { sql } from "drizzle-orm";
import { index, jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { vendorsTable } from "./vendors";
import { table } from "./table";

export type VendorStorefrontHistoryChange = {
  from: unknown;
  to: unknown;
};

export const vendorStorefrontHistoryTable = table(
  "vendor_storefront_history",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendorsTable.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").notNull(),
    action: text("action").notNull(),
    changes: jsonb("changes")
      .$type<Record<string, VendorStorefrontHistoryChange>>()
      .notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    vendorChangedAtIdx: index(
      "vendor_storefront_history_vendor_changed_at_idx",
    ).on(table.vendorId, table.changedAt),
  }),
);

export type VendorStorefrontHistory =
  typeof vendorStorefrontHistoryTable.$inferSelect;