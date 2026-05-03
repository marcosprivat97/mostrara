import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { env } from "./env.js";

export async function requireAdmin(userId: string | undefined) {
  if (!userId) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || !env.admin.emails.has(user.email.toLowerCase())) return null;
  return user;
}
