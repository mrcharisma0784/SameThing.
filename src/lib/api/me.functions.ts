import { createServerFn } from "@tanstack/react-start";
/* eslint-disable @typescript-eslint/no-explicit-any -- Service-role reads migrated tables before generated Supabase types refresh. */
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { effectivePlan } from "@/lib/premium";
import { getVisibilityContext, isVisibleTarget } from "@/lib/content-visibility.server";

const PROFILE_COLS =
  "id, username, emoji, avatar_url, bio, language, is_anon_default, rare_thing_count, onboarded_at, last_post_at, last_comment_at, custom_tags, warnings_count, banned_at, muted_until, plan, premium_until, referral_code, same_credits, tour_completed_at, messages_open, username_changed_at, inbox_seen_at, allow_mentions, gender, age_range, demographics_completed_at, theme, feed_tags, notification_prefs, notification_retention_hours, is_test_user, test_user_until, test_user_label, same_credits_unlimited, deletion_scheduled_for, deletion_cancelled_until";
const PROFILE_COLS_LEGACY = PROFILE_COLS.replace(
  ", avatar_url, deletion_scheduled_for, deletion_cancelled_until",
  "",
);

type HiddenContentItem = {
  report_id: string;
  target_type: "thing" | "quote";
  target_id: string;
  reason: string;
  reported_at: string;
  available: boolean;
  deleted: boolean;
  admin_hidden: boolean;
  text: string | null;
  title: string | null;
  author: { username: string; emoji: string; avatar_url?: string | null; plan: string } | null;
};

async function attachOwnAuthor<
  T extends { user_id?: string | null; is_anonymous?: boolean | null },
>(
  rows: T[],
  prof: {
    id: string;
    username: string;
    emoji: string;
    avatar_url?: string | null;
    plan?: string | null;
  } | null,
) {
  if (!prof) return rows.map((r) => ({ ...r, author: null, is_mine: true }));
  return rows.map((r) => ({
    ...r,
    is_mine: true,
    author: r.is_anonymous
      ? null
      : {
          username: prof.username,
          emoji: prof.emoji,
          avatar_url: prof.avatar_url ?? null,
          plan: prof.plan ?? "free",
        },
    user_id: r.is_anonymous ? null : (r.user_id ?? null),
  }));
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const firstRead = (await supabaseAdmin
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("id", context.userId)
      .maybeSingle()) as unknown as {
      data: Record<string, unknown> | null;
      error: { message: string } | null;
    };
    let data = firstRead.data;
    const error = firstRead.error;
    if (error) {
      // Keep existing accounts usable while a production migration is being applied.
      const legacy = (await supabaseAdmin
        .from("profiles")
        .select(PROFILE_COLS_LEGACY)
        .eq("id", context.userId)
        .maybeSingle()) as unknown as {
        data: Record<string, unknown> | null;
        error: { message: string } | null;
      };
      if (legacy.error) {
        console.error("getMyProfile", error);
        return { profile: null };
      }
      data = legacy.data;
    }
    if (!data) return { profile: null };
    const profile = { ...data, plan: effectivePlan(data) };
    return { profile };
  });

const ReferralCodeInput = z.object({ code: z.string().trim().min(2).max(80) });

export const getReferenceData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [{ data: profile }, { data: claims, count }] = await Promise.all([
      db
        .from("profiles")
        .select("referral_code, same_credits")
        .eq("id", context.userId)
        .maybeSingle(),
      db
        .from("referral_claims")
        .select("id, referred_id, created_at", { count: "exact" })
        .eq("referrer_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    const referredIds = (claims ?? []).map((claim: { referred_id: string }) => claim.referred_id);
    const { data: referredProfiles } = referredIds.length
      ? await db.from("profiles").select("id, username").in("id", referredIds)
      : { data: [] };
    const names = new Map(
      (referredProfiles ?? []).map((referred: { id: string; username: string }) => [
        referred.id,
        referred.username,
      ]),
    );
    return {
      code: profile?.referral_code ?? `same-${context.userId.slice(0, 8)}`,
      credits: Number(profile?.same_credits ?? 0),
      count: count ?? 0,
      referrals: (claims ?? []).map(
        (claim: { id: string; referred_id: string; created_at: string }) => ({
          id: claim.id,
          username: names.get(claim.referred_id) ?? "new thinker",
          created_at: claim.created_at,
        }),
      ),
    };
  });

export const claimReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ReferralCodeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await (supabaseAdmin as any).rpc("claim_referral", {
      _code: data.code,
      _referred_id: context.userId,
    });
    if (error) return { ok: false as const, error: "Could not apply that reference code." };
    const payload = (result ?? {}) as { ok?: boolean; reason?: string; referred_reward?: number };
    if (payload.ok) return { ok: true as const, reward: payload.referred_reward ?? 5 };
    const errors: Record<string, string> = {
      not_found: "That reference code does not exist.",
      self: "You cannot use your own reference code.",
      already_claimed: "A reference code has already been used on this account.",
      invalid: "Enter a valid reference code.",
    };
    return {
      ok: false as const,
      error: errors[payload.reason ?? ""] ?? "Reference code was not applied.",
    };
  });

const AccountDataRequestInput = z.object({
  request_type: z.enum(["export", "deletion"]),
});

export const getMyDataRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("account_data_requests")
      .select(
        "id, request_type, status, requested_at, scheduled_for, handled_at, email_sent_at, admin_note",
      )
      .eq("user_id", context.userId)
      .order("requested_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const requestAccountData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => AccountDataRequestInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    if (data.request_type === "deletion") {
      const authTime = Number(context.claims.auth_time);
      const authAgeSeconds = Math.floor(Date.now() / 1000) - authTime;
      if (!Number.isFinite(authTime) || authAgeSeconds < 0 || authAgeSeconds > 300) {
        return {
          ok: false as const,
          error: "Confirm your password again before submitting a deletion request.",
        };
      }
      const { requestDeletion } = await import("@/lib/account-lifecycle.server");
      return requestDeletion(context.userId);
    }
    const monthlyCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentExport, error: recentExportError } = await db
      .from("account_data_requests")
      .select("id")
      .eq("user_id", context.userId)
      .eq("request_type", "export")
      .gte("requested_at", monthlyCutoff)
      .limit(1)
      .maybeSingle();
    if (recentExportError) throw new Error(recentExportError.message);
    if (recentExport) {
      return { ok: false as const, error: "You can request one data export every 30 days." };
    }
    const { data: existing, error: existingError } = await db
      .from("account_data_requests")
      .select("id, status")
      .eq("user_id", context.userId)
      .eq("request_type", data.request_type)
      .in("status", ["pending", "in_progress"])
      .limit(1)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing)
      return { ok: false as const, error: "A request of this type is already in progress." };
    const { data: request, error } = await db
      .from("account_data_requests")
      .insert({ user_id: context.userId, request_type: data.request_type })
      .select("id, request_type, status, requested_at")
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, request };
  });

export const cancelAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { cancelDeletion } = await import("@/lib/account-lifecycle.server");
    return cancelDeletion(context.userId);
  });

export const getMyThings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id, username, emoji, avatar_url, plan, premium_until")
      .eq("id", context.userId)
      .maybeSingle();
    const { data, error } = await supabaseAdmin
      .from("things")
      .select(
        "id, simplified_text, title, language, tags, is_anonymous, is_open_to_chat, comments_closed, same_count, nah_count, total_votes, similarity_score, comment_count, like_count, is_rare_thing, share_palette, share_font, created_at, user_id",
      )
      .eq("user_id", context.userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("getMyThings", error);
      return { things: [] };
    }
    type OwnThingRow = {
      id: string;
      user_id: string | null;
      is_anonymous?: boolean | null;
      [key: string]: unknown;
    };
    const ownThings = (data ?? []) as unknown as OwnThingRow[];
    const withAuthor = await attachOwnAuthor(
      ownThings,
      prof ? { ...prof, plan: effectivePlan(prof) } : null,
    );
    const ids = ownThings.map((thing) => thing.id).filter(Boolean);
    const { data: likes, error: likesError } =
      ids.length > 0
        ? await supabaseAdmin
            .from("thing_likes")
            .select("thing_id")
            .eq("user_id", context.userId)
            .in("thing_id", ids)
        : { data: [], error: null };
    if (likesError) console.error("getMyThings like enrichment", likesError);
    const likedIds = new Set((likes ?? []).map((like) => like.thing_id));
    return {
      things: withAuthor.map((thing) => ({
        ...thing,
        liked_by_me: likedIds.has(thing.id),
      })),
    };
  });

const WithdrawReportInput = z.object({
  target_type: z.enum(["thing", "quote"]),
  target_id: z.string().uuid(),
});

export const getMyHiddenContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: reports, error } = await db
      .from("reports")
      .select("id, target_type, target_id, reason, created_at")
      .eq("reporter_id", context.userId)
      .in("target_type", ["thing", "quote"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("getMyHiddenContent reports", error);
      return { items: [] as HiddenContentItem[] };
    }

    const rows = (reports ?? []) as Array<{
      id: string;
      target_type: "thing" | "quote";
      target_id: string;
      reason: string;
      created_at: string;
    }>;
    const thingIds = rows.filter((row) => row.target_type === "thing").map((row) => row.target_id);
    const quoteIds = rows.filter((row) => row.target_type === "quote").map((row) => row.target_id);
    const [{ data: things }, { data: quotes }] = await Promise.all([
      thingIds.length
        ? db
            .from("things")
            .select(
              "id, user_id, simplified_text, title, is_anonymous, deleted_at, hidden, created_at",
            )
            .in("id", thingIds)
        : Promise.resolve({ data: [] }),
      quoteIds.length
        ? db
            .from("quotes")
            .select("id, user_id, text, author, is_anonymous, deleted_at, hidden, created_at")
            .in("id", quoteIds)
        : Promise.resolve({ data: [] }),
    ]);

    const thingById = new Map<string, any>((things ?? []).map((row: any) => [row.id, row]));
    const quoteById = new Map<string, any>((quotes ?? []).map((row: any) => [row.id, row]));
    const authorIds = Array.from(
      new Set(
        [...(things ?? []), ...(quotes ?? [])]
          .map((row: any) => row.user_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const { data: authors } = authorIds.length
      ? await db
          .from("profiles")
          .select("id, username, emoji, plan, premium_until")
          .in("id", authorIds)
      : { data: [] };
    const authorById = new Map<string, any>((authors ?? []).map((row: any) => [row.id, row]));

    return {
      items: rows.map((report) => {
        const target =
          report.target_type === "thing"
            ? thingById.get(report.target_id)
            : quoteById.get(report.target_id);
        const author = target?.is_anonymous ? null : authorById.get(target?.user_id);
        const item: HiddenContentItem = {
          report_id: report.id,
          target_type: report.target_type,
          target_id: report.target_id,
          reason: report.reason,
          reported_at: report.created_at,
          available: Boolean(target),
          deleted: Boolean(target?.deleted_at),
          admin_hidden: Boolean(target?.hidden),
          text:
            report.target_type === "thing"
              ? (target?.simplified_text ?? null)
              : (target?.text ?? null),
          title: report.target_type === "thing" ? (target?.title ?? null) : null,
          author: author
            ? {
                username: author.username,
                emoji: author.emoji,
                plan: effectivePlan(author),
              }
            : null,
        };
        return item;
      }),
    };
  });

export const withdrawReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => WithdrawReportInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: removed, error } = await (supabaseAdmin as any)
      .from("reports")
      .delete()
      .eq("reporter_id", context.userId)
      .eq("target_type", data.target_type)
      .eq("target_id", data.target_id)
      .select("id")
      .maybeSingle();
    if (error || !removed)
      return { ok: false as const, error: "That hide decision is no longer active." };
    return { ok: true as const };
  });

// ---- Custom tags --------------------------------------------------
const TagInput = z.object({
  tag: z
    .string()
    .min(1)
    .max(24)
    .regex(/^[a-z0-9 _-]+$/i, "letters/numbers only"),
});

export const addCustomTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => TagInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tag = data.tag.trim().toLowerCase();
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("custom_tags, plan, premium_until, is_test_user")
      .eq("id", context.userId)
      .maybeSingle();
    const current: string[] = (prof?.custom_tags as string[] | null) ?? [];
    const premium = effectivePlan(prof) === "premium";
    const limit = premium ? 15 : 5;
    if (current.includes(tag)) return { error: null, tags: current };
    if (current.length >= limit)
      return {
        error: premium
          ? "Tag limit reached (15)."
          : "Free limit reached (5). ✦ PremiumThing. gives you 15.",
        tags: current,
      };

    const next = [...current, tag];
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ custom_tags: next })
      .eq("id", context.userId);
    if (error) return { error: "Could not save tag.", tags: current };
    return { error: null as string | null, tags: next };
  });

// ---- Edit profile -------------------------------------------------
const EditInput = z.object({
  username: z
    .string()
    .min(2)
    .max(24)
    .regex(/^[a-z0-9_]+$/)
    .optional(),
  bio: z.string().max(160).optional().nullable(),
  language: z.string().min(2).max(5).optional(),
  messages_open: z.boolean().optional(),
  theme: z.string().min(2).max(20).optional(),
  feed_tags: z.array(z.string().min(1).max(24)).max(20).optional(),
});

const USERNAME_COOLDOWN_DAYS = 15;

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => EditInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const update: Record<string, unknown> = { ...data };

    if (data.feed_tags !== undefined) {
      const { TAGS } = await import("@/lib/thing-helpers");
      const { data: currentProfile } = await supabaseAdmin
        .from("profiles")
        .select("custom_tags")
        .eq("id", context.userId)
        .maybeSingle();
      const allowedTags = new Set([
        ...TAGS,
        ...((currentProfile?.custom_tags as string[] | null) ?? []).map((tag) => tag.toLowerCase()),
      ]);
      const normalizedTags = data.feed_tags.map((tag) => tag.trim().toLowerCase());
      if (normalizedTags.some((tag) => !allowedTags.has(tag))) {
        return { error: "Choose feed filters from your available tags." };
      }
      const { data: billingResult, error: billingError } = await (supabaseAdmin as any).rpc(
        "set_feed_filter_pills",
        { _user_id: context.userId, _feed_tags: normalizedTags },
      );
      if (billingError) {
        console.error("set_feed_filter_pills", billingError);
        return { error: "Feed filter pills are temporarily unavailable." };
      }
      const payload = (billingResult ?? {}) as {
        ok?: boolean;
        reason?: string;
        cost?: number;
        credits?: number;
      };
      if (!payload.ok) {
        if (payload.reason === "insufficient_credits") {
          return {
            error: `You need ${payload.cost ?? 5} Same Credits to edit Feed filter pills.`,
            credits: payload.credits ?? 0,
          };
        }
        return { error: "Could not save Feed filter pills." };
      }
      return {
        error: null as string | null,
        cost: payload.cost ?? 0,
        credits: payload.credits,
      };
    }

    // PremiumThing. gating for themes
    if (data.theme !== undefined) {
      const { isPremiumTheme, isValidTheme } = await import("@/lib/themes");
      const { data: planRow } = await supabaseAdmin
        .from("profiles")
        .select("plan, premium_until")
        .eq("id", context.userId)
        .maybeSingle();
      const isPremium = effectivePlan(planRow) === "premium";
      if (data.theme !== undefined) {
        if (!isValidTheme(data.theme)) return { error: "Unknown theme." };
        if (isPremiumTheme(data.theme) && !isPremium)
          return { error: "That theme is PremiumThing. only." };
      }
    }

    if (data.username !== undefined) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("username, username_changed_at")
        .eq("id", context.userId)
        .maybeSingle();
      if (prof && data.username !== prof.username) {
        if (prof.username_changed_at) {
          const diffDays = (Date.now() - +new Date(prof.username_changed_at)) / 86400000;
          if (diffDays < USERNAME_COOLDOWN_DAYS) {
            const wait = Math.ceil(USERNAME_COOLDOWN_DAYS - diffDays);
            return {
              error: `You can change your username again in ${wait} day${wait === 1 ? "" : "s"}.`,
            };
          }
        }
        update.username_changed_at = new Date().toISOString();
      } else {
        delete update.username;
      }
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(update as never)
      .eq("id", context.userId);
    if (error) {
      if (String(error.message).toLowerCase().includes("unique"))
        return { error: "Username taken." };
      return { error: "Could not save profile." };
    }
    return { error: null as string | null };
  });

// ---- Public profile by username ----------------------------------
async function getOptionalViewerId(): Promise<string | null> {
  try {
    const request = getRequest();
    const authorization = request?.headers?.get("authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return null;
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

export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ username: z.string().min(1).max(24) }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const viewerId = await getOptionalViewerId();
    const { data: prof } = (await supabaseAdmin
      .from("profiles")
      .select(
        "id, username, emoji, avatar_url, bio, plan, premium_until, rare_thing_count, onboarded_at, is_test_user, test_user_until, test_user_label, same_credits_unlimited",
      )
      .eq("username", data.username)
      .maybeSingle()) as unknown as {
      data: {
        id: string;
        username: string;
        emoji: string;
        avatar_url: string | null;
        bio: string | null;
        plan: string;
        premium_until: string | null;
        rare_thing_count: number;
        onboarded_at: string | null;
        is_test_user: boolean;
        test_user_until: string | null;
        test_user_label: string | null;
        same_credits_unlimited: boolean;
      } | null;
    };
    if (!prof) return { profile: null, things: [] };

    const [{ data: things }, { count: followerCount }, { count: followingCount }] =
      await Promise.all([
        supabaseAdmin
          .from("things")
          .select(
            "id, simplified_text, title, language, tags, is_anonymous, is_open_to_chat, comments_closed, same_count, nah_count, total_votes, similarity_score, comment_count, like_count, is_rare_thing, boosted_until, share_palette, share_font, created_at, user_id",
          )
          .eq("user_id", prof.id)
          .eq("is_anonymous", false)
          .eq("hidden", false)
          .eq("safety_flag", false)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50),
        supabaseAdmin
          .from("follows" as never)
          .select("follower_id", { count: "exact", head: true })
          .eq("followed_id", prof.id),
        supabaseAdmin
          .from("follows" as never)
          .select("followed_id", { count: "exact", head: true })
          .eq("follower_id", prof.id),
      ]);

    let watching = false;
    let blocked = false;
    if (viewerId && viewerId !== prof.id) {
      const [following, blocking, blockedBy] = await Promise.all([
        supabaseAdmin
          .from("follows" as never)
          .select("created_at")
          .eq("follower_id", viewerId)
          .eq("followed_id", prof.id)
          .maybeSingle(),
        supabaseAdmin
          .from("blocks" as never)
          .select("created_at")
          .eq("blocker_id", viewerId)
          .eq("blocked_id", prof.id)
          .maybeSingle(),
        supabaseAdmin
          .from("blocks" as never)
          .select("created_at")
          .eq("blocker_id", prof.id)
          .eq("blocked_id", viewerId)
          .maybeSingle(),
      ]);
      watching = Boolean(following.data);
      blocked = Boolean(blocking.data || blockedBy.data);
    }

    const effective = effectivePlan(prof);
    type PublicThingRow = Record<string, unknown> & { id: string };
    const publicThings = (things ?? []) as unknown as Array<
      PublicThingRow & { user_id?: string | null }
    >;
    const visibility = await getVisibilityContext(
      viewerId,
      publicThings.map((thing) => ({
        type: "thing" as const,
        id: thing.id,
        authorId: thing.user_id,
      })),
    );
    const withAuthor = blocked
      ? []
      : publicThings
          .filter((thing) =>
            isVisibleTarget(visibility, { type: "thing", id: thing.id, authorId: thing.user_id }),
          )
          .map((t) => ({
            ...t,
            author: {
              username: prof.username,
              emoji: prof.emoji,
              plan: effective,
              is_test_user: prof.is_test_user,
              test_user_until: prof.test_user_until,
              test_user_label: prof.test_user_label,
            },
            is_mine: Boolean(viewerId && viewerId === prof.id),
          }));
    return {
      profile: {
        ...prof,
        plan: effective,
        follower_count: followerCount ?? 0,
        following_count: followingCount ?? 0,
        watching,
        blocked,
      },
      things: withAuthor,
    };
  });

// ---- Update demographics (one-time) ------------------------------
const DemoInput = z.object({
  gender: z.string().min(1).max(24),
  age_range: z.string().regex(/^(?:[1-9]|[1-9][0-9]|1[01][0-9]|120)$/),
});
export const saveDemographics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => DemoInput.parse(i))
  .handler(async ({ data, context }) => {
    if (Number(data.age_range) < 15) {
      return {
        error:
          "Under-15 registration is paused until verified parent or guardian approval is available.",
      };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        gender: data.gender,
        age_range: data.age_range,
        demographics_completed_at: new Date().toISOString(),
      } as never)
      .eq("id", context.userId);
    if (error) return { error: "Could not save." };
    return { error: null as string | null };
  });

export const completeServiceTour = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ tour_completed_at: new Date().toISOString() })
      .eq("id", context.userId);
    return { error: error ? "Could not save tour preference." : null };
  });

// ---- Delete account for the under-13 onboarding gate ----------------
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    // Under-13 onboarding must immediately block access and remove the account.
    await supabaseAdmin.from("things").delete().eq("user_id", uid);
    await supabaseAdmin.from("comments").delete().eq("user_id", uid);
    await supabaseAdmin.from("votes").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("profiles").delete().eq("id", uid);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) {
      console.error("delete user error", error);
      return { error: "Could not delete auth user." };
    }
    return { error: null as string | null };
  });

const ProfilePhotoInput = z.object({
  image: z.string().min(1).max(7_000_000),
  mime: z.enum(["image/webp", "image/gif"]),
});
function validateProfileImage(bytes: Uint8Array, mime: string) {
  if (mime === "image/webp") {
    if (
      bytes.length > 5 * 1024 * 1024 ||
      bytes.length < 26 ||
      String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" ||
      String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP" ||
      new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) !==
        bytes.length - 8
    )
      throw new Error("Invalid WebP image.");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 12;
    let dimensions: { width: number; height: number } | null = null;
    while (offset + 8 <= bytes.length) {
      const kind = String.fromCharCode(...bytes.slice(offset, offset + 4));
      const size = view.getUint32(offset + 4, true);
      const data = offset + 8;
      if (size > bytes.length - data) throw new Error("Malformed WebP image.");
      if (kind === "VP8X" && size >= 10) {
        dimensions = {
          width: 1 + bytes[data + 4] + (bytes[data + 5] << 8) + (bytes[data + 6] << 16),
          height: 1 + bytes[data + 7] + (bytes[data + 8] << 8) + (bytes[data + 9] << 16),
        };
      } else if (
        kind === "VP8 " &&
        size >= 10 &&
        bytes[data + 3] === 0x9d &&
        bytes[data + 4] === 0x01 &&
        bytes[data + 5] === 0x2a
      ) {
        dimensions = {
          width: (bytes[data + 6] | (bytes[data + 7] << 8)) & 0x3fff,
          height: (bytes[data + 8] | (bytes[data + 9] << 8)) & 0x3fff,
        };
      } else if (kind === "VP8L" && size >= 5 && bytes[data] === 0x2f) {
        dimensions = {
          width: 1 + bytes[data + 1] + ((bytes[data + 2] & 0x3f) << 8),
          height:
            1 + (bytes[data + 2] >> 6) + (bytes[data + 3] << 2) + ((bytes[data + 4] & 0x0f) << 10),
        };
      }
      offset = data + size + (size & 1);
    }
    if (offset !== bytes.length || dimensions?.width !== 512 || dimensions?.height !== 512)
      throw new Error("Profile photos must be valid, square 512 × 512 WebP images.");
    return;
  }
  if (
    bytes.length > 2 * 1024 * 1024 ||
    bytes.length < 14 ||
    (String.fromCharCode(...bytes.slice(0, 6)) !== "GIF87a" &&
      String.fromCharCode(...bytes.slice(0, 6)) !== "GIF89a")
  )
    throw new Error("Invalid GIF image.");
  const width = bytes[6] | (bytes[7] << 8),
    height = bytes[8] | (bytes[9] << 8);
  if (!width || !height || width > 2048 || height > 2048)
    throw new Error("GIF dimensions are not supported.");
  let i = 13,
    frames = 0,
    duration = 0,
    delay = 0,
    hasTrailer = false;
  const packed = bytes[10];
  if (packed & 0x80) i += 3 * (1 << ((packed & 7) + 1));
  if (i > bytes.length) throw new Error("Malformed GIF.");
  const skipSubBlocks = () => {
    while (i < bytes.length) {
      const n = bytes[i++];
      if (!n) return;
      if (i + n > bytes.length) throw new Error("Malformed GIF.");
      i += n;
    }
    throw new Error("Malformed GIF.");
  };
  while (i < bytes.length) {
    const marker = bytes[i++];
    if (marker === 0x3b) {
      hasTrailer = true;
      break;
    }
    if (marker === 0x21) {
      if (i >= bytes.length) throw new Error("Malformed GIF.");
      const label = bytes[i++];
      if (label === 0xf9) {
        if (i + 6 > bytes.length || bytes[i++] !== 4) throw new Error("Malformed GIF.");
        i++;
        delay = bytes[i] | (bytes[i + 1] << 8);
        i += 2;
        if (bytes[i++] !== 0) throw new Error("Malformed GIF.");
      } else {
        skipSubBlocks();
      }
    } else if (marker === 0x2c) {
      if (i + 9 > bytes.length) throw new Error("Malformed GIF.");
      const frameLeft = bytes[i] | (bytes[i + 1] << 8);
      const frameTop = bytes[i + 2] | (bytes[i + 3] << 8);
      const frameWidth = bytes[i + 4] | (bytes[i + 5] << 8);
      const frameHeight = bytes[i + 6] | (bytes[i + 7] << 8);
      const local = bytes[i + 8];
      if (
        !frameWidth ||
        !frameHeight ||
        frameLeft + frameWidth > width ||
        frameTop + frameHeight > height
      )
        throw new Error("GIF frame dimensions are not supported.");
      i += 9;
      if (local & 0x80) i += 3 * (1 << ((local & 7) + 1));
      if (i >= bytes.length || bytes[i] < 2 || bytes[i] > 8) throw new Error("Malformed GIF.");
      i++;
      skipSubBlocks();
      frames++;
      if (delay < 9) throw new Error("GIF frames must be at least 9 centiseconds apart.");
      duration += delay;
      if (frames > 60 || duration > 500)
        throw new Error("GIFs must be 5 seconds or shorter and contain at most 60 frames.");
      delay = 0;
    } else throw new Error("Malformed GIF.");
  }
  if (!frames || !hasTrailer || i !== bytes.length) throw new Error("Malformed GIF image.");
}
export const uploadMyProfilePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ProfilePhotoInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const raw = data.image.replace(/^data:[^,]+,/, "");
    const bytes = Buffer.from(raw, "base64");
    if (!bytes.length || bytes.toString("base64").replace(/=+$/, "") !== raw.replace(/=+$/, ""))
      return { ok: false as const, error: "Invalid image data." };
    try {
      validateProfileImage(new Uint8Array(bytes), data.mime);
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Invalid image." };
    }
    const db = supabaseAdmin as any;
    const { data: planRow, error: planError } = await db
      .from("profiles")
      .select("plan, premium_until, avatar_url")
      .eq("id", context.userId)
      .maybeSingle();
    if (planError || !planRow) return { ok: false as const, error: "Profile is unavailable." };
    if (data.mime === "image/gif" && effectivePlan(planRow) !== "premium")
      return { ok: false as const, error: "Animated GIF profile photos require Premium." };
    const key = `${context.userId}/${crypto.randomUUID()}.${data.mime === "image/gif" ? "gif" : "webp"}`;
    const { error: uploadError } = await db.storage
      .from("profile-photos")
      .upload(key, bytes, { contentType: data.mime, upsert: false });
    if (uploadError) return { ok: false as const, error: "Photo upload failed. Please try again." };
    const { data: pub } = db.storage.from("profile-photos").getPublicUrl(key);
    const { data: result, error } = await db.rpc("set_profile_avatar", {
      _user_id: context.userId,
      _avatar_url: pub.publicUrl,
    });
    if (error || !result?.ok) {
      await db.storage.from("profile-photos").remove([key]);
      return {
        ok: false as const,
        error:
          result?.reason === "daily_limit"
            ? "You have used all 3 profile-photo changes for today (UTC). Try again tomorrow."
            : "Could not save your profile photo.",
      };
    }
    const oldPath =
      typeof planRow.avatar_url === "string"
        ? planRow.avatar_url.split("/profile-photos/").pop()?.split("?")[0]
        : null;
    if (oldPath && oldPath.startsWith(`${context.userId}/`) && oldPath !== key)
      await db.storage.from("profile-photos").remove([oldPath]);
    return { ok: true as const, avatar_url: pub.publicUrl };
  });
export const removeMyProfilePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: current } = await db
      .from("profiles")
      .select("avatar_url")
      .eq("id", context.userId)
      .maybeSingle();
    const { data, error } = await db.rpc("set_profile_avatar", {
      _user_id: context.userId,
      _avatar_url: null,
    });
    if (error || !data?.ok)
      return {
        ok: false as const,
        error:
          data?.reason === "daily_limit"
            ? "You have used all 3 profile-photo changes for today (UTC). Try again tomorrow."
            : "Could not remove your profile photo.",
      };
    const oldPath =
      typeof current?.avatar_url === "string"
        ? current.avatar_url.split("/profile-photos/").pop()?.split("?")[0]
        : null;
    if (oldPath?.startsWith(`${context.userId}/`))
      await db.storage.from("profile-photos").remove([oldPath]);
    return { ok: true as const };
  });
