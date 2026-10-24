import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type StreakOverview = {
  is_started: boolean;
  current_streak: number;
  best_streak: number;
  total_checkins: number;
  last_checkin_date: string | null;
  last_checkin_at: string | null;
  checked_in_today: boolean;
  extended_today: boolean;
  freeze_balance: number;
  freeze_purchased_count: number;
  freeze_used_total: number;
  next_milestone: number;
};

const EmptyInput = z.object({});

const MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365];

function nextMilestone(current: number) {
  return (
    MILESTONES.find((milestone) => milestone > current) ?? Math.ceil((current + 1) / 100) * 100
  );
}

function buildOverview(
  row?: Partial<StreakOverview> | null,
  overrides?: Partial<StreakOverview>,
): StreakOverview {
  const current = Number(row?.current_streak ?? overrides?.current_streak ?? 0);
  return {
    is_started: Boolean(row) || Boolean(overrides?.is_started),
    current_streak: current,
    best_streak: Number(row?.best_streak ?? overrides?.best_streak ?? 0),
    total_checkins: Number(row?.total_checkins ?? overrides?.total_checkins ?? 0),
    last_checkin_date: row?.last_checkin_date ?? overrides?.last_checkin_date ?? null,
    last_checkin_at: row?.last_checkin_at ?? overrides?.last_checkin_at ?? null,
    checked_in_today: Boolean(row?.checked_in_today ?? overrides?.checked_in_today),
    extended_today: Boolean(row?.extended_today ?? overrides?.extended_today),
    freeze_balance: Number(row?.freeze_balance ?? overrides?.freeze_balance ?? 0),
    freeze_purchased_count: Number(
      row?.freeze_purchased_count ?? overrides?.freeze_purchased_count ?? 0,
    ),
    freeze_used_total: Number(row?.freeze_used_total ?? overrides?.freeze_used_total ?? 0),
    next_milestone: nextMilestone(current),
  };
}

export const getStreakOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => EmptyInput.parse(input))
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("user_streaks" as never)
      .select(
        "current_streak, best_streak, total_checkins, last_checkin_date, last_checkin_at, freeze_balance, freeze_purchased_count, freeze_used_total",
      )
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const today = new Date().toISOString().slice(0, 10);
    const streakRow = data as unknown as Partial<StreakOverview> | null;
    return buildOverview(streakRow, {
      checked_in_today: streakRow?.last_checkin_date === today,
    });
  });

export const startStreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => EmptyInput.parse(input))
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin.rpc(
      "record_streak_checkin" as never,
      {
        _user_id: context.userId,
      } as never,
    );
    if (error) throw new Error("Your Streak could not be checked in yet.");
    return buildOverview(data as unknown as Partial<StreakOverview>, { is_started: true });
  });

export const checkInStreak = startStreak;

export const purchaseStreakFreeze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ count: z.number().int().min(1).max(3) }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: result, error } = await supabaseAdmin.rpc(
      "purchase_streak_freeze" as never,
      { _user_id: context.userId, _count: data.count } as never,
    );
    if (error) throw new Error(error.message);
    const payload = result as {
      ok?: boolean;
      reason?: string;
      cost?: number;
      credits?: number;
      freeze_balance?: number;
      premium_included?: boolean;
    };
    if (!payload.ok) {
      const messages: Record<string, string> = {
        streak_not_started: "Start your Streak before adding a Freeze.",
        purchase_limit: "You can add up to three paid Freezes.",
        insufficient_credits: `You need ${payload.cost ?? data.count * 30} Same Credits for this purchase.`,
        invalid: "That Freeze purchase is not available.",
      };
      throw new Error(messages[payload.reason ?? ""] ?? "Streak Freeze could not be added.");
    }
    return { ...payload, ok: true };
  });
