import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, couponsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";
import { couponSchema, parseBody, validationError } from "../lib/validation.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const coupons = await db
      .select()
      .from(couponsTable)
      .where(eq(couponsTable.user_id, req.userId!))
      .orderBy(desc(couponsTable.created_at));
    res.json({ coupons });
  } catch (err) {
    req.log.error({ err }, "ListCoupons error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const body = parseBody(couponSchema, req.body);
    const [existing] = await db
      .select()
      .from(couponsTable)
      .where(and(eq(couponsTable.user_id, req.userId!), eq(couponsTable.code, body.code)));
    if (existing) {
      res.status(409).json({ error: "Cupom ja existe" });
      return;
    }
    const [coupon] = await db
      .insert(couponsTable)
      .values({
        id: uuidv4(),
        user_id: req.userId!,
        code: body.code,
        type: body.type,
        value: body.value,
        active: body.active,
        max_uses: body.max_uses ?? null,
        expires_at: body.expires_at ? new Date(body.expires_at) : null,
      })
      .returning();
    res.status(201).json({ coupon });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "CreateCoupon error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const body = parseBody(couponSchema.partial(), req.body);
    const update: Partial<typeof couponsTable.$inferInsert> = { updated_at: new Date() };
    if (body.code !== undefined) update.code = body.code;
    if (body.type !== undefined) update.type = body.type;
    if (body.value !== undefined) update.value = body.value;
    if (body.active !== undefined) update.active = body.active;
    if (body.max_uses !== undefined) update.max_uses = body.max_uses ?? null;
    if (body.expires_at !== undefined) update.expires_at = body.expires_at ? new Date(body.expires_at) : null;

    const [coupon] = await db
      .update(couponsTable)
      .set(update)
      .where(and(eq(couponsTable.id, String(req.params.id)), eq(couponsTable.user_id, req.userId!)))
      .returning();
    if (!coupon) {
      res.status(404).json({ error: "Cupom nao encontrado" });
      return;
    }
    res.json({ coupon });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "UpdateCoupon error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    await db.delete(couponsTable).where(and(eq(couponsTable.id, String(req.params.id)), eq(couponsTable.user_id, req.userId!)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "DeleteCoupon error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
