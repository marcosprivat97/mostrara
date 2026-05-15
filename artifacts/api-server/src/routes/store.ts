import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, usersTable, productsTable, ordersTable, couponsTable } from "@workspace/db";
import { eq, and, desc, inArray, or, sql } from "drizzle-orm";
import { parseBody, publicAvailabilitySchema, publicOrderSchema, validationError } from "../lib/validation.js";
import {
  createMercadoPagoPixPayment,
  decryptMercadoPagoToken,
  encryptMercadoPagoToken,
  refreshMercadoPagoToken,
} from "../lib/mercadopago.js";
import { isPremium } from "../lib/plan.js";
import { env } from "../lib/env.js";
import { sendMerchantOrderEmail } from "../lib/email.js";
import { logSnagEvent } from "../lib/logsnag.js";
import {
  resolveStoreDeliveryConfig,
  resolveStoreTaxonomyFromProfile,
} from "../lib/store-taxonomy.js";
import { evolutionService } from "../lib/evolution.js";
import { formatProduct, parseOptions } from "../lib/product-data.js";
import {
  buildAvailableSlots,
  getSaoPauloNowParts,
  isSlotAvailable,
  parseDurationMinutes,
  parseServiceHours,
  type OccupiedInterval,
} from "../lib/scheduling.js";

const router = Router();
const APP_URL = env.core.appUrl;

function buildAddressLines(input: {
  delivery_method?: string;
  delivery_method_name?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  reference?: string;
}) {
  if ((input.delivery_method || "delivery") !== "delivery") {
    return [input.delivery_method_name || "Retirada no local"];
  }

  return [
    input.cep ? `CEP: ${input.cep}` : "",
    input.street ? `Endereco: ${input.street}${input.number ? `, ${input.number}` : ""}` : "",
    input.complement ? `Complemento: ${input.complement}` : "",
    input.neighborhood ? `Bairro: ${input.neighborhood}` : "",
    input.city || input.state ? `Cidade/UF: ${[input.city, input.state].filter(Boolean).join(" / ")}` : "",
    input.reference ? `Referencia: ${input.reference}` : "",
  ].filter(Boolean);
}

function sumAppointmentDurationMinutes(items: Array<{ storage?: string; quantity: number }>) {
  const duration = items.reduce(
    (sum, item) => sum + parseDurationMinutes(item.storage) * Math.max(1, Number(item.quantity) || 1),
    0,
  );
  return duration > 0 ? duration : 60;
}

async function loadOccupiedIntervals(userId: string, appointmentDate: string) {
  const appointments = await db
    .select({
      appointment_time: ordersTable.appointment_time,
      appointment_end_time: ordersTable.appointment_end_time,
      appointment_duration_minutes: ordersTable.appointment_duration_minutes,
    })
    .from(ordersTable)
    .where(and(
      eq(ordersTable.user_id, userId),
      eq(ordersTable.appointment_date, appointmentDate),
      inArray(ordersTable.status, ["pendente", "preparando", "saiu_entrega", "confirmado"]),
    ));

  return appointments
    .map((appointment) => {
      const start = String(appointment.appointment_time || "");
      if (!/^\d{2}:\d{2}$/.test(start)) return null;

      const end = String(appointment.appointment_end_time || "");
      if (/^\d{2}:\d{2}$/.test(end)) {
        return { start, end } satisfies OccupiedInterval;
      }

      const duration = Number(appointment.appointment_duration_minutes || 0);
      if (duration > 0) {
        const [hours, minutes] = start.split(":").map(Number);
        const totalMinutes = hours * 60 + minutes + duration;
        const computedEnd = `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
        return { start, end: computedEnd } satisfies OccupiedInterval;
      }

      return null;
    })
    .filter((interval): interval is OccupiedInterval => Boolean(interval));
}

async function resolveMercadoPagoAccessToken(userId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user?.mp_access_token || !user?.mp_refresh_token) return null;

  const now = Date.now();
  const expiresAt = user.mp_access_token_expires_at?.getTime() ?? 0;
  const shouldRefresh = !expiresAt || expiresAt - now < 24 * 60 * 60 * 1000;

  if (!shouldRefresh) {
    const token = decryptMercadoPagoToken(user.mp_access_token);
    return token || null;
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

router.get("/:storeSlug", async (req, res) => {
  const { storeSlug } = req.params;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.store_slug, storeSlug), eq(usersTable.active, true)));

    if (!user) {
      res.status(404).json({ error: "Loja nao encontrada" });
      return;
    }

    const products = await db
      .select()
      .from(productsTable)
      .where(and(
        eq(productsTable.user_id, user.id),
        eq(productsTable.status, "disponivel"),
        or(
          eq(productsTable.unlimited_stock, true),
          sql`coalesce(${productsTable.stock}, 0) > 0`,
        ),
      ))
      .orderBy(desc(productsTable.created_at));

    const storeProfile = resolveStoreDeliveryConfig(user);

    res.json({
      store: {
        store_name: user.store_name,
        owner_name: user.owner_name,
        description: user.description,
        city: user.city,
        state: user.state,
        store_cep: user.store_cep,
        store_address: user.store_address,
        store_address_number: user.store_address_number,
        store_neighborhood: user.store_neighborhood,
        store_latitude: user.store_latitude,
        store_longitude: user.store_longitude,
        whatsapp: user.whatsapp,
        logo_url: user.logo_url,
        cover_url: user.cover_url,
        theme_primary: user.theme_primary,
        theme_secondary: user.theme_secondary,
        theme_accent: user.theme_accent,
        store_type: storeProfile.storeType,
        store_mode: storeProfile.storeMode,
        canonical_niche: storeProfile.canonicalNiche,
        is_open: user.is_open,
        store_hours: user.store_hours,
        delivery_fee_type: storeProfile.deliveryFeeType,
        delivery_fee_amount: storeProfile.deliveryFeeAmount,
        verified_badge: Boolean(user.verified_badge && isPremium(user)),
        mercado_pago_connected: Boolean(user.mp_connected_at && user.mp_user_id && isPremium(user)),
        mercado_pago_connected_at: user.mp_connected_at,
        store_slug: user.store_slug,
      },
      products: products.map(formatProduct),
    });
  } catch (err) {
    req.log.error({ err }, "GetStore error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/:storeSlug/validate-coupon", async (req, res) => {
  try {
    const { storeSlug } = req.params;
    const { code, subtotal } = req.body;

    if (!code || typeof code !== "string" || !subtotal || typeof subtotal !== "number") {
      res.status(400).json({ error: "Dados invalidos para validacao do cupom" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.store_slug, storeSlug), eq(usersTable.active, true)));

    if (!user) {
      res.status(404).json({ error: "Loja nao encontrada" });
      return;
    }

    const [coupon] = await db
      .select()
      .from(couponsTable)
      .where(and(
        eq(couponsTable.user_id, user.id),
        eq(couponsTable.code, code.toUpperCase()),
        eq(couponsTable.active, true),
      ));

    const expired = coupon?.expires_at ? coupon.expires_at.getTime() < Date.now() : false;
    const maxed = coupon?.max_uses ? Number(coupon.used_count || 0) >= coupon.max_uses : false;

    if (!coupon || expired || maxed) {
      res.status(400).json({ error: "Cupom invalido, expirado ou esgotado" });
      return;
    }

    const discountAmount = coupon.type === "fixed"
      ? Math.min(Number(coupon.value), subtotal)
      : subtotal * (Number(coupon.value) / 100);

    res.json({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      discountAmount,
    });
  } catch (err) {
    req.log.error({ err }, "ValidateCoupon error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/:storeSlug/availability", async (req, res) => {
  try {
    const { storeSlug } = req.params;
    const body = parseBody(publicAvailabilitySchema, req.body);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.store_slug, storeSlug), eq(usersTable.active, true)));

    if (!user) {
      res.status(404).json({ error: "Loja nao encontrada" });
      return;
    }

    const storeProfile = resolveStoreTaxonomyFromProfile(user);

    if (storeProfile.storeMode !== "booking") {
      res.status(400).json({ error: "Essa loja nao trabalha com agenda" });
      return;
    }

    const today = getSaoPauloNowParts().date;
    if (body.date < today) {
      res.status(400).json({ error: "Nao e possivel agendar em uma data passada" });
      return;
    }

    const requestedIds = [...new Set(body.items.map((item) => item.product_id))];
    const products = await db
      .select({
        id: productsTable.id,
        storage: productsTable.storage,
      })
      .from(productsTable)
      .where(and(
        eq(productsTable.user_id, user.id),
        eq(productsTable.status, "disponivel"),
        inArray(productsTable.id, requestedIds),
      ));

    const productById = new Map(products.map((product) => [product.id, product]));
    const requestedItems = body.items.map((item) => {
      const product = productById.get(item.product_id);
      if (!product) return null;
      return {
        storage: product.storage || "",
        quantity: item.quantity,
      };
    });

    if (requestedItems.some((item) => item === null)) {
      res.status(400).json({ error: "Um ou mais servicos nao estao disponiveis" });
      return;
    }

    const safeItems = requestedItems.filter((item): item is NonNullable<typeof item> => item !== null);
    const durationMinutes = sumAppointmentDurationMinutes(safeItems);
    const storeHours = parseServiceHours(user.store_hours);
    const occupiedIntervals = await loadOccupiedIntervals(user.id, body.date);
    const slots = buildAvailableSlots({
      date: body.date,
      durationMinutes,
      storeHours,
      occupiedIntervals,
    });

    res.json({
      date: body.date,
      duration_minutes: durationMinutes,
      slots,
    });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "StoreAvailability error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/:storeSlug/orders", async (req, res) => {
  const { storeSlug } = req.params;

  try {
    const body = parseBody(publicOrderSchema, req.body);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.store_slug, storeSlug), eq(usersTable.active, true)));

    if (!user) {
      res.status(404).json({ error: "Loja nao encontrada" });
      return;
    }

    if (user.is_open === false) {
      res.status(400).json({ error: "A loja está fechada no momento" });
      return;
    }

    const storeProfile = resolveStoreDeliveryConfig(user);
    const serviceStore = storeProfile.storeMode === "booking";
    if (serviceStore && (!body.appointment_date || !body.appointment_time)) {
      res.status(400).json({ error: "Data e horario sao obrigatorios para esse agendamento" });
      return;
    }

    const requestedIds = [...new Set(body.items.map((item) => item.product_id))];
    const products = await db
      .select()
      .from(productsTable)
      .where(and(
        eq(productsTable.user_id, user.id),
        eq(productsTable.status, "disponivel"),
        inArray(productsTable.id, requestedIds),
      ));

    const productById = new Map(products.map((product) => [product.id, product]));
    const items = body.items.map((item) => {
      const product = productById.get(item.product_id);
      if (!product) return null;
      const availableOptions = parseOptions(product.options);
      const selectedOptions = item.selected_options
        .map((name) => availableOptions.find((option) => option.name === name))
        .filter((option): option is { name: string; price: number } => Boolean(option));
      const optionsTotal = selectedOptions.reduce((sum, option) => sum + option.price, 0);
      const unitPrice = Number(product.price) + optionsTotal;
      return {
        product_id: product.id,
        name: product.name,
        storage: product.storage || "",
        price: unitPrice,
        base_price: Number(product.price),
        selected_options: selectedOptions,
        quantity: item.quantity,
      };
    });

    if (items.some((item) => item === null)) {
      res.status(400).json({ error: "Um ou mais produtos nao estao disponiveis" });
      return;
    }

    const safeItems = items.filter((item): item is NonNullable<typeof item> => item !== null);
    const appointmentDurationMinutes = serviceStore ? sumAppointmentDurationMinutes(safeItems) : 0;
    let appointmentEndTime = "";

    if (serviceStore && body.appointment_date && body.appointment_time) {
      const today = getSaoPauloNowParts().date;
      if (body.appointment_date < today) {
        res.status(400).json({ error: "Nao e possivel agendar em uma data passada" });
        return;
      }

      const storeHours = parseServiceHours(user.store_hours);
      const occupiedIntervals = await loadOccupiedIntervals(user.id, body.appointment_date);
      const availability = isSlotAvailable({
        date: body.appointment_date,
        startTime: body.appointment_time,
        durationMinutes: appointmentDurationMinutes,
        storeHours,
        occupiedIntervals,
      });

      if (!availability.available) {
        res.status(409).json({ error: "Esse horario nao esta mais disponivel. Escolha outro horario." });
        return;
      }

      appointmentEndTime = availability.endTime;
    }

    const subtotal = safeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discount = 0;
    let couponCode = "";

    if (body.coupon_code) {
      const [coupon] = await db
        .select()
        .from(couponsTable)
        .where(and(
          eq(couponsTable.user_id, user.id),
          eq(couponsTable.code, body.coupon_code.toUpperCase()),
          eq(couponsTable.active, true),
        ));
      const expired = coupon?.expires_at ? coupon.expires_at.getTime() < Date.now() : false;
      const maxed = coupon?.max_uses ? Number(coupon.used_count || 0) >= coupon.max_uses : false;
      if (!coupon || expired || maxed) {
        res.status(400).json({ error: "Cupom invalido ou expirado" });
        return;
      }
      couponCode = coupon.code;
      discount = coupon.type === "fixed"
        ? Math.min(Number(coupon.value), subtotal)
        : Math.min(subtotal * (Number(coupon.value) / 100), subtotal);
    }

    let deliveryFee = 0;
    if (body.delivery_method === "delivery") {
      if (storeProfile.deliveryFeeType === "fixed") {
        deliveryFee = storeProfile.deliveryFeeAmount;
      } else if (storeProfile.deliveryFeeType === "distance" && typeof body.delivery_fee === "number" && body.delivery_fee > 0) {
        deliveryFee = body.delivery_fee;
      }
    }

    const finalNotes = [
      serviceStore && body.appointment_date && body.appointment_time
        ? `[Agendamento: ${body.appointment_date} ${body.appointment_time}${appointmentEndTime ? `-${appointmentEndTime}` : ""}]`
        : "",
      body.delivery_method_name ? `[Modalidade: ${body.delivery_method_name}]` : "",
      body.notes || "",
    ].filter(Boolean).join(" ").trim();

    const total = Math.max(subtotal - discount + deliveryFee, 0);
    const id = uuidv4();
    const wantsMercadoPagoPix = body.payment_provider === "mercadopago_pix" && body.payment_method === "pix" && isPremium(user);

    const [order] = await db
      .insert(ordersTable)
      .values({
        id,
        user_id: user.id,
        customer_name: body.customer_name,
        customer_whatsapp: body.customer_whatsapp,
        customer_email: body.customer_email || "",
        customer_document: body.customer_document || "",
        delivery_method: body.delivery_method || "delivery",
        cep: body.cep || "",
        street: body.street || "",
        number: body.number || "",
        complement: body.complement || "",
        neighborhood: body.neighborhood || "",
        city: body.city || "",
        state: body.state || "",
        reference: body.reference || "",
        appointment_date: body.appointment_date || "",
        appointment_time: body.appointment_time || "",
        appointment_end_time: appointmentEndTime,
        appointment_duration_minutes: appointmentDurationMinutes,
        payment_method: body.payment_method,
        notes: finalNotes,
        items: JSON.stringify(safeItems),
        coupon_code: couponCode,
        discount,
        delivery_fee: deliveryFee,
        total,
        payment_provider: wantsMercadoPagoPix ? "mercadopago_pix" : "whatsapp",
        payment_status: wantsMercadoPagoPix ? "pending" : "not_applicable",
        status: "pendente",
        whatsapp_clicked_at: new Date(),
      })
      .returning();

    void sendMerchantOrderEmail({
      to: user.email,
      storeName: user.store_name,
      orderId: order.id,
      customerName: body.customer_name,
      customerWhatsapp: body.customer_whatsapp,
      total,
      paymentMethod: body.payment_method,
      deliveryMethod: body.delivery_method || "delivery",
      addressLines: buildAddressLines(body),
      items: safeItems,
    }).catch(() => undefined);
    void logSnagEvent({
      channel: "orders",
      event: "order_created",
      description: `Novo pedido em ${user.store_name}`,
      icon: "🛒",
      notify: true,
      userId: user.id,
      tags: {
        store_type: user.store_type || "celulares",
        store_mode: user.store_mode || "retail",
        canonical_niche: user.canonical_niche || "legacy",
        payment_method: body.payment_method,
        delivery_method: body.delivery_method || "delivery",
        total,
      },
    }).catch(() => undefined);

    if (couponCode) {
      await db
        .update(couponsTable)
        .set({ used_count: sql`coalesce(${couponsTable.used_count}, 0) + 1`, updated_at: new Date() })
        .where(and(eq(couponsTable.user_id, user.id), eq(couponsTable.code, couponCode)));
    }

    if (!wantsMercadoPagoPix) {
      // Fire-and-forget: Try to send an automated confirmation message via Evolution API
      const instanceName = `mostrara_store_${user.id}`;
      const scheduleMessage = serviceStore && body.appointment_date && body.appointment_time
        ? `\n*Agendamento:* ${body.appointment_date} ${body.appointment_time}${appointmentEndTime ? ` ate ${appointmentEndTime}` : ""}\n`
        : "\n";
      const messageText = `*Ol\u00E1, ${body.customer_name}!* \uD83D\uDC4B\n\nRecebemos o seu pedido na loja *${user.store_name}* com sucesso!\n\n*Resumo do Pedido #${order.id.slice(0, 6).toUpperCase()}*\n${safeItems.map(i => `- ${i.quantity}x ${i.name}`).join("\n")}${scheduleMessage}\n*Total:* R$ ${total.toFixed(2).replace('.', ',')}\n\nN\u00F3s avisaremos assim que houver atualiza\u00E7\u00F5es. Obrigado pela prefer\u00EAncia!`;
      
      void evolutionService.sendTextMessage(instanceName, body.customer_whatsapp, messageText).catch(() => undefined);
      // Optional: also send a detailed notification to the merchant's own whatsapp
      if (user.whatsapp) {
        const paymentLabels: Record<string, string> = {
          pix: "Pix", credito: "Cartão de Crédito", debito: "Cartão de Débito",
          dinheiro: "Dinheiro", credit: "Cartão de Crédito", debit: "Cartão de Débito",
          cash: "Dinheiro",
        };
        const payLabel = paymentLabels[body.payment_method] || body.payment_method;
        const deliveryLabel = (body.delivery_method || "delivery") === "delivery"
          ? `🚚 ${body.delivery_method_name || "Entrega"}`
          : `🏪 ${body.delivery_method_name || "Retirada no local"}`;
        const addressLines = buildAddressLines(body);

        const itemLines = safeItems.map(i => {
          const optText = i.selected_options?.length ? ` (${i.selected_options.map((o: any) => o.name).join(", ")})` : "";
          return `  • ${i.quantity}x ${i.name}${optText} — R$ ${(i.price * i.quantity).toFixed(2).replace(".", ",")}`;
        }).join("\n");

        const merchantMsg = [
          `🛒 *NOVO PEDIDO #${order.id.slice(0, 6).toUpperCase()}*`,
          ``,
          `👤 *Cliente:* ${body.customer_name}`,
          `📱 *WhatsApp:* ${body.customer_whatsapp}`,
          serviceStore && body.appointment_date && body.appointment_time
            ? `🗓️ *Agendamento:* ${body.appointment_date} ${body.appointment_time}${appointmentEndTime ? `-${appointmentEndTime}` : ""}`
            : "",
          ``,
          `📦 *Itens:*`,
          itemLines,
          ``,
          discount > 0 ? `💰 Subtotal: R$ ${subtotal.toFixed(2).replace(".", ",")}` : "",
          discount > 0 ? `🏷️ Desconto${couponCode ? ` (${couponCode})` : ""}: -R$ ${discount.toFixed(2).replace(".", ",")}` : "",
          deliveryFee > 0 ? `🚚 Taxa de entrega: R$ ${deliveryFee.toFixed(2).replace(".", ",")}` : "",
          `💵 *Total: R$ ${total.toFixed(2).replace(".", ",")}*`,
          ``,
          `💳 *Pagamento:* ${payLabel}`,
          `📍 *Modalidade:* ${deliveryLabel}`,
          ...(addressLines.length > 0 ? [``, `🏠 *Endereço:*`, ...addressLines.map(l => `  ${l}`)] : []),
          body.notes ? `\n📝 *Obs:* ${body.notes}` : "",
        ].filter(Boolean).join("\n");

        void evolutionService.sendTextMessage(instanceName, user.whatsapp, merchantMsg).catch(() => undefined);
      }

      res.status(201).json({
        order: {
          ...order,
          items: safeItems,
        },
      });
      return;
    }

    const accessToken = await resolveMercadoPagoAccessToken(user.id);
    if (!accessToken) {
      await db
        .update(ordersTable)
        .set({ payment_status: "failed" })
        .where(eq(ordersTable.id, order.id));
      res.status(409).json({ error: "Loja ainda nao conectou o Mercado Pago", order_id: order.id });
      return;
    }

    if (!body.customer_email) {
      await db
        .update(ordersTable)
        .set({ payment_status: "failed" })
        .where(eq(ordersTable.id, order.id));
      res.status(400).json({ error: "E-mail do comprador e obrigatorio para Pix do Mercado Pago" });
      return;
    }

    const payment = await createMercadoPagoPixPayment({
      accessToken,
      amount: total,
      description: `${user.store_name} - Pedido ${order.id.slice(0, 8)}`,
      customerName: body.customer_name,
      customerEmail: body.customer_email,
      customerDocument: body.customer_document || undefined,
      externalReference: order.id,
      notificationUrl: `${APP_URL}/api/payments/mercadopago/webhook`,
      idempotencyKey: order.id,
    });

    const [updated] = await db
      .update(ordersTable)
      .set({
        mp_payment_id: payment.id,
        mp_qr_code: payment.qr_code,
        mp_qr_code_base64: payment.qr_code_base64,
        mp_ticket_url: payment.ticket_url,
        mp_status_detail: payment.status_detail || "",
        payment_status: payment.status,
        payment_provider: "mercadopago_pix",
        paid_at: payment.status === "approved" ? new Date() : null,
      })
      .where(eq(ordersTable.id, order.id))
      .returning();

    res.status(201).json({
      order: {
        ...(updated || order),
        items: safeItems,
      },
      payment: {
        provider: "mercadopago_pix",
        status: payment.status,
        status_detail: payment.status_detail,
        qr_code: payment.qr_code,
        qr_code_base64: payment.qr_code_base64,
        ticket_url: payment.ticket_url,
        order_id: order.id,
      },
    });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "CreatePublicOrder error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/:storeSlug/orders/:orderId/payment", async (req, res) => {
  try {
    const { storeSlug, orderId } = req.params;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.store_slug, storeSlug), eq(usersTable.active, true)));

    if (!user) {
      res.status(404).json({ error: "Loja nao encontrada" });
      return;
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.user_id, user.id)));

    if (!order) {
      res.status(404).json({ error: "Pedido nao encontrado" });
      return;
    }

    res.json({
      order: {
        ...order,
      },
      payment: {
        provider: order.payment_provider,
        status: order.payment_status,
        status_detail: order.mp_status_detail,
        qr_code: order.mp_qr_code,
        qr_code_base64: order.mp_qr_code_base64,
        ticket_url: order.mp_ticket_url,
        mp_payment_id: order.mp_payment_id,
        paid_at: order.paid_at,
      },
    });
  } catch (err) {
    req.log.error({ err }, "GetStoreOrderPayment error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/:storeSlug/orders/:orderId", async (req, res) => {
  try {
    const { storeSlug, orderId } = req.params;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.store_slug, storeSlug), eq(usersTable.active, true)));

    if (!user) {
      res.status(404).json({ error: "Loja nao encontrada" });
      return;
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.user_id, user.id)));

    if (!order) {
      res.status(404).json({ error: "Pedido nao encontrado" });
      return;
    }

    res.json({
      order: {
        id: order.id,
        customer_name: order.customer_name,
        total: order.total,
        status: order.status,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        delivery_method: order.delivery_method,
        appointment_date: order.appointment_date,
        appointment_time: order.appointment_time,
        appointment_end_time: order.appointment_end_time,
        created_at: order.created_at,
        items: (() => {
          try { return JSON.parse(order.items || "[]"); } catch { return []; }
        })(),
      },
      store: {
        store_name: user.store_name,
        whatsapp: user.whatsapp,
      }
    });
  } catch (err) {
    req.log.error({ err }, "GetStoreOrder error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
