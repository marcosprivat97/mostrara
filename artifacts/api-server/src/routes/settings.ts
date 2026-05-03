import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";
import { uploadImageToCloudinary } from "../lib/cloudinary.js";

const router = Router();
router.use(authMiddleware);

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    store_name: user.store_name,
    owner_name: user.owner_name,
    email: user.email,
    phone: user.phone,
    whatsapp: user.whatsapp,
    store_slug: user.store_slug,
    description: user.description,
    city: user.city,
    logo_url: user.logo_url,
    created_at: user.created_at,
  };
}

router.put("/", async (req: AuthRequest, res) => {
  const { store_name, owner_name, phone, whatsapp, description, city } = req.body;

  try {
    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    if (store_name !== undefined) updateData.store_name = store_name;
    if (owner_name !== undefined) updateData.owner_name = owner_name;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (description !== undefined) updateData.description = description;
    if (city !== undefined) updateData.city = city;

    const [updated] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, req.userId!))
      .returning();

    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    req.log.error({ err }, "UpdateSettings error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/password", async (req: AuthRequest, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
    return;
  }

  if (new_password.length < 6) {
    res.status(400).json({ error: "Nova senha deve ter pelo menos 6 caracteres" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) {
      res.status(400).json({ error: "Senha atual incorreta" });
      return;
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await db.update(usersTable).set({ password_hash }).where(eq(usersTable.id, req.userId!));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "UpdatePassword error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/logo", async (req: AuthRequest, res) => {
  const { image_base64, mime_type, image, mimeType: mimeTypeAlt } = req.body;
  const imageData = image_base64 || image;

  if (!imageData) {
    res.status(400).json({ error: "Imagem é obrigatória" });
    return;
  }

  try {
    const mimeType = mime_type || mimeTypeAlt || "image/jpeg";
    const url = await uploadImageToCloudinary(imageData, mimeType, `vitrinepro/logos/${req.userId}`);

    if (!url) {
      res.status(400).json({ error: "Erro ao fazer upload da logomarca no Cloudinary." });
      return;
    }

    await db.update(usersTable).set({ logo_url: url }).where(eq(usersTable.id, req.userId!));
    res.json({ logo_url: url });
  } catch (err) {
    req.log.error({ err }, "UploadLogo error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/delete-account", async (req: AuthRequest, res) => {
  try {
    await db.delete(productsTable).where(eq(productsTable.user_id, req.userId!));
    await db.delete(usersTable).where(eq(usersTable.id, req.userId!));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "DeleteAccount error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
