import { Router } from "express";
import { captureServerException } from "../lib/sentry.js";

const router = Router();

router.post("/client-errors", (req, res) => {
  const body = req.body as {
    message?: unknown;
    source?: unknown;
    stack?: unknown;
    path?: unknown;
    userAgent?: unknown;
  };

  req.log.warn(
    {
      clientError: {
        message: String(body.message ?? "").slice(0, 500),
        source: String(body.source ?? "").slice(0, 200),
        stack: String(body.stack ?? "").slice(0, 2000),
        path: String(body.path ?? "").slice(0, 300),
        userAgent: String(body.userAgent ?? "").slice(0, 300),
      },
    },
    "Client error reported",
  );
  captureServerException(new Error(String(body.message ?? "Client error reported")), {
    tags: {
      source: String(body.source ?? "client-error"),
      path: String(body.path ?? ""),
    },
    extras: {
      stack: body.stack,
      userAgent: body.userAgent,
    },
  });

  res.status(204).end();
});

export default router;
