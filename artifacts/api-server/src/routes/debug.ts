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
