/* Server-only anti-spam helpers. */
/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase server client is intentionally abstracted at this boundary. */

export const THING_DAILY_LIMIT = 3;
export const POST_COOLDOWN_SECONDS = 60;
export const COMMENT_COOLDOWN_SECONDS = 15;
export const INTERACTION_COOLDOWN_SECONDS = 5;

type Db = {
  from: (table: string) => any;
};

export function utcDayStart(now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString();
}

export async function getThingDailyCount(db: Db, userId: string) {
  const { count, error } = await db
    .from("things")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null)
    .gte("created_at", utcDayStart());
  if (error) {
    console.error("thing daily count", error);
    return null;
  }
  return count ?? 0;
}

export async function checkInteractionCooldown(db: Db, userId: string) {
  const { data: profile, error } = await db
    .from("profiles")
    .select("last_interaction_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("interaction cooldown read", error);
    return { ok: false as const, error: "Please try again in a moment." };
  }
  if (profile?.last_interaction_at) {
    const elapsed = (Date.now() - new Date(profile.last_interaction_at).getTime()) / 1000;
    if (Number.isFinite(elapsed) && elapsed < INTERACTION_COOLDOWN_SECONDS) {
      const wait = Math.max(1, Math.ceil(INTERACTION_COOLDOWN_SECONDS - elapsed));
      return { ok: false as const, error: `Wait ${wait}s before another action.` };
    }
  }
  return { ok: true as const };
}

export async function markInteraction(db: Db, userId: string) {
  const { error } = await db
    .from("profiles")
    .update({ last_interaction_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) console.error("interaction cooldown write", error);
}

export async function getCommentCooldown(db: Db, userId: string) {
  const { data: profile, error } = await db
    .from("profiles")
    .select("last_comment_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("comment cooldown read", error);
    return { ok: false as const, error: "Please try again in a moment." };
  }
  if (profile?.last_comment_at) {
    const elapsed = (Date.now() - new Date(profile.last_comment_at).getTime()) / 1000;
    if (Number.isFinite(elapsed) && elapsed < COMMENT_COOLDOWN_SECONDS) {
      const wait = Math.max(1, Math.ceil(COMMENT_COOLDOWN_SECONDS - elapsed));
      return { ok: false as const, error: `Wait ${wait}s before commenting again.` };
    }
  }
  return { ok: true as const };
}

export async function markComment(db: Db, userId: string) {
  const { error } = await db
    .from("profiles")
    .update({ last_comment_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) console.error("comment cooldown write", error);
}
