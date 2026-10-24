export const API_SCOPES = [
  "things:read",
  "quotes:read",
  "metadata:read",
  "aggregates:read",
] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export const API_SCOPE_DETAILS: Record<ApiScope, { label: string; detail: string }> = {
  "things:read": {
    label: "Public Things",
    detail: "Moderated public text and aggregate responses.",
  },
  "quotes:read": {
    label: "Public Quotes",
    detail: "Public Quote of the Day text and aggregates.",
  },
  "metadata:read": {
    label: "Metadata",
    detail: "Version, field dictionary and availability policy.",
  },
  "aggregates:read": {
    label: "Anonymous aggregates",
    detail: "Non-personal counts and time/tag summaries.",
  },
};

export const API_RATE_PLANS = {
  pilot: { label: "Pilot", requestsPerMinute: 60, monthlyCredits: 500 },
  standard: { label: "Standard", requestsPerMinute: 120, monthlyCredits: 2_000 },
  bulk: { label: "Bulk", requestsPerMinute: 30, monthlyCredits: 10_000 },
} as const;
export type ApiRatePlan = keyof typeof API_RATE_PLANS;

export const API_CREDIT_WELCOME = 500;

export const API_CREDIT_PACKS = [
  {
    key: "starter",
    label: "Starter",
    credits: 500,
    amountCents: 499,
    description: "For a first pilot or a small study.",
  },
  {
    key: "builder",
    label: "Builder",
    credits: 2_500,
    amountCents: 1_499,
    description: "For a regular research workflow.",
  },
  {
    key: "studio",
    label: "Studio",
    credits: 10_000,
    amountCents: 3_999,
    description: "For a larger approved read-only program.",
  },
] as const;
export type ApiCreditPackKey = (typeof API_CREDIT_PACKS)[number]["key"];

export const PREMIUM_MONTHLY_SAME_CREDITS = 25;

export const SAME_CREDIT_PACKS = [
  {
    key: "small",
    label: "A little more",
    credits: 25,
    amountCents: 199,
    description: "A gentle top-up for a few meaningful extras.",
  },
  {
    key: "medium",
    label: "Keep going",
    credits: 100,
    amountCents: 599,
    description: "For a longer stretch of Time Capsule, Boost and themes.",
  },
  {
    key: "large",
    label: "Make room",
    credits: 300,
    amountCents: 1_499,
    description: "A fuller balance for regular creative use.",
  },
] as const;
export type SameCreditPackKey = (typeof SAME_CREDIT_PACKS)[number]["key"];

export function formatUsdCents(amountCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amountCents / 100,
  );
}
