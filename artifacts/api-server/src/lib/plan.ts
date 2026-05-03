import type { User } from "@workspace/db";

/**
 * Checks if a user has premium access (paid plan or gifted free_forever).
 * A user is considered premium if:
 * 1. They have free_forever = true (admin gifted)
 * 2. They have plan = "premium" AND plan hasn't expired
 */
export function isPremium(user: Pick<User, "plan" | "free_forever" | "plan_expires_at">): boolean {
  if (user.free_forever) return true;
  if (user.plan !== "premium") return false;
  if (user.plan_expires_at && user.plan_expires_at.getTime() < Date.now()) return false;
  return true;
}

/** Product limit for the given user */
export function getProductLimit(user: Pick<User, "plan" | "free_forever" | "plan_expires_at">): number {
  return isPremium(user) ? Infinity : 10;
}

/** Plan feature flags for API responses */
export function getPlanFeatures(user: Pick<User, "plan" | "free_forever" | "plan_expires_at" | "verified_badge">) {
  const premium = isPremium(user);
  return {
    plan: premium ? "premium" as const : "free" as const,
    is_premium: premium,
    max_products: premium ? null : 10,  // null = unlimited
    can_use_ai: premium,
    can_use_mercado_pago: premium,
    has_verified_badge: premium && Boolean(user.verified_badge),
  };
}
