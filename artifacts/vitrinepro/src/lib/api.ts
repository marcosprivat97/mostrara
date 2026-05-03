const BASE = "/api";

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro na requisição");
  return data as T;
}
