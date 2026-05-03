import { Router } from "express";
import { db, usersTable, productsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

function parsePhotos(photosStr: string | null): string[] {
  try {
    return JSON.parse(photosStr || "[]");
  } catch {
    return [];
  }
}

router.get("/:storeSlug", async (req, res) => {
  const { storeSlug } = req.params;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.store_slug, storeSlug));

    if (!user) {
      res.status(404).json({ error: "Loja não encontrada" });
      return;
    }

    const products = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.user_id, user.id), eq(productsTable.status, "disponivel")))
      .orderBy(desc(productsTable.created_at));

    res.json({
      store: {
        store_name: user.store_name,
        owner_name: user.owner_name,
        description: user.description,
        city: user.city,
        whatsapp: user.whatsapp,
        logo_url: user.logo_url,
        store_slug: user.store_slug,
      },
      products: products.map((p) => ({
        ...p,
        photos: parsePhotos(p.photos),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "GetStore error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
