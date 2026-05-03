import { captureClientException, hasClientSentry } from "./sentry";

let installed = false;

function reportClientError(payload: {
  message: string;
  source: string;
  stack?: string;
}) {
  if (hasClientSentry()) {
    captureClientException(new Error(payload.message), {
      source: payload.source,
      stack: payload.stack,
      path: window.location.pathname,
    });
    return;
  }

  const body = JSON.stringify({
    ...payload,
    path: window.location.pathname,
    userAgent: navigator.userAgent,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/client-errors", new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch("/api/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

export function installClientErrorReporting() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    reportClientError({
      message: event.message,
      source: "window.error",
      stack: event.error instanceof Error ? event.error.stack : undefined,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    reportClientError({
      message: reason instanceof Error ? reason.message : String(reason),
      source: "unhandledrejection",
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
