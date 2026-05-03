import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db, productsTable, usersTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "../lib/cloudinary.js";
import { removeBgService } from "../lib/removebg.js";
import { getProductLimit, isPremium } from "../lib/plan.js";
import { parseBody, productSchema, productUpdateSchema, uploadImageSchema, validationError } from "../lib/validation.js";

const router = Router();
router.use(authMiddleware);

function parsePhotos(photosStr: string | null): string[] {
  try {
    const parsed = JSON.parse(photosStr || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseOptions(optionsStr: string | null): { name: string; price: number }[] {
  try {
    const parsed = JSON.parse(optionsStr || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        name: typeof item?.name === "string" ? item.name.trim() : "",
        price: Number(item?.price || 0),
      }))
      .filter((item) => item.name && Number.isFinite(item.price) && item.price >= 0);
  } catch {
    return [];
  }
}

function formatProduct(p: typeof productsTable.$inferSelect) {
  return {
    ...p,
    photos: parsePhotos(p.photos),
    options: parseOptions(p.options),
  };
}

async function processPhotos(
  photos: string[],
  userId: string,
): Promise<string[]> {
  const results: string[] = [];
  for (const photo of photos.slice(0, 5)) {
    if (photo.startsWith("data:")) {
      const mimeMatch = photo.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const url = await uploadImageToCloudinary(photo, mimeType, `mostrara/products/${userId}`);
      if (url) results.push(url);
    } else if (photo.startsWith("https://")) {
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
  try {
    // Enforce product limit for free plan
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (user) {
      const limit = getProductLimit(user);
      if (limit !== Infinity) {
        const [{ count: currentCount }] = await db.select({ count: count() }).from(productsTable).where(eq(productsTable.user_id, req.userId!));
        if (Number(currentCount) >= limit) {
          res.status(403).json({
            error: `Voce atingiu o limite de ${limit} produtos do plano Free. Assine o Premium para cadastrar produtos ilimitados.`,
            upgrade_required: true,
            current_count: Number(currentCount),
            max_count: limit,
          });
          return;
        }
      }
    }

    const body = parseBody(productSchema, req.body);
    const processedPhotos = await processPhotos(body.photos, req.userId!);

    const id = uuidv4();
    const [product] = await db.insert(productsTable).values({
      id,
      user_id: req.userId!,
      name: body.name,
      category: body.category,
      storage: body.storage,
      price: body.price,
      condition: body.condition,
      battery: body.battery,
      warranty: body.warranty,
      stock: body.stock,
      unlimited_stock: body.unlimited_stock,
      status: body.status,
      description: body.description,
      options: JSON.stringify(body.options),
      photos: JSON.stringify(processedPhotos),
      width: String(body.width),
      height: String(body.height),
      length: String(body.length),
      weight: String(body.weight),
    }).returning();

    res.status(201).json({ product: formatProduct(product) });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
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
      res.status(404).json({ error: "Produto nao encontrado" });
      return;
    }

    res.json({ product: formatProduct(product) });
  } catch (err) {
    req.log.error({ err }, "GetProduct error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const body = parseBody(productUpdateSchema, req.body);
    const productId = String(req.params.id);
    const [existing] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.user_id, req.userId!)));

    if (!existing) {
      res.status(404).json({ error: "Produto nao encontrado" });
      return;
    }

    let finalPhotos = parsePhotos(existing.photos);

    if (body.photos !== undefined) {
      const oldPhotos = parsePhotos(existing.photos);
      finalPhotos = await processPhotos(body.photos, req.userId!);
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

    if (body.name !== undefined) updateData.name = body.name;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.storage !== undefined) updateData.storage = body.storage;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.condition !== undefined) updateData.condition = body.condition;
    if (body.battery !== undefined) updateData.battery = body.battery;
    if (body.warranty !== undefined) updateData.warranty = body.warranty;
    if (body.stock !== undefined) updateData.stock = body.stock;
    if (body.unlimited_stock !== undefined) updateData.unlimited_stock = body.unlimited_stock;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.options !== undefined) updateData.options = JSON.stringify(body.options);
    if (body.width !== undefined) updateData.width = String(body.width);
    if (body.height !== undefined) updateData.height = String(body.height);
    if (body.length !== undefined) updateData.length = String(body.length);
    if (body.weight !== undefined) updateData.weight = String(body.weight);

    const [updated] = await db
      .update(productsTable)
      .set(updateData)
      .where(and(eq(productsTable.id, productId), eq(productsTable.user_id, req.userId!)))
      .returning();

    res.json({ product: formatProduct(updated) });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "UpdateProduct error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/upload-photo", async (req: AuthRequest, res) => {
  try {
    const { image, mimeType } = parseBody(uploadImageSchema, req.body);
    const url = await uploadImageToCloudinary(image, mimeType, `mostrara/products/${req.userId}`);
    if (!url) {
      res.status(400).json({ error: "Erro ao fazer upload da foto." });
      return;
    }
    res.json({ url });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "UploadPhoto error");
    res.status(500).json({ error: "Erro ao fazer upload da foto" });
  }
});

router.post("/remove-bg", async (req: AuthRequest, res) => {
  try {
    const { image } = parseBody(z.object({ image: z.string().min(100).max(10_000_000) }), req.body);
    
    // Check if it's a URL or base64
    let base64ToProcess = image;
    if (image.startsWith("http")) {
      const imgRes = await fetch(image);
      const buffer = await imgRes.arrayBuffer();
      const mime = imgRes.headers.get("content-type") || "image/jpeg";
      base64ToProcess = `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;
    }

    const cleanImage = await removeBgService.removeBackground(base64ToProcess);
    
    // Upload the clean version to Cloudinary
    const url = await uploadImageToCloudinary(cleanImage, "image/png", `mostrara/products/${req.userId}/clean`);
    
    if (!url) {
      res.status(400).json({ error: "Erro ao salvar imagem processada." });
      return;
    }

    res.json({ url });
  } catch (err: any) {
    req.log.error({ err }, "RemoveBg error");
    res.status(500).json({ error: err.message || "Erro ao remover fundo" });
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
      res.status(404).json({ error: "Produto nao encontrado" });
      return;
    }

    const photos = parsePhotos(existing.photos);
    for (const photo of photos) {
      if (photo.includes("cloudinary.com")) {
        await deleteImageFromCloudinary(photo);
      }
    }

    await db.delete(productsTable).where(and(eq(productsTable.id, productId), eq(productsTable.user_id, req.userId!)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "DeleteProduct error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
