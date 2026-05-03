import { pgTable, text, numeric, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const couponsTable = pgTable("coupons", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  type: text("type").default("percent"),
  value: numeric("value", { precision: 12, scale: 2, mode: "number" }).notNull(),
  active: boolean("active").default(true),
  max_uses: integer("max_uses"),
  used_count: integer("used_count").default(0),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type Coupon = typeof couponsTable.$inferSelect;
export type InsertCoupon = typeof couponsTable.$inferInsert;
