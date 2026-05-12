import { Router } from "express";
import { db, usersTable, productsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const router = Router();

router.get("/db-check", async (req, res) => {
  try {
    const userCount = await db.select({ count: sql`count(*)` }).from(usersTable);
    const productCount = await db.select({ count: sql`count(*)` }).from(productsTable);
    
    // Find our specific user
    const allUsers = await db.select({ id: usersTable.id, name: usersTable.store_name, email: usersTable.email }).from(usersTable);
    
    // Force add shipping columns if missing
    try {
      await db.execute(sql`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "width" text DEFAULT '0'`);
      await db.execute(sql`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "height" text DEFAULT '0'`);
      await db.execute(sql`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "length" text DEFAULT '0'`);
      await db.execute(sql`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight" text DEFAULT '0'`);
      await db.execute(sql`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "condition" text DEFAULT 'novo'`);
      await db.execute(sql`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "battery" text`);
      await db.execute(sql`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "warranty" text`);
      await db.execute(sql`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unlimited_stock" boolean DEFAULT true`);
    } catch (e) {
      console.error("Migration error:", e);
    }

    res.json({
      total_users: allUsers.length,
      users: allUsers,
      total_products: Number(productCount[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "DB Check failed" });
  }
});

export default router;
