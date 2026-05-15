import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, ordersTable, salesTable, couponsTable } from "@workspace/db";
import { productsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";
import { uploadImageToCloudinary } from "../lib/cloudinary.js";
import { sendPasswordChangedEmail } from "../lib/email.js";
import { geocodeStoreAddress } from "../lib/location.js";
import { logSnagEvent, logSnagIdentify } from "../lib/logsnag.js";
import {
  resolveStoreDeliveryConfig,
  resolveStoreTaxonomy,
} from "../lib/store-taxonomy.js";
import { parseBody, passwordSchema, settingsSchema, uploadImageSchema, validationError } from "../lib/validation.js";
import { sanitizeUser } from "./auth.js";

const router = Router();
router.use(authMiddleware);

router.put("/", async (req: AuthRequest, res) => {
  try {
    const body = parseBody(settingsSchema, req.body);
    const [currentUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    if (!currentUser) {
      res.status(404).json({ error: "Usuario nao encontrado" });
      return;
    }

    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    const nextTaxonomy = body.store_type !== undefined
      ? resolveStoreTaxonomy(body.store_type)
      : {
          storeType: currentUser.store_type ?? undefined,
          storeMode: currentUser.store_mode ?? undefined,
          canonicalNiche: currentUser.canonical_niche ?? undefined,
        };

    const nextDelivery = resolveStoreDeliveryConfig({
      store_type: nextTaxonomy.storeType,
      store_mode: nextTaxonomy.storeMode,
      canonical_niche: nextTaxonomy.canonicalNiche,
      delivery_fee_type: body.delivery_fee_type !== undefined
        ? body.delivery_fee_type
        : currentUser.delivery_fee_type,
      delivery_fee_amount: body.delivery_fee_amount !== undefined
        ? body.delivery_fee_amount
        : currentUser.delivery_fee_amount,
    });

    if (body.store_name !== undefined) updateData.store_name = body.store_name;
    if (body.owner_name !== undefined) updateData.owner_name = body.owner_name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.whatsapp !== undefined) updateData.whatsapp = body.whatsapp;
    if (body.store_type !== undefined) {
      updateData.store_type = nextTaxonomy.storeType;
      updateData.store_mode = nextTaxonomy.storeMode;
      updateData.canonical_niche = nextTaxonomy.canonicalNiche;
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.state !== undefined) updateData.state = body.state;
    if (body.store_cep !== undefined) updateData.store_cep = body.store_cep;
    if (body.store_address !== undefined) updateData.store_address = body.store_address;
    if (body.store_address_number !== undefined) updateData.store_address_number = body.store_address_number;
    if (body.store_neighborhood !== undefined) updateData.store_neighborhood = body.store_neighborhood;
    if (body.store_latitude !== undefined) updateData.store_latitude = body.store_latitude;
    if (body.store_longitude !== undefined) updateData.store_longitude = body.store_longitude;
    if (body.cover_url !== undefined) updateData.cover_url = body.cover_url;
    if (body.theme_primary !== undefined) updateData.theme_primary = body.theme_primary;
    if (body.theme_secondary !== undefined) updateData.theme_secondary = body.theme_secondary;
    if (body.theme_accent !== undefined) updateData.theme_accent = body.theme_accent;
    if (body.is_open !== undefined) updateData.is_open = body.is_open;
    if (body.store_hours !== undefined) updateData.store_hours = body.store_hours;
    if (
      body.delivery_fee_type !== undefined ||
      body.delivery_fee_amount !== undefined ||
      body.store_type !== undefined
    ) {
      updateData.delivery_fee_type = nextDelivery.deliveryFeeType;
      updateData.delivery_fee_amount = String(nextDelivery.deliveryFeeAmount);
    }

    const [updated] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, req.userId!))
      .returning();

    void logSnagIdentify({
      userId: updated.id,
      properties: {
        store_name: updated.store_name ?? "",
        store_slug: updated.store_slug ?? "",
        store_type: updated.store_type ?? "celulares",
        city: updated.city ?? "",
        email: updated.email ?? "",
      },
    }).catch(() => undefined);

    const locationFieldsChanged = [
      "city",
      "state",
      "store_cep",
      "store_address",
      "store_address_number",
      "store_neighborhood",
    ].some((field) => Object.prototype.hasOwnProperty.call(body, field));

    if (locationFieldsChanged) {
      const hasLocationData = Boolean(
        updated.store_cep ||
        updated.store_address ||
        updated.store_address_number ||
        updated.store_neighborhood ||
        updated.city ||
        updated.state,
      );

      if (!hasLocationData) {
        const [withoutCoords] = await db
          .update(usersTable)
          .set({
            store_latitude: "",
            store_longitude: "",
          })
          .where(eq(usersTable.id, req.userId!))
          .returning();

        res.json({ user: sanitizeUser(withoutCoords || updated), geocoded: false });
        return;
      }

      const geocoded = await geocodeStoreAddress({
        storeName: updated.store_name,
        address: updated.store_address,
        number: updated.store_address_number,
        neighborhood: updated.store_neighborhood,
        city: updated.city,
        state: updated.state,
        cep: updated.store_cep,
      });

      if (geocoded) {
        const [withCoords] = await db
          .update(usersTable)
          .set({
            store_latitude: geocoded.latitude,
            store_longitude: geocoded.longitude,
          })
          .where(eq(usersTable.id, req.userId!))
          .returning();
        res.json({ user: sanitizeUser(withCoords || updated), geocoded: true });
        return;
      }

      const [withoutCoords] = await db
        .update(usersTable)
        .set({
          store_latitude: "",
          store_longitude: "",
        })
        .where(eq(usersTable.id, req.userId!))
        .returning();

      res.json({ user: sanitizeUser(withoutCoords || updated), geocoded: false });
      return;
    }

    res.json({ user: sanitizeUser(updated), geocoded: false });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "UpdateSettings error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/password", async (req: AuthRequest, res) => {
  try {
    const { current_password, new_password } = parseBody(passwordSchema, req.body);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user) {
      res.status(404).json({ error: "Usuario nao encontrado" });
      return;
    }

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) {
      res.status(400).json({ error: "Senha atual incorreta" });
      return;
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await db.update(usersTable).set({ password_hash }).where(eq(usersTable.id, req.userId!));

    void sendPasswordChangedEmail({
      to: user.email,
      storeName: user.store_name,
    }).catch(() => undefined);

    res.json({ success: true });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "UpdatePassword error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/onboarding/complete", async (req: AuthRequest, res) => {
  try {
    const [updated] = await db
      .update(usersTable)
      .set({ onboarding_completed_at: new Date() })
      .where(eq(usersTable.id, req.userId!))
      .returning();

    void logSnagEvent({
      channel: "stores",
      event: "onboarding_completed",
      description: `Onboarding concluido para ${updated.store_name}`,
      icon: "✅",
      notify: false,
      userId: updated.id,
      tags: {
        store_type: updated.store_type ?? "celulares",
        city: updated.city ?? "desconhecida",
      },
    }).catch(() => undefined);

    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    req.log.error({ err }, "CompleteOnboarding error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/mercadopago/disconnect", async (req: AuthRequest, res) => {
  try {
    const [updated] = await db
      .update(usersTable)
      .set({
        mp_access_token: null,
        mp_refresh_token: null,
        mp_user_id: null,
        mp_connected_at: null,
        mp_access_token_expires_at: null,
        mp_refresh_token_expires_at: null,
      })
      .where(eq(usersTable.id, req.userId!))
      .returning();

    void logSnagEvent({
      channel: "integrations",
      event: "mercadopago_disconnected",
      description: `Mercado Pago desconectado em ${updated.store_name}`,
      icon: "🔌",
      notify: false,
      userId: updated.id,
      tags: {
        store_type: updated.store_type ?? "celulares",
        city: updated.city ?? "desconhecida",
      },
    }).catch(() => undefined);

    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    req.log.error({ err }, "DisconnectMercadoPago error");
    res.status(500).json({ error: "Nao foi possivel desconectar Mercado Pago" });
  }
});

router.post("/logo", async (req: AuthRequest, res) => {
  try {
    const parsed = parseBody(uploadImageSchema, {
      image: req.body?.image_base64 || req.body?.image,
      mimeType: req.body?.mime_type || req.body?.mimeType,
    });
    const url = await uploadImageToCloudinary(parsed.image, parsed.mimeType, `mostrara/logos/${req.userId}`);

    if (!url) {
      res.status(400).json({ error: "Erro ao fazer upload da logomarca." });
      return;
    }

    await db.update(usersTable).set({ logo_url: url }).where(eq(usersTable.id, req.userId!));
    res.json({ logo_url: url });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "UploadLogo error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/cover", async (req: AuthRequest, res) => {
  try {
    const parsed = parseBody(uploadImageSchema, {
      image: req.body?.image_base64 || req.body?.image,
      mimeType: req.body?.mime_type || req.body?.mimeType,
    });
    const url = await uploadImageToCloudinary(parsed.image, parsed.mimeType, `mostrara/covers/${req.userId}`);

    if (!url) {
      res.status(400).json({ error: "Erro ao fazer upload da capa." });
      return;
    }

    await db.update(usersTable).set({ cover_url: url }).where(eq(usersTable.id, req.userId!));
    res.json({ cover_url: url });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "UploadCover error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});


router.delete("/delete-account", async (req: AuthRequest, res) => {
  try {
    // Cascade delete all user data
    await db.delete(ordersTable).where(eq(ordersTable.user_id, req.userId!));
    await db.delete(salesTable).where(eq(salesTable.user_id, req.userId!));
    await db.delete(couponsTable).where(eq(couponsTable.user_id, req.userId!));
    await db.delete(productsTable).where(eq(productsTable.user_id, req.userId!));
    await db.delete(usersTable).where(eq(usersTable.id, req.userId!));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "DeleteAccount error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
