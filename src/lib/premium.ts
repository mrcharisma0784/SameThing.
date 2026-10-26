export type PremiumState = {
  plan?: string | null;
  premium_until?: string | null;
  is_test_user?: boolean | null;
};

export function isPremiumActive(profile?: PremiumState | null, now = Date.now()): boolean {
  if (profile?.is_test_user) return false;
  if (profile?.plan !== "premium") return false;
  if (!profile.premium_until) return true;
  const until = new Date(profile.premium_until).getTime();
  return Number.isFinite(until) && until > now;
}

export function effectivePlan(profile?: PremiumState | null, now = Date.now()): "free" | "premium" {
  return isPremiumActive(profile, now) ? "premium" : "free";
}
