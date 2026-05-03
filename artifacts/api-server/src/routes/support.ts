import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, supportTicketsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";
import { parseBody, supportTicketSchema, validationError } from "../lib/validation.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const tickets = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.user_id, req.userId!))
      .orderBy(desc(supportTicketsTable.created_at));
    res.json({ tickets });
  } catch (err) {
    req.log.error({ err }, "ListSupportTickets error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const body = parseBody(supportTicketSchema, req.body);
    const [ticket] = await db
      .insert(supportTicketsTable)
      .values({
        id: uuidv4(),
        user_id: req.userId!,
        type: body.type,
        title: body.title,
        message: body.message,
        status: "aberto",
      })
      .returning();
    res.status(201).json({ ticket });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "CreateSupportTicket error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    await db
      .delete(supportTicketsTable)
      .where(and(eq(supportTicketsTable.id, String(req.params.id)), eq(supportTicketsTable.user_id, req.userId!)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "DeleteSupportTicket error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
