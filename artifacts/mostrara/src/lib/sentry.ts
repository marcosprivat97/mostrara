import * as Sentry from "@sentry/react";

let initialized = false;

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim() || "";

export function hasClientSentry() {
  return Boolean(dsn);
}

export function initSentry() {
  if (initialized || !dsn) return;
  initialized = true;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) {
        const headers = { ...event.request.headers } as Record<string, unknown>;
        for (const key of ["authorization", "cookie", "set-cookie", "x-api-key"]) {
          if (key in headers) headers[key] = "[redacted]";
        }
        event.request.headers = headers as Record<string, string>;
      }
      return event;
    },
  });
}

export function setSentryUser(user: {
  id: string;
  email?: string;
  store_name?: string;
  store_type?: string;
} | null) {
  if (!dsn) return;
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.store_name,
  });
  Sentry.setTag("store_type", user.store_type || "unknown");
}

export function clearSentryUser() {
  if (!dsn) return;
  Sentry.setUser(null);
}

export function captureClientException(
  error: Error,
  context?: {
    source?: string;
    stack?: string;
    path?: string;
    componentStack?: string;
    extra?: Record<string, unknown>;
  },
) {
  if (!dsn) return;

  Sentry.withScope((scope) => {
    if (context?.source) scope.setTag("source", context.source);
    if (context?.path) scope.setTag("path", context.path);
    if (context?.stack) scope.setContext("stack", { value: context.stack });
    if (context?.componentStack) {
      scope.setContext("react", { componentStack: context.componentStack });
    }
    if (context?.extra) scope.setContext("extra", context.extra);
    Sentry.captureException(error);
  });
}

