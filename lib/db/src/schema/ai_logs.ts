import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const aiLogsTable = pgTable("ai_logs", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  area: text("area").default("merchant"),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export type AiLog = typeof aiLogsTable.$inferSelect;
export type InsertAiLog = typeof aiLogsTable.$inferInsert;
