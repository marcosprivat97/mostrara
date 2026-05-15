import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { and, desc, eq, ne } from "drizzle-orm";
import { db, ordersTable, usersTable } from "@workspace/db";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";
import { evolutionService } from "../lib/evolution.js";

const router = Router();
router.use(authMiddleware);

type CourierUser = typeof usersTable.$inferSelect & {
  account_role?: string | null;
  parent_user_id?: string | null;
};

function parseItems(items: string | null): Array<{
  product_id: string;
  name: string;
  storage?: string;
  price: number;
  quantity: number;
}> {
  try {
    const parsed = JSON.parse(items || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) =>
      item &&
      typeof item.product_id === "string" &&
      typeof item.name === "string" &&
      Number.isFinite(Number(item.price)) &&
      Number.isFinite(Number(item.quantity)),
    ).map((item) => ({
      product_id: item.product_id,
      name: item.name,
      storage: typeof item.storage === "string" ? item.storage : "",
      price: Number(item.price),
      quantity: Number(item.quantity),
    }));
  } catch {
    return [];
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getCurrentUser(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return (user as CourierUser | undefined) ?? null;
}

function formatCourier(user: CourierUser) {
  return {
    id: user.id,
    store_name: user.store_name,
    owner_name: user.owner_name,
    email: user.email,
    phone: user.phone,
    whatsapp: user.whatsapp,
    store_slug: user.store_slug,
    account_role: user.account_role ?? "merchant",
    parent_user_id: user.parent_user_id ?? null,
    active: user.active ?? true,
    created_at: user.created_at,
    last_login_at: user.last_login_at,
  };
}

function formatOrder(order: typeof ordersTable.$inferSelect) {
  return {
    ...order,
    items: parseItems(order.items),
  };
}

router.get("/", async (req: AuthRequest, res) => {
  try {
    const currentUser = await getCurrentUser(req.userId!);
    if (!currentUser || (currentUser.account_role ?? "merchant") === "courier") {
      res.status(403).json({ error: "Acesso restrito ao lojista" });
      return;
    }

    const couriers = await db
      .select()
      .from(usersTable)
      .where(and(
        eq(usersTable.parent_user_id, currentUser.id),
        eq(usersTable.account_role, "courier"),
      ))
      .orderBy(desc(usersTable.created_at));

    res.json({ couriers: couriers.map((courier) => formatCourier(courier as CourierUser)) });
  } catch (err) {
    req.log.error({ err }, "ListCouriers error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const currentUser = await getCurrentUser(req.userId!);
    if (!currentUser || (currentUser.account_role ?? "merchant") === "courier") {
      res.status(403).json({ error: "Acesso restrito ao lojista" });
      return;
    }

    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();
    const whatsapp = String(req.body?.whatsapp || "").trim();
    const password = String(req.body?.password || "");

    if (name.length < 2 || email.length < 5 || phone.length < 8 || whatsapp.length < 8 || password.length < 6) {
      res.status(400).json({ error: "Dados invalidos para criar entregador" });
      return;
    }

    const existingEmail = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existingEmail[0]) {
      res.status(409).json({ error: "E-mail ja cadastrado" });
      return;
    }

    const baseSlug = `${currentUser.store_slug}-entregador-${slugify(name) || "padrao"}`;
    let storeSlug = baseSlug;
    let suffix = 1;
    let existingSlug = await db.select().from(usersTable).where(eq(usersTable.store_slug, storeSlug)).limit(1);
    while (existingSlug[0]) {
      suffix += 1;
      storeSlug = `${baseSlug}-${suffix}`;
      existingSlug = await db.select().from(usersTable).where(eq(usersTable.store_slug, storeSlug)).limit(1);
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [created] = await db.insert(usersTable).values({
      id: uuidv4(),
      store_name: `${currentUser.store_name} - Entregador`,
      owner_name: name,
      email,
      password_hash,
      phone,
      whatsapp,
      store_slug: storeSlug,
      account_role: "courier",
      parent_user_id: currentUser.id,
      store_type: currentUser.store_type,
      store_mode: currentUser.store_mode,
      canonical_niche: currentUser.canonical_niche,
      description: "Conta de entregador vinculada ao lojista",
      city: currentUser.city,
      state: currentUser.state,
      active: true,
      plan: currentUser.plan ?? "free",
      free_forever: true,
      verified_badge: false,
      onboarding_completed_at: new Date(),
      is_open: true,
      store_hours: "[]",
      delivery_fee_type: "none",
      delivery_fee_amount: "0",
      last_login_at: null,
    }).returning();

    res.status(201).json({ courier: formatCourier(created as CourierUser) });
  } catch (err) {
    req.log.error({ err }, "CreateCourier error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/orders", async (req: AuthRequest, res) => {
  try {
    const currentUser = await getCurrentUser(req.userId!);
    if (!currentUser || (currentUser.account_role ?? "merchant") !== "courier" || !currentUser.parent_user_id) {
      res.status(403).json({ error: "Acesso restrito ao entregador" });
      return;
    }

    const orders = await db
      .select()
      .from(ordersTable)
      .where(and(
        eq(ordersTable.user_id, currentUser.parent_user_id),
        eq(ordersTable.assigned_courier_id, currentUser.id),
        ne(ordersTable.status, "cancelado"),
      ))
      .orderBy(desc(ordersTable.created_at));

    res.json({ orders: orders.map(formatOrder) });
  } catch (err) {
    req.log.error({ err }, "ListCourierOrders error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/orders/:id/delivered", async (req: AuthRequest, res) => {
  try {
    const currentUser = await getCurrentUser(req.userId!);
    if (!currentUser || (currentUser.account_role ?? "merchant") !== "courier" || !currentUser.parent_user_id) {
      res.status(403).json({ error: "Acesso restrito ao entregador" });
      return;
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(and(
        eq(ordersTable.id, String(req.params.id)),
        eq(ordersTable.user_id, currentUser.parent_user_id),
        eq(ordersTable.assigned_courier_id, currentUser.id),
      ));

    if (!order) {
      res.status(404).json({ error: "Pedido nao encontrado" });
      return;
    }

    if (order.status !== "saiu_entrega") {
      res.status(400).json({ error: "Este pedido ainda nao saiu para entrega" });
      return;
    }

    const [updatedOrder] = await db
      .update(ordersTable)
      .set({ status: "entregue", confirmed_at: order.confirmed_at || new Date() })
      .where(and(
        eq(ordersTable.id, order.id),
        eq(ordersTable.user_id, currentUser.parent_user_id),
        eq(ordersTable.assigned_courier_id, currentUser.id),
      ))
      .returning();

    const customerMessage = `Seu pedido na *${currentUser.store_name.replace(" - Entregador", "")}* foi entregue com sucesso. Obrigado pela preferencia!`;
    void evolutionService.sendTextMessage(`mostrara_store_${currentUser.parent_user_id}`, order.customer_whatsapp, customerMessage).catch(() => undefined);

    res.json({ order: formatOrder(updatedOrder) });
  } catch (err) {
    req.log.error({ err }, "DeliverCourierOrder error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
