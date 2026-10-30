import { createServerFn } from "@tanstack/react-start";
/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase RPC responses use generated schema types outside this source snapshot. */
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scanBannedWords, sendBannedWordWarning } from "@/lib/moderation.server";
import { getVisibilityContext, isVisibleTarget } from "@/lib/content-visibility.server";
import { reviewThingContent } from "@/lib/ai/content-review.server";
import { BOOST_CREDIT_COSTS } from "@/lib/api/credits.functions";
import {
  POST_COOLDOWN_SECONDS,
  THING_DAILY_LIMIT,
  checkInteractionCooldown,
  getCommentCooldown,
  getThingDailyCount,
  markComment,
  markInteraction,
} from "@/lib/anti-spam.server";
const MAX_RAW = 1000;
const MAX_TITLE = 80;

async function getVisibleThing(viewerId: string, thingId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: thing } = await supabaseAdmin
    .from("things")
    .select("id, user_id, hidden, safety_flag, comments_closed, deleted_at")
    .eq("id", thingId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!thing || thing.hidden || thing.safety_flag) return null;
  const visibility = await getVisibilityContext(viewerId, [
    { type: "thing", id: thing.id, authorId: thing.user_id },
  ]);
  return isVisibleTarget(visibility, { type: "thing", id: thing.id, authorId: thing.user_id })
    ? thing
    : null;
}

const ShareThingInput = z.object({ thing_id: z.string().uuid() });

export const recordThingShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ShareThingInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const thing = await getVisibleThing(context.userId, data.thing_id);
    if (!thing) return { ok: false as const, error: "Thing not found." };
    const interaction = await checkInteractionCooldown(supabaseAdmin, context.userId);
    if (!interaction.ok) return { ok: false as const, error: interaction.error };
    const { error } = await (supabaseAdmin as any)
      .from("thing_shares")
      .upsert(
        { thing_id: data.thing_id, user_id: context.userId },
        { onConflict: "thing_id,user_id" },
      );
    if (error) return { ok: false as const, error: "Share signal could not be recorded." };
    await markInteraction(supabaseAdmin, context.userId);
    return { ok: true as const };
  });

const DropInput = z.object({
  raw_text: z.string().min(3).max(MAX_RAW),
  tags: z.array(z.string().min(1).max(40)).min(1, "Pick at least 1 tag.").max(3, "Up to 3 tags."),
  is_anonymous: z.boolean().default(false),
  comments_closed: z.boolean().default(false),
  ai_review: z.enum(["safe", "review"]).default("review"),
});

async function checkMentionsAllowed(
  text: string,
  authorId: string,
): Promise<{ ok: true } | { ok: false; blocked: string[] }> {
  const raw = text.match(/@([a-z0-9_]{2,24})/gi) ?? [];
  const usernames = Array.from(new Set(raw.map((m) => m.slice(1).toLowerCase())));
  if (!usernames.length) return { ok: true };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: users } = await supabaseAdmin
    .from("profiles")
    .select("id, username, allow_mentions")
    .in("username", usernames);
  const blocked = (
    (users as unknown as Array<{ id: string; username: string; allow_mentions?: boolean }>) ?? []
  )
    .filter((u) => u.allow_mentions === false && u.id !== authorId)
    .map((u) => u.username);
  return blocked.length ? { ok: false, blocked } : { ok: true };
}

async function persistMentions(
  text: string,
  opts: { authorId: string; thingId: string; commentId: string | null },
) {
  const raw = text.match(/@([a-z0-9_]{2,24})/gi) ?? [];
  const usernames = Array.from(new Set(raw.map((m) => m.slice(1).toLowerCase())));
  if (!usernames.length) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: users } = await supabaseAdmin
    .from("profiles")
    .select("id, username, allow_mentions")
    .in("username", usernames);
  const rows = (
    (users as unknown as Array<{ id: string; username: string; allow_mentions?: boolean }>) ?? []
  )
    .filter((u) => u.allow_mentions !== false && u.id !== opts.authorId)
    .map((u) => ({
      comment_id: opts.commentId,
      thing_id: opts.thingId,
      mentioned_user_id: u.id,
      author_user_id: opts.authorId,
    }));
  if (rows.length) {
    await supabaseAdmin.from("mentions" as never).insert(rows as never);
  }
}

async function queueThingForAiReview(thingId: string, userId: string, text: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data: review, error } = await db
    .from("ai_safety_reviews")
    .insert({
      thing_id: thingId,
      user_id: userId,
      outcome: "unavailable",
      label: "It should be checked.",
      reason: "AI review was inconclusive at publish time.",
    })
    .select("id")
    .single();
  if (error || !review) {
    console.error("queueThingForAiReview insert", error);
    return;
  }

  void runFollowUpAiReview(review.id, text);
}

async function runFollowUpAiReview(reviewId: string, text: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  try {
    const result = await reviewThingContent(text);
    if (result.ok) {
      await db
        .from("ai_safety_reviews")
        .update({
          status: "dismissed",
          reason: "Follow-up AI review passed.",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reviewId);
      return;
    }
    await db
      .from("ai_safety_reviews")
      .update({
        outcome: result.reason,
        reason: result.message,
        last_attempt_at: new Date().toISOString(),
      })
      .eq("id", reviewId);
  } catch (error) {
    console.error("queueThingForAiReview retry", error);
  }
}

export const dropThing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => DropInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("last_post_at, language, muted_until, warnings_count, messages_open")
      .eq("id", userId)
      .maybeSingle();

    if (prof?.muted_until && new Date(prof.muted_until).getTime() > Date.now()) {
      const mins = Math.ceil((new Date(prof.muted_until).getTime() - Date.now()) / 60000);
      return { error: `You're temporarily muted (${mins}m left).` as string, thing: null };
    }

    if (prof?.last_post_at) {
      const diff = (Date.now() - new Date(prof.last_post_at).getTime()) / 1000;
      if (diff < POST_COOLDOWN_SECONDS) {
        const wait = Math.ceil(POST_COOLDOWN_SECONDS - diff);
        return { error: `Slow down. Try again in ${wait}s.` as string, thing: null };
      }
    }

    const dailyCount = await getThingDailyCount(supabase, userId);
    if (dailyCount === null) {
      return { error: "Could not verify today's posting limit. Please try again.", thing: null };
    }
    if (dailyCount >= THING_DAILY_LIMIT) {
      return {
        error:
          "You have reached today's limit of 3 Things. You can post again after the UTC day resets.",
        thing: null,
      };
    }

    const mc = await checkMentionsAllowed(data.raw_text, userId);
    if (!mc.ok) {
      return {
        error: `@${mc.blocked[0]} doesn't accept mentions. Remove it to post.`,
        thing: null,
      };
    }

    const bwHits = await scanBannedWords(data.raw_text);
    if (bwHits.length > 0) {
      await sendBannedWordWarning(userId, bwHits, "thing");
      return {
        error: `Your post contains forbidden word(s): ${bwHits.map((h) => `"${h.word}"`).join(", ")}.`,
        thing: null,
      };
    }

    // AI is advisory at publish time. Deterministic platform policy checks above
    // remain blocking; a suspicious/unavailable model result is queued after the
    // Thing is created so the user never loses their post to a model timeout.
    const simplified_text = data.raw_text.trim();
    const language = prof?.language || "en";

    const title =
      simplified_text.length <= MAX_TITLE
        ? simplified_text
        : simplified_text.split(/\s+/).slice(0, 8).join(" ").slice(0, MAX_TITLE);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("things")
      .insert({
        user_id: userId,
        raw_text: data.raw_text,
        simplified_text,
        title,
        language,
        tags: data.tags,
        is_anonymous: data.is_anonymous,
        is_open_to_chat: prof?.messages_open ?? false,
        comments_closed: data.comments_closed,
        safety_flag: false,
        hidden: false,
      })
      .select("*")
      .single();

    if (insErr) {
      console.error("insert thing error", insErr);
      return { error: "Could not save your thing.", thing: null };
    }

    await supabaseAdmin
      .from("profiles")
      .update({ last_post_at: new Date().toISOString() })
      .eq("id", userId);

    try {
      await persistMentions(data.raw_text, {
        authorId: userId,
        thingId: inserted.id,
        commentId: null,
      });
    } catch (e) {
      console.error("thing mention persist failed", e);
    }

    if (data.ai_review === "review") {
      await queueThingForAiReview(inserted.id, userId, data.raw_text);
    }

    return { error: null as string | null, thing: inserted };
  });

// ---- Vote --------------------------------------------------------
const VoteInput = z.object({
  thing_id: z.string().uuid(),
  vote_type: z.enum(["same", "nah"]),
});

export const voteOnThing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => VoteInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const owner = await getVisibleThing(userId, data.thing_id);
    if (!owner) {
      return { error: "This Thing is not available.", thing: null };
    }
    if (owner.user_id === userId) {
      return { error: "You can't vote on your own thing." as string | null, thing: null };
    }

    const interaction = await checkInteractionCooldown(supabase, userId);
    if (!interaction.ok) return { error: interaction.error, thing: null };

    const { error } = await supabase
      .from("votes")
      .upsert(
        { thing_id: data.thing_id, user_id: userId, vote_type: data.vote_type },
        { onConflict: "thing_id,user_id" },
      );
    if (error) {
      console.error("vote error", error);
      return { error: `Vote failed: ${error.message}` as string | null, thing: null };
    }

    const { data: thing } = await supabase
      .from("things")
      .select("id, same_count, nah_count, total_votes, similarity_score")
      .eq("id", data.thing_id)
      .maybeSingle();
    await markInteraction(supabase, userId);

    return { error: null as string | null, thing };
  });

// ---- Thing likes --------------------------------------------------
const ThingIdInput = z.object({ thing_id: z.string().uuid() });
const ThingLikeIdInput = z.object({ id: z.string().uuid() });

export const likeThing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ThingIdInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin;
    const target = await getVisibleThing(context.userId, data.thing_id);
    if (!target) {
      return { error: "This Thing is not available to like." };
    }
    const interaction = await checkInteractionCooldown(db, context.userId);
    if (!interaction.ok) return { error: interaction.error };
    const { error } = await db.from("thing_likes").insert({
      thing_id: data.thing_id,
      user_id: context.userId,
    });
    if (error && error.code !== "23505") {
      console.error("likeThing", error);
      return { error: "Could not like Thing." };
    }
    await markInteraction(db, context.userId);
    return { error: null as string | null };
  });

export const unlikeThing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ThingLikeIdInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("thing_likes")
      .delete()
      .eq("thing_id", data.id)
      .eq("user_id", context.userId);
    if (error) {
      console.error("unlikeThing", error);
      return { error: "Could not unlike Thing." };
    }
    return { error: null as string | null };
  });

// ---- Comment -----------------------------------------------------
const CommentInput = z.object({
  thing_id: z.string().uuid(),
  text: z.string().min(1).max(500),
  is_anonymous: z.boolean().default(true),
  parent_id: z.string().uuid().nullable().optional(),
});

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => CommentInput.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const t = await getVisibleThing(userId, data.thing_id);
    if (!t) {
      return { error: "This Thing is not available.", comment: null };
    }
    if (t.comments_closed) {
      return { error: "Comments are closed on this thing.", comment: null };
    }

    const commentCooldown = await getCommentCooldown(supabaseAdmin, userId);
    if (!commentCooldown.ok) return { error: commentCooldown.error, comment: null };

    const mc = await checkMentionsAllowed(data.text, userId);
    if (!mc.ok) {
      return {
        error: `@${mc.blocked[0]} doesn't accept mentions. Remove it to send.`,
        comment: null,
      };
    }

    const bwHits = await scanBannedWords(data.text);
    if (bwHits.some((h) => h.severity === "block")) {
      await sendBannedWordWarning(userId, bwHits, "comment");
      return {
        error: `Your comment contains forbidden word(s): ${bwHits.map((h) => `"${h.word}"`).join(", ")}.`,
        comment: null,
      };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("comments")
      .insert({
        thing_id: data.thing_id,
        user_id: userId,
        text: data.text,
        is_anonymous: data.is_anonymous,
        parent_id: data.parent_id ?? null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("comment error", error);
      return { error: `Comment failed: ${error.message}`, comment: null };
    }

    try {
      await persistMentions(data.text, {
        authorId: userId,
        thingId: data.thing_id,
        commentId: inserted.id,
      });
    } catch (e) {
      console.error("comment mention persist failed", e);
    }

    await markComment(supabaseAdmin, userId);

    if (bwHits.length) {
      try {
        await sendBannedWordWarning(userId, bwHits, "comment");
      } catch (e) {
        console.error("bw warn", e);
      }
    }

    return { error: null as string | null, comment: inserted };
  });

// ---- Report ------------------------------------------------------
const ReportInput = z.object({
  target_type: z.enum(["thing", "quote", "comment", "user"]),
  target_id: z.string().uuid(),
  reason: z.string().min(1).max(60),
});

export const reportTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ReportInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("reports").insert({ ...data, reporter_id: userId });
    if (error && !String(error.message).includes("duplicate")) {
      return { error: "Could not file report." };
    }
    return { error: null as string | null };
  });

// ---- Pin/Unpin comment (thing owner only) ------------------------
const PinInput = z.object({
  comment_id: z.string().uuid(),
  pin: z.boolean(),
});

export const pinComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => PinInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin
      .from("comments")
      .select("thing_id")
      .eq("id", data.comment_id)
      .maybeSingle();
    if (!c) return { error: "Comment not found." };
    if (!c.thing_id) return { error: "Only Thing comments can be pinned." };
    const { data: t } = await supabaseAdmin
      .from("things")
      .select("user_id")
      .eq("id", c.thing_id)
      .maybeSingle();
    if (!t || t.user_id !== context.userId) return { error: "Only the thing owner can pin." };
    const { error } = await supabaseAdmin
      .from("comments")
      .update({ pinned_at: data.pin ? new Date().toISOString() : null })
      .eq("id", data.comment_id);
    if (error) return { error: "Could not update pin." };
    return { error: null as string | null };
  });

// ---- Onboarding update -------------------------------------------
const OnboardInput = z.object({
  username: z
    .string()
    .min(2)
    .max(24)
    .regex(/^[a-z0-9_]+$/, "lowercase letters, numbers, underscores"),
  emoji: z.string().min(1).max(4),
  language: z.enum(["en", "tr"]),
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => OnboardInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        username: data.username,
        emoji: data.emoji,
        language: data.language,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) {
      if (String(error.message).toLowerCase().includes("unique")) {
        return { error: "That username is taken." };
      }
      return { error: "Could not save profile." };
    }
    return { error: null as string | null };
  });

// ---- Comment edit/delete ------------------------------------------
const CommentEditInput = z.object({
  id: z.string().uuid(),
  text: z.string().trim().min(1).max(500),
});
const CommentIdInput = z.object({ id: z.string().uuid() });

export const updateComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CommentEditInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("comments")
      .select("id, user_id, thing_id, quote_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing || existing.user_id !== context.userId)
      return { error: "You can only edit your own comment." };

    const mentionCheck = await checkMentionsAllowed(data.text, context.userId);
    if (!mentionCheck.ok)
      return { error: `@${mentionCheck.blocked[0]} doesn't accept mentions. Remove it to save.` };
    const banned = await scanBannedWords(data.text);
    if (banned.some((hit) => hit.severity === "block")) {
      return {
        error: `Your comment contains forbidden word(s): ${banned.map((hit) => `"${hit.word}"`).join(", ")}.`,
      };
    }

    const { data: updated, error } = await supabaseAdmin
      .from("comments")
      .update({ text: data.text, edited_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("id, text, edited_at")
      .maybeSingle();
    if (error || !updated) return { error: "Could not update your comment." };

    await supabaseAdmin
      .from("mentions" as never)
      .delete()
      .eq("comment_id", data.id);
    if (existing.thing_id) {
      try {
        await persistMentions(data.text, {
          authorId: context.userId,
          thingId: existing.thing_id,
          commentId: data.id,
        });
      } catch (error) {
        console.error("edited comment mention persist failed", error);
      }
    }
    return { error: null as string | null, comment: updated };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CommentIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: deleted, error } = await supabaseAdmin
      .from("comments")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("id")
      .maybeSingle();
    if (error || !deleted) return { error: "Could not delete your comment." };
    await supabaseAdmin
      .from("mentions" as never)
      .delete()
      .eq("comment_id", data.id);
    return { error: null as string | null };
  });

// ---- Thing owner actions ------------------------------------------
const ThingOwnerUpdateInput = z.object({
  id: z.string().uuid(),
  is_anonymous: z.boolean().optional(),
  comments_closed: z.boolean().optional(),
});
const ThingBoostInput = z.object({
  id: z.string().uuid(),
  duration_hours: z.union([z.literal(6), z.literal(24), z.literal(72)]),
});

export const updateThing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ThingOwnerUpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const update: Record<string, boolean> = {};
    if (data.is_anonymous !== undefined) update.is_anonymous = data.is_anonymous;
    if (data.comments_closed !== undefined) update.comments_closed = data.comments_closed;
    if (Object.keys(update).length === 0) return { error: "Nothing to update." };
    const { data: row, error } = await supabaseAdmin
      .from("things")
      .update(update as never)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("id, is_anonymous, comments_closed")
      .maybeSingle();
    if (error || !row) return { error: "Could not update your Thing." };
    return { error: null as string | null, thing: row };
  });

export const deleteThing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: updated, error } = await db
      .from("things")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .is("deleted_at", null)
      .select("id, deleted_at")
      .maybeSingle();
    if (error || !updated) return { error: "Could not remove your Thing." };
    return { error: null as string | null, thing: updated };
  });

export const restoreThing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: restored, error } = await db
      .from("things")
      .update({ deleted_at: null })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .not("deleted_at", "is", null)
      .select("id, deleted_at")
      .maybeSingle();
    if (error || !restored) return { error: "Could not restore your Thing." };
    return { error: null as string | null, thing: restored };
  });

export const boostThing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ThingBoostInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cost = BOOST_CREDIT_COSTS[data.duration_hours];
    const { data: result, error } = await (supabaseAdmin as any).rpc("boost_thing_with_credits", {
      _user_id: context.userId,
      _thing_id: data.id,
      _duration_hours: data.duration_hours,
      _cost: cost,
    });
    if (error) {
      console.error("boostThing RPC failed", error);
      return { error: "Boost could not be completed yet. Please try again." };
    }
    const payload = (result ?? {}) as {
      ok?: boolean;
      reason?: string;
      cost?: number;
      credits?: number;
      thing?: {
        id: string;
        boosted_at: string;
        boosted_until: string;
        boost_duration_hours: number;
      };
    };
    if (!payload.ok) {
      if (payload.reason === "insufficient_credits") {
        return { error: `You need ${payload.cost ?? cost} Same Credits for this Boost.` };
      }
      if (payload.reason === "not_owner") return { error: "Only your own Thing can be boosted." };
      if (payload.reason === "profile_not_found")
        return { error: "Your profile could not be loaded." };
      if (payload.reason === "invalid") return { error: "That Boost option is not available." };
      return { error: "Boost could not be completed yet. Please try again." };
    }
    return {
      error: null as string | null,
      cost: payload.cost ?? 0,
      credits: payload.credits ?? 0,
      thing: payload.thing ?? null,
    };
  });
