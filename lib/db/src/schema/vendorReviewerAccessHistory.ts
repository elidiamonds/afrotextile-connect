import { sql } from "drizzle-orm";
import { index, text, timestamp } from "drizzle-orm/pg-core";
import { table } from "./table";

export const vendorReviewerAccessHistoryTable = table(
  "vendor_reviewer_access_history",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    targetUserId: text("target_user_id").notNull(),
    actorUserId: text("actor_user_id").notNull(),
    action: text("action").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    changedAtIdx: index("vendor_reviewer_access_history_changed_at_idx").on(
      table.changedAt,
    ),
    targetUserChangedAtIdx: index(
      "vendor_reviewer_access_history_target_user_changed_at_idx",
    ).on(table.targetUserId, table.changedAt),
  }),
);

export type VendorReviewerAccessHistory =
  typeof vendorReviewerAccessHistoryTable.$inferSelect;