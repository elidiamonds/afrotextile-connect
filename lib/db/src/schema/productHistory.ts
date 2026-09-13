import { sql } from "drizzle-orm";
import { index, jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { table } from "./table";

export type ProductHistoryChange = {
  from: unknown;
  to: unknown;
};

export const productHistoryTable = table(
  "product_history",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    productId: text("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").notNull(),
    action: text("action").notNull(),
    changes: jsonb("changes")
      .$type<Record<string, ProductHistoryChange>>()
      .notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    productChangedAtIdx: index("product_history_product_changed_at_idx").on(
      table.productId,
      table.changedAt,
    ),
  }),
);

export type ProductHistory = typeof productHistoryTable.$inferSelect;