import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db, ordersTable, salesTable, usersTable, productsTable } from "@workspace/db";
import {
  decryptMercadoPagoToken,
  encryptMercadoPagoToken,
  fetchMercadoPagoPayment,
  refreshMercadoPagoToken,
  verifyMercadoPagoWebhookSignature,
} from "../lib/mercadopago.js";
import { sendCustomerReceiptEmail } from "../lib/email.js";
import { logSnagEvent } from "../lib/logsnag.js";
import { env } from "../lib/env.js";
import { evolutionService } from "../lib/evolution.js";

const router = Router();

function parseItems(items: string | null): Array<{
  product_id: string;
  name: string;
  storage?: string;
  price: number;
  quantity: number;
  selected_options?: { name: string; price: number }[];
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
    ).map((item: any) => ({
      product_id: item.product_id,
      name: item.name,
      storage: typeof item.storage === "string" ? item.storage : "",
      price: Number(item.price),
      quantity: Number(item.quantity),
      selected_options: Array.isArray(item.selected_options)
        ? item.selected_options
            .map((option: any) => ({
              name: typeof option?.name === "string" ? option.name : "",
              price: Number(option?.price ?? 0),
            }))
            .filter((option: { name: string }) => option.name)
        : [],
    }));
  } catch {
    return [];
  }
}

async function resolveMercadoPagoAccessToken(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.mp_access_token || !user?.mp_refresh_token) return null;

  const now = Date.now();
  const expiresAt = user.mp_access_token_expires_at?.getTime() ?? 0;
  const shouldRefresh = !expiresAt || expiresAt - now < 24 * 60 * 60 * 1000;

  if (!shouldRefresh) {
    return decryptMercadoPagoToken(user.mp_access_token) || null;
  }

  try {
    const refreshToken = decryptMercadoPagoToken(user.mp_refresh_token);
    if (!refreshToken) return null;
    const refreshed = await refreshMercadoPagoToken(refreshToken);
    const updatedAt = new Date();
    const accessExpiresAt = new Date(updatedAt.getTime() + Number(refreshed.expires_in || 15552000) * 1000);
    const refreshExpiresAt = new Date(updatedAt.getTime() + 180 * 24 * 60 * 60 * 1000);
    await db
      .update(usersTable)
      .set({
        mp_access_token: encryptMercadoPagoToken(refreshed.access_token),
        mp_refresh_token: encryptMercadoPagoToken(refreshed.refresh_token),
        mp_user_id: refreshed.user_id,
        mp_connected_at: updatedAt,
        mp_access_token_expires_at: accessExpiresAt,
        mp_refresh_token_expires_at: refreshExpiresAt,
      })
      .where(eq(usersTable.id, userId));
    return refreshed.access_token;
  } catch {
    return null;
  }
}

router.post("/mercadopago/webhook", async (req, res) => {
  try {
    const paymentId = String(req.body?.data?.id ?? req.query?.id ?? "");
    if (!paymentId) {
      res.json({ received: true, ignored: true });
      return;
    }

    const secret = env.mp.webhookSecret;
    if (secret) {
      const valid = verifyMercadoPagoWebhookSignature({
        secret,
        signature: typeof req.headers["x-signature"] === "string" ? req.headers["x-signature"] : undefined,
        requestId: typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined,
        paymentId,
      });
      if (!valid) {
        res.status(401).json({ error: "Assinatura invalida" });
        return;
      }
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.mp_payment_id, paymentId));

    if (!order) {
      res.json({ received: true, ignored: true });
      return;
    }

    const accessToken = await resolveMercadoPagoAccessToken(order.user_id);
    if (!accessToken) {
      res.json({ received: true, ignored: true });
      return;
    }

    const payment = await fetchMercadoPagoPayment(accessToken, paymentId);
    const items = parseItems(order.items);
    const approved = payment.status === "approved";
    const [merchant] = await db.select().from(usersTable).where(eq(usersTable.id, order.user_id));

    await db.transaction(async (tx) => {
      await tx
        .update(ordersTable)
        .set({
          payment_status: payment.status,
          mp_status_detail: payment.status_detail || "",
          mp_qr_code: payment.qr_code || order.mp_qr_code,
          mp_qr_code_base64: payment.qr_code_base64 || order.mp_qr_code_base64,
          mp_ticket_url: payment.ticket_url || order.mp_ticket_url,
          paid_at: approved ? order.paid_at || new Date() : order.paid_at,
          status: approved ? "confirmado" : order.status,
          confirmed_at: approved ? order.confirmed_at || new Date() : order.confirmed_at,
        })
        .where(eq(ordersTable.id, order.id));

      if (approved && !order.confirmed_at) {
        const saleId = uuidv4();
        await tx
          .insert(salesTable)
          .values({
            id: saleId,
            user_id: order.user_id,
            product_id: items.length === 1 ? items[0].product_id : null,
            product_name: items.map((item) => `${item.quantity}x ${item.name}`).join(" + "),
            customer_name: order.customer_name,
            customer_whatsapp: order.customer_whatsapp,
            sale_date: new Date().toISOString().split("T")[0],
            product_price: Number(order.total),
            amount_paid: Number(order.total),
            payment_method: "pix",
            notes: `Pagamento Mercado Pago #${payment.id}${order.notes ? ` - ${order.notes}` : ""}`,
          });

        for (const item of items) {
          await tx
            .update(productsTable)
            .set({
              stock: sql`greatest(coalesce(${productsTable.stock}, 0) - ${item.quantity}, 0)`,
              updated_at: new Date(),
            })
            .where(and(eq(productsTable.id, item.product_id), eq(productsTable.user_id, order.user_id), eq(productsTable.unlimited_stock, false)));
        }
      }
    });

    if (approved && order.customer_email) {
      void sendCustomerReceiptEmail({
        to: order.customer_email,
        storeName: merchant?.store_name || "Mostrara",
        orderId: order.id,
        total: Number(order.total),
        paymentStatus: payment.status,
        qrCode: payment.qr_code,
        ticketUrl: payment.ticket_url,
      }).catch(() => undefined);
    }

    if (approved) {
      // Send WhatsApp notification to merchant
      if (merchant?.whatsapp) {
        const instanceName = `mostrara_store_${merchant.id}`;
        const itemLines = items.map(i => {
          const optText = i.selected_options?.length ? ` (${i.selected_options.map(o => o.name).join(", ")})` : "";
          return `  • ${i.quantity}x ${i.name}${optText} — R$ ${(i.price * i.quantity).toFixed(2).replace(".", ",")}`;
        }).join("\n");

        const deliveryLabel = (order.delivery_method || "delivery") === "delivery" ? "🚚 Entrega" : "🏪 Retirada na loja";
        const addressParts = [
          order.cep ? `CEP: ${order.cep}` : "",
          order.street ? `Endereco: ${order.street}${order.number ? `, ${order.number}` : ""}` : "",
          order.complement ? `Complemento: ${order.complement}` : "",
          order.neighborhood ? `Bairro: ${order.neighborhood}` : "",
          order.city || order.state ? `Cidade/UF: ${[order.city, order.state].filter(Boolean).join(" / ")}` : "",
        ].filter(Boolean);

        const merchantMsg = [
          `🛒 *NOVO PEDIDO #${order.id.slice(0, 6).toUpperCase()}*`,
          `✅ *Pix aprovado automaticamente*`,
          ``,
          `👤 *Cliente:* ${order.customer_name}`,
          `📱 *WhatsApp:* ${order.customer_whatsapp}`,
          ``,
          `📦 *Itens:*`,
          itemLines,
          ``,
          `💵 *Total: R$ ${Number(order.total).toFixed(2).replace(".", ",")}*`,
          ``,
          `💳 *Pagamento:* Pix (Mercado Pago) ✅`,
          `📍 *Modalidade:* ${deliveryLabel}`,
          ...(addressParts.length > 0 ? [``, `🏠 *Endereço:*`, ...addressParts.map(l => `  ${l}`)] : []),
          order.notes ? `\n📝 *Obs:* ${order.notes}` : "",
        ].filter(Boolean).join("\n");

        void evolutionService.sendTextMessage(instanceName, merchant.whatsapp, merchantMsg).catch(() => undefined);
      }

      // Send customer confirmation via WhatsApp
      if (order.customer_whatsapp) {
        const instanceName = `mostrara_store_${order.user_id}`;
        const customerMsg = `*Olá, ${order.customer_name}!* 👋\n\n✅ Seu pagamento Pix foi *confirmado* com sucesso!\n\n*Pedido #${order.id.slice(0, 6).toUpperCase()}*\n*Total:* R$ ${Number(order.total).toFixed(2).replace(".", ",")}\n\nA loja já foi notificada e está preparando seu pedido. Obrigado!`;
        void evolutionService.sendTextMessage(instanceName, order.customer_whatsapp, customerMsg).catch(() => undefined);
      }

      void logSnagEvent({
        channel: "payments",
        event: "pix_approved",
        description: `Pix aprovado para ${merchant?.store_name || "loja"}`,
        icon: "💰",
        notify: true,
        userId: order.user_id,
        tags: {
          store_type: merchant?.store_type || "celulares",
          payment_id: payment.id,
          order_id: order.id,
          amount: Number(order.total),
        },
      }).catch(() => undefined);
    }

    res.json({ received: true, status: payment.status });
  } catch (err) {
    req.log.error({ err }, "MercadoPagoWebhook error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
