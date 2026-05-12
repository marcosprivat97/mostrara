import { Router } from "express";
import { db, usersTable, productsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/db-check", async (req, res) => {
  try {
    const userCount = await db.select({ count: sql`count(*)` }).from(usersTable);
    const productCount = await db.select({ count: sql`count(*)` }).from(productsTable);
    
    // Find our specific user
    const [user] = await db.select().from(usersTable).where(sql`store_slug = 'lk-cel-bek2'`);
    
    let userProducts = 0;
    if (user) {
      const [{ count }] = await db.select({ count: sql`count(*)` }).from(productsTable).where(sql`user_id = ${user.id}`);
      userProducts = Number(count);
    }

    res.json({
      users: Number(userCount[0].count),
      products: Number(productCount[0].count),
      target_user: user ? { id: user.id, name: user.store_name } : "Not found",
      target_user_products: userProducts
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "DB Check failed" });
  }
});

export default router;
