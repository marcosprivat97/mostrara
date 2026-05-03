export function buildStoreUrl(storeSlug: string) {
  const env = import.meta.env.VITE_PUBLIC_APP_URL;
  const origin = env 
    ? env.replace(/\/$/, "")
    : typeof window !== "undefined"
      ? window.location.origin
      : "https://www.mostrara.shop";
  const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
  const prefix = base ? `${base}` : "";
  return `${origin}${prefix}/loja/${encodeURIComponent(storeSlug)}`;
}
