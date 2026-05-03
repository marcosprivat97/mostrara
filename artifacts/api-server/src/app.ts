import "./lib/load-env.js";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { env } from "./lib/env.js";
import { captureServerException, initServerSentry } from "./lib/sentry.js";

initServerSentry();

const app: Express = express();
const isProduction = env.runtime.isProduction;
const allowedOrigins = (env.core.corsOrigin ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const rateWindowMs = 60_000;
const rateLimit = env.core.rateLimitPerMinute;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.use((req, res, next) => {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + rateWindowMs });
    next();
    return;
  }
  bucket.count += 1;
  if (bucket.count > rateLimit) {
    res.status(429).json({ error: "Muitas requisicoes. Tente novamente em instantes." });
    return;
  }
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin || 
        !isProduction || 
        allowedOrigins.length === 0 || 
        allowedOrigins.includes(origin) ||
        origin.endsWith("mostrara.shop") ||
        origin.endsWith("vercel.app")
      ) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api", router);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    captureServerException(err, { tags: { source: "express-error-handler" } });
    logger.error({ err }, "Unhandled request error");
    res.status(500).json({ error: "Erro interno do servidor" });
  },
);

export default app;
