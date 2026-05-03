import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  token_hash: text("token_hash").notNull().unique(),
  expires_at: timestamp("expires_at").notNull(),
  used_at: timestamp("used_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;
