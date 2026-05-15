import { pgTable, text, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  customer_name: text("customer_name").notNull(),
  customer_whatsapp: text("customer_whatsapp").notNull(),
  customer_email: text("customer_email").default(""),
  customer_document: text("customer_document").default(""),
  delivery_method: text("delivery_method").default("delivery"),
  assigned_courier_id: text("assigned_courier_id"),
  cep: text("cep").default(""),
  street: text("street").default(""),
  number: text("number").default(""),
  complement: text("complement").default(""),
  neighborhood: text("neighborhood").default(""),
  city: text("city").default(""),
  state: text("state").default(""),
  reference: text("reference").default(""),
  appointment_date: text("appointment_date").default(""),
  appointment_time: text("appointment_time").default(""),
  appointment_end_time: text("appointment_end_time").default(""),
  appointment_duration_minutes: integer("appointment_duration_minutes").default(0),
  payment_method: text("payment_method").default("pix"),
  notes: text("notes").default(""),
  items: text("items").notNull().default("[]"),
  coupon_code: text("coupon_code").default(""),
  discount: numeric("discount", { precision: 12, scale: 2, mode: "number" }).default(0),
  delivery_fee: numeric("delivery_fee", { precision: 12, scale: 2, mode: "number" }).default(0),
  total: numeric("total", { precision: 12, scale: 2, mode: "number" }).notNull(),
  payment_provider: text("payment_provider").default("whatsapp"),
  payment_status: text("payment_status").default("pending"),
  mp_payment_id: text("mp_payment_id"),
  mp_qr_code: text("mp_qr_code"),
  mp_qr_code_base64: text("mp_qr_code_base64"),
  mp_ticket_url: text("mp_ticket_url"),
  mp_status_detail: text("mp_status_detail"),
  paid_at: timestamp("paid_at"),
  status: text("status").default("pendente"),
  whatsapp_clicked_at: timestamp("whatsapp_clicked_at").defaultNow(),
  confirmed_at: timestamp("confirmed_at"),
  canceled_at: timestamp("canceled_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export type Order = typeof ordersTable.$inferSelect;
export type InsertOrder = typeof ordersTable.$inferInsert;
