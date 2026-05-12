import { Router } from "express";
import { db, usersTable, productsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const router = Router();

router.get("/db-check", async (req, res) => {
  try {
    const userCount = await db.select({ count: sql`count(*)` }).from(usersTable);
    const productCount = await db.select({ count: sql`count(*)` }).from(productsTable);
    
    // Find our specific user
    const [user] = await db.select().from(usersTable).where(sql`store_slug = 'lk-cel-bek2'`);
    
    let userProducts = 0;
    let dbError = null;
    if (user) {
      try {
        const results = await db.select().from(productsTable).where(eq(productsTable.user_id, user.id));
        userProducts = results.length;
      } catch (e) {
        dbError = e instanceof Error ? e.message : String(e);
      }
    }

    res.json({
      users: Number(userCount[0].count),
      products: Number(productCount[0].count),
      target_user: user ? { id: user.id, name: user.store_name } : "Not found",
      target_user_products: userProducts,
      db_error: dbError
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "DB Check failed" });
  }
});

export default router;
