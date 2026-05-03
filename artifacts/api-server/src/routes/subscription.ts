import { Router } from "express";
import { db, usersTable, productsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";
import { getPlanFeatures, getProductLimit } from "../lib/plan.js";

const router = Router();
router.use(authMiddleware);

/** Returns the current plan status, feature flags, and usage limits */
router.get("/status", async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user) {
      res.status(401).json({ error: "Usuario nao encontrado" });
      return;
    }

    const [{ count: productCount }] = await db
      .select({ count: count() })
      .from(productsTable)
      .where(eq(productsTable.user_id, req.userId!));

    const features = getPlanFeatures(user);
    const limit = getProductLimit(user);

    res.json({
      ...features,
      plan_started_at: user.plan_started_at,
      plan_expires_at: user.plan_expires_at,
      free_forever: user.free_forever,
      usage: {
        products_count: Number(productCount),
        products_limit: limit === Infinity ? null : limit,
        products_remaining: limit === Infinity ? null : Math.max(limit - Number(productCount), 0),
      },
    });
  } catch (err) {
    req.log.error({ err }, "SubscriptionStatus error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
