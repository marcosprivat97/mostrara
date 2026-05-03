const runtime = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
};

const appUrl = (process.env.APP_URL || process.env.PUBLIC_APP_URL || "https://www.mostrara.shop").replace(/\/$/, "");

export const env = {
  runtime,
  core: {
    appUrl,
    publicAppUrl: (process.env.PUBLIC_APP_URL || appUrl).replace(/\/$/, ""),
    corsOrigin: process.env.CORS_ORIGIN || "",
    rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE || 120),
    logLevel: process.env.LOG_LEVEL || "info",
    port: process.env.PORT || "23131",
    sessionSecret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "dev-secret-keep-it-safe",
    sentryDsn: process.env.SENTRY_DSN || "",
    sentryTracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
  },
  auth: {
    googleClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
    googleClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
    googleRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || `${appUrl}/api/auth/google/callback`,
    googleStateSecret: process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.JWT_SECRET || "mostrara-google-state",
    jwtSecret: process.env.JWT_SECRET || process.env.SESSION_SECRET || "dev-secret-keep-it-safe",
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || "",
    resendFromEmail: process.env.RESEND_FROM_EMAIL || "Mostrara <noreply@www.mostrara.shop>",
  },
  logsnag: {
    token: process.env.LOGSNAG_TOKEN || "",
    project: process.env.LOGSNAG_PROJECT || "mostrara",
  },
  mp: {
    clientId: process.env.MP_CLIENT_ID || process.env.MERCADOPAGO_CLIENT_ID || "",
    clientSecret: process.env.MP_CLIENT_SECRET || process.env.MERCADOPAGO_CLIENT_SECRET || "",
    redirectUri: process.env.MP_REDIRECT_URI || `${appUrl}/api/auth/mercadopago/callback`,
    stateSecret: process.env.MP_STATE_SECRET || process.env.JWT_SECRET || "mostrara-mp-state",
    tokenEncryptionSecret: process.env.MP_TOKEN_ENCRYPTION_SECRET || process.env.JWT_SECRET || "mostrara-mp-token",
    webhookSecret: process.env.MP_WEBHOOK_SECRET || "",
  },
  ai: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    dailyLimit: Number(process.env.AI_DAILY_LIMIT || 40),
  },
  admin: {
    emails: new Set(
      (process.env.ADMIN_EMAILS || "sevenbeatx@gmail.com")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  evolution: {
    apiUrl: (process.env.EVOLUTION_API_URL || "http://147.15.38.136:8080").replace(/\/$/, ""),
    apiKey: process.env.EVOLUTION_API_KEY || "mostrara_global_key_2026_super_secret",
  },
  unsplash: {
    accessKey: process.env.UNSPLASH_ACCESS_KEY || "yVMK3eBIpa2bngdOiRLdgXZW0pHup02CSbmx5CYO3IM",
    secretKey: process.env.UNSPLASH_SECRET_KEY || "G_vLDDYZU2meeOCsDnT_I7DkInXSNBFjeibNOnx90ks",
  },
  trigger: {
    apiKey: process.env.TRIGGER_API_KEY || "tr_dev_lbG6dIbGFXo225fKoT4c",
  },
  melhorenvio: {
    token: process.env.MELHORENVIO_TOKEN || "inLH07S7yaXQodGG8tRNHYOTIoais69HhMoo5gIe",
    isSandbox: process.env.NODE_ENV !== "production",
  },
  removeBg: {
    apiKey: process.env.REMOVE_BG_API_KEY || "ipMYuQiSRvghJqemjmBRjPdS",
  },
} as const;
