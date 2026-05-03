import { Router } from "express";
import { evolutionService } from "../lib/evolution";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();
router.use(authMiddleware);

// Get WhatsApp Connection Status and QR Code
// This endpoint NEVER returns 500 — it always returns a clean JSON response
// so the frontend can handle all states gracefully.
router.get("/status", async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const instanceName = `mostrara_store_${user.id}`;

    // ensureInstanceAndGetQr handles ALL Evolution API edge cases internally
    // and never throws — it always returns a structured result.
    const result = await evolutionService.ensureInstanceAndGetQr(instanceName);

    if (result.status === "connected") {
      return res.json({ status: "connected" });
    }

    if (result.status === "processing") {
      return res.json({ status: "processing", message: "Configurando instância..." });
    }

    if (result.status === "qrcode") {
      return res.json({ status: "qrcode", qr: result.qr || null, pairingCode: result.pairingCode || null });
    }

    // Error state — return as a normal JSON response, NOT a 500
    return res.json({ status: "error", error: "Falha ao conectar com o servidor WhatsApp" });
  } catch (error: any) {
    // This catch is a safety net. Even unexpected errors return clean JSON.
    logger.error("WhatsApp Status unexpected error:", error?.message || error);
    return res.json({
      status: "error",
      error: "Servidor WhatsApp temporariamente indisponível",
    });
  }
});

// Logout WhatsApp Instance
router.post("/logout", async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const instanceName = `mostrara_store_${user.id}`;

    // Try to logout first, then delete the instance entirely for a clean slate
    try {
      await evolutionService.logoutInstance(instanceName);
    } catch {
      // Ignore logout errors — instance might not be connected
    }
    try {
      await evolutionService.deleteInstance(instanceName);
    } catch {
      // Ignore delete errors
    }

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    logger.error("WhatsApp Logout Error:", error?.message || error);
    res.status(500).json({ error: "Failed to logout WhatsApp" });
  }
});

export default router;
