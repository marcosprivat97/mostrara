import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, salesTable, productsTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res: Response) => {
  const { month, year } = req.query;

  try {
    const conditions: ReturnType<typeof eq>[] = [eq(salesTable.user_id, req.userId!)];

    if (month && year) {
      const m = String(month).padStart(2, "0");
      const y = String(year);
      const start = `${y}-${m}-01`;
      const lastDay = new Date(Number(y), Number(month), 0).getDate();
      const end = `${y}-${m}-${lastDay}`;
      conditions.push(gte(salesTable.sale_date, start) as ReturnType<typeof eq>);
      conditions.push(lte(salesTable.sale_date, end) as ReturnType<typeof eq>);
    }

    const sales = await db
      .select()
      .from(salesTable)
      .where(and(...conditions))
      .orderBy(desc(salesTable.sale_date), desc(salesTable.created_at));

    res.json({ sales });
  } catch (err) {
    (req as AuthRequest).log.error({ err }, "GetSales error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

async function monthlySummaryHandler(req: AuthRequest, res: Response) {
  try {
    const all = await db
      .select()
      .from(salesTable)
      .where(eq(salesTable.user_id, req.userId!))
      .orderBy(desc(salesTable.sale_date));

    const byMonth: Record<string, { month: string; year: string; label: string; total: number; count: number }> = {};

    for (const s of all) {
      const [y, m] = s.sale_date.split("-");
      const key = `${y}-${m}`;
      if (!byMonth[key]) {
        const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
        byMonth[key] = {
          month: m,
          year: y,
          label: `${monthNames[Number(m) - 1]} ${y}`,
          total: 0,
          count: 0,
        };
      }
      byMonth[key].total += s.amount_paid;
      byMonth[key].count += 1;
    }

    const months = Object.entries(byMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, v]) => v);

    const now = new Date();
    const curY = String(now.getFullYear());
    const curM = String(now.getMonth() + 1).padStart(2, "0");
    const curKey = `${curY}-${curM}`;
    const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const current_month = byMonth[curKey] || {
      month: curM,
      year: curY,
      label: `${monthNames[now.getMonth()]} ${curY}`,
      total: 0,
      count: 0,
    };

    res.json({ months, current_month });
  } catch (err) {
    req.log.error({ err }, "GetMonthlySummary error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

router.get("/monthly-summary", (req: AuthRequest, res: Response) => monthlySummaryHandler(req, res));
router.get("/summary", (req: AuthRequest, res: Response) => monthlySummaryHandler(req, res));

router.post("/", async (req: AuthRequest, res: Response) => {
  const {
    product_id,
    product_name,
    customer_name,
    customer_whatsapp,
    sale_date,
    product_price,
    amount_paid,
    payment_method,
    notes,
    mark_as_sold,
  } = req.body;

  if (!product_name || !customer_name || !sale_date || product_price == null || amount_paid == null) {
    res.status(400).json({ error: "Campos obrigatórios faltando" });
    return;
  }

  try {
    const id = uuidv4();
    const [sale] = await db
      .insert(salesTable)
      .values({
        id,
        user_id: req.userId!,
        product_id: product_id || null,
        product_name,
        customer_name,
        customer_whatsapp: customer_whatsapp || "",
        sale_date,
        product_price: Number(product_price),
        amount_paid: Number(amount_paid),
        payment_method: payment_method || "pix",
        notes: notes || "",
      })
      .returning();

    if (product_id && mark_as_sold) {
      await db
        .update(productsTable)
        .set({ status: "vendido" })
        .where(and(eq(productsTable.id, product_id), eq(productsTable.user_id, req.userId!)));
    }

    res.status(201).json({ sale });
  } catch (err) {
    req.log.error({ err }, "CreateSale error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const saleId = String(req.params.id);
  try {
    await db
      .delete(salesTable)
      .where(and(eq(salesTable.id, saleId), eq(salesTable.user_id, req.userId!)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "DeleteSale error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
