export const SUPPORTED_STORE_TYPES = [
  "celulares",
  "acai",
  "hamburgueria",
  "pizzaria",
  "quentinhas",
  "doces",
  "salgados",
  "manicure",
  "pastelaria",
  "salgadinhos",
  "marmitex",
  "salao",
] as const;

export const CANONICAL_STORE_NICHES = [
  "acai",
  "pizzaria",
  "quentinhas",
  "doces",
  "hamburgueria",
  "salgados",
  "celulares",
  "manicure",
] as const;

export const STORE_MODES = ["food", "retail", "booking"] as const;

export type SupportedStoreType = (typeof SUPPORTED_STORE_TYPES)[number];
export type CanonicalStoreNiche = (typeof CANONICAL_STORE_NICHES)[number];
export type StoreMode = (typeof STORE_MODES)[number];

const SUPPORTED_STORE_TYPE_SET = new Set<string>(SUPPORTED_STORE_TYPES);
const FOOD_STORE_TYPES = new Set<string>([
  "acai",
  "hamburgueria",
  "pizzaria",
  "quentinhas",
  "doces",
  "salgados",
  "pastelaria",
  "salgadinhos",
  "marmitex",
]);
const BOOKING_STORE_TYPES = new Set<string>(["manicure", "salao"]);

const CANONICAL_STORE_NICHE_MAP: Record<SupportedStoreType, CanonicalStoreNiche | null> = {
  celulares: "celulares",
  acai: "acai",
  hamburgueria: "hamburgueria",
  pizzaria: "pizzaria",
  quentinhas: "quentinhas",
  doces: "doces",
  salgados: "salgados",
  manicure: "manicure",
  pastelaria: "salgados",
  salgadinhos: "salgados",
  marmitex: "quentinhas",
  salao: null,
};

export function normalizeStoreType(storeType?: string | null): SupportedStoreType {
  const normalized = String(storeType || "").trim().toLowerCase();
  return SUPPORTED_STORE_TYPE_SET.has(normalized)
    ? (normalized as SupportedStoreType)
    : "celulares";
}

export function resolveStoreMode(storeType?: string | null): StoreMode {
  const normalized = normalizeStoreType(storeType);
  if (BOOKING_STORE_TYPES.has(normalized)) return "booking";
  if (FOOD_STORE_TYPES.has(normalized)) return "food";
  return "retail";
}

export function resolveCanonicalStoreNiche(
  storeType?: string | null,
): CanonicalStoreNiche | null {
  const normalized = normalizeStoreType(storeType);
  return CANONICAL_STORE_NICHE_MAP[normalized];
}

export function isBookingStoreType(storeType?: string | null) {
  return resolveStoreMode(storeType) === "booking";
}

export function resolveStoreTaxonomy(storeType?: string | null) {
  const normalized = normalizeStoreType(storeType);

  return {
    storeType: normalized,
    storeMode: resolveStoreMode(normalized),
    canonicalNiche: resolveCanonicalStoreNiche(normalized),
  };
}
