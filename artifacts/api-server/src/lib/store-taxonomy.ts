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
export const DELIVERY_FEE_TYPES = ["none", "fixed", "distance"] as const;

export type SupportedStoreType = (typeof SUPPORTED_STORE_TYPES)[number];
export type CanonicalStoreNiche = (typeof CANONICAL_STORE_NICHES)[number];
export type StoreMode = (typeof STORE_MODES)[number];
export type DeliveryFeeType = (typeof DELIVERY_FEE_TYPES)[number];

const SUPPORTED_STORE_TYPE_SET = new Set<string>(SUPPORTED_STORE_TYPES);
const SUPPORTED_CANONICAL_NICHE_SET = new Set<string>(CANONICAL_STORE_NICHES);
const SUPPORTED_STORE_MODE_SET = new Set<string>(STORE_MODES);
const SUPPORTED_DELIVERY_FEE_TYPE_SET = new Set<string>(DELIVERY_FEE_TYPES);
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

export function normalizeStoreMode(storeMode?: string | null): StoreMode | null {
  const normalized = String(storeMode || "").trim().toLowerCase();
  return SUPPORTED_STORE_MODE_SET.has(normalized)
    ? (normalized as StoreMode)
    : null;
}

export function normalizeCanonicalStoreNiche(
  canonicalNiche?: string | null,
): CanonicalStoreNiche | null {
  const normalized = String(canonicalNiche || "").trim().toLowerCase();
  return SUPPORTED_CANONICAL_NICHE_SET.has(normalized)
    ? (normalized as CanonicalStoreNiche)
    : null;
}

export function normalizeDeliveryFeeType(
  deliveryFeeType?: string | null,
): DeliveryFeeType {
  const normalized = String(deliveryFeeType || "").trim().toLowerCase();
  return SUPPORTED_DELIVERY_FEE_TYPE_SET.has(normalized)
    ? (normalized as DeliveryFeeType)
    : "none";
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

function fallbackStoreTypeForMode(storeMode: StoreMode): SupportedStoreType {
  if (storeMode === "food") return "acai";
  if (storeMode === "booking") return "manicure";
  return "celulares";
}

export function resolveStoreTaxonomyFromProfile(profile: {
  store_type?: string | null;
  store_mode?: string | null;
  canonical_niche?: string | null;
}) {
  const rawStoreType = String(profile.store_type || "").trim().toLowerCase();
  if (SUPPORTED_STORE_TYPE_SET.has(rawStoreType)) {
    return resolveStoreTaxonomy(rawStoreType);
  }

  const canonicalNiche = normalizeCanonicalStoreNiche(profile.canonical_niche);
  if (canonicalNiche) {
    return resolveStoreTaxonomy(canonicalNiche);
  }

  const storeMode = normalizeStoreMode(profile.store_mode);
  if (storeMode) {
    return resolveStoreTaxonomy(fallbackStoreTypeForMode(storeMode));
  }

  return resolveStoreTaxonomy(rawStoreType);
}

export function resolveStoreDeliveryConfig(profile: {
  store_type?: string | null;
  store_mode?: string | null;
  canonical_niche?: string | null;
  delivery_fee_type?: string | null;
  delivery_fee_amount?: string | number | null;
}) {
  const taxonomy = resolveStoreTaxonomyFromProfile(profile);
  const rawAmount = Number(profile.delivery_fee_amount || 0);
  const deliveryFeeAmount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 0;
  const requestedType = normalizeDeliveryFeeType(profile.delivery_fee_type);
  const deliveryFeeType =
    taxonomy.storeMode !== "retail" && requestedType === "distance"
      ? (deliveryFeeAmount > 0 ? "fixed" : "none")
      : requestedType;

  return {
    ...taxonomy,
    deliveryFeeType,
    deliveryFeeAmount,
  };
}
