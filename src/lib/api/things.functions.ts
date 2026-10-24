import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scanBannedWords, sendBannedWordWarning } from "@/lib/moderation.server";

const POST_COOLDOWN_SECONDS = 60;
const COMMENT_COOLDOWN_SECONDS = 15;
const MAX_RAW = 1000;
const MAX_TITLE = 80;

const DropInput = z.object({
  raw_text: z.string().min(3).max(MAX_RAW),
  title: z.string().max(MAX_TITLE).optional().nullable(),
  tags: z.array(z.string().min(1).max(40)).min(1, "Pick at least 1 tag.").max(3, "Up to 3 tags."),
  is_anonymous: z.boolean().default(false),
  comments_closed: z.boolean().default(false),
});

async function checkMentionsAllowed(text: string, authorId: string): Promise<{ ok: true } | { ok: false; blocked: string[] }> {
  const raw = text.match(/@([a-z0-9_]{2,24})/gi) ?? [];
  const usernames = Array.from(new Set(raw.map((m) => m.slice(1).toLowerCase())));
  if (!usernames.length) return { ok: true };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: users } = await supabaseAdmin
    .from("profiles")
    .select("id, username, allow_mentions")
    .in("username", usernames);
  const blocked = ((users as unknown as Array<{ id: string; username: string; allow_mentions?: boolean }>) ?? [])
    .filter((u) => u.allow_mentions === false && u.id !== authorId)
    .map((u) => u.username);
  return blocked.length ? { ok: false, blocked } : { ok: true };
}

async function persistMentions(text: string, opts: { authorId: string; thingId: string; commentId: string | null }) {
  const raw = text.match(/@([a-z0-9_]{2,24})/gi) ?? [];
  const usernames = Array.from(new Set(raw.map((m) => m.slice(1).toLowerCase())));
  if (!usernames.length) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: users } = await supabaseAdmin
    .from("profiles")
    .select("id, username, allow_mentions")
    .in("username", usernames);
  const rows = ((users as unknown as Array<{ id: string; username: string; allow_mentions?: boolean }>) ?? [])
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

    const mc = await checkMentionsAllowed(data.raw_text, userId);
    if (!mc.ok) {
      return { error: `@${mc.blocked[0]} doesn't accept mentions. Remove it to post.`, thing: null };
    }

    const bwHits = await scanBannedWords(data.raw_text);
    if (bwHits.some((h) => h.severity === "block")) {
      await sendBannedWordWarning(userId, bwHits, "thing");
      return { error: `Your post contains forbidden word(s): ${bwHits.map((h) => `"${h.word}"`).join(", ")}.`, thing: null };
    }

    const simplified_text = data.raw_text.trim();
    const language = prof?.language || "en";

    let title = (data.title || "").trim();
    if (!title) {
      title = simplified_text.length <= MAX_TITLE
        ? simplified_text
        : simplified_text.split(/\s+/).slice(0, 8).join(" ").slice(0, MAX_TITLE);
    }

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

    await supabaseAdmin.from("profiles").update({ last_post_at: new Date().toISOString() }).eq("id", userId);

    try { await persistMentions(data.raw_text, { authorId: userId, thingId: inserted.id, commentId: null }); }
    catch (e) { console.error("thing mention persist failed", e); }

    if (bwHits.length) { try { await sendBannedWordWarning(userId, bwHits, "thing"); } catch (e) { console.error("bw warn", e); } }

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

    const { data: owner } = await supabase
      .from("things").select("user_id").eq("id", data.thing_id).maybeSingle();
    if (owner?.user_id === userId) {
      return { error: "You can't vote on your own thing." as string | null, thing: null };
    }

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

    return { error: null as string | null, thing };
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
    const { supabase, userId } = context;

    const { data: t } = await supabase
      .from("things").select("comments_closed").eq("id", data.thing_id).maybeSingle();
    if (t?.comments_closed) {
      return { error: "Comments are closed on this thing.", comment: null };
    }

    const { data: prof } = await supabase
      .from("profiles").select("last_comment_at").eq("id", userId).maybeSingle();
    if (prof?.last_comment_at) {
      const diff = (Date.now() - new Date(prof.last_comment_at).getTime()) / 1000;
      if (diff < COMMENT_COOLDOWN_SECONDS) {
        const wait = Math.ceil(COMMENT_COOLDOWN_SECONDS - diff);
        return { error: `Wait ${wait}s before commenting again.`, comment: null };
      }
    }

    const mc = await checkMentionsAllowed(data.text, userId);
    if (!mc.ok) {
      return { error: `@${mc.blocked[0]} doesn't accept mentions. Remove it to send.`, comment: null };
    }

    const bwHits = await scanBannedWords(data.text);
    if (bwHits.some((h) => h.severity === "block")) {
      await sendBannedWordWarning(userId, bwHits, "comment");
      return { error: `Your comment contains forbidden word(s): ${bwHits.map((h) => `"${h.word}"`).join(", ")}.`, comment: null };
    }

    const { data: inserted, error } = await supabase
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

    try { await persistMentions(data.text, { authorId: userId, thingId: data.thing_id, commentId: inserted.id }); }
    catch (e) { console.error("comment mention persist failed", e); }

    await supabase.from("profiles").update({ last_comment_at: new Date().toISOString() }).eq("id", userId);

    if (bwHits.length) { try { await sendBannedWordWarning(userId, bwHits, "comment"); } catch (e) { console.error("bw warn", e); } }

    return { error: null as string | null, comment: inserted };
  });

// ---- Report ------------------------------------------------------
const ReportInput = z.object({
  target_type: z.enum(["thing", "comment"]),
  target_id: z.string().uuid(),
  reason: z.string().min(1).max(60),
});

export const reportTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ReportInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("reports")
      .insert({ ...data, reporter_id: userId });
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
      .from("comments").select("thing_id").eq("id", data.comment_id).maybeSingle();
    if (!c) return { error: "Comment not found." };
    const { data: t } = await supabaseAdmin
      .from("things").select("user_id").eq("id", c.thing_id).maybeSingle();
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
  username: z.string().min(2).max(24).regex(/^[a-z0-9_]+$/, "lowercase letters, numbers, underscores"),
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
