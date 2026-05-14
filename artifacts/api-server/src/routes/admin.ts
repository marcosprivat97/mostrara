import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db, usersTable, productsTable, salesTable, ordersTable, supportTicketsTable } from "@workspace/db";
import { count, desc, eq, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";
import { requireAdmin } from "../lib/admin.js";
import { isPremium } from "../lib/plan.js";
import { logSnagEvent, logSnagIdentify } from "../lib/logsnag.js";
import { resolveStoreTaxonomy } from "../lib/store-taxonomy.js";
import { adminCreateUserSchema, adminUpdatePlanSchema, parseBody, supportTicketUpdateSchema, validationError } from "../lib/validation.js";
import { sanitizeUser } from "./auth.js";
import { signToken } from "../lib/auth.js";

const router = Router();
router.use(authMiddleware);

router.use(async (req: AuthRequest, res, next) => {
  const admin = await requireAdmin(req.userId);
  if (!admin) {
    res.status(403).json({ error: "Acesso de desenvolvedor negado" });
    return;
  }
  next();
});

router.get("/summary", async (_req, res) => {
  try {
    const [stores] = await db.select({ count: count() }).from(usersTable);
    const [products] = await db.select({ count: count() }).from(productsTable);
    const [sales] = await db.select({ count: count() }).from(salesTable);
    const [orders] = await db.select({ count: count() }).from(ordersTable);
    const [tickets] = await db.select({ count: count() }).from(supportTicketsTable).where(eq(supportTicketsTable.status, "aberto"));
    res.json({
      stores: Number(stores.count),
      products: Number(products.count),
      sales: Number(sales.count),
      orders: Number(orders.count),
      open_tickets: Number(tickets.count),
    });
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/stores", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: usersTable.id,
        store_name: usersTable.store_name,
        owner_name: usersTable.owner_name,
        email: usersTable.email,
        whatsapp: usersTable.whatsapp,
        store_slug: usersTable.store_slug,
        plan: usersTable.plan,
        free_forever: usersTable.free_forever,
        active: usersTable.active,
        created_at: usersTable.created_at,
        last_login_at: usersTable.last_login_at,
        products_count: sql<number>`count(distinct ${productsTable.id})`,
        sales_count: sql<number>`count(distinct ${salesTable.id})`,
        orders_count: sql<number>`count(distinct ${ordersTable.id})`,
        revenue: sql<number>`coalesce(sum(distinct ${salesTable.amount_paid}), 0)`,
      })
      .from(usersTable)
      .leftJoin(productsTable, eq(productsTable.user_id, usersTable.id))
      .leftJoin(salesTable, eq(salesTable.user_id, usersTable.id))
      .leftJoin(ordersTable, eq(ordersTable.user_id, usersTable.id))
      .groupBy(usersTable.id)
      .orderBy(desc(usersTable.created_at));
    res.json({ stores: rows });
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/stores", async (req, res) => {
  try {
    const body = parseBody(adminCreateUserSchema, req.body);
    const taxonomy = resolveStoreTaxonomy(body.store_type);
    const existingEmail = await db.select().from(usersTable).where(eq(usersTable.email, body.email));
    if (existingEmail.length) {
      res.status(409).json({ error: "E-mail ja cadastrado" });
      return;
    }
    const existingSlug = await db.select().from(usersTable).where(eq(usersTable.store_slug, body.store_slug));
    if (existingSlug.length) {
      res.status(409).json({ error: "Slug ja cadastrado" });
      return;
    }
    const [user] = await db.insert(usersTable).values({
      id: uuidv4(),
      store_name: body.store_name,
      owner_name: body.owner_name,
      email: body.email,
      password_hash: await bcrypt.hash(body.password, 10),
      phone: body.phone,
      whatsapp: body.whatsapp,
      store_slug: body.store_slug,
      store_type: taxonomy.storeType,
      store_mode: taxonomy.storeMode,
      canonical_niche: taxonomy.canonicalNiche,
      city: body.city || "Rio de Janeiro",
      description: "",
      logo_url: "",
      plan: "free",
      free_forever: body.free_forever,
      active: true,
    }).returning();
    void logSnagIdentify({
      userId: user.id,
      properties: {
        store_name: user.store_name ?? "",
        store_slug: user.store_slug ?? "",
        store_type: user.store_type ?? "celulares",
        city: user.city ?? "Rio de Janeiro",
        email: user.email ?? "",
      },
    }).catch(() => undefined);
    void logSnagEvent({
      channel: "stores",
      event: "admin_store_created",
      description: `Loja criada pelo admin: ${user.store_name}`,
      icon: "🛠️",
      notify: true,
      userId: user.id,
      tags: {
        city: user.city || "Rio de Janeiro",
        plan: user.plan || "free",
        free_forever: Boolean(user.free_forever),
      },
    }).catch(() => undefined);
    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/stores/:id", async (req: AuthRequest, res) => {
  try {
    void logSnagEvent({
      channel: "stores",
      event: "admin_store_deleted",
      description: `Loja removida pelo admin: ${String(req.params.id)}`,
      icon: "🗑️",
      notify: false,
      userId: req.userId ?? undefined,
      tags: {
        store_id: String(req.params.id),
      },
    }).catch(() => undefined);
    await db.delete(usersTable).where(eq(usersTable.id, String(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/stores/:id/plan", async (req, res) => {
  try {
    const body = parseBody(adminUpdatePlanSchema, req.body);
    const storeId = String(req.params.id);
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, storeId));
    if (!existing) {
      res.status(404).json({ error: "Lojista nao encontrado" });
      return;
    }

    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    if (body.plan !== undefined) {
      updateData.plan = body.plan;
      if (body.plan === "premium" && !existing.plan_started_at) {
        updateData.plan_started_at = new Date();
      }
    }
    if (body.free_forever !== undefined) updateData.free_forever = body.free_forever;
    if (body.verified_badge !== undefined) updateData.verified_badge = body.verified_badge;
    if (body.plan_expires_at !== undefined) {
      updateData.plan_expires_at = body.plan_expires_at ? new Date(body.plan_expires_at) : null;
    }

    const [updated] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, storeId))
      .returning();

    void logSnagEvent({
      channel: "stores",
      event: "admin_plan_updated",
      description: `Plano atualizado pelo admin: ${updated.store_name} -> ${updated.plan}${updated.free_forever ? " (free_forever)" : ""}`,
      icon: "👑",
      notify: true,
      userId: updated.id,
      tags: {
        plan: updated.plan || "free",
        free_forever: Boolean(updated.free_forever),
        verified_badge: Boolean(updated.verified_badge),
      },
    }).catch(() => undefined);

    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/tickets", async (_req, res) => {
  try {
    const tickets = await db
      .select({
        id: supportTicketsTable.id,
        type: supportTicketsTable.type,
        title: supportTicketsTable.title,
        message: supportTicketsTable.message,
        status: supportTicketsTable.status,
        admin_note: supportTicketsTable.admin_note,
        created_at: supportTicketsTable.created_at,
        store_name: usersTable.store_name,
        email: usersTable.email,
      })
      .from(supportTicketsTable)
      .leftJoin(usersTable, eq(usersTable.id, supportTicketsTable.user_id))
      .orderBy(desc(supportTicketsTable.created_at));
    res.json({ tickets });
  } catch {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/tickets/:id", async (req, res) => {
  try {
    const body = parseBody(supportTicketUpdateSchema, req.body);
    const [ticket] = await db
      .update(supportTicketsTable)
      .set({ ...body, updated_at: new Date() })
      .where(eq(supportTicketsTable.id, String(req.params.id)))
      .returning();
    res.json({ ticket });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});
router.post("/impersonate", async (req, res) => {
  try {
    const storeId = req.body.store_id;
    if (!storeId || typeof storeId !== "string") {
      res.status(400).json({ error: "store_id e obrigatorio" });
      return;
    }
    const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, storeId));
    if (!targetUser) {
      res.status(404).json({ error: "Lojista nao encontrado" });
      return;
    }
    
    const token = signToken(targetUser.id);
    void logSnagEvent({
      channel: "stores",
      event: "admin_impersonated",
      description: `Admin acessou a conta de: ${targetUser.store_name}`,
      icon: "🕵️",
      notify: false,
      userId: targetUser.id,
    }).catch(() => undefined);

    res.json({ token, user: sanitizeUser(targetUser) });
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
