import { Router, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, ordersTable, salesTable, productsTable, usersTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { evolutionService } from "../lib/evolution.js";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

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

function formatOrder(order: typeof ordersTable.$inferSelect) {
  return {
    ...order,
    items: parseItems(order.items),
  };
}

type MerchantCourier = {
  id: string;
  owner_name: string;
  whatsapp: string;
  store_name: string;
};

async function selectActiveMerchantCourier(merchantId: string): Promise<MerchantCourier | null> {
  const [courier] = await db
    .select({
      id: usersTable.id,
      owner_name: usersTable.owner_name,
      whatsapp: usersTable.whatsapp,
      store_name: usersTable.store_name,
    })
    .from(usersTable)
    .where(and(
      eq(usersTable.parent_user_id, merchantId),
      eq(usersTable.account_role, "courier"),
      eq(usersTable.active, true),
    ))
    .orderBy(desc(usersTable.created_at))
    .limit(1);

  return (courier as MerchantCourier | undefined) ?? null;
}

function buildCourierAssignmentMessage(order: typeof ordersTable.$inferSelect, storeName: string) {
  const items = parseItems(order.items)
    .map((item) => `${item.quantity}x ${item.name}`)
    .join(", ");
  const address = [
    order.street,
    order.number ? `, ${order.number}` : "",
    order.neighborhood ? ` - ${order.neighborhood}` : "",
    order.city ? `, ${order.city}` : "",
    order.state ? ` / ${order.state}` : "",
  ].join("").trim();

  return [
    `Novo pedido atribuido para voce na loja ${storeName}.`,
    `Cliente: ${order.customer_name}`,
    address ? `Endereco: ${address}` : "",
    order.reference ? `Referencia: ${order.reference}` : "",
    items ? `Itens: ${items}` : "",
    order.notes ? `Obs: ${order.notes}` : "",
  ].filter(Boolean).join("\n");
}

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const filters = [eq(ordersTable.user_id, req.userId!)];
    if (status && ["pendente", "confirmado", "preparando", "saiu_entrega", "entregue", "cancelado"].includes(status)) {
      filters.push(eq(ordersTable.status, status));
    }

    const orders = await db
      .select()
      .from(ordersTable)
      .where(and(...filters))
      .orderBy(desc(ordersTable.created_at));

    res.json({ orders: orders.map(formatOrder) });
  } catch (err) {
    req.log.error({ err }, "ListOrders error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/:id/confirm", async (req: AuthRequest, res: Response) => {
  try {
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(and(
        eq(ordersTable.id, String(req.params.id)),
        eq(ordersTable.user_id, req.userId!),
      ));

    if (!order) {
      res.status(404).json({ error: "Pedido nao encontrado" });
      return;
    }

    if (order.status !== "pendente") {
      res.status(400).json({ error: "Este pedido ja foi finalizado" });
      return;
    }

    const items = parseItems(order.items);
    const saleDate = new Date().toISOString().split("T")[0];
    const saleId = uuidv4();

    const [sale] = await db
      .insert(salesTable)
      .values({
        id: saleId,
        user_id: req.userId!,
        product_id: items.length === 1 ? items[0].product_id : null,
        product_name: items.map((item) => `${item.quantity}x ${item.name}`).join(" + "),
        customer_name: order.customer_name,
        customer_whatsapp: order.customer_whatsapp,
        sale_date: saleDate,
        product_price: Number(order.total),
        amount_paid: Number(order.total),
        payment_method: order.payment_method || "pix",
        notes: `Pedido WhatsApp #${order.id}${order.notes ? ` - ${order.notes}` : ""}`,
      })
      .returning();

    for (const item of items) {
      await db
        .update(productsTable)
        .set({
          stock: sql`greatest(coalesce(${productsTable.stock}, 0) - ${item.quantity}, 0)`,
          updated_at: new Date(),
        })
        .where(and(
          eq(productsTable.id, item.product_id),
          eq(productsTable.user_id, req.userId!),
          eq(productsTable.unlimited_stock, false),
        ));
    }

    const [updatedOrder] = await db
      .update(ordersTable)
      .set({ status: "confirmado", confirmed_at: new Date() })
      .where(and(eq(ordersTable.id, order.id), eq(ordersTable.user_id, req.userId!)))
      .returning();

    res.json({ order: formatOrder(updatedOrder), sale });
  } catch (err) {
    req.log.error({ err }, "ConfirmOrder error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/:id/cancel", async (req: AuthRequest, res: Response) => {
  try {
    const [currentOrder] = await db
      .select()
      .from(ordersTable)
      .where(and(
        eq(ordersTable.id, String(req.params.id)),
        eq(ordersTable.user_id, req.userId!),
      ));

    if (!currentOrder) {
      res.status(404).json({ error: "Pedido nao encontrado" });
      return;
    }

    if (currentOrder.status === "cancelado" || currentOrder.status === "entregue") {
      res.status(400).json({ error: "Este pedido ja foi finalizado" });
      return;
    }

    const [updatedOrder] = await db
      .update(ordersTable)
      .set({ status: "cancelado", canceled_at: new Date() })
      .where(and(
        eq(ordersTable.id, String(req.params.id)),
        eq(ordersTable.user_id, req.userId!),
      ))
      .returning();

    res.json({ order: formatOrder(updatedOrder) });
  } catch (err) {
    req.log.error({ err }, "CancelOrder error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pendente", "confirmado", "preparando", "saiu_entrega", "entregue", "cancelado"];
    
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Status invalido" });
      return;
    }

    const [currentOrder] = await db
      .select()
      .from(ordersTable)
      .where(and(
        eq(ordersTable.id, String(req.params.id)),
        eq(ordersTable.user_id, req.userId!)
      ));

    if (!currentOrder) {
      res.status(404).json({ error: "Pedido nao encontrado" });
      return;
    }

    let assignedCourierId = currentOrder.assigned_courier_id || null;
    let assignedCourier: MerchantCourier | null = null;
    if (status === "saiu_entrega" && !assignedCourierId) {
      assignedCourier = await selectActiveMerchantCourier(req.userId!);
      assignedCourierId = assignedCourier?.id || null;
    }

    const [updatedOrder] = await db
      .update(ordersTable)
      .set({
        status,
        ...(status === "confirmado" ? { confirmed_at: new Date() } : {}),
        ...(status === "entregue" ? { confirmed_at: currentOrder.confirmed_at || new Date() } : {}),
        ...(status === "cancelado" ? { canceled_at: new Date() } : {}),
        ...(status === "saiu_entrega" && assignedCourierId ? { assigned_courier_id: assignedCourierId } : {}),
      })
      .where(and(
        eq(ordersTable.id, String(req.params.id)),
        eq(ordersTable.user_id, req.userId!)
      ))
      .returning();

    if (currentOrder.status !== status) {
      // If moving to confirmado, create a sale and deduct stock
      if (status === "confirmado") {
        const items = parseItems(currentOrder.items);
        const saleDate = new Date().toISOString().split("T")[0];
        const saleId = uuidv4();

        await db.insert(salesTable).values({
          id: saleId,
          user_id: req.userId!,
          product_id: items.length === 1 ? items[0].product_id : null,
          product_name: items.map((item) => `${item.quantity}x ${item.name}`).join(" + "),
          customer_name: currentOrder.customer_name,
          customer_whatsapp: currentOrder.customer_whatsapp,
          sale_date: saleDate,
          product_price: Number(currentOrder.total),
          amount_paid: Number(currentOrder.total),
          payment_method: currentOrder.payment_method || "pix",
          notes: `Pedido WhatsApp #${currentOrder.id}${currentOrder.notes ? ` - ${currentOrder.notes}` : ""}`,
        });

        for (const item of items) {
          await db.update(productsTable)
            .set({
              stock: sql`greatest(coalesce(${productsTable.stock}, 0) - ${item.quantity}, 0)`,
              updated_at: new Date(),
            })
            .where(and(
              eq(productsTable.id, item.product_id),
              eq(productsTable.user_id, req.userId!),
              eq(productsTable.unlimited_stock, false)
            ));
        }
      }

      // Send Evolution API message to the customer
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
      const storeName = user?.store_name || "nossa loja";
      const isDelivery = (currentOrder.delivery_method || "delivery") === "delivery";
      
      let message = "";
      if (status === "confirmado") {
        if (isDelivery) {
          message = `Seu pedido na *${storeName}* foi aceito e ja entrou na fila de preparo. Vamos atualizar o status assim que ele estiver pronto.`;
        } else {
          message = `Seu pedido na *${storeName}* foi aceito e ja entrou na fila de preparo. Avisaremos quando estiver pronto para retirada.`;
        }
      } else if (status === "preparando") {
        if (isDelivery) {
          message = `Seu pedido na *${storeName}* ja esta sendo preparado. Assim que ficar pronto, avisamos o proximo passo.`;
        } else {
          message = `Seu pedido na *${storeName}* ja esta sendo preparado. Assim que ficar pronto, avisaremos para retirada.`;
        }
      } else if (status === "saiu_entrega") {
        if (isDelivery) {
          message = `Seu pedido na *${storeName}* saiu para entrega e deve chegar em breve. Fique atento ao WhatsApp.`;
        } else {
          message = `Seu pedido na *${storeName}* ja esta pronto para retirada.`;
        }
      } else if (status === "entregue") {
        message = `Seu pedido na *${storeName}* foi entregue com sucesso. Obrigado pela preferencia!`;
      } else if (status === "cancelado") {
        message = `Seu pedido na *${storeName}* foi cancelado pela loja. Se precisar, fale com a equipe no WhatsApp.`;
      }

      if (message) {
        const instanceName = `mostrara_store_${req.userId}`;
        void evolutionService.sendTextMessage(instanceName, currentOrder.customer_whatsapp, message).catch((err) => {
          req.log.warn({ err }, "Failed to send status update WhatsApp message");
        });
      }

      if (status === "saiu_entrega") {
        const courierTarget = assignedCourier || (assignedCourierId
          ? await db
              .select({
                id: usersTable.id,
                owner_name: usersTable.owner_name,
                whatsapp: usersTable.whatsapp,
                store_name: usersTable.store_name,
              })
              .from(usersTable)
              .where(eq(usersTable.id, assignedCourierId))
              .limit(1)
              .then(([row]) => row ? {
                id: row.id,
                owner_name: row.owner_name,
                whatsapp: row.whatsapp,
                store_name: row.store_name,
              } : null)
          : null);

        if (courierTarget?.whatsapp) {
          const courierMessage = buildCourierAssignmentMessage(updatedOrder, storeName);
          const instanceName = `mostrara_store_${req.userId}`;
          void evolutionService.sendTextMessage(instanceName, courierTarget.whatsapp, courierMessage).catch((err) => {
            req.log.warn({ err }, "Failed to send courier assignment WhatsApp message");
          });
        }
      }
    }

    res.json({ order: formatOrder(updatedOrder) });
  } catch (err) {
    req.log.error({ err }, "UpdateOrderStatus error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/:id/assign-courier", async (req: AuthRequest, res: Response) => {
  try {
    const courierId = typeof req.body?.courier_id === "string" ? req.body.courier_id.trim() : "";
    const [currentUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    if (!currentUser || (currentUser.account_role ?? "merchant") === "courier") {
      res.status(403).json({ error: "Acesso restrito ao lojista" });
      return;
    }

    if (courierId) {
      const [courier] = await db
        .select()
        .from(usersTable)
        .where(and(
          eq(usersTable.id, courierId),
          eq(usersTable.parent_user_id, currentUser.id),
          eq(usersTable.account_role, "courier"),
          eq(usersTable.active, true),
        ))
        .limit(1);

      if (!courier) {
        res.status(404).json({ error: "Entregador nao encontrado" });
        return;
      }
    }

    const [currentOrder] = await db
      .select()
      .from(ordersTable)
      .where(and(
        eq(ordersTable.id, String(req.params.id)),
        eq(ordersTable.user_id, req.userId!),
      ))
      .limit(1);

    if (!currentOrder) {
      res.status(404).json({ error: "Pedido nao encontrado" });
      return;
    }

    const [updatedOrder] = await db
      .update(ordersTable)
      .set({
        assigned_courier_id: courierId || null,
      })
      .where(and(
        eq(ordersTable.id, String(req.params.id)),
        eq(ordersTable.user_id, req.userId!),
      ))
      .returning();

    if (courierId && currentOrder.status === "saiu_entrega") {
      const [merchant] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, req.userId!))
        .limit(1);
      const [courier] = await db
        .select({
          id: usersTable.id,
          owner_name: usersTable.owner_name,
          whatsapp: usersTable.whatsapp,
          store_name: usersTable.store_name,
        })
        .from(usersTable)
        .where(eq(usersTable.id, courierId))
        .limit(1);

      if (courier?.whatsapp) {
        const courierMessage = buildCourierAssignmentMessage(updatedOrder, merchant?.store_name || "nossa loja");
        const instanceName = `mostrara_store_${req.userId}`;
        void evolutionService.sendTextMessage(instanceName, courier.whatsapp, courierMessage).catch((err) => {
          req.log.warn({ err }, "Failed to notify assigned courier");
        });
      }
    }

    res.json({ order: formatOrder(updatedOrder) });
  } catch (err) {
    req.log.error({ err }, "AssignCourier error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
