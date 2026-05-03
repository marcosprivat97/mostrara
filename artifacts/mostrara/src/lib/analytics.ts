import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || "";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;

export function hasAnalyticsConfig() {
  return Boolean(POSTHOG_KEY);
}

export function initAnalytics() {
  if (initialized || !POSTHOG_KEY || typeof window === "undefined") return false;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage",
    disable_session_recording: false,
    person_profiles: "identified_only",
  });

  initialized = true;
  return true;
}

export function identifyAnalytics(user: {
  id: string;
  email?: string;
  store_name?: string;
  store_type?: string;
}) {
  if (!initAnalytics()) return;
  posthog.identify(user.id, {
    email: user.email,
    store_name: user.store_name,
    store_type: user.store_type,
  });
}

export function trackAnalytics(event: string, properties?: Record<string, unknown>) {
  if (!initAnalytics()) return;
  posthog.capture(event, properties);
}

export function resetAnalytics() {
  if (!initialized) return;
  posthog.reset();
}

export function pageViewAnalytics(path: string, properties?: Record<string, unknown>) {
  trackAnalytics("$pageview", {
    $current_url: window.location.href,
    path,
    ...properties,
  });
}
