import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  store_name: text("store_name").notNull(),
  owner_name: text("owner_name").notNull(),
  email: text("email").unique().notNull(),
  password_hash: text("password_hash").notNull(),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp").notNull(),
  store_slug: text("store_slug").unique().notNull(),
  description: text("description").default(""),
  city: text("city").default("Rio de Janeiro"),
  logo_url: text("logo_url").default(""),
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
