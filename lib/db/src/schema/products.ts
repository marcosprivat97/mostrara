import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const productsTable = pgTable("products", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").default("iPhone"),
  storage: text("storage").default(""),
  price: real("price").notNull(),
  condition: text("condition").default("Vitrine"),
  battery: text("battery").default(""),
  warranty: text("warranty").default(""),
  status: text("status").default("disponivel"),
  description: text("description").default(""),
  photos: text("photos").default("[]"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;
