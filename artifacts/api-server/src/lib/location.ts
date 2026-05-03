export interface StoreGeocodeInput {
  storeName?: string | null;
  address?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
}

export interface StoreGeocodeResult {
  latitude: string;
  longitude: string;
  display_name?: string;
}

function buildQuery(input: StoreGeocodeInput) {
  const parts = [
    input.storeName,
    input.address,
    input.number,
    input.neighborhood,
    input.city,
    input.state,
    input.cep,
    "Brasil",
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  return parts.join(", ");
}

export async function geocodeStoreAddress(input: StoreGeocodeInput): Promise<StoreGeocodeResult | null> {
  const query = buildQuery(input);
  if (!query) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mostrara/1.0",
    },
  });

  if (!response.ok) return null;
  const data: any = await response.json().catch(() => []);
  const first = Array.isArray(data) ? data[0] : null;
  if (!first?.lat || !first?.lon) return null;

  return {
    latitude: String(first.lat),
    longitude: String(first.lon),
    display_name: typeof first.display_name === "string" ? first.display_name : undefined,
  };
}
