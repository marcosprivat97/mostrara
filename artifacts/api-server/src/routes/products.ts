import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, productsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "../lib/cloudinary.js";

const router = Router();
router.use(authMiddleware);

function parsePhotos(photosStr: string | null): string[] {
  try {
    return JSON.parse(photosStr || "[]");
  } catch {
    return [];
  }
}

function formatProduct(p: typeof productsTable.$inferSelect) {
  return {
    ...p,
    photos: parsePhotos(p.photos),
  };
}

async function processPhotos(
  photos: string[],
  userId: string
): Promise<string[]> {
  const results: string[] = [];
  for (const photo of photos) {
    if (photo.startsWith("data:")) {
      const mimeMatch = photo.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const url = await uploadImageToCloudinary(photo, mimeType, `vitrinepro/products/${userId}`);
      if (url) results.push(url);
      else results.push(photo);
    } else {
      results.push(photo);
    }
  }
  return results;
}

router.get("/", async (req: AuthRequest, res) => {
  try {
    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.user_id, req.userId!))
      .orderBy(desc(productsTable.created_at));

    res.json({ products: products.map(formatProduct) });
  } catch (err) {
    req.log.error({ err }, "GetProducts error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  const { name, category, storage, price, condition, battery, warranty, status, description, photos } = req.body;

  if (!name || price === undefined || price === null) {
    res.status(400).json({ error: "Nome e preço são obrigatórios" });
    return;
  }

  try {
    const processedPhotos = photos && Array.isArray(photos)
      ? await processPhotos(photos, req.userId!)
      : [];

    const id = uuidv4();
    const [product] = await db.insert(productsTable).values({
      id,
      user_id: req.userId!,
      name,
      category: category || "iPhone",
      storage: storage || "",
      price: Number(price),
      condition: condition || "Vitrine",
      battery: battery || "",
      warranty: warranty || "",
      status: status || "disponivel",
      description: description || "",
      photos: JSON.stringify(processedPhotos),
    }).returning();

    res.status(201).json({ product: formatProduct(product) });
  } catch (err) {
    req.log.error({ err }, "CreateProduct error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const productId = String(req.params.id);
    const [product] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.user_id, req.userId!)));

    if (!product) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }

    res.json({ product: formatProduct(product) });
  } catch (err) {
    req.log.error({ err }, "GetProduct error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  const { name, category, storage, price, condition, battery, warranty, status, description, photos } = req.body;

  try {
    const productId = String(req.params.id);
    const [existing] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.user_id, req.userId!)));

    if (!existing) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }

    let finalPhotos = parsePhotos(existing.photos);

    if (photos !== undefined && Array.isArray(photos)) {
      const oldPhotos = parsePhotos(existing.photos);
      const newRaw = await processPhotos(photos, req.userId!);
      finalPhotos = newRaw;
      for (const old of oldPhotos) {
        if (!finalPhotos.includes(old) && old.includes("cloudinary.com")) {
          await deleteImageFromCloudinary(old);
        }
      }
    }

    const updateData: Partial<typeof productsTable.$inferInsert> = {
      updated_at: new Date(),
      photos: JSON.stringify(finalPhotos),
    };

    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (storage !== undefined) updateData.storage = storage;
    if (price !== undefined) updateData.price = Number(price);
    if (condition !== undefined) updateData.condition = condition;
    if (battery !== undefined) updateData.battery = battery;
    if (warranty !== undefined) updateData.warranty = warranty;
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;

    const [updated] = await db
      .update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, productId))
      .returning();

    res.json({ product: formatProduct(updated) });
  } catch (err) {
    req.log.error({ err }, "UpdateProduct error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/upload-photo", async (req: AuthRequest, res) => {
  const { image, mimeType } = req.body;

  if (!image) {
    res.status(400).json({ error: "Imagem é obrigatória" });
    return;
  }

  try {
    const url = await uploadImageToCloudinary(image, mimeType || "image/jpeg", `vitrinepro/products/${req.userId}`);
    if (!url) {
      res.status(400).json({ error: "Erro ao fazer upload da foto no Cloudinary." });
      return;
    }
    res.json({ url });
  } catch (err) {
    req.log.error({ err }, "UploadPhoto error");
    res.status(500).json({ error: "Erro ao fazer upload da foto" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const productId = String(req.params.id);
    const [existing] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.user_id, req.userId!)));

    if (!existing) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }

    const photos = parsePhotos(existing.photos);
    for (const photo of photos) {
      if (photo.includes("cloudinary.com")) {
        await deleteImageFromCloudinary(photo);
      }
    }

    await db.delete(productsTable).where(eq(productsTable.id, productId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "DeleteProduct error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
