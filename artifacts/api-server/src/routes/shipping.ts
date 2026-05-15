import { Router, type IRouter } from "express";
import { melhorenvioService } from "../lib/melhorenvio.js";
import { db, usersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { resolveStoreTaxonomyFromProfile } from "../lib/store-taxonomy.js";

const router: IRouter = Router();

router.post("/calculate", async (req, res) => {
  try {
    const { storeSlug, cep, products, street, number, city, state } = req.body ?? {};

    if (!storeSlug || !cep || !Array.isArray(products) || products.length === 0) {
      res.status(400).json({ error: "Dados incompletos para calculo de frete" });
      return;
    }

    const [store] = await db
      .select({
        store_cep: usersTable.store_cep,
        store_address: usersTable.store_address,
        store_address_number: usersTable.store_address_number,
        city: usersTable.city,
        state: usersTable.state,
        store_type: usersTable.store_type,
        store_mode: usersTable.store_mode,
        active: usersTable.active,
      })
      .from(usersTable)
      .where(and(eq(usersTable.store_slug, String(storeSlug)), eq(usersTable.active, true)))
      .limit(1);

    if (!store) {
      res.status(404).json({ error: "Loja nao encontrada" });
      return;
    }

    const taxonomy = resolveStoreTaxonomyFromProfile(store);

    if (taxonomy.storeMode !== "retail") {
      res.status(400).json({ error: "Esse nicho nao usa frete por transportadora" });
      return;
    }

    const originCep = String(store.store_cep || "").replace(/\D/g, "");
    const destinationCep = String(cep).replace(/\D/g, "");

    if (originCep.length !== 8) {
      res.status(400).json({ error: "Loja nao configurada para calculo de frete" });
      return;
    }

    if (destinationCep.length !== 8) {
      res.status(400).json({ error: "CEP invalido para calculo de frete" });
      return;
    }

    const rates = await melhorenvioService.calculate({
      from: {
        postalCode: originCep,
        address: String(store.store_address || ""),
        number: String(store.store_address_number || ""),
        city: String(store.city || ""),
        state: String(store.state || ""),
      },
      to: {
        postalCode: destinationCep,
        address: String(street || ""),
        number: String(number || ""),
        city: String(city || ""),
        state: String(state || ""),
      },
      products: products.map((product: any) => ({
        id: product.id,
        width: Number(product.width) > 0 ? Number(product.width) : 11,
        height: Number(product.height) > 0 ? Number(product.height) : 2,
        length: Number(product.length) > 0 ? Number(product.length) : 16,
        weight: Number(product.weight) > 0 ? Number(product.weight) : 0.3,
        insurance_value: Number(product.price) > 0 ? Number(product.price) : 0,
        quantity: Number(product.quantity) > 0 ? Number(product.quantity) : 1,
      })),
    });

    res.json(rates);
  } catch (error: unknown) {
    console.error("Erro ao calcular frete:", error);
    const message = error instanceof Error ? error.message : "Erro ao calcular frete";
    const status = /dados incompletos|nao configurada|invalido/i.test(message) ? 400 : 422;
    res.status(status).json({ error: message });
  }
});

export default router;
