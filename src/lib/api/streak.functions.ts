import { createServerFn } from "@tanstack/react-start";

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

const disabled = () => {
  throw new Error("Streak is currently unavailable. Existing Streak data is preserved.");
};

export const getStreakOverview = createServerFn({ method: "GET" }).handler(disabled);
export const startStreak = createServerFn({ method: "POST" }).handler(disabled);
export const checkInStreak = startStreak;
export const purchaseStreakFreeze = createServerFn({ method: "POST" }).handler(disabled);
