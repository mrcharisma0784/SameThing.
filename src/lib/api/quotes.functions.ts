import { createServerFn } from "@tanstack/react-start";
/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase generated types lag behind the live quote schema at this server-only boundary. */
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { effectivePlan } from "@/lib/premium";
import { getVisibilityContext, isVisibleTarget } from "@/lib/content-visibility.server";
import { scanBannedWords, sendBannedWordWarning } from "@/lib/moderation.server";
import {
  checkInteractionCooldown,
  getCommentCooldown,
  markComment,
  markInteraction,
} from "@/lib/anti-spam.server";

async function getOptionalUserId(): Promise<string | null> {
  try {
    const request = getRequest();
    const authorization = request?.headers?.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return null;
    const token = authorization.slice(7);
    if (!token) return null;
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await client.auth.getClaims(token);
    return (data?.claims?.sub as string) ?? null;
  } catch {
    return null;
  }
}

const QuoteInput = z.object({
  text: z.string().trim().min(8).max(220),
  author: z.string().trim().max(80).nullable().optional(),
  is_anonymous: z.boolean().default(false),
});

const QuoteUpdateInput = QuoteInput.extend({
  id: z.string().uuid(),
});

const QuoteIdInput = z.object({ id: z.string().uuid() });

async function enrichQuotes(rows: any[], currentUserId?: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))] as string[];
  const [{ data: profiles }, { data: likes }] = await Promise.all([
    userIds.length
      ? db
          .from("profiles")
          .select("id, username, emoji, avatar_url, plan, premium_until")
          .in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    currentUserId && rows.length
      ? db
          .from("quote_likes")
          .select("quote_id")
          .eq("user_id", currentUserId)
          .in(
            "quote_id",
            rows.map((row) => row.id),
          )
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const profileById = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
  const liked = new Set((likes ?? []).map((like: any) => like.quote_id));
  return rows.map((row) => {
    const profile =
      row.is_anonymous || !row.user_id ? null : (profileById.get(row.user_id) ?? null);
    return {
      ...row,
      profile: profile ? { ...profile, plan: effectivePlan(profile) } : null,
      liked_by_me: liked.has(row.id),
      is_mine: Boolean(currentUserId && row.user_id === currentUserId),
    };
  });
}

async function enrichQuoteComments(rows: any[], currentUserId?: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))] as string[];
  const { data: profiles } = userIds.length
    ? await supabaseAdmin
        .from("profiles")
        .select("id, username, emoji, avatar_url, plan, premium_until")
        .in("id", userIds)
    : { data: [] as any[] };
  const profileById = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
  return rows.map((row) => ({
    ...row,
    profile:
      row.is_anonymous || !row.user_id
        ? null
        : (() => {
            const profile = profileById.get(row.user_id);
            return profile ? { ...profile, plan: effectivePlan(profile) } : null;
          })(),
    is_mine: Boolean(currentUserId && row.user_id === currentUserId),
  }));
}

export const getQuotesToday = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const day = new Date().toISOString().slice(0, 10);
  const { data, error } = await db
    .from("quotes")
    .select(
      "id, user_id, text, author, is_anonymous, day, like_count, comment_count, share_palette, share_font, created_at, updated_at",
    )
    .eq("day", day)
    .eq("hidden", false)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    console.error("getQuotesToday", error);
    return { quotes: [] as any[] };
  }
  const viewerId = await getOptionalUserId();
  const rows = (data ?? []) as any[];
  const visibility = await getVisibilityContext(
    viewerId,
    rows.map((quote) => ({ type: "quote" as const, id: quote.id, authorId: quote.user_id })),
  );
  const visibleRows = rows.filter((quote) =>
    isVisibleTarget(visibility, { type: "quote", id: quote.id, authorId: quote.user_id }),
  );
  const quotes = await enrichQuotes(visibleRows, viewerId);
  const quoteIds = quotes.map((quote) => quote.id);
  if (!viewerId || quoteIds.length === 0) {
    return { quotes: quotes.map((quote) => ({ ...quote, comments: [] })) };
  }
  const { data: comments, error: commentsError } = await db
    .from("comments")
    .select("id, quote_id, text, is_anonymous, created_at, user_id, parent_id")
    .in("quote_id", quoteIds)
    .eq("hidden", false)
    .order("created_at", { ascending: true })
    .limit(300);
  if (commentsError) {
    console.error("getQuotesToday comments", commentsError);
    return { quotes: quotes.map((quote) => ({ ...quote, comments: [] })) };
  }
  const commentRows = (comments ?? []) as any[];
  const commentVisibility = await getVisibilityContext(
    viewerId,
    commentRows.map((comment) => ({
      type: "comment" as const,
      id: comment.id,
      authorId: comment.user_id,
    })),
  );
  const visibleCommentRows = commentRows.filter((comment) =>
    isVisibleTarget(commentVisibility, {
      type: "comment",
      id: comment.id,
      authorId: comment.user_id,
    }),
  );
  const enrichedComments = await enrichQuoteComments(visibleCommentRows, viewerId);
  const commentsByQuote = new Map<string, any[]>();
  enrichedComments.forEach((comment) => {
    if (!comment.quote_id) return;
    const list = commentsByQuote.get(comment.quote_id) ?? [];
    list.push(comment);
    commentsByQuote.set(comment.quote_id, list);
  });
  return {
    quotes: quotes.map((quote) => ({ ...quote, comments: commentsByQuote.get(quote.id) ?? [] })),
  };
});

export const getMyQuote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const day = new Date().toISOString().slice(0, 10);
    const { data, error } = await db
      .from("quotes")
      .select(
        "id, user_id, text, author, is_anonymous, day, like_count, share_palette, share_font, created_at, updated_at",
      )
      .eq("user_id", context.userId)
      .eq("day", day)
      .is("deleted_at", null)
      .maybeSingle();
    if (error && error.code !== "PGRST116") {
      console.error("getMyQuote", error);
      return { quote: null };
    }
    if (!data) return { quote: null };
    const [quote] = await enrichQuotes([data], context.userId);
    return { quote: quote ?? null };
  });

export const createQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => QuoteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const day = new Date().toISOString().slice(0, 10);
    const { data: existing } = await db
      .from("quotes")
      .select("id")
      .eq("user_id", context.userId)
      .eq("day", day)
      .maybeSingle();
    if (existing)
      return { error: "You already have a quote today. Edit it instead.", id: existing.id };
    const { data: row, error } = await db
      .from("quotes")
      .insert({
        user_id: context.userId,
        text: data.text,
        author: data.author || null,
        is_anonymous: data.is_anonymous,
        day,
      })
      .select("id")
      .single();
    if (error) {
      console.error("createQuote", error);
      return { error: "Could not publish your quote." };
    }
    return { error: null as string | null, id: row.id };
  });

export const updateQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => QuoteUpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { error } = await db
      .from("quotes")
      .update({ text: data.text, author: data.author || null, is_anonymous: data.is_anonymous })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) {
      console.error("updateQuote", error);
      return { error: "Could not update your quote." };
    }
    return { error: null as string | null };
  });

export const deleteQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => QuoteIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: updated, error } = await db
      .from("quotes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .is("deleted_at", null)
      .select("id, deleted_at")
      .maybeSingle();
    if (error || !updated) return { error: "Could not remove your quote." };
    return { error: null as string | null, quote: updated };
  });

export const restoreQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => QuoteIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: restored, error } = await db
      .from("quotes")
      .update({ deleted_at: null })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .not("deleted_at", "is", null)
      .select("id, deleted_at")
      .maybeSingle();
    if (error || !restored) return { error: "Could not restore your quote." };
    return { error: null as string | null, quote: restored };
  });

export const likeQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => QuoteIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: quote } = await db
      .from("quotes")
      .select("id, user_id, hidden")
      .eq("id", data.id)
      .maybeSingle();
    if (!quote || quote.hidden) return { error: "Quote not found." };
    const visibility = await getVisibilityContext(context.userId, [
      { type: "quote", id: quote.id, authorId: quote.user_id },
    ]);
    if (!isVisibleTarget(visibility, { type: "quote", id: quote.id, authorId: quote.user_id })) {
      return { error: "Quote not found." };
    }
    const interaction = await checkInteractionCooldown(db, context.userId);
    if (!interaction.ok) return { error: interaction.error };
    const { error } = await db
      .from("quote_likes")
      .insert({ quote_id: data.id, user_id: context.userId });
    if (error && error.code !== "23505") return { error: "Could not like quote." };
    await markInteraction(db, context.userId);
    return { error: null as string | null };
  });

export const unlikeQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => QuoteIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { error } = await db
      .from("quote_likes")
      .delete()
      .eq("quote_id", data.id)
      .eq("user_id", context.userId);
    return { error: error ? "Could not unlike quote." : null };
  });

const QuoteCommentInput = z.object({
  quote_id: z.string().uuid(),
  text: z.string().trim().min(1).max(500),
  is_anonymous: z.boolean().default(true),
  parent_id: z.string().uuid().nullable().optional(),
});

const QuotePinInput = z.object({
  comment_id: z.string().uuid(),
  pin: z.boolean(),
});

export const getQuoteDetail = createServerFn({ method: "GET" })
  .inputValidator((input) => QuoteIdInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const viewerId = await getOptionalUserId();
    const { data: row, error } = await db
      .from("quotes")
      .select(
        "id, user_id, text, author, is_anonymous, day, like_count, comment_count, share_palette, share_font, report_count, hidden, created_at, updated_at, deleted_at",
      )
      .eq("id", data.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !row || (row.hidden && row.user_id !== viewerId))
      return { quote: null, comments: [], previous: null, next: null };
    const quoteVisibility = await getVisibilityContext(viewerId, [
      { type: "quote", id: row.id, authorId: row.user_id },
    ]);
    if (!isVisibleTarget(quoteVisibility, { type: "quote", id: row.id, authorId: row.user_id })) {
      return { quote: null, comments: [], previous: null, next: null };
    }

    const [quote] = await enrichQuotes([row], viewerId);
    const { data: siblings } = await db
      .from("quotes")
      .select(
        "id, user_id, text, author, is_anonymous, day, like_count, comment_count, share_palette, share_font, created_at, updated_at",
      )
      .eq("day", row.day)
      .eq("hidden", false)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(100);
    const siblingRows = (siblings ?? []) as any[];
    const siblingVisibility = await getVisibilityContext(
      viewerId,
      siblingRows.map((item) => ({ type: "quote" as const, id: item.id, authorId: item.user_id })),
    );
    const ordered = siblingRows.filter((item) =>
      isVisibleTarget(siblingVisibility, { type: "quote", id: item.id, authorId: item.user_id }),
    );
    const index = ordered.findIndex((item) => item.id === row.id);
    const adjacent =
      index < 0
        ? { previous: null, next: null }
        : {
            previous: ordered[index - 1]
              ? (await enrichQuotes([ordered[index - 1]], viewerId))[0]
              : null,
            next: ordered[index + 1]
              ? (await enrichQuotes([ordered[index + 1]], viewerId))[0]
              : null,
          };

    const { data: commentRows } = await db
      .from("comments")
      .select(
        "id, quote_id, text, is_anonymous, created_at, edited_at, user_id, parent_id, pinned_at",
      )
      .eq("quote_id", data.id)
      .eq("hidden", false)
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(200);
    const commentVisibility = await getVisibilityContext(
      viewerId,
      (commentRows ?? []).map((comment: any) => ({
        type: "comment" as const,
        id: comment.id,
        authorId: comment.user_id,
      })),
    );
    const visibleCommentRows = (commentRows ?? []).filter((comment: any) =>
      isVisibleTarget(commentVisibility, {
        type: "comment",
        id: comment.id,
        authorId: comment.user_id,
      }),
    );
    const comments = await enrichQuoteComments(visibleCommentRows, viewerId);
    return { quote, comments, ...adjacent };
  });

export const addQuoteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => QuoteCommentInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: quote } = await db
      .from("quotes")
      .select("id, user_id, hidden, deleted_at")
      .eq("id", data.quote_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!quote || quote.hidden) return { error: "Quote not found.", comment: null };
    const visibility = await getVisibilityContext(context.userId, [
      { type: "quote", id: quote.id, authorId: quote.user_id },
    ]);
    if (!isVisibleTarget(visibility, { type: "quote", id: quote.id, authorId: quote.user_id })) {
      return { error: "Quote not found.", comment: null };
    }
    const commentCooldown = await getCommentCooldown(db, context.userId);
    if (!commentCooldown.ok) return { error: commentCooldown.error, comment: null };

    const banned = await scanBannedWords(data.text);
    if (banned.some((hit) => hit.severity === "block")) {
      await sendBannedWordWarning(context.userId, banned, "comment");
      return {
        error: `Your comment contains forbidden word(s): ${banned.map((hit) => `"${hit.word}"`).join(", ")}.`,
        comment: null,
      };
    }
    const { data: comment, error } = await db
      .from("comments")
      .insert({
        quote_id: data.quote_id,
        user_id: context.userId,
        text: data.text,
        is_anonymous: data.is_anonymous,
        parent_id: data.parent_id ?? null,
      })
      .select("id, quote_id, text, is_anonymous, created_at, edited_at, user_id, parent_id")
      .single();
    if (error) {
      console.error("addQuoteComment", error);
      return { error: "Could not add your comment.", comment: null };
    }
    await markComment(db, context.userId);
    const [enriched] = await enrichQuoteComments([comment], context.userId);
    return { error: null as string | null, comment: enriched };
  });

export const pinQuoteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => QuotePinInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: comment } = await db
      .from("comments")
      .select("quote_id")
      .eq("id", data.comment_id)
      .maybeSingle();
    if (!comment?.quote_id) return { error: "Quote comment not found." };
    const { data: quote } = await db
      .from("quotes")
      .select("user_id")
      .eq("id", comment.quote_id)
      .maybeSingle();
    if (!quote || quote.user_id !== context.userId) {
      return { error: "Only the quote owner can pin." };
    }
    const { error } = await db
      .from("comments")
      .update({ pinned_at: data.pin ? new Date().toISOString() : null })
      .eq("id", data.comment_id)
      .eq("quote_id", comment.quote_id);
    return { error: error ? "Could not update pin." : null };
  });

export const setQuoteAnonymous = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => QuoteUpdateInput.pick({ id: true, is_anonymous: true }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("quotes")
      .update({ is_anonymous: data.is_anonymous })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { error: error ? "Could not update quote privacy." : null };
  });
