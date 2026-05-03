import { env } from "./env";
import { logger } from "./logger";

const BASE_URL = env.evolution.apiUrl;
const API_KEY = env.evolution.apiKey;

// Global map to track instances currently undergoing a heavy "ensure" operation
// to prevent multiple concurrent requests from flooding the Evolution API.
const processingInstances = new Map<string, { startTime: number }>();
const MAX_PROCESSING_TIME = 25_000; // 25 seconds safety limit

/**
 * Fetch wrapper with timeout for Evolution API.
 * The connect endpoint in particular can hang forever if the instance is stuck.
 */
async function evolutionFetch(
  path: string,
  options: RequestInit = {},
  timeoutMs = 45_000,
): Promise<any> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        apikey: API_KEY,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err: any = new Error(
        `Evolution API ${res.status}: ${JSON.stringify(data)}`,
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error: any) {
    if (error.name === "AbortError") {
      const err: any = new Error(
        `Evolution API timeout after ${timeoutMs}ms on ${path}`,
      );
      err.status = 408;
      err.data = { error: "timeout" };
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract QR code from any Evolution API response format.
 * Evolution API v2 returns QR in various fields depending on version/endpoint:
 *   - code: "data:image/png;base64,..."  (v2.2.x connect endpoint)
 *   - base64: "data:image/png;base64,..."
 *   - qrcode.base64 / qrcode.code
 *   - qrCode.base64 / qrCode.code
 */
function extractQrCode(data: any): string | null {
  if (!data) return null;

  // Direct fields
  if (typeof data.code === "string" && data.code.startsWith("data:image"))
    return data.code;
  if (typeof data.base64 === "string" && data.base64.length > 100)
    return data.base64;

  // Nested qrcode object
  if (data.qrcode) {
    if (
      typeof data.qrcode === "string" &&
      data.qrcode.startsWith("data:image")
    )
      return data.qrcode;
    if (
      typeof data.qrcode.code === "string" &&
      data.qrcode.code.startsWith("data:image")
    )
      return data.qrcode.code;
    if (
      typeof data.qrcode.base64 === "string" &&
      data.qrcode.base64.length > 100
    )
      return data.qrcode.base64;
  }

  // Nested qrCode object (camelCase variant)
  if (data.qrCode) {
    if (
      typeof data.qrCode === "string" &&
      data.qrCode.startsWith("data:image")
    )
      return data.qrCode;
    if (
      typeof data.qrCode.code === "string" &&
      data.qrCode.code.startsWith("data:image")
    )
      return data.qrCode.code;
    if (
      typeof data.qrCode.base64 === "string" &&
      data.qrCode.base64.length > 100
    )
      return data.qrCode.base64;
  }

  return null;
}

/**
 * Extract pairing code from any Evolution API response format.
 * The pairing code allows connecting without scanning a QR code (mobile-friendly).
 */
function extractPairingCode(data: any): string | null {
  if (!data) return null;
  if (typeof data.pairingCode === "string" && data.pairingCode.length > 3) return data.pairingCode;
  if (typeof data.code === "string" && data.code.length >= 6 && data.code.length <= 12 && !data.code.startsWith("data:image")) return data.code;
  return null;
}

export const evolutionService = {
  extractQrCode,
  extractPairingCode,

  /**
   * Check if an instance exists in Evolution API.
   */
  async instanceExists(instanceName: string): Promise<boolean> {
    try {
      const data = await evolutionFetch("/instance/fetchInstances", {}, 5_000);
      const instances: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.value)
          ? data.value
          : [];
      return instances.some((i: any) => i.name === instanceName);
    } catch {
      return false;
    }
  },

  /**
   * Get the raw connection state of an instance.
   */
  async getInstanceConnectionState(instanceName: string) {
    try {
      return await evolutionFetch(
        `/instance/connectionState/${instanceName}`,
        {},
        5_000,
      );
    } catch (error) {
      logger.error("Evolution API: Failed to get connection state", error);
      throw error;
    }
  },

  /**
   * Delete an instance.
   */
  async deleteInstance(instanceName: string) {
    try {
      return await evolutionFetch(
        `/instance/delete/${instanceName}`,
        { method: "DELETE" },
        6_000,
      );
    } catch (error: any) {
      // Ignore 404 — instance may already be gone
      if (error.status === 404) return { status: "already_deleted" };
      logger.error("Evolution API: Failed to delete instance", error);
      throw error;
    }
  },

  /**
   * Creates an instance for a store.
   * NOTE: createInstance in Evolution API v2 does NOT reliably return a QR code.
   * You must call connectInstance afterwards to get the QR.
   */
  async createInstance(instanceName: string) {
    try {
      return await evolutionFetch(
        "/instance/create",
        {
          method: "POST",
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          }),
        },
        7_000,
      );
    } catch (error: any) {
      // If instance already exists, that's fine
      if (
        error.status === 403 ||
        error.status === 409 ||
        error.data?.error?.toLowerCase()?.includes("already exists")
      ) {
        logger.info(
          `Evolution API: Instance ${instanceName} already exists, continuing.`,
        );
        return { alreadyExists: true };
      }
      logger.error("Evolution API: Failed to create instance", error);
      throw error;
    }
  },

  /**
   * Connects the instance and returns the QR Code.
   * Uses a shorter timeout because this endpoint can hang when instance is stuck.
   */
  async connectInstance(instanceName: string) {
    try {
      return await evolutionFetch(
        `/instance/connect/${instanceName}`,
        {},
        7_000,
      );
    } catch (error) {
      logger.error("Evolution API: Failed to connect instance", error);
      throw error;
    }
  },

  /**
   * Logs out from WhatsApp and disconnects the instance.
   */
  async logoutInstance(instanceName: string) {
    try {
      return await evolutionFetch(
        `/instance/logout/${instanceName}`,
        { method: "DELETE" },
        10_000,
      );
    } catch (error) {
      logger.error("Evolution API: Failed to logout instance", error);
      throw error;
    }
  },

  /**
   * Full connection flow: ensures instance exists, handles stuck states,
   * and returns a QR code or connected status.
   */
  async ensureInstanceAndGetQr(
    instanceName: string,
  ): Promise<{ status: "connected" | "qrcode" | "processing" | "error"; qr?: string | null; pairingCode?: string | null; raw?: any }> {
    // Check if instance is already being processed by another request
    const processing = processingInstances.get(instanceName);
    if (processing) {
      const elapsed = Date.now() - processing.startTime;
      if (elapsed < MAX_PROCESSING_TIME) {
        logger.info(`Evolution API: Instance ${instanceName} is already being processed (elapsed: ${elapsed}ms). Returning processing status.`);
        return { status: "processing" };
      }
      // Safety timeout: if it's taking too long, clear the lock and try again
      processingInstances.delete(instanceName);
    }

    // Top-level safety net: this method NEVER throws
    try {
      processingInstances.set(instanceName, { startTime: Date.now() });
      const result = await this._ensureInstanceAndGetQrInternal(instanceName);
      return result;
    } catch (e: any) {
      logger.error(
        "Evolution API: Unexpected error in ensureInstanceAndGetQr:",
        e?.message || e,
      );
      return { status: "error", raw: { unexpected: true, message: e?.message } };
    } finally {
      // Small delay before clearing the lock to let the API settle
      setTimeout(() => processingInstances.delete(instanceName), 1500);
    }
  },

  /** @internal */
  async _ensureInstanceAndGetQrInternal(
    instanceName: string,
  ): Promise<{ status: "connected" | "qrcode" | "processing" | "error"; qr?: string | null; pairingCode?: string | null; raw?: any }> {
    // Step 1: Check if instance exists and its current state
    let state: string | undefined;
    let exists = false;

    try {
      const stateRes = await this.getInstanceConnectionState(instanceName);
      state = stateRes?.instance?.state;
      exists = true;
      logger.info(
        `Evolution API: Instance ${instanceName} state = ${state}`,
      );
    } catch (e: any) {
      if (e.status === 404) {
        exists = false;
        logger.info(
          `Evolution API: Instance ${instanceName} does not exist yet.`,
        );
      } else {
        // Could be a timeout or network issue — try to continue
        logger.warn(
          `Evolution API: Could not get state for ${instanceName}:`,
          e.data || e.message,
        );
      }
    }

    // Step 2: If already connected, return immediately
    if (state === "connected" || state === "open") {
      return { status: "connected" };
    }

    // Step 3: If "connecting", that's NORMAL — just call connect to get QR again
    // DO NOT delete/recreate — that invalidates the QR the user may be scanning!
    if (state === "connecting") {
      logger.info(
        `Evolution API: Instance ${instanceName} is in "connecting" state — requesting QR code...`,
      );
      // Go directly to Step 5 (connect call) to get current QR
    }

    // Step 3b: If instance is in "close" state, delete and recreate cleanly
    if (state === "close" || state === "closed") {
      logger.info(
        `Evolution API: Instance ${instanceName} is closed. Deleting and recreating...`,
      );
      try {
        await this.deleteInstance(instanceName);
        await new Promise((r) => setTimeout(r, 800));
        exists = false;
      } catch (e: any) {
        logger.warn("Evolution API: Failed to delete closed instance:", e.message);
      }
    }

    // Step 4: Create instance if it doesn't exist
    if (!exists) {
      try {
        const createRes = await this.createInstance(instanceName);
        // Check if createInstance returned a QR code directly (some versions do)
        const qr = extractQrCode(createRes);
        const pc = extractPairingCode(createRes);
        if (qr || pc) {
          return { status: "qrcode", qr: qr || null, pairingCode: pc, raw: createRes };
        }
        // Wait briefly for the instance to initialize before calling connect
        await new Promise((r) => setTimeout(r, 1500));
      } catch (e: any) {
        logger.error("Evolution API: Failed to create instance:", e.message);
        return { status: "error", raw: e.data };
      }
    }

    // Step 5: Call connect to get the QR code
    try {
      logger.info(`Evolution API: Requesting connection for ${instanceName}...`);
      const connectRes = await evolutionFetch(
        `/instance/connect/${instanceName}`,
        {},
        12_000,
      );

      logger.info(`Evolution API: Connect response for ${instanceName}:`, JSON.stringify(connectRes).slice(0, 300));

      const qr = extractQrCode(connectRes);
      const pairingCode = extractPairingCode(connectRes);

      if (qr || pairingCode) {
        logger.info(`Evolution API: QR/Pairing code received for ${instanceName}`);
        return {
          status: "qrcode",
          qr: qr || null,
          pairingCode: pairingCode || null,
          raw: connectRes,
        };
      }

      // No QR yet but no error — instance is still initializing
      logger.info(`Evolution API: No QR yet for ${instanceName}, returning processing.`);
      return { status: "processing" };
    } catch (error: any) {
      // If it's a timeout, return processing so the frontend continues to poll.
      if (error.name === "AbortError" || error.status === 408) {
        logger.info(`Evolution API: Connection for ${instanceName} timed out. Returning processing.`);
        return { status: "processing" };
      }

      // If it's any other error, it's a real failure.
      logger.error(`Evolution API: Real error for ${instanceName}:`, error.message);
      return { status: "error", message: error.message };
    }
  },

  /**
   * Sends a text message to a number.
   * @param instanceName Store instance name
   * @param remoteJid Target number (e.g., 5521999999999@s.whatsapp.net or just 5521999999999)
   * @param text Message content
   */
  async sendTextMessage(
    instanceName: string,
    remoteJid: string,
    text: string,
  ) {
    try {
      // Clean phone number if not already in Jid format
      let number = remoteJid;
      if (!number.includes("@s.whatsapp.net")) {
        let clean = number.replace(/\D/g, "");
        if (clean && !clean.startsWith("55") && clean.length <= 11) {
          clean = "55" + clean;
        }
        number = clean + "@s.whatsapp.net";
      }

      return await evolutionFetch(
        `/message/sendText/${instanceName}`,
        {
          method: "POST",
          body: JSON.stringify({
            number: number,
            options: {
              delay: 1200,
              presence: "composing",
            },
            textMessage: {
              text: text,
            },
          }),
        },
        15_000,
      );
    } catch (error) {
      logger.error("Evolution API: Failed to send text message", error);
      // We don't throw here to avoid failing the order creation if WhatsApp fails
      return null;
    }
  },
};
