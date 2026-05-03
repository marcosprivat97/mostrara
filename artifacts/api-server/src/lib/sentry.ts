import * as Sentry from "@sentry/node";
import { env } from "./env.js";

let initialized = false;

function isEnabled() {
  return Boolean(env.core.sentryDsn);
}

function scrubHeaders(headers: Record<string, unknown> | undefined) {
  if (!headers) return headers;
  const copy = { ...headers };
  for (const key of ["authorization", "cookie", "set-cookie", "x-api-key"]) {
    if (key in copy) {
      copy[key] = "[redacted]";
    }
  }
  return copy;
}

export function initServerSentry() {
  if (initialized || !isEnabled()) return;
  initialized = true;

  Sentry.init({
    dsn: env.core.sentryDsn,
    environment: env.runtime.nodeEnv,
    sampleRate: 1,
    tracesSampleRate: Number.isFinite(env.core.sentryTracesSampleRate) ? env.core.sentryTracesSampleRate : 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) {
        event.request.headers = scrubHeaders(event.request.headers as Record<string, unknown>) as Record<string, string>;
      }
      if (event.user) {
        event.user = {
          id: event.user.id,
          username: event.user.username,
        };
      }
      return event;
    },
  });
}

export function captureServerException(error: unknown, context?: {
  tags?: Record<string, string | number | boolean>;
  extras?: Record<string, unknown>;
}) {
  if (!isEnabled()) return;

  Sentry.withScope((scope) => {
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, String(value));
      }
    }
    if (context?.extras) {
      scope.setContext("extras", context.extras);
    }
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

