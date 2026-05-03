import { pgTable, text, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const salesTable = pgTable("sales", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  product_id: text("product_id"),
  product_name: text("product_name").notNull(),
  customer_name: text("customer_name").notNull(),
  customer_whatsapp: text("customer_whatsapp").default(""),
  sale_date: date("sale_date").notNull(),
  product_price: numeric("product_price", { precision: 12, scale: 2, mode: "number" }).notNull(),
  amount_paid: numeric("amount_paid", { precision: 12, scale: 2, mode: "number" }).notNull(),
  payment_method: text("payment_method").default("pix"),
  notes: text("notes").default(""),
  created_at: timestamp("created_at").defaultNow(),
});

export type Sale = typeof salesTable.$inferSelect;
export type InsertSale = typeof salesTable.$inferInsert;
