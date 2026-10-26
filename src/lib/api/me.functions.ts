import { createServerFn } from "@tanstack/react-start";
/* eslint-disable @typescript-eslint/no-explicit-any -- Service-role reads migrated tables before generated Supabase types refresh. */
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { effectivePlan } from "@/lib/premium";
import { getVisibilityContext, isVisibleTarget } from "@/lib/content-visibility.server";

const PROFILE_COLS =
  "id, username, emoji, bio, language, is_anon_default, rare_thing_count, onboarded_at, last_post_at, last_comment_at, custom_tags, warnings_count, banned_at, muted_until, plan, premium_until, referral_code, same_credits, tour_completed_at, messages_open, username_changed_at, inbox_seen_at, allow_mentions, gender, age_range, demographics_completed_at, theme, feed_tags, notification_prefs, notification_retention_hours, is_test_user, test_user_until, test_user_label, same_credits_unlimited";

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
  author: { username: string; emoji: string; plan: string } | null;
};

async function attachOwnAuthor<
  T extends { user_id?: string | null; is_anonymous?: boolean | null },
>(rows: T[], prof: { id: string; username: string; emoji: string; plan?: string | null } | null) {
  if (!prof) return rows.map((r) => ({ ...r, author: null, is_mine: true }));
  return rows.map((r) => ({
    ...r,
    is_mine: true,
    author: r.is_anonymous
      ? null
      : { username: prof.username, emoji: prof.emoji, plan: prof.plan ?? "free" },
    user_id: r.is_anonymous ? null : (r.user_id ?? null),
  }));
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = (await supabaseAdmin
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("id", context.userId)
      .maybeSingle()) as unknown as {
      data: Record<string, unknown> | null;
      error: { message: string } | null;
    };
    if (error) {
      console.error("getMyProfile", error);
      return { profile: null };
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
      .select("id, request_type, status, requested_at, handled_at, admin_note")
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
    if (data.request_type === "deletion") {
      const authTime = Number(context.claims.auth_time);
      const authAgeSeconds = Math.floor(Date.now() / 1000) - authTime;
      if (!Number.isFinite(authTime) || authAgeSeconds < 0 || authAgeSeconds > 300) {
        return {
          ok: false as const,
          error: "Confirm your password again before submitting a deletion request.",
        };
      }
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
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

export const getMyThings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id, username, emoji, plan, premium_until")
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
  emoji: z.string().min(1).max(4).optional(),
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

    // PremiumThing. gating for themes and premium profile icons
    if (data.theme !== undefined || data.emoji !== undefined) {
      const { isPremiumTheme, isValidTheme } = await import("@/lib/themes");
      const { isPremiumAvatar } = await import("@/lib/avatars");
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
      if (data.emoji !== undefined && isPremiumAvatar(data.emoji) && !isPremium) {
        return { error: "That icon is PremiumThing. only." };
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
        "id, username, emoji, bio, plan, premium_until, rare_thing_count, onboarded_at, is_test_user, test_user_until, test_user_label, same_credits_unlimited",
      )
      .eq("username", data.username)
      .maybeSingle()) as unknown as {
      data: {
        id: string;
        username: string;
        emoji: string;
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
