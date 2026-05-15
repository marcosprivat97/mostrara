import { pgTable, text, numeric, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const productsTable = pgTable("products", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").default("Produto"),
  storage: text("storage").default(""),
  price: numeric("price", { precision: 12, scale: 2, mode: "number" }).notNull(),
  condition: text("condition").default("Vitrine"),
  battery: text("battery").default(""),
  warranty: text("warranty").default(""),
  stock: integer("stock").default(1),
  unlimited_stock: boolean("unlimited_stock").default(true),
  status: text("status").default("disponivel"),
  description: text("description").default(""),
  options: text("options").default("[]"),
  photos: text("photos").default("[]"),
  width: numeric("width", { precision: 10, scale: 2 }).default("11"),
  height: numeric("height", { precision: 10, scale: 2 }).default("2"),
  length: numeric("length", { precision: 10, scale: 2 }).default("16"),
  weight: numeric("weight", { precision: 10, scale: 2 }).default("0.3"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;
