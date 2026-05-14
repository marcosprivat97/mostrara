import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { evolutionService } from "../lib/evolution";
import { logger } from "../lib/logger";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

// Get WhatsApp connection status and QR code.
// This endpoint never returns 500 so the frontend can handle all states gracefully.
router.get("/status", async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const instanceName = `mostrara_store_${user.id}`;
    const result = await evolutionService.ensureInstanceAndGetQr(instanceName);

    if (result.status === "connected") {
      res.json({ status: "connected" });
      return;
    }

    if (result.status === "processing") {
      res.json({ status: "processing", message: "Configurando instancia..." });
      return;
    }

    if (result.status === "qrcode") {
      res.json({
        status: "qrcode",
        qr: result.qr || null,
        pairingCode: result.pairingCode || null,
      });
      return;
    }

    res.json({
      status: "error",
      error: "Falha ao conectar com o servidor WhatsApp",
    });
  } catch (error: any) {
    logger.error("WhatsApp Status unexpected error:", error?.message || error);
    res.json({
      status: "error",
      error: "Servidor WhatsApp temporariamente indisponivel",
    });
  }
});

// Logout WhatsApp instance.
router.post("/logout", async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const instanceName = `mostrara_store_${user.id}`;

    try {
      await evolutionService.logoutInstance(instanceName);
    } catch {
      // Ignore logout errors because the instance might not be connected.
    }

    try {
      await evolutionService.deleteInstance(instanceName);
    } catch {
      // Ignore delete errors.
    }

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    logger.error("WhatsApp Logout Error:", error?.message || error);
    res.status(500).json({ error: "Failed to logout WhatsApp" });
  }
});

export default router;
