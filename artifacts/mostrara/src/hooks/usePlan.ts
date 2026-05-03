import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook that encapsulates all plan logic for the frontend.
 * Checks if user is premium (paid plan or free_forever gifted by admin).
 */
export function usePlan() {
  const { user } = useAuth();

  const isPremium = Boolean(
    user?.email?.toLowerCase() === "sevenbeatx@gmail.com" ||
    user?.free_forever ||
    (user?.plan === "premium" &&
      (!user?.plan_expires_at || new Date(user.plan_expires_at) > new Date()))
  );

  return {
    /** Current plan name */
    plan: isPremium ? ("premium" as const) : ("free" as const),
    /** Whether the user has premium access */
    isPremium,
    /** Whether the user is on the free tier */
    isFree: !isPremium,
    /** Max products allowed */
    maxProducts: isPremium ? Infinity : 10,
    /** Whether AI is accessible */
    canUseAI: isPremium,
    /** Whether Mercado Pago OAuth is accessible */
    canUseMercadoPago: isPremium,
    /** Whether the store has the verified badge */
    hasVerifiedBadge: isPremium && Boolean(user?.verified_badge),
    /** Whether user was gifted free premium by admin */
    isFreeForever: Boolean(user?.free_forever),
    /** Plan expiration date (null if not set or free_forever) */
    planExpiresAt: user?.plan_expires_at ? new Date(user.plan_expires_at) : null,
  };
}
