import { Router, type IRouter } from "express";
import { melhorenvioService } from "../lib/melhorenvio.js";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Calcular frete para o checkout
router.post("/calculate", async (req, res) => {
  try {
    const { storeSlug, cep, products } = req.body;

    if (!storeSlug || !cep || !products || !Array.isArray(products)) {
      return res.status(400).json({ error: "Dados incompletos para calculo de frete" });
    }

    // 1. Buscar o CEP de origem (da loja)
    const store = await db.query.usersTable.findFirst({
      where: eq(usersTable.slug, storeSlug),
      columns: {
        zip_code: true,
        delivery_enabled: true,
      }
    });

    if (!store || !store.zip_code) {
      return res.status(404).json({ error: "Loja nao configurada para entregas" });
    }

    // 2. Chamar o servico do Melhor Envio
    const rates = await melhorenvioService.calculate({
      from: store.zip_code,
      to: cep,
      products: products.map((p: any) => ({
        id: p.id,
        width: p.width || 11,
        height: p.height || 2,
        length: p.length || 16,
        weight: p.weight || 0.3,
        insurance_value: p.price || 0,
        quantity: p.quantity || 1
      }))
    });

    res.json(rates);
  } catch (error: any) {
    console.error("Erro ao calcular frete:", error);
    res.status(500).json({ error: error.message || "Erro ao calcular frete" });
  }
});

export default router;
