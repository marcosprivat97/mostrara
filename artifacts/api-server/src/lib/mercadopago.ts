import crypto from "node:crypto";
import { env } from "./env.js";

const MP_AUTH_URL = "https://auth.mercadopago.com.br/authorization";
const MP_TOKEN_URL = "https://api.mercadopago.com/oauth/token";
const MP_PAYMENTS_URL = "https://api.mercadopago.com/v1/payments";
const APP_URL = env.core.appUrl;
const MP_CLIENT_ID = env.mp.clientId;
const MP_CLIENT_SECRET = env.mp.clientSecret;
const MP_REDIRECT_URI = env.mp.redirectUri;
const MP_STATE_SECRET = env.mp.stateSecret;
const MP_TOKEN_ENCRYPTION_SECRET = env.mp.tokenEncryptionSecret;

export interface MercadoPagoOAuthTokenResponse {
  access_token: string;
  public_key?: string;
  refresh_token: string;
  live_mode?: boolean;
  user_id: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

export interface MercadoPagoPixPaymentResponse {
  id: string;
  status: string;
  status_detail?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code_base64?: string;
      qr_code?: string;
      ticket_url?: string;
    };
  };
}

export interface MercadoPagoConnectionTokens {
  access_token: string;
  refresh_token: string;
  user_id: string;
  access_token_expires_at: Date;
  refresh_token_expires_at: Date | null;
}

export function hasMercadoPagoConfig() {
  return Boolean(MP_CLIENT_ID && MP_CLIENT_SECRET && MP_REDIRECT_URI);
}

export function getMercadoPagoRedirectUri() {
  return MP_REDIRECT_URI;
}

export function buildMercadoPagoAuthUrl(state: string) {
  const url = new URL(MP_AUTH_URL);
  url.searchParams.set("client_id", MP_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("scope", "offline_access payments write");
  url.searchParams.set("redirect_uri", MP_REDIRECT_URI);
  url.searchParams.set("state", state);
  return url.toString();
}

export function signMercadoPagoState(payload: Record<string, unknown>) {
  const base = Buffer.from(JSON.stringify({ ...payload, ts: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", MP_STATE_SECRET).update(base).digest("base64url");
  return `${base}.${sig}`;
}

export function verifyMercadoPagoState(state: string, maxAgeMs = 30 * 60 * 1000) {
  const [base, sig] = state.split(".");
  if (!base || !sig) return null;
  const expected = crypto.createHmac("sha256", MP_STATE_SECRET).update(base).digest("base64url");
  if (expected !== sig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(base, "base64url").toString("utf8")) as { userId?: string; redirect?: string; ts?: number };
    if (!parsed.userId || !parsed.ts || Date.now() - parsed.ts > maxAgeMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

function keyFromSecret(secret: string) {
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptMercadoPagoToken(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFromSecret(MP_TOKEN_ENCRYPTION_SECRET), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptMercadoPagoToken(value: string) {
  if (!value) return "";
  if (!value.startsWith("v1.")) return value;
  const [, ivB64, tagB64, encryptedB64] = value.split(".");
  if (!ivB64 || !tagB64 || !encryptedB64) return "";
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    keyFromSecret(MP_TOKEN_ENCRYPTION_SECRET),
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

async function exchangeToken(body: Record<string, string>) {
  const response = await fetch(MP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : typeof data?.error === "string" ? data.error : "Falha ao conectar Mercado Pago";
    throw new Error(message);
  }
  return data as MercadoPagoOAuthTokenResponse;
}

export async function exchangeMercadoPagoCode(code: string) {
  return exchangeToken({
    client_id: MP_CLIENT_ID,
    client_secret: MP_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: MP_REDIRECT_URI,
  });
}

export async function refreshMercadoPagoToken(refreshToken: string) {
  return exchangeToken({
    client_id: MP_CLIENT_ID,
    client_secret: MP_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "Cliente", last_name: "Mostrara" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "Mostrara" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

export async function createMercadoPagoPixPayment(params: {
  accessToken: string;
  amount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  customerDocument?: string;
  externalReference: string;
  notificationUrl: string;
  idempotencyKey: string;
}) {
  const response = await fetch(MP_PAYMENTS_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
      "X-Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: Number(params.amount.toFixed(2)),
      description: params.description.slice(0, 150),
      payment_method_id: "pix",
      notification_url: params.notificationUrl,
      external_reference: params.externalReference.slice(0, 64),
      payer: {
        email: params.customerEmail,
        ...splitName(params.customerName),
        ...(params.customerDocument
          ? {
              identification: {
                type: "CPF",
                number: params.customerDocument.replace(/\D/g, ""),
              },
            }
          : {}),
      },
      metadata: {
        external_reference: params.externalReference.slice(0, 64),
      },
    }),
  });

  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : typeof data?.error === "string" ? data.error : "Falha ao criar pagamento Pix";
    throw new Error(message);
  }

  const qr = data?.point_of_interaction?.transaction_data ?? {};
  return {
    id: String(data?.id ?? ""),
    status: String(data?.status ?? "pending"),
    status_detail: typeof data?.status_detail === "string" ? data.status_detail : undefined,
    qr_code: typeof qr.qr_code === "string" ? qr.qr_code : "",
    qr_code_base64: typeof qr.qr_code_base64 === "string" ? qr.qr_code_base64 : "",
    ticket_url: typeof qr.ticket_url === "string" ? qr.ticket_url : "",
  };
}

export async function fetchMercadoPagoPayment(accessToken: string, paymentId: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : typeof data?.error === "string" ? data.error : "Falha ao consultar pagamento";
    throw new Error(message);
  }
  const qr = data?.point_of_interaction?.transaction_data ?? {};
  return {
    id: String(data?.id ?? paymentId),
    status: String(data?.status ?? "pending"),
    status_detail: typeof data?.status_detail === "string" ? data.status_detail : undefined,
    qr_code: typeof qr.qr_code === "string" ? qr.qr_code : "",
    qr_code_base64: typeof qr.qr_code_base64 === "string" ? qr.qr_code_base64 : "",
    ticket_url: typeof qr.ticket_url === "string" ? qr.ticket_url : "",
  };
}

export function verifyMercadoPagoWebhookSignature(params: {
  secret: string;
  signature: string | undefined;
  requestId: string | undefined;
  paymentId: string | undefined;
}) {
  if (!params.secret || !params.signature || !params.requestId || !params.paymentId) return false;
  const parts = params.signature.split(",");
  const values = new Map(parts.map((part) => {
    const [key, value] = part.split("=", 2);
    return [key?.trim(), value?.trim()];
  }));
  const ts = values.get("ts");
  const hash = values.get("v1");
  if (!ts || !hash) return false;
  const manifest = `id:${params.paymentId};request-id:${params.requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", params.secret).update(manifest).digest("hex");
  return expected === hash;
}
