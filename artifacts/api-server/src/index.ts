import app from "./app";
import { logger } from "./lib/logger";
import { env } from "./lib/env.js";
import { captureServerException } from "./lib/sentry.js";

const rawPort = env.core.port;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

process.on("unhandledRejection", (reason) => {
  captureServerException(reason, { tags: { source: "unhandled-rejection" } });
});

process.on("uncaughtException", (error) => {
  captureServerException(error, { tags: { source: "uncaught-exception" } });
  logger.error({ err: error }, "Uncaught exception");
  process.exit(1);
});

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
