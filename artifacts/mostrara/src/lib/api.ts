const DEFAULT_REMOTE_API_BASE = "https://mostrara.onrender.com/api";
const DEFAULT_LOCAL_API_BASE = "http://localhost:23131/api";

function normalizeApiBase(base: string) {
  return base.replace(/\/+$/, "");
}

function resolveApiBaseUrl() {
  const envBase = import.meta.env.VITE_API_URL?.trim();
  if (envBase) return normalizeApiBase(envBase);
  return import.meta.env.DEV ? DEFAULT_LOCAL_API_BASE : DEFAULT_REMOTE_API_BASE;
}

export const API_BASE_URL = resolveApiBaseUrl();

export function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

if (import.meta.env.DEV) {
  console.info(`[Mostrara] API base: ${API_BASE_URL}`);
}

function extractApiErrorMessage(status: number, data: unknown) {
  if (data && typeof data === "object") {
    const fields = (data as { fields?: Record<string, string[] | undefined> }).fields;
    const fieldMessage = fields
      ? Object.values(fields)
          .flat()
          .find((value): value is string => typeof value === "string" && value.trim().length > 0)
      : undefined;
    if (fieldMessage) return fieldMessage;

    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  return `Erro na API: ${status}`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...rest } = options;
  const method = (rest.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string>),
  };
  if (method !== "GET" && method !== "HEAD" && method !== "DELETE") {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(buildApiUrl(path), { ...rest, headers });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    console.error(`API Error [${res.status}]:`, data);
    throw new Error(extractApiErrorMessage(res.status, data));
  }
  return data as T;
}
