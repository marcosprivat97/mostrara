import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { passwordResetTokensTable, usersTable } from "@workspace/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { signToken } from "../lib/auth.js";
import { isPremium } from "../lib/plan.js";
import type { AuthRequest } from "../middlewares/auth.js";
import { authMiddleware } from "../middlewares/auth.js";
import { env } from "../lib/env.js";
import { evolutionService } from "../lib/evolution.js";
import {
  buildMercadoPagoAuthUrl,
  encryptMercadoPagoToken,
  exchangeMercadoPagoCode,
  hasMercadoPagoConfig,
  signMercadoPagoState,
  verifyMercadoPagoState,
} from "../lib/mercadopago.js";
import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../lib/email.js";
import {
  logSnagEvent,
  logSnagIdentify,
} from "../lib/logsnag.js";
import {
  loginSchema,
  parseBody,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  registerSchema,
  validationError,
} from "../lib/validation.js";
import { resolveStoreTaxonomy } from "../lib/store-taxonomy.js";

const router = Router();
const APP_URL = env.core.appUrl;
const GOOGLE_CLIENT_ID = env.auth.googleClientId;
const GOOGLE_CLIENT_SECRET = env.auth.googleClientSecret;
const GOOGLE_REDIRECT_URI = env.auth.googleRedirectUri;
const GOOGLE_STATE_SECRET = env.auth.googleStateSecret;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "") // Remove tudo que não é letra, número ou espaço
    .replace(/\s+/g, "")        // Remove os espaços unindo as palavras
    .trim();
}

export function sanitizeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    store_name: user.store_name,
    owner_name: user.owner_name,
    email: user.email,
    phone: user.phone,
    whatsapp: user.whatsapp,
    store_slug: user.store_slug,
    description: user.description,
    store_mode: user.store_mode,
    canonical_niche: user.canonical_niche,
    city: user.city,
    state: user.state,
    store_cep: user.store_cep,
    store_address: user.store_address,
    store_address_number: user.store_address_number,
    store_neighborhood: user.store_neighborhood,
    store_latitude: user.store_latitude,
    store_longitude: user.store_longitude,
    logo_url: user.logo_url,
    cover_url: user.cover_url,
    theme_primary: user.theme_primary,
    theme_secondary: user.theme_secondary,
    theme_accent: user.theme_accent,
    store_type: user.store_type,
    plan: user.plan,
    free_forever: user.free_forever,
    verified_badge: user.verified_badge,
    plan_started_at: user.plan_started_at,
    plan_expires_at: user.plan_expires_at,
    mp_connected_at: user.mp_connected_at,
    mp_user_id: user.mp_user_id,
    mp_access_token_expires_at: user.mp_access_token_expires_at,
    mp_refresh_token_expires_at: user.mp_refresh_token_expires_at,
    onboarding_completed_at: user.onboarding_completed_at,
    is_open: user.is_open,
    store_hours: user.store_hours,
    delivery_fee_type: user.delivery_fee_type,
    delivery_fee_amount: Number(user.delivery_fee_amount || 0),
    created_at: user.created_at,
    last_login_at: user.last_login_at,
  };
}

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function signGoogleState(payload: Record<string, unknown>) {
  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", GOOGLE_STATE_SECRET).update(base).digest("base64url");
  return `${base}.${sig}`;
}

function verifyGoogleState(state: string) {
  const [base, sig] = state.split(".");
  if (!base || !sig) return null;
  const expected = crypto.createHmac("sha256", GOOGLE_STATE_SECRET).update(base).digest("base64url");
  if (expected !== sig) return null;
  try {
    return JSON.parse(Buffer.from(base, "base64url").toString("utf8")) as { redirect?: string };
  } catch {
    return null;
  }
}

function safeRelativePath(value: string | undefined, fallback: string) {
  if (!value || !value.startsWith("/")) return fallback;
  return value;
}

router.post("/register", async (req, res) => {
  try {
    const { store_name, store_slug: requestedSlug, owner_name, email, password, phone, whatsapp, store_type, city } = parseBody(registerSchema, req.body);
    const taxonomy = resolveStoreTaxonomy(store_type);
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      res.status(409).json({ error: "E-mail ja cadastrado" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const store_slug = slugify(requestedSlug || store_name) || "loja";
    const existingSlug = await db.select().from(usersTable).where(eq(usersTable.store_slug, store_slug));
    if (existingSlug.length > 0) {
      res.status(409).json({ error: "Link da loja ja esta em uso. Escolha outro nome." });
      return;
    }
    const id = uuidv4();

    const [user] = await db.insert(usersTable).values({
      id,
      store_name,
      owner_name,
      email,
      password_hash,
      phone,
      whatsapp,
      store_type: taxonomy.storeType,
      store_mode: taxonomy.storeMode,
      canonical_niche: taxonomy.canonicalNiche,
      store_slug,
      city: city || "Rio de Janeiro",
      description: "",
      logo_url: "",
      cover_url: "",
      theme_primary: "#dc2626",
      theme_secondary: "#111827",
      theme_accent: "#ffffff",
      active: true,
      onboarding_completed_at: null,
      last_login_at: new Date(),
    }).returning();

    void sendWelcomeEmail({
      to: user.email,
      storeName: user.store_name,
      storeSlug: user.store_slug,
      ownerName: user.owner_name,
    }).catch(() => undefined);
    void logSnagIdentify({
      userId: user.id,
      properties: {
        store_name: user.store_name ?? "",
        store_slug: user.store_slug ?? "",
        store_type: user.store_type ?? "celulares",
        city: user.city ?? "",
        email: user.email ?? "",
      },
    }).catch(() => undefined);
    void logSnagEvent({
      channel: "stores",
      event: "new_store_created",
      description: `Nova loja criada: ${user.store_name}`,
      icon: "🏪",
      notify: true,
      userId: user.id,
      tags: {
        store_type: user.store_type ?? "celulares",
        city: user.city ?? "desconhecida",
      },
    }).catch(() => undefined);

    const token = signToken(user.id);
    
    // Pré-aquecimento da Instância do WhatsApp no background
    const instanceName = `mostrara_store_${user.id}`;
    evolutionService.createInstance(instanceName).catch(() => undefined);

    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err: unknown) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = parseBody(loginSchema, req.body);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      res.status(401).json({ error: "Credenciais invalidas" });
      return;
    }

    if (user.active === false) {
      res.status(403).json({ error: "Conta desativada. Crie uma nova conta ou fale com o suporte." });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Credenciais invalidas" });
      return;
    }

    void logSnagIdentify({
      userId: user.id,
      properties: {
        store_name: user.store_name ?? "",
        store_slug: user.store_slug ?? "",
        store_type: user.store_type ?? "celulares",
        city: user.city ?? "",
        email: user.email ?? "",
      },
    }).catch(() => undefined);
    void logSnagEvent({
      channel: "auth",
      event: "merchant_login",
      description: `Login realizado em ${user.store_name}`,
      icon: "🔐",
      notify: false,
      userId: user.id,
      tags: {
        store_type: user.store_type || "celulares",
        city: user.city || "desconhecida",
      },
    }).catch(() => undefined);

    const [updated] = await db
      .update(usersTable)
      .set({ last_login_at: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();

    const token = signToken(user.id);
    
    // Pré-aquecimento da Instância do WhatsApp no background
    const instanceName = `mostrara_store_${user.id}`;
    evolutionService.createInstance(instanceName).catch(() => undefined);

    res.json({ token, user: sanitizeUser(updated || user) });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/mercadopago/start", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!hasMercadoPagoConfig()) {
      res.status(500).json({ error: "Mercado Pago nao configurado no servidor" });
      return;
    }

    // Gate: only premium users can connect Mercado Pago
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user || !isPremium(user)) {
      res.status(403).json({ error: "Conecte o Mercado Pago assinando o plano Premium.", upgrade_required: true });
      return;
    }

    const redirect = safeRelativePath(
      typeof req.query.redirect === "string" ? req.query.redirect : undefined,
      "/dashboard/settings?mp=connected",
    );
    const state = signMercadoPagoState({
      userId: req.userId!,
      redirect,
    });
    res.redirect(buildMercadoPagoAuthUrl(state));
  } catch (err) {
    req.log.error({ err }, "MercadoPagoStart error");
    res.status(500).json({ error: "Nao foi possivel iniciar a conexao" });
  }
});

router.get("/mercadopago/callback", async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    const parsedState = typeof state === "string" ? verifyMercadoPagoState(state) : null;
    const redirect = safeRelativePath(parsedState?.redirect, "/dashboard/settings?mp=connected");

    if (typeof error === "string") {
      const url = new URL(redirect, APP_URL);
      url.searchParams.set("mp", "error");
      url.searchParams.set("reason", error_description && typeof error_description === "string" ? error_description : error);
      res.redirect(url.toString());
      return;
    }

    if (!parsedState || typeof code !== "string") {
      const url = new URL(redirect, APP_URL);
      url.searchParams.set("mp", "error");
      url.searchParams.set("reason", "state_or_code_missing");
      res.redirect(url.toString());
      return;
    }

    const userId = parsedState.userId as string;
    const tokens = await exchangeMercadoPagoCode(code);
    const now = new Date();
    const accessExpiresAt = new Date(now.getTime() + Number(tokens.expires_in || 15552000) * 1000);
    const refreshExpiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    const [updated] = await db
      .update(usersTable)
      .set({
        mp_access_token: encryptMercadoPagoToken(tokens.access_token),
        mp_refresh_token: encryptMercadoPagoToken(tokens.refresh_token),
        mp_user_id: tokens.user_id,
        mp_connected_at: now,
        mp_access_token_expires_at: accessExpiresAt,
        mp_refresh_token_expires_at: refreshExpiresAt,
      })
      .where(eq(usersTable.id, userId))
      .returning();

    if (!updated) {
      const url = new URL(redirect, APP_URL);
      url.searchParams.set("mp", "error");
      url.searchParams.set("reason", "user_not_found");
      res.redirect(url.toString());
      return;
    }

    void logSnagEvent({
      channel: "integrations",
      event: "mercadopago_connected",
      description: `Mercado Pago conectado em ${updated.store_name}`,
      icon: "✅",
      notify: true,
      userId: updated.id,
      tags: {
        store_type: updated.store_type ?? "celulares",
        city: updated.city ?? "desconhecida",
        mp_user_id: updated.mp_user_id ?? "unknown",
      },
    }).catch(() => undefined);

    const url = new URL(redirect, APP_URL);
    url.searchParams.set("mp", "connected");
    res.redirect(url.toString());
  } catch (err) {
    const url = new URL("/dashboard/settings", APP_URL);
    url.searchParams.set("mp", "error");
    url.searchParams.set("reason", err instanceof Error ? err.message : "callback_failed");
    res.redirect(url.toString());
  }
});

router.post("/password/reset/request", async (req, res) => {
  try {
    const { email } = parseBody(passwordResetRequestSchema, req.body);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user || user.active === false) {
      res.json({ success: true });
      return;
    }

    const token = generateToken();
    const tokenHash = hashValue(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await db.insert(passwordResetTokensTable).values({
      id: uuidv4(),
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const mail = await sendPasswordResetEmail({
      to: user.email,
      storeName: user.store_name,
      resetUrl,
    });
    res.json({
      success: true,
      ...(mail.sent ? {} : !env.runtime.isProduction ? { reset_url: resetUrl } : {}),
    });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "PasswordResetRequest error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/password/reset/confirm", async (req, res) => {
  try {
    const { token, new_password } = parseBody(passwordResetConfirmSchema, req.body);
    const tokenHash = hashValue(token);
    const [resetToken] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.token_hash, tokenHash),
          isNull(passwordResetTokensTable.used_at),
          gt(passwordResetTokensTable.expires_at, new Date()),
        ),
      );

    if (!resetToken) {
      res.status(400).json({ error: "Token invalido ou expirado" });
      return;
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await db.transaction(async (tx) => {
      await tx.update(usersTable).set({ password_hash }).where(eq(usersTable.id, resetToken.user_id));
      await tx.update(passwordResetTokensTable).set({ used_at: new Date() }).where(eq(passwordResetTokensTable.id, resetToken.id));
    });

    const [changedUser] = await db.select().from(usersTable).where(eq(usersTable.id, resetToken.user_id));
    if (changedUser) {
      void sendPasswordChangedEmail({
        to: changedUser.email,
        storeName: changedUser.store_name,
      }).catch(() => undefined);
    }

    res.json({
      success: true,
      ...(!env.runtime.isProduction ? { reset_url: resetUrl } : {}),
    });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "PasswordResetConfirm error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/google/start", (_req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    res.redirect(`${APP_URL}/login?auth=google-unavailable`);
    return;
  }

  const state = signGoogleState({ redirect: `${APP_URL}/auth/google/callback`, ts: Date.now() });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);
  res.redirect(url.toString());
});

router.get("/google/callback", async (req, res) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (!code) {
      res.redirect(`${APP_URL}/login?auth=google-error`);
      return;
    }

    const stateData = verifyGoogleState(state);
    if (!stateData) {
      res.redirect(`${APP_URL}/login?auth=google-invalid`);
      return;
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      res.redirect(`${APP_URL}/login?auth=google-unavailable`);
      return;
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(await tokenRes.text());
    }

    const tokenData = await tokenRes.json() as { access_token?: string };
    if (!tokenData.access_token) {
      throw new Error("Google access token ausente");
    }

    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) {
      throw new Error(await profileRes.text());
    }

    const profile = await profileRes.json() as { email?: string; name?: string };
    const email = (profile.email || "").toLowerCase().trim();
    if (!email) {
      throw new Error("Google nao retornou e-mail");
    }

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    let user = existing;
    if (!user) {
      const taxonomy = resolveStoreTaxonomy("celulares");
      const ownerName = profile.name?.trim() || email.split("@")[0];
      const baseSlug = slugify(email.split("@")[0]) || "loja";
      let storeSlug = baseSlug;
      let suffix = 1;
      while ((await db.select().from(usersTable).where(eq(usersTable.store_slug, storeSlug))).length > 0) {
        suffix += 1;
        storeSlug = `${baseSlug}-${suffix}`;
      }
      [user] = await db.insert(usersTable).values({
        id: uuidv4(),
        store_name: profile.name?.trim() ? `${profile.name.trim().split(" ")[0]} Store` : "Minha Loja",
        owner_name: ownerName,
        email,
        password_hash: await bcrypt.hash(generateToken(), 10),
        phone: "0000000000",
        whatsapp: "0000000000",
        store_slug: storeSlug,
        store_type: taxonomy.storeType,
        store_mode: taxonomy.storeMode,
        canonical_niche: taxonomy.canonicalNiche,
        city: "Rio de Janeiro",
        description: "",
        logo_url: "",
        cover_url: "",
        theme_primary: "#dc2626",
        theme_secondary: "#111827",
        theme_accent: "#ffffff",
        active: true,
        onboarding_completed_at: null,
        last_login_at: new Date(),
      }).returning();

      void sendWelcomeEmail({
        to: user.email,
        storeName: user.store_name,
        storeSlug: user.store_slug,
        ownerName: user.owner_name,
      }).catch(() => undefined);
      void logSnagIdentify({
        userId: user.id,
        properties: {
          store_name: user.store_name ?? "",
          store_slug: user.store_slug ?? "",
          store_type: user.store_type ?? "celulares",
          city: user.city ?? "",
          email: user.email ?? "",
        },
      }).catch(() => undefined);
      void logSnagEvent({
        channel: "stores",
        event: "new_store_created",
        description: `Nova loja criada via Google: ${user.store_name}`,
        icon: "🏪",
        notify: true,
        userId: user.id,
        tags: {
          store_type: user.store_type ?? "celulares",
          city: user.city ?? "desconhecida",
          auth_provider: "google",
        },
      }).catch(() => undefined);
    } else if (user.active === false) {
      res.redirect(`${APP_URL}/login?auth=disabled`);
      return;
    } else {
      const [updated] = await db
        .update(usersTable)
        .set({ last_login_at: new Date() })
        .where(eq(usersTable.id, user.id))
        .returning();
      user = updated || user;
      void logSnagIdentify({
        userId: user.id,
        properties: {
          store_name: user.store_name ?? "",
          store_slug: user.store_slug ?? "",
          store_type: user.store_type ?? "celulares",
          city: user.city ?? "",
          email: user.email ?? "",
        },
      }).catch(() => undefined);
      void logSnagEvent({
        channel: "auth",
        event: "merchant_login",
        description: `Login realizado via Google em ${user.store_name}`,
        icon: "🔐",
        notify: false,
        userId: user.id,
        tags: {
          store_type: user.store_type ?? "celulares",
          city: user.city ?? "desconhecida",
          auth_provider: "google",
        },
      }).catch(() => undefined);
    }

    const token = signToken(user.id);
    const redirectUrl = new URL(stateData.redirect || `${APP_URL}/auth/google/callback`);
    redirectUrl.searchParams.set("token", token);
    res.redirect(redirectUrl.toString());
  } catch (err) {
    res.redirect(`${APP_URL}/login?auth=google-error`);
  }
});

router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user) {
      res.status(401).json({ error: "Usuario nao encontrado" });
      return;
    }
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    req.log.error({ err }, "GetMe error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ── Forgot Password ──────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = parseBody(passwordResetRequestSchema, req.body);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()));

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ success: true });
      return;
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashValue(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokensTable).values({
      id: uuidv4(),
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    const resetUrl = `${env.core.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    void sendPasswordResetEmail({
      to: user.email,
      storeName: user.store_name,
      resetUrl,
    }).catch(() => undefined);

    res.json({ success: true });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "ForgotPassword error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, new_password } = parseBody(passwordResetConfirmSchema, req.body);
    const tokenHash = hashValue(token);

    const [resetToken] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.token_hash, tokenHash),
          gt(passwordResetTokensTable.expires_at, new Date()),
          isNull(passwordResetTokensTable.used_at),
        ),
      );

    if (!resetToken) {
      res.status(400).json({ error: "Token inválido ou expirado. Solicite um novo link." });
      return;
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await db
      .update(usersTable)
      .set({ password_hash })
      .where(eq(usersTable.id, resetToken.user_id));

    // Mark token as used
    await db
      .update(passwordResetTokensTable)
      .set({ used_at: new Date() })
      .where(eq(passwordResetTokensTable.id, resetToken.id));

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, resetToken.user_id));

    if (user) {
      void sendPasswordChangedEmail({
        to: user.email,
        storeName: user.store_name,
      }).catch(() => undefined);
    }

    res.json({ success: true });
  } catch (err) {
    const invalid = validationError(err);
    if (invalid) {
      res.status(400).json(invalid);
      return;
    }
    req.log.error({ err }, "ResetPassword error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
