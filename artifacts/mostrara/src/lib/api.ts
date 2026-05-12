const BASE = "https://mostrara.onrender.com/api";
console.log("🚀 Mostrara: Conectado ao Render Backend");

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

  const res = await fetch(`${BASE}${path}`, { ...rest, headers });
  const text = await res.text();
  let data: { error?: string } = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    const errorMessage = data.error || text || res.statusText || "Erro na requisicao";
    throw new Error(errorMessage);
  }
  return data as T;
}
