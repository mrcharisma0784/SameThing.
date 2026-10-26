// Admin server functions. All (except adminLogin/adminStatus/adminLogout)
/* eslint-disable @typescript-eslint/no-explicit-any -- Admin reads newly migrated service-only tables before generated types refresh. */
// require the admin session cookie unlocked via the shared password.
import { createServerFn } from "@tanstack/react-start";
import { effectivePlan } from "@/lib/premium";
import { z } from "zod";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  RESEARCH_API_AVAILABLE,
  RESEARCH_API_PAUSE_MESSAGE,
} from "@/lib/api/research-availability";

async function assertAdmin(
  permission: import("@/lib/admin-rbac.server").AdminPermission = "admin:read",
) {
  const { requireAdminAccess } = await import("@/lib/admin-rbac.server");
  return requireAdminAccess(permission);
}

async function recordAdminAction(
  action: string,
  permission: import("@/lib/admin-rbac.server").AdminPermission,
) {
  const { recordAdminAudit } = await import("@/lib/admin-rbac.server");
  await recordAdminAudit({ action, permission });
}

function pwEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

async function findTargetOwnerId(
  db: any,
  targetType: string,
  targetId: string,
): Promise<string | null> {
  if (targetType === "user") return targetId;
  const table =
    targetType === "thing" || targetType === "comment" || targetType === "quote"
      ? targetType === "thing"
        ? "things"
        : targetType === "comment"
          ? "comments"
          : "quotes"
      : null;
  if (!table) return null;
  const { data } = await db.from(table).select("user_id").eq("id", targetId).maybeSingle();
  return data?.user_id ?? null;
}

async function sendAdminSystemMessage(
  db: any,
  recipientId: string | null,
  title: string,
  body: string,
  meta?: Record<string, unknown>,
) {
  if (!recipientId) return;
  await db.from("system_messages").insert({
    recipient_id: recipientId,
    kind: "moderation",
    title,
    body,
    meta: meta ?? {},
  });
}

// ---------- auth ----------
const FOUNDER_USERNAME = "jeonwx_0";
const FOUNDER_LOGIN_USERNAME = "jeonwx";

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((i: { username: string; password: string }) =>
    z
      .object({ username: z.string().trim().min(1).max(80), password: z.string().min(1).max(500) })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const expected = process.env.FOUNDER_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;
    if (!expected) return { ok: false as const, error: "Admin not configured." };
    if (!process.env.ADMIN_SESSION_SECRET)
      return { ok: false as const, error: "Admin session is not configured." };
    if (
      !pwEqual(data.password, expected) ||
      data.username.trim().toLowerCase() !== FOUNDER_LOGIN_USERNAME
    ) {
      return { ok: false as const, error: "Wrong username or password." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: founder, error: founderError } = await supabaseAdmin
      .from("profiles")
      .select("id, username")
      .eq("username", FOUNDER_USERNAME)
      .maybeSingle();
    if (founderError)
      return { ok: false as const, error: "Founder profile could not be verified." };
    if (!founder?.id) return { ok: false as const, error: "Founder profile was not found." };

    const { getAdminSession } = await import("@/lib/admin-session.server");
    const { ADMIN_PERMISSIONS } = await import("@/lib/admin-rbac.server");
    const s = await getAdminSession();
    await s.update({
      unlocked: true,
      at: Date.now(),
      actor_user_id: founder.id,
      mode: "breakglass",
      username: FOUNDER_USERNAME,
      permissions: [...ADMIN_PERMISSIONS],
    });
    return { ok: true as const, mode: "breakglass" as const, username: FOUNDER_USERNAME };
  });

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getAdminStatus } = await import("@/lib/admin-rbac.server");
  return getAdminStatus();
});

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getAdminSession } = await import("@/lib/admin-session.server");
  const s = await getAdminSession();
  await s.clear();
  return { ok: true };
});

// ---------- overview ----------
export const adminOverview = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin("admin:read");
  await recordAdminAction("adminOverview", "admin:read");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [
    users,
    things,
    quotes,
    comments,
    votes,
    follows,
    reports,
    feedback,
    premium,
    banned,
    prompts,
    apiKeys,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("things").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("quotes").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("comments").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("votes").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("follows").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabaseAdmin.from("feedback").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("plan", "premium"),
    supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("banned_at", "is", null),
    (supabaseAdmin as any).from("feedback_prompts").select("id", { count: "exact", head: true }),
    (supabaseAdmin as any)
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null),
  ]);
  return {
    users: users.count ?? 0,
    things: things.count ?? 0,
    quotes: quotes.count ?? 0,
    comments: comments.count ?? 0,
    votes: votes.count ?? 0,
    follows: follows.count ?? 0,
    openReports: reports.count ?? 0,
    feedback: feedback.count ?? 0,
    premium: premium.count ?? 0,
    banned: banned.count ?? 0,
    prompts: prompts.count ?? 0,
    activeApiKeys: apiKeys.count ?? 0,
  };
});

// ---------- users ----------
export const adminListUsers = createServerFn({ method: "GET" })
  .inputValidator((i: { q?: string; limit?: number; offset?: number }) =>
    z
      .object({
        q: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    await assertAdmin("users:read");
    await recordAdminAction("adminListUsers", "users:read");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select(
        "id, username, emoji, bio, plan, language, created_at, warnings_count, banned_at, ban_reason, rare_thing_count, gender, age_range",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.q) q = q.ilike("username", `%${data.q}%`);
    const { data: rows, count } = await q;
    return { items: rows ?? [], total: count ?? 0 };
  });

export const adminUserDetail = createServerFn({ method: "GET" })
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin("users:read");
    await recordAdminAction("adminUserDetail", "users:read");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [profileRes, authRes, thingsRes, commentsRes, votesRes, feedbackRes, mentionsRes] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("id", data.id).maybeSingle(),
        supabaseAdmin.auth.admin.getUserById(data.id),
        supabaseAdmin
          .from("things")
          .select(
            "id, title, tags, created_at, hidden, same_count, nah_count, total_votes, is_anonymous",
          )
          .eq("user_id", data.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabaseAdmin
          .from("comments")
          .select("id, thing_id, text, created_at, hidden")
          .eq("user_id", data.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabaseAdmin
          .from("votes")
          .select("id, thing_id, vote_type, created_at")
          .eq("user_id", data.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabaseAdmin
          .from("feedback")
          .select("id, message, created_at, replied_at")
          .eq("user_id", data.id)
          .order("created_at", { ascending: false })
          .limit(30),
        supabaseAdmin
          .from("mentions" as never)
          .select("id, thing_id, comment_id, created_at")
          .eq("mentioned_user_id", data.id)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
    const u = authRes.data?.user;
    // Collect tag usage from user's things
    const tagCounts = new Map<string, number>();
    for (const t of (thingsRes.data ?? []) as Array<{ tags: string[] }>) {
      for (const tag of t.tags ?? []) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
    const tags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
    return {
      profile: profileRes.data,
      auth: u
        ? {
            email: u.email,
            phone: u.phone,
            provider: u.app_metadata?.provider ?? null,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
          }
        : null,
      things: thingsRes.data ?? [],
      comments: commentsRes.data ?? [],
      votes: votesRes.data ?? [],
      feedback: feedbackRes.data ?? [],
      mentions: mentionsRes.data ?? [],
      tags,
    };
  });

export const adminBanUser = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string; reason: string; ban: boolean }) =>
    z
      .object({ id: z.string().uuid(), reason: z.string().max(500).default(""), ban: z.boolean() })
      .parse(i),
  )
  .handler(async ({ data }) => {
    await assertAdmin("users:write");
    await recordAdminAction("adminBanUser", "users:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        banned_at: data.ban ? new Date().toISOString() : null,
        ban_reason: data.ban ? data.reason || null : null,
      })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    const db = supabaseAdmin as any;
    if (data.ban) {
      await sendAdminSystemMessage(
        db,
        data.id,
        "Your account has been banned",
        data.reason || "Your account has been restricted by SameThing moderators.",
      );
    } else {
      await sendAdminSystemMessage(
        db,
        data.id,
        "Your account ban was removed",
        "You can use SameThing again. Please follow the community rules.",
      );
    }
    return { ok: true as const };
  });

export const adminSetPlan = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string; plan: "free" | "premium" }) =>
    z.object({ id: z.string().uuid(), plan: z.enum(["free", "premium"]) }).parse(i),
  )
  .handler(async ({ data }) => {
    await assertAdmin("users:write");
    await recordAdminAction("adminSetPlan", "users:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ plan: data.plan }).eq("id", data.id);
    await supabaseAdmin.from("system_messages").insert({
      recipient_id: data.id,
      kind: "system",
      title: data.plan === "premium" ? "✦ PremiumThing. unlocked" : "PremiumThing. ended",
      body:
        data.plan === "premium"
          ? "Your account is now PremiumThing. — themes, exclusive icons and the golden ring are yours."
          : "Your PremiumThing. access has ended. Themes and premium icons are locked again.",
      link: "/premium",
    } as never);
    return { ok: true };
  });

const PremiumAccessInput = z.object({
  id: z.string().uuid(),
  grant: z.boolean(),
  duration_days: z.union([z.literal("forever"), z.number().int().min(1).max(90)]),
});

export const adminSetPremiumAccess = createServerFn({ method: "POST" })
  .inputValidator((i) => PremiumAccessInput.parse(i))
  .handler(async ({ data }) => {
    await assertAdmin("users:write");
    await recordAdminAction("adminSetPremiumAccess", "users:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const premiumUntil =
      data.grant && data.duration_days !== "forever"
        ? new Date(Date.now() + data.duration_days * 24 * 60 * 60 * 1000).toISOString()
        : null;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        plan: data.grant ? "premium" : "free",
        premium_until: data.grant ? premiumUntil : null,
      } as never)
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    await supabaseAdmin.from("system_messages" as never).insert({
      recipient_id: data.id,
      kind: "system",
      title: data.grant ? "✦ PremiumThing. unlocked" : "PremiumThing. ended",
      body: data.grant
        ? data.duration_days === "forever"
          ? "Your PremiumThing. access is now unlimited."
          : `Your PremiumThing. access is active for ${data.duration_days} days.`
        : "Your PremiumThing. access has ended.",
      link: "/premium",
    } as never);
    return { ok: true as const, premium_until: premiumUntil };
  });

export const adminWarnUser = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string; note: string }) =>
    z.object({ id: z.string().uuid(), note: z.string().min(1).max(500) }).parse(i),
  )
  .handler(async ({ data }) => {
    await assertAdmin("users:write");
    await recordAdminAction("adminWarnUser", "users:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("warnings_count")
      .eq("id", data.id)
      .maybeSingle();
    await supabaseAdmin
      .from("profiles")
      .update({ warnings_count: ((p?.warnings_count as number | undefined) ?? 0) + 1 })
      .eq("id", data.id);
    await supabaseAdmin.from("system_messages" as never).insert({
      recipient_id: data.id,
      kind: "warning",
      title: "Warning from moderators",
      body: data.note,
    } as never);
    return { ok: true };
  });

// ---------- things ----------
export const adminListThings = createServerFn({ method: "GET" })
  .inputValidator((i: { q?: string; limit?: number; offset?: number; hiddenOnly?: boolean }) =>
    z
      .object({
        q: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(30),
        offset: z.number().int().min(0).default(0),
        hiddenOnly: z.boolean().default(false),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    await assertAdmin("content:read");
    await recordAdminAction("adminListThings", "content:read");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("things")
      .select(
        "id, user_id, title, raw_text, tags, created_at, hidden, same_count, nah_count, total_votes, report_count, comment_count, is_anonymous",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    if (data.hiddenOnly) q = q.eq("hidden", true);
    const { data: rows, count } = await q;
    return { items: rows ?? [], total: count ?? 0 };
  });

export const adminHideThing = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string; hidden: boolean }) =>
    z.object({ id: z.string().uuid(), hidden: z.boolean() }).parse(i),
  )
  .handler(async ({ data }) => {
    await assertAdmin("content:write");
    await recordAdminAction("adminHideThing", "content:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const ownerId = await findTargetOwnerId(db, "thing", data.id);
    const { error } = await db.from("things").update({ hidden: data.hidden }).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    await sendAdminSystemMessage(
      db,
      ownerId,
      data.hidden ? "Your Thing was hidden" : "Your Thing is visible again",
      data.hidden
        ? "A moderator hid your Thing after reviewing it."
        : "A moderator restored your Thing.",
      { thing_id: data.id },
    );
    return { ok: true as const };
  });

export const adminDeleteThing = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin("content:delete");
    await recordAdminAction("adminDeleteThing", "content:delete");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const ownerId = await findTargetOwnerId(db, "thing", data.id);
    await db.from("comments").delete().eq("thing_id", data.id);
    await supabaseAdmin.from("votes").delete().eq("thing_id", data.id);
    await supabaseAdmin
      .from("mentions" as never)
      .delete()
      .eq("thing_id", data.id);
    const { error } = await db.from("things").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    await sendAdminSystemMessage(
      db,
      ownerId,
      "Your Thing was removed",
      "A moderator removed your Thing after reviewing a report.",
      { thing_id: data.id },
    );
    return { ok: true as const };
  });

// ---------- reports & privacy queue ----------
const ReportListInput = z.object({
  status: z.enum(["open", "in_review", "resolved", "dismissed", "all"]).default("open"),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const adminListReports = createServerFn({ method: "GET" })
  .inputValidator((input) => ReportListInput.parse(input))
  .handler(async ({ data }) => {
    await assertAdmin("reports:read");
    await recordAdminAction("adminListReports", "reports:read");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    let query = db
      .from("reports")
      .select(
        "id, target_type, target_id, reporter_id, reason, created_at, status, resolved_at, resolved_by, resolution, admin_note",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: reports, count, error } = await query;
    if (error) throw new Error(error.message);
    const rows = (reports ?? []) as Array<Record<string, any>>;
    const ids = Array.from(
      new Set(
        rows.flatMap((row) =>
          [row.reporter_id, row.target_type === "user" ? row.target_id : null].filter(Boolean),
        ),
      ),
    );
    const { data: profiles } = ids.length
      ? await db
          .from("profiles")
          .select("id, username, emoji, plan, warnings_count, banned_at")
          .in("id", ids)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
    const thingIds = rows.filter((row) => row.target_type === "thing").map((row) => row.target_id);
    const commentIds = rows
      .filter((row) => row.target_type === "comment")
      .map((row) => row.target_id);
    const quoteIds = rows.filter((row) => row.target_type === "quote").map((row) => row.target_id);
    const [{ data: things }, { data: comments }, { data: quotes }] = await Promise.all([
      thingIds.length
        ? db.from("things").select("id, title, simplified_text, user_id, hidden").in("id", thingIds)
        : { data: [] },
      commentIds.length
        ? db
            .from("comments")
            .select("id, text, user_id, thing_id, quote_id, hidden")
            .in("id", commentIds)
        : { data: [] },
      quoteIds.length
        ? db.from("quotes").select("id, text, user_id, hidden").in("id", quoteIds)
        : { data: [] },
    ]);
    const targetMap = new Map<string, any>();
    for (const row of things ?? []) targetMap.set(`thing:${row.id}`, row);
    for (const row of comments ?? []) targetMap.set(`comment:${row.id}`, row);
    for (const row of quotes ?? []) targetMap.set(`quote:${row.id}`, row);
    return {
      items: rows.map((row) => ({
        ...row,
        reporter: profileMap.get(row.reporter_id) ?? null,
        target_user: row.target_type === "user" ? (profileMap.get(row.target_id) ?? null) : null,
        target:
          row.target_type === "user"
            ? null
            : (targetMap.get(`${row.target_type}:${row.target_id}`) ?? null),
        owner:
          row.target_type === "user"
            ? (profileMap.get(row.target_id) ?? null)
            : (profileMap.get(targetMap.get(`${row.target_type}:${row.target_id}`)?.user_id) ??
              null),
      })),
      total: count ?? rows.length,
    };
  });

const SuspiciousListInput = z.object({
  status: z.enum(["pending", "reviewed", "dismissed", "all"]).default("pending"),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const adminListSuspicious = createServerFn({ method: "GET" })
  .inputValidator((input) => SuspiciousListInput.parse(input))
  .handler(async ({ data }) => {
    await assertAdmin("reports:read");
    await recordAdminAction("adminListSuspicious", "reports:read");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    let query = db
      .from("ai_safety_reviews")
      .select(
        "id, thing_id, user_id, status, outcome, label, reason, attempts, last_attempt_at, reviewed_at, reviewed_by, admin_note, created_at, updated_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: reviews, count, error } = await query;
    if (error) throw new Error(error.message);
    const rows = (reviews ?? []) as Array<Record<string, any>>;
    const thingIds = rows.map((row) => row.thing_id).filter(Boolean);
    const userIds = rows.map((row) => row.user_id).filter(Boolean);
    const [{ data: things }, { data: profiles }] = await Promise.all([
      thingIds.length
        ? db
            .from("things")
            .select(
              "id, user_id, title, simplified_text, raw_text, tags, hidden, deleted_at, created_at",
            )
            .in("id", thingIds)
        : { data: [] },
      userIds.length
        ? db.from("profiles").select("id, username, emoji, plan, premium_until").in("id", userIds)
        : { data: [] },
    ]);
    const thingsById = new Map((things ?? []).map((thing: any) => [thing.id, thing]));
    const profilesById = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
    return {
      items: rows.map((row) => ({
        ...row,
        thing: thingsById.get(row.thing_id) ?? null,
        profile: profilesById.get(row.user_id) ?? null,
      })),
      total: count ?? rows.length,
    };
  });

const SuspiciousActionInput = z.object({
  review_id: z.string().uuid(),
  status: z.enum(["reviewed", "dismissed"]),
  admin_note: z.string().max(1000).default(""),
});

export const adminResolveSuspicious = createServerFn({ method: "POST" })
  .inputValidator((input) => SuspiciousActionInput.parse(input))
  .handler(async ({ data }) => {
    const actor = await assertAdmin("reports:write");
    await recordAdminAction("adminResolveSuspicious", "reports:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: updated, error } = await db
      .from("ai_safety_reviews")
      .update({
        status: data.status,
        admin_note: data.admin_note || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: actor.userId,
      })
      .eq("id", data.review_id)
      .select("id")
      .maybeSingle();
    if (error || !updated) return { ok: false as const, error: "Suspicious review not found." };
    return { ok: true as const };
  });

export const adminRetrySuspicious = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ review_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const actor = await assertAdmin("reports:write");
    await recordAdminAction("adminRetrySuspicious", "reports:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: review, error } = await db
      .from("ai_safety_reviews")
      .select("id, thing_id, attempts")
      .eq("id", data.review_id)
      .maybeSingle();
    if (error || !review) return { ok: false as const, error: "Suspicious review not found." };
    const { data: thing } = await db
      .from("things")
      .select("simplified_text")
      .eq("id", review.thing_id)
      .maybeSingle();
    if (!thing) return { ok: false as const, error: "Thing is no longer available." };
    const { reviewThingContent } = await import("@/lib/ai/content-review.server");
    const result = await reviewThingContent(thing.simplified_text);
    const { error: updateError } = await db
      .from("ai_safety_reviews")
      .update({
        status: result.ok ? "dismissed" : "pending",
        outcome: result.ok ? "unavailable" : result.reason,
        reason: result.ok ? "Follow-up AI review passed." : result.message,
        attempts: Number(review.attempts ?? 1) + 1,
        last_attempt_at: new Date().toISOString(),
        reviewed_at: result.ok ? new Date().toISOString() : null,
        reviewed_by: result.ok ? actor.userId : null,
      })
      .eq("id", data.review_id);
    if (updateError) return { ok: false as const, error: updateError.message };
    return { ok: true as const, status: result.ok ? ("dismissed" as const) : ("pending" as const) };
  });

const ReportActionInput = z.object({
  report_id: z.string().uuid(),
  status: z.enum(["in_review", "resolved", "dismissed"]),
  action: z.enum(["none", "hide", "delete", "warn", "ban"]).default("none"),
  admin_note: z.string().max(1000).default(""),
});

export const adminResolveReport = createServerFn({ method: "POST" })
  .inputValidator((input) => ReportActionInput.parse(input))
  .handler(async ({ data }) => {
    await assertAdmin("reports:write");
    await recordAdminAction("adminResolveReport", "reports:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: report, error: reportError } = await db
      .from("reports")
      .select("id, target_type, target_id")
      .eq("id", data.report_id)
      .maybeSingle();
    if (reportError || !report) return { ok: false as const, error: "Report not found." };
    const targetType = report.target_type as "thing" | "comment" | "quote" | "user";
    let ownerId: string | null = targetType === "user" ? report.target_id : null;
    if (targetType === "thing") {
      const { data: item } = await db
        .from("things")
        .select("user_id")
        .eq("id", report.target_id)
        .maybeSingle();
      ownerId = item?.user_id ?? null;
      if (data.action === "hide")
        await db.from("things").update({ hidden: true }).eq("id", report.target_id);
      if (data.action === "delete") await db.from("things").delete().eq("id", report.target_id);
    } else if (targetType === "comment") {
      const { data: item } = await db
        .from("comments")
        .select("user_id")
        .eq("id", report.target_id)
        .maybeSingle();
      ownerId = item?.user_id ?? null;
      if (data.action === "hide")
        await db.from("comments").update({ hidden: true }).eq("id", report.target_id);
      if (data.action === "delete") await db.from("comments").delete().eq("id", report.target_id);
    } else if (targetType === "quote") {
      const { data: item } = await db
        .from("quotes")
        .select("user_id")
        .eq("id", report.target_id)
        .maybeSingle();
      ownerId = item?.user_id ?? null;
      if (data.action === "hide")
        await db.from("quotes").update({ hidden: true }).eq("id", report.target_id);
      if (data.action === "delete") await db.from("quotes").delete().eq("id", report.target_id);
    }
    if (ownerId && data.action === "warn") {
      const { data: profile } = await db
        .from("profiles")
        .select("warnings_count")
        .eq("id", ownerId)
        .maybeSingle();
      await db
        .from("profiles")
        .update({ warnings_count: Number(profile?.warnings_count ?? 0) + 1 })
        .eq("id", ownerId);
    }
    if (ownerId && data.action === "ban") {
      await db
        .from("profiles")
        .update({
          banned_at: new Date().toISOString(),
          ban_reason: data.admin_note || "Reported content",
        })
        .eq("id", ownerId);
    }
    if (ownerId && data.action !== "none") {
      const messages: Record<string, { title: string; body: string }> = {
        hide: {
          title: "Reported content was hidden",
          body: "A moderator hid content connected to a report. Please review the community rules.",
        },
        delete: {
          title: "Reported content was removed",
          body: "A moderator removed content connected to a report. Please review the community rules.",
        },
        warn: {
          title: "A moderator sent you a warning",
          body: data.admin_note || "Please review the community rules before posting again.",
        },
        ban: {
          title: "Your account has been banned",
          body: data.admin_note || "Your account is restricted after a moderation review.",
        },
      };
      const message = messages[data.action];
      if (message)
        await sendAdminSystemMessage(db, ownerId, message.title, message.body, {
          report_id: data.report_id,
          action: data.action,
          target_type: targetType,
          target_id: report.target_id,
        });
    }
    const { error } = await db
      .from("reports")
      .update({
        status: data.status,
        resolved_at: data.status === "in_review" ? null : new Date().toISOString(),
        resolution: data.action,
        admin_note: data.admin_note || null,
      })
      .eq("id", data.report_id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

const ReportMessageInput = z.object({
  report_id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
});

export const adminSendReportMessage = createServerFn({ method: "POST" })
  .inputValidator((input) => ReportMessageInput.parse(input))
  .handler(async ({ data }) => {
    await assertAdmin("reports:write");
    await recordAdminAction("adminSendReportMessage", "reports:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: report, error: reportError } = await db
      .from("reports")
      .select("id, target_type, target_id")
      .eq("id", data.report_id)
      .maybeSingle();
    if (reportError || !report) return { ok: false as const, error: "Report not found." };
    const ownerId = await findTargetOwnerId(db, report.target_type, report.target_id);
    if (!ownerId) return { ok: false as const, error: "The reported user is no longer available." };
    await sendAdminSystemMessage(db, ownerId, data.title, data.body, {
      report_id: data.report_id,
      manual: true,
    });
    return { ok: true as const };
  });

export const adminListAccountDataRequests = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin("support:read");
  await recordAdminAction("adminListAccountDataRequests", "support:read");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("account_data_requests")
    .select("id, user_id, request_type, status, requested_at, handled_at, handled_by, admin_note")
    .order("requested_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);
  const ids = Array.from(new Set((data ?? []).map((row: any) => row.user_id)));
  const { data: profiles } = ids.length
    ? await db.from("profiles").select("id, username, emoji, plan").in("id", ids)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
  return {
    items: (data ?? []).map((row: any) => ({
      ...row,
      profile: profileMap.get(row.user_id) ?? null,
    })),
  };
});

const AccountRequestActionInput = z.object({
  request_id: z.string().uuid(),
  status: z.enum(["in_progress", "completed", "rejected", "cancelled"]),
  admin_note: z.string().max(1000).default(""),
});

export const adminUpdateAccountDataRequest = createServerFn({ method: "POST" })
  .inputValidator((input) => AccountRequestActionInput.parse(input))
  .handler(async ({ data }) => {
    await assertAdmin("support:write");
    await recordAdminAction("adminUpdateAccountDataRequest", "support:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await (supabaseAdmin as any).auth.getSession();
    const adminId = session?.session?.user?.id ?? null;
    const { error } = await (supabaseAdmin as any)
      .from("account_data_requests")
      .update({
        status: data.status,
        handled_at: ["completed", "rejected", "cancelled"].includes(data.status)
          ? new Date().toISOString()
          : null,
        handled_by: adminId,
        admin_note: data.admin_note || null,
      })
      .eq("id", data.request_id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ---------- support queue -------------------------------------------
export const adminListSupportRequests = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        status: z.enum(["open", "in_progress", "resolved", "closed", "all"]).default("open"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await assertAdmin("support:read");
    await recordAdminAction("adminListSupportRequests", "support:read");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    let query = db
      .from("support_requests")
      .select(
        "id, user_id, subject, message, screenshot_name, status, created_at, handled_at, handled_by, admin_note",
      )
      .order("created_at", { ascending: true })
      .limit(100);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: requests, error } = await query;
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((requests ?? []).map((row: any) => row.user_id)));
    const { data: profiles } = ids.length
      ? await db
          .from("profiles")
          .select("id, username, emoji, plan, premium_until, is_test_user, test_user_until")
          .in("id", ids)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
    const items = (requests ?? []).map((row: any) => {
      const replyEmailMatch =
        typeof row.message === "string" ? row.message.match(/^\[Reply email:([^\]]+)\]\n\n/) : null;
      return {
        ...row,
        message: replyEmailMatch ? row.message.slice(replyEmailMatch[0].length) : row.message,
        reply_to_email: replyEmailMatch?.[1]?.trim() ?? null,
        profile: profileMap.get(row.user_id) ?? null,
      };
    });
    items.sort((left: any, right: any) => {
      const premiumRank = (profile: any) => {
        return effectivePlan(profile) === "premium" ? 1 : 0;
      };
      return (
        premiumRank(right.profile) - premiumRank(left.profile) ||
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
      );
    });
    return { items };
  });

const SupportActionInput = z.object({
  request_id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  title: z.string().trim().max(120).default("Reply from SameThing Support"),
  body: z.string().trim().max(2000).default(""),
  email_sent: z.boolean().default(false),
});

export const adminUpdateSupportRequest = createServerFn({ method: "POST" })
  .inputValidator((input) => SupportActionInput.parse(input))
  .handler(async ({ data }) => {
    await assertAdmin("support:write");
    await recordAdminAction("adminUpdateSupportRequest", "support:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: request, error: requestError } = await db
      .from("support_requests")
      .select("id, user_id, subject, message")
      .eq("id", data.request_id)
      .maybeSingle();
    if (requestError || !request)
      return { ok: false as const, error: "Support request not found." };
    const replyEmailMatch =
      typeof request.message === "string"
        ? request.message.match(/^\[Reply email:([^\]]+)\]\n\n/)
        : null;
    const replyEmail = replyEmailMatch?.[1]?.trim();
    if (data.status === "resolved" && data.body && replyEmail && !data.email_sent)
      return { ok: false as const, error: "Send the reply to the contact email before resolving." };
    if (data.status === "resolved" && data.body && data.email_sent && !replyEmail)
      return { ok: false as const, error: "This request has no contact email address." };
    if (data.status === "resolved" && replyEmail && !data.body)
      return { ok: false as const, error: "Add the email reply before resolving this request." };
    if (data.body) {
      const { data: existingNotice, error: noticeLookupError } = await db
        .from("system_messages")
        .select("id")
        .eq("recipient_id", request.user_id)
        .eq("kind", "moderation")
        .contains("meta", { support_request_id: data.request_id })
        .limit(1)
        .maybeSingle();
      if (noticeLookupError)
        return { ok: false as const, error: "Could not check the inbox reply." };
      if (!existingNotice) {
        const { error: noticeError } = await db.from("system_messages").insert({
          recipient_id: request.user_id,
          kind: "moderation",
          title: data.email_sent
            ? "We replied by email"
            : data.title || "Reply from SameThing Support",
          body: data.email_sent
            ? `We sent a reply about “${request.subject}” to ${replyEmail}. Check your email.\n\n${data.body}`
            : data.body,
          meta: { support_request_id: data.request_id },
        });
        if (noticeError) return { ok: false as const, error: "Could not send the inbox reply." };
      }
    }
    const { error } = await db
      .from("support_requests")
      .update({
        status: data.status,
        handled_at: ["resolved", "closed"].includes(data.status) ? new Date().toISOString() : null,
        admin_note: data.body || null,
      })
      .eq("id", data.request_id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ---------- feedback ----------
export const adminListFeedback = createServerFn({ method: "GET" })
  .inputValidator((i: { limit?: number; offset?: number; onlyOpen?: boolean }) =>
    z
      .object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
        onlyOpen: z.boolean().default(false),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    await assertAdmin("support:read");
    await recordAdminAction("adminListFeedback", "support:read");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("feedback")
      .select("id, user_id, message, user_agent, created_at, replied_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.onlyOpen) q = q.is("replied_at", null);
    const { data: rows, count } = await q;
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))) as string[];
    let userMap = new Map<string, { username: string; emoji: string }>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, username, emoji")
        .in("id", ids);
      userMap = new Map((profs ?? []).map((p) => [p.id, { username: p.username, emoji: p.emoji }]));
    }
    return {
      items: (rows ?? []).map((r) => ({
        ...r,
        user: r.user_id ? (userMap.get(r.user_id) ?? null) : null,
      })),
      total: count ?? 0,
    };
  });

export const adminReplyFeedback = createServerFn({ method: "POST" })
  .inputValidator((i: { feedback_id: string; message: string }) =>
    z.object({ feedback_id: z.string().uuid(), message: z.string().min(1).max(2000) }).parse(i),
  )
  .handler(async ({ data }) => {
    await assertAdmin("support:write");
    await recordAdminAction("adminReplyFeedback", "support:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fb } = await supabaseAdmin
      .from("feedback")
      .select("id, user_id, message")
      .eq("id", data.feedback_id)
      .maybeSingle();
    if (!fb?.user_id) return { ok: false, error: "Feedback has no user." };
    await supabaseAdmin.from("system_messages" as never).insert({
      recipient_id: fb.user_id,
      kind: "feedback_reply",
      title: "Reply to your feedback",
      body: data.message,
      meta: { original: fb.message, feedback_id: fb.id },
    } as never);
    await supabaseAdmin
      .from("feedback")
      .update({ replied_at: new Date().toISOString() })
      .eq("id", data.feedback_id);
    return { ok: true };
  });

// ---------- feedback prompts / in-app ads ----------
const FeedbackPromptInput = z.object({
  id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(1000),
  button_label: z.string().trim().min(2).max(40),
  active: z.boolean(),
  duration: z.enum(["1h", "7d", "14d", "forever"]),
});

export const adminListFeedbackPrompts = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin("ads:read");
  await recordAdminAction("adminListFeedbackPrompts", "ads:read");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: prompts, error } = await (supabaseAdmin as any)
    .from("feedback_prompts")
    .select("id, title, body, button_label, active, expires_at, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) return { items: [], error: error.message };

  const ids = (prompts ?? []).map((prompt: { id: string }) => prompt.id);
  const { data: responses } = ids.length
    ? await (supabaseAdmin as any)
        .from("feedback_prompt_responses")
        .select("prompt_id, rating")
        .in("prompt_id", ids)
        .limit(5000)
    : { data: [] };
  const stats = new Map<string, { count: number; total: number }>();
  for (const response of responses ?? []) {
    const current = stats.get(response.prompt_id) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += Number(response.rating ?? 0);
    stats.set(response.prompt_id, current);
  }
  return {
    items: (prompts ?? []).map((prompt: { id: string }) => {
      const stat = stats.get(prompt.id) ?? { count: 0, total: 0 };
      return {
        ...prompt,
        response_count: stat.count,
        average_rating: stat.count ? stat.total / stat.count : null,
      };
    }),
    error: null,
  };
});

const FeedbackPromptResponsesInput = z.object({ prompt_id: z.string().uuid() });

export const adminListFeedbackPromptResponses = createServerFn({ method: "GET" })
  .inputValidator((input) => FeedbackPromptResponsesInput.parse(input))
  .handler(async ({ data }) => {
    await assertAdmin("ads:read");
    await recordAdminAction("adminListFeedbackPromptResponses", "ads:read");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: responses, error } = await (supabaseAdmin as any)
      .from("feedback_prompt_responses")
      .select("id, prompt_id, user_id, rating, comment, created_at")
      .eq("prompt_id", data.prompt_id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return { items: [], error: error.message };
    const userIds = Array.from(
      new Set<string>((responses ?? []).map((item: { user_id: string }) => item.user_id)),
    );
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, username").in("id", userIds).limit(500)
      : { data: [] };
    const usernames = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
    return {
      items: (responses ?? []).map((item: { user_id: string }) => ({
        ...item,
        username: usernames.get(item.user_id) ?? null,
      })),
      error: null,
    };
  });

export const adminUpsertFeedbackPrompt = createServerFn({ method: "POST" })
  .inputValidator((input) => FeedbackPromptInput.parse(input))
  .handler(async ({ data }) => {
    await assertAdmin("ads:write");
    await recordAdminAction("adminUpsertFeedbackPrompt", "ads:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expiresAt =
      data.active && data.duration !== "forever"
        ? new Date(
            Date.now() +
              (data.duration === "1h"
                ? 60 * 60 * 1000
                : data.duration === "7d"
                  ? 7 * 24 * 60 * 60 * 1000
                  : 14 * 24 * 60 * 60 * 1000),
          ).toISOString()
        : null;
    if (data.active) {
      const { error: deactivateError } = await (supabaseAdmin as any)
        .from("feedback_prompts")
        .update({ active: false })
        .neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
      if (deactivateError) return { ok: false as const, error: deactivateError.message };
    }
    const payload = {
      title: data.title,
      body: data.body,
      button_label: data.button_label,
      active: data.active,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };
    const result = data.id
      ? await (supabaseAdmin as any)
          .from("feedback_prompts")
          .update(payload)
          .eq("id", data.id)
          .select("id, title, body, button_label, active, expires_at, updated_at")
          .maybeSingle()
      : await (supabaseAdmin as any)
          .from("feedback_prompts")
          .insert(payload)
          .select("id, title, body, button_label, active, expires_at, updated_at")
          .single();
    if (result.error || !result.data)
      return { ok: false as const, error: result.error?.message ?? "Prompt not found." };
    return { ok: true as const, item: result.data };
  });

// ---------- Research API access requests ----------
const ApiAccessRequestStatus = z.enum(["pending", "reviewing", "approved", "waitlist", "declined"]);
const ApiAccessRequestUpdateInput = z.object({
  id: z.string().uuid(),
  status: ApiAccessRequestStatus,
  admin_note: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const adminListApiAccessRequests = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin("api:read");
  await recordAdminAction("adminListApiAccessRequests", "api:read");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("api_access_requests")
    .select(
      "id, applicant_name, email, organization, use_case, requested_scopes, expected_volume, status, admin_note, reviewed_at, created_at, updated_at, retry_after",
    )
    .in("status", ["pending", "reviewing"])
    .order("created_at", { ascending: false })
    .limit(200);
  return { items: data ?? [], error: error?.message ?? null };
});

export const adminUpdateApiAccessRequest = createServerFn({ method: "POST" })
  .inputValidator((input) => ApiAccessRequestUpdateInput.parse(input))
  .handler(async ({ data }) => {
    await assertAdmin("api:write");
    await recordAdminAction("adminUpdateApiAccessRequest", "api:write");
    if (!RESEARCH_API_AVAILABLE) return { ok: false as const, error: RESEARCH_API_PAUSE_MESSAGE };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: item, error } = await (supabaseAdmin as any)
      .from("api_access_requests")
      .update({
        status: data.status,
        admin_note: data.admin_note?.trim() || null,
        reviewed_at: data.status === "pending" ? null : new Date().toISOString(),
        retry_after:
          data.status === "declined" || data.status === "waitlist"
            ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        application_notice_seen_at: null,
      })
      .eq("id", data.id)
      .select("id, status, admin_note, reviewed_at, updated_at, user_id")
      .maybeSingle();
    if (error || !item)
      return { ok: false as const, error: error?.message ?? "Request not found." };

    if (item.status === "approved") {
      const { issueApiKeyForApprovedRequest } = await import("@/lib/api/api-access.functions");
      const access = await issueApiKeyForApprovedRequest(item.id);
      if (!access.ok) return { ok: false as const, error: access.error };
      return {
        ok: true as const,
        item,
        access: { ready: true as const, created: access.created },
      };
    }

    if (["declined", "waitlist"].includes(item.status)) {
      await (supabaseAdmin as any)
        .from("api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("request_id", item.id)
        .is("revoked_at", null);
    }
    return { ok: true as const, item, access: { ready: false as const } };
  });

export const adminListApiKeys = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin("api:read");
  await recordAdminAction("adminListApiKeys", "api:read");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("api_keys")
    .select(
      "id, request_id, name, applicant_name, email, organization, key_prefix, scopes, rate_plan, created_at, last_used_at, expires_at, revoked_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  return { items: data ?? [], error: error?.message ?? null };
});

export const adminRevokeApiKey = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await assertAdmin("api:write");
    await recordAdminAction("adminRevokeApiKey", "api:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: item, error } = await (supabaseAdmin as any)
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("revoked_at", null)
      .select("id, revoked_at")
      .maybeSingle();
    if (error || !item)
      return { ok: false as const, error: error?.message ?? "Key not found or already revoked." };
    const { recordAdminAudit } = await import("@/lib/admin-rbac.server");
    await recordAdminAudit({
      action: "api_key.revoke",
      permission: "api:write",
      targetType: "api_key",
      targetId: item.id,
    });
    return { ok: true as const, item };
  });

const AdminMemberInput = z.object({
  username: z.string().trim().min(2).max(40),
  permissions: z.array(z.string()).min(1).max(25),
  active: z.boolean().default(true),
});

export const adminListAdminMembers = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin("admin:manage");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("admin_members")
    .select("user_id, username, permissions, active, created_at, updated_at")
    .order("active", { ascending: false })
    .order("username", { ascending: true })
    .limit(200);
  return { items: data ?? [], error: error?.message ?? null };
});

export const adminUpsertAdminMember = createServerFn({ method: "POST" })
  .inputValidator((input) => AdminMemberInput.parse(input))
  .handler(async ({ data }) => {
    const actor = await assertAdmin("admin:manage");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ADMIN_PERMISSIONS, recordAdminAudit } = await import("@/lib/admin-rbac.server");
    const username = data.username.replace(/^@/, "").trim().toLowerCase();
    const permissions = Array.from(new Set(data.permissions));
    const invalid = permissions.filter(
      (permission) => !(ADMIN_PERMISSIONS as readonly string[]).includes(permission),
    );
    if (invalid.length) return { ok: false as const, error: `Unknown permission: ${invalid[0]}` };
    const { data: profile } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, username")
      .eq("username", username)
      .maybeSingle();
    if (!profile)
      return { ok: false as const, error: "No SameThing. account exists with that username." };
    if (actor.userId === profile.id && !data.active)
      return { ok: false as const, error: "You cannot deactivate your own admin account." };
    const { data: member, error } = await (supabaseAdmin as any)
      .from("admin_members")
      .upsert(
        {
          user_id: profile.id,
          username: profile.username,
          permissions,
          active: data.active,
          created_by: actor.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("user_id, username, permissions, active, created_at, updated_at")
      .single();
    if (error || !member)
      return { ok: false as const, error: error?.message ?? "Could not save admin member." };
    await recordAdminAudit({
      action: "admin_member.upsert",
      permission: "admin:manage",
      targetType: "admin_member",
      targetId: member.user_id,
      metadata: {
        username: member.username,
        active: member.active,
        permission_count: permissions.length,
      },
    });
    return { ok: true as const, item: member };
  });

export const adminListAuditLogs = createServerFn({ method: "GET" })
  .inputValidator((input: { limit?: number; offset?: number; actor?: string; action?: string }) =>
    z
      .object({
        limit: z.number().int().min(1).max(200).default(100),
        offset: z.number().int().min(0).default(0),
        actor: z.string().trim().max(40).optional().or(z.literal("")),
        action: z.string().trim().max(120).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await assertAdmin("logs:read");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = (supabaseAdmin as any)
      .from("admin_audit_logs")
      .select(
        "id, actor_user_id, actor_username, actor_mode, action, permission, target_type, target_id, metadata, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.actor) query = query.ilike("actor_username", `%${data.actor.replace(/[%_]/g, "")}%`);
    if (data.action) query = query.ilike("action", `%${data.action.replace(/[%_]/g, "")}%`);
    const { data: items, count, error } = await query;
    return { items: items ?? [], total: count ?? 0, error: error?.message ?? null };
  });

// ---------- system messages ----------
export const adminSendSystemMessage = createServerFn({ method: "POST" })
  .inputValidator(
    (i: {
      recipient_username?: string;
      broadcast?: boolean;
      title: string;
      body: string;
      link?: string;
    }) =>
      z
        .object({
          recipient_username: z.string().optional(),
          broadcast: z.boolean().default(false),
          title: z.string().min(1).max(120),
          body: z.string().min(1).max(2000),
          link: z.string().max(500).optional(),
        })
        .parse(i),
  )
  .handler(async ({ data }) => {
    await assertAdmin("messages:write");
    await recordAdminAction("adminSendSystemMessage", "messages:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let recipientIds: string[] = [];
    if (data.broadcast) {
      const { data: all } = await supabaseAdmin.from("profiles").select("id");
      recipientIds = (all ?? []).map((p) => p.id);
    } else {
      if (!data.recipient_username) return { ok: false, error: "Username required." };
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", data.recipient_username.trim().toLowerCase())
        .maybeSingle();
      if (!p) return { ok: false, error: "User not found." };
      recipientIds = [p.id];
    }
    if (!recipientIds.length) return { ok: false, error: "No recipients." };
    const rows = recipientIds.map((rid) => ({
      recipient_id: rid,
      kind: "system",
      title: data.title,
      body: data.body,
      link: data.link || null,
    }));
    const { error } = await supabaseAdmin.from("system_messages" as never).insert(rows as never);
    if (error) return { ok: false, error: error.message };
    return { ok: true, count: rows.length };
  });

// ---------- banned words ----------
export const adminListBannedWords = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin("content:read");
  await recordAdminAction("adminListBannedWords", "content:read");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("banned_words" as never)
    .select("id, word, severity, created_at")
    .order("word");
  return {
    items:
      (data as unknown as Array<{
        id: string;
        word: string;
        severity: string;
        created_at: string;
      }>) ?? [],
  };
});

export const adminAddBannedWord = createServerFn({ method: "POST" })
  .inputValidator((i: { word: string; severity?: "warn" | "block" }) =>
    z
      .object({
        word: z.string().min(1).max(60),
        severity: z.enum(["warn", "block"]).default("warn"),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    await assertAdmin("content:write");
    await recordAdminAction("adminAddBannedWord", "content:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("banned_words" as never)
      .insert({ word: data.word.trim().toLowerCase(), severity: data.severity } as never);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const adminDeleteBannedWord = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin("content:delete");
    await recordAdminAction("adminDeleteBannedWord", "content:delete");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("banned_words" as never)
      .delete()
      .eq("id", data.id);
    return { ok: true };
  });
