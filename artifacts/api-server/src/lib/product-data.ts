import { productsTable } from "@workspace/db";

type ProductRow = typeof productsTable.$inferSelect;

const DEFAULT_PRODUCT_DIMENSIONS = {
  width: 11,
  height: 2,
  length: 16,
  weight: 0.3,
} as const;

function normalizePositiveNumber(value: unknown, fallback: number, min: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min ? numeric : fallback;
}

export function parsePhotos(photosStr: string | null): string[] {
  try {
    const parsed = JSON.parse(photosStr || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function parseOptions(optionsStr: string | null): { name: string; price: number }[] {
  try {
    const parsed = JSON.parse(optionsStr || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        name: typeof item?.name === "string" ? item.name.trim() : "",
        price: Number(item?.price || 0),
      }))
      .filter((item) => item.name && Number.isFinite(item.price) && item.price >= 0);
  } catch {
    return [];
  }
}

function normalizeDimensions(product: ProductRow) {
  return {
    width: normalizePositiveNumber(product.width, DEFAULT_PRODUCT_DIMENSIONS.width, 0.1),
    height: normalizePositiveNumber(product.height, DEFAULT_PRODUCT_DIMENSIONS.height, 0.1),
    length: normalizePositiveNumber(product.length, DEFAULT_PRODUCT_DIMENSIONS.length, 0.1),
    weight: normalizePositiveNumber(product.weight, DEFAULT_PRODUCT_DIMENSIONS.weight, 0.01),
  };
}

export function formatProduct(product: ProductRow) {
  return {
    ...product,
    ...normalizeDimensions(product),
    photos: parsePhotos(product.photos),
    options: parseOptions(product.options),
  };
}
