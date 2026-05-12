import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/stats", async (req: AuthRequest, res) => {
  try {
    const [total] = await db
      .select({ count: count() })
      .from(productsTable)
      .where(eq(productsTable.user_id, req.userId!));

    const [available] = await db
      .select({ count: count() })
      .from(productsTable)
      .where(and(eq(productsTable.user_id, req.userId!), eq(productsTable.status, "disponivel")));

    const [reserved] = await db
      .select({ count: count() })
      .from(productsTable)
      .where(and(eq(productsTable.user_id, req.userId!), eq(productsTable.status, "reservado")));

    const [sold] = await db
      .select({ count: count() })
      .from(productsTable)
      .where(and(eq(productsTable.user_id, req.userId!), eq(productsTable.status, "vendido")));

    res.json({
      total_products: Number(total.count),
      available_products: Number(available.count),
      reserved_products: Number(reserved.count),
      sold_products: Number(sold.count),
      store_active: true,
      debug_user_id: req.userId,
    });
  } catch (err) {
    req.log.error({ err }, "DashboardStats error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
