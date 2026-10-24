/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase RPC responses use generated schema types outside this source snapshot. */
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { effectivePlan } from "@/lib/premium";
import { PREMIUM_MONTHLY_SAME_CREDITS, SAME_CREDIT_PACKS } from "@/lib/api/api-catalog";

export const TIME_CAPSULE_COSTS = {
  1: 10,
  3: 15,
  6: 20,
  12: 30,
  60: 60,
} as const;

export type TimeCapsuleDuration = keyof typeof TIME_CAPSULE_COSTS;

export const BOOST_CREDIT_COSTS = {
  6: 10,
  24: 15,
  72: 30,
} as const;

const CapsuleInput = z.object({
  text: z.string().min(3).max(600),
  open_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  months: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12), z.literal(60)]),
});
const CapsuleIdInput = z.object({ id: z.string().uuid() });

type DbCapsule = {
  id: string;
  text: string;
  open_at?: string;
  created_at?: string;
  openAt?: string;
  createdAt?: string;
};

function mapCapsule(row: DbCapsule) {
  return {
    id: row.id,
    text: row.text,
    openAt: row.open_at ?? row.openAt ?? "",
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  };
}

export const listTimeCapsules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [{ data: capsuleRows, error: capsuleError }, { data: profile, error: profileError }] =
      await Promise.all([
        db.rpc("list_time_capsules", { _user_id: context.userId }),
        db
          .from("profiles")
          .select("same_credits, plan, premium_until")
          .eq("id", context.userId)
          .maybeSingle(),
      ]);
    if (capsuleError) throw new Error(capsuleError.message);
    if (profileError) throw new Error(profileError.message);
    const capsules = ((capsuleRows ?? []) as DbCapsule[]).map(mapCapsule);
    return {
      capsules,
      credits: Number(profile?.same_credits ?? 0),
      premium: effectivePlan(profile) === "premium",
    };
  });

export const createTimeCapsule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CapsuleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await (supabaseAdmin as any).rpc("create_time_capsule", {
      _user_id: context.userId,
      _text: data.text.trim(),
      _open_at: data.open_at,
      _cost: TIME_CAPSULE_COSTS[data.months],
    });
    if (error) return { ok: false as const, error: "Time Capsule could not be saved yet." };
    const payload = (result ?? {}) as {
      ok?: boolean;
      reason?: string;
      cost?: number;
      credits?: number;
      capsule?: DbCapsule;
    };
    if (!payload.ok) {
      if (payload.reason === "insufficient_credits") {
        return {
          ok: false as const,
          error: `You need ${payload.cost ?? TIME_CAPSULE_COSTS[data.months]} Same Credits for this capsule.`,
          reason: payload.reason,
        };
      }
      return {
        ok: false as const,
        error: "Time Capsule could not be saved yet.",
        reason: payload.reason,
      };
    }
    return {
      ok: true as const,
      cost: payload.cost ?? 0,
      credits: payload.credits ?? 0,
      capsule: payload.capsule ? mapCapsule(payload.capsule as DbCapsule) : null,
    };
  });

export const deleteTimeCapsule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CapsuleIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: deleted, error } = await (supabaseAdmin as any).rpc("delete_time_capsule", {
      _user_id: context.userId,
      _id: data.id,
    });
    if (error || deleted !== true)
      return { ok: false as const, error: "Could not delete this capsule." };
    return { ok: true as const };
  });

type CreditLedgerRow = {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
};

export const getCreditLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { error: monthlyError } = await db.rpc("grant_premium_monthly_credits", {
      _user_id: context.userId,
      _amount: PREMIUM_MONTHLY_SAME_CREDITS,
    });
    if (monthlyError) throw new Error(monthlyError.message);
    const [{ data: profile, error: profileError }, { data: rows, error: ledgerError }] =
      await Promise.all([
        db
          .from("profiles")
          .select("same_credits, plan, premium_until")
          .eq("id", context.userId)
          .maybeSingle(),
        db
          .from("same_credit_ledger")
          .select("id, amount, reason, created_at")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
    if (profileError) throw new Error(profileError.message);
    if (ledgerError) throw new Error(ledgerError.message);
    return {
      credits: Number(profile?.same_credits ?? 0),
      premium: effectivePlan(profile) === "premium",
      entries: (rows ?? []) as CreditLedgerRow[],
    };
  });

export const createSameCreditPurchaseIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ pack_key: z.enum(["small", "medium", "large"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const pack = SAME_CREDIT_PACKS.find((item) => item.key === data.pack_key);
    if (!pack) return { ok: false as const, error: "That Credit pack is not available." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: intent, error } = await (supabaseAdmin as any)
      .from("same_credit_purchase_intents")
      .insert({
        user_id: context.userId,
        pack_key: pack.key,
        credits: pack.credits,
        amount_cents: pack.amountCents,
        currency: "USD",
        status: "pending",
        provider: null,
      })
      .select("id, pack_key, credits, amount_cents, currency, status, created_at")
      .single();
    if (error || !intent) return { ok: false as const, error: "We could not prepare checkout." };
    return {
      ok: true as const,
      intent,
      message:
        "Checkout is prepared but payments are not connected yet. No card was charged and no Credits were added.",
    };
  });

export const listSameCreditPurchaseIntents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("same_credit_purchase_intents")
      .select("id, pack_key, credits, amount_cents, currency, status, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error("Purchase history is temporarily unavailable.");
    return { items: data ?? [] };
  });
