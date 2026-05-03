import { pgTable, text, real, timestamp, date } from "drizzle-orm/pg-core";
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
  product_price: real("product_price").notNull(),
  amount_paid: real("amount_paid").notNull(),
  payment_method: text("payment_method").default("pix"),
  notes: text("notes").default(""),
  created_at: timestamp("created_at").defaultNow(),
});

export type Sale = typeof salesTable.$inferSelect;
export type InsertSale = typeof salesTable.$inferInsert;
