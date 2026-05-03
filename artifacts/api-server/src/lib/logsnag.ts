import { env } from "./env.js";

type LogSnagTagValue = string | number | boolean;

type LogSnagEventParams = {
  channel: string;
  event: string;
  description?: string;
  icon?: string;
  notify?: boolean;
  tags?: Record<string, LogSnagTagValue>;
  userId?: string;
  timestamp?: number;
  parser?: "markdown" | "text";
};

type LogSnagIdentifyParams = {
  userId: string;
  properties: Record<string, LogSnagTagValue>;
};

function hasLogSnagConfig() {
  return Boolean(env.logsnag.token && env.logsnag.project);
}

function normalizeTagKey(key: string) {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanTags(tags?: Record<string, LogSnagTagValue>) {
  if (!tags) return undefined;
  const entries = Object.entries(tags)
    .map(([key, value]) => [normalizeTagKey(key), value] as const)
    .filter(([key]) => Boolean(key));
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

async function postLogSnag(path: string, body: Record<string, unknown>) {
  if (!hasLogSnagConfig()) return { sent: false, skipped: true };

  const response = await fetch(`https://api.logsnag.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.logsnag.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project: env.logsnag.project,
      ...body,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Falha ao enviar evento ao LogSnag");
  }

  return { sent: true, skipped: false };
}

export async function logSnagEvent(params: LogSnagEventParams) {
  return postLogSnag("/v1/log", {
    channel: params.channel,
    event: params.event,
    description: params.description,
    icon: params.icon,
    notify: params.notify ?? false,
    tags: cleanTags(params.tags),
    user_id: params.userId,
    timestamp: params.timestamp ?? Math.floor(Date.now() / 1000),
    parser: params.parser || "text",
  });
}

export async function logSnagIdentify(params: LogSnagIdentifyParams) {
  return postLogSnag("/v1/identify", {
    user_id: params.userId,
    properties: cleanTags(params.properties),
  });
}

