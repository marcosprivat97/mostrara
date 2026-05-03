import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, aiLogsTable, productsTable, salesTable, ordersTable, usersTable } from "@workspace/db";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";
import { isPremium } from "../lib/plan.js";
import { env } from "../lib/env.js";
import { aiChatSchema, parseBody, validationError } from "../lib/validation.js";

const router = Router();
router.use(authMiddleware);

const DAILY_LIMIT = env.ai.dailyLimit;

async function groqChat(prompt: string) {
  const apiKey = env.ai.apiKey;
  if (!apiKey) {
    return "IA ainda nao configurada. Adicione GROQ_API_KEY nas variaveis da Vercel para ativar respostas inteligentes.";
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.ai.model,
      temperature: 0.3,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content: "Voce e a IA do Mostrara para pequenos lojistas. Responda em portugues do Brasil, direto, pratico, com foco em vendas, estoque, atendimento e catalogo. Nao invente dados alem do contexto informado.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Erro na IA");
  }
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || "Nao consegui gerar uma resposta agora.";
}

router.post("/chat", async (req: AuthRequest, res) => {
  try {
    // Gate: only premium users can use AI
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user || !isPremium(user)) {
      res.status(403).json({
        error: "A IA Mostrara e exclusiva do plano Premium. Assine para desbloquear.",
        upgrade_required: true,
      });
      return;
    }

    const body = parseBody(aiChatSchema, req.body);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [used] = await db
      .select({ count: count() })
      .from(aiLogsTable)
      .where(and(eq(aiLogsTable.user_id, req.userId!), gte(aiLogsTable.created_at, since)));

    if (Number(used.count) >= DAILY_LIMIT) {
      res.status(429).json({ error: "Limite diario da IA atingido. Tente novamente amanha." });
      return;
    }

    const [productsCount] = await db.select({ count: count() }).from(productsTable).where(eq(productsTable.user_id, req.userId!));
    const [salesCount] = await db.select({ count: count() }).from(salesTable).where(eq(salesTable.user_id, req.userId!));
    const [pendingOrders] = await db.select({ count: count() }).from(ordersTable).where(and(eq(ordersTable.user_id, req.userId!), eq(ordersTable.status, "pendente")));
    const lowStock = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.user_id, req.userId!), eq(productsTable.unlimited_stock, false)))
      .orderBy(desc(productsTable.updated_at))
      .limit(20);

    const context = [
      `Area: ${body.area}`,
      `Produtos cadastrados: ${Number(productsCount.count)}`,
      `Vendas registradas: ${Number(salesCount.count)}`,
      `Pedidos pendentes WhatsApp: ${Number(pendingOrders.count)}`,
      `Produtos com estoque controlado: ${lowStock.map((p) => `${p.name} (${p.stock ?? 0})`).join(", ") || "nenhum"}`,
      `Pedido do lojista: ${body.message}`,
    ].join("\n");

    const answer = await groqChat(context);
    await db.insert(aiLogsTable).values({
      id: uuidv4(),
      user_id: req.userId!,
      area: body.area,
      prompt: body.message,
      response: answer,
    });

    res.json({ answer, remaining: Math.max(DAILY_LIMIT - Number(used.count) - 1, 0) });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "AiChat error");
    res.status(500).json({ error: "Erro ao falar com a IA" });
  }
});

export default router;
