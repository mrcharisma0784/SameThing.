// Admin server functions. All (except adminLogin/adminStatus/adminLogout)
// require the admin session cookie unlocked via the shared password.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, timingSafeEqual } from "node:crypto";

async function assertAdmin() {
  const { requireAdminUnlocked } = await import("@/lib/admin-session.server");
  await requireAdminUnlocked();
}

function pwEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

// ---------- auth ----------
export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((i: { password: string }) => z.object({ password: z.string().min(1).max(500) }).parse(i))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return { ok: false as const, error: "Admin not configured." };
    if (!pwEqual(data.password, expected)) return { ok: false as const, error: "Wrong password." };
    const { getAdminSession } = await import("@/lib/admin-session.server");
    const s = await getAdminSession();
    await s.update({ unlocked: true, at: Date.now() });
    return { ok: true as const };
  });

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getAdminSession } = await import("@/lib/admin-session.server");
  const s = await getAdminSession();
  return { unlocked: !!s.data.unlocked };
});

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getAdminSession } = await import("@/lib/admin-session.server");
  const s = await getAdminSession();
  await s.clear();
  return { ok: true };
});

// ---------- overview ----------
export const adminOverview = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [users, things, comments, votes, feedback, premium, banned] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("things").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("comments").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("votes").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("feedback").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("plan", "premium"),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).not("banned_at", "is", null),
  ]);
  return {
    users: users.count ?? 0,
    things: things.count ?? 0,
    comments: comments.count ?? 0,
    votes: votes.count ?? 0,
    feedback: feedback.count ?? 0,
    premium: premium.count ?? 0,
    banned: banned.count ?? 0,
  };
});

// ---------- users ----------
export const adminListUsers = createServerFn({ method: "GET" })
  .inputValidator((i: { q?: string; limit?: number; offset?: number }) =>
    z.object({ q: z.string().optional(), limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).default(0) }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("profiles").select(
      "id, username, emoji, bio, plan, language, created_at, warnings_count, banned_at, ban_reason, rare_thing_count, gender, age_range",
      { count: "exact" },
    ).order("created_at", { ascending: false }).range(data.offset, data.offset + data.limit - 1);
    if (data.q) q = q.ilike("username", `%${data.q}%`);
    const { data: rows, count } = await q;
    return { items: rows ?? [], total: count ?? 0 };
  });

export const adminUserDetail = createServerFn({ method: "GET" })
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [profileRes, authRes, thingsRes, commentsRes, votesRes, feedbackRes, mentionsRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(data.id),
      supabaseAdmin.from("things").select("id, title, tags, created_at, hidden, same_count, nah_count, total_votes, is_anonymous")
        .eq("user_id", data.id).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("comments").select("id, thing_id, text, created_at, hidden")
        .eq("user_id", data.id).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("votes").select("id, thing_id, vote_type, created_at")
        .eq("user_id", data.id).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("feedback").select("id, message, created_at, replied_at")
        .eq("user_id", data.id).order("created_at", { ascending: false }).limit(30),
      supabaseAdmin.from("mentions" as never).select("id, thing_id, comment_id, created_at")
        .eq("mentioned_user_id", data.id).order("created_at", { ascending: false }).limit(30),
    ]);
    const u = authRes.data?.user;
    // Collect tag usage from user's things
    const tagCounts = new Map<string, number>();
    for (const t of (thingsRes.data ?? []) as Array<{ tags: string[] }>) {
      for (const tag of t.tags ?? []) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
    const tags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
    return {
      profile: profileRes.data,
      auth: u ? { email: u.email, phone: u.phone, provider: u.app_metadata?.provider ?? null, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at } : null,
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
    z.object({ id: z.string().uuid(), reason: z.string().max(500).default(""), ban: z.boolean() }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({
      banned_at: data.ban ? new Date().toISOString() : null,
      ban_reason: data.ban ? data.reason || null : null,
    }).eq("id", data.id);
    return { ok: true };
  });

export const adminSetPlan = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string; plan: "free" | "premium" }) =>
    z.object({ id: z.string().uuid(), plan: z.enum(["free", "premium"]) }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ plan: data.plan }).eq("id", data.id);
    await supabaseAdmin.from("system_messages").insert({
      recipient_id: data.id,
      kind: "system",
      title: data.plan === "premium" ? "✦ PremiumThing. unlocked" : "PremiumThing. ended",
      body: data.plan === "premium"
        ? "Your account is now PremiumThing. — themes, exclusive icons and the golden ring are yours."
        : "Your PremiumThing. access has ended. Themes and premium icons are locked again.",
      link: "/premium",
    } as never);
    return { ok: true };
  });

export const adminWarnUser = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string; note: string }) =>
    z.object({ id: z.string().uuid(), note: z.string().min(1).max(500) }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("profiles").select("warnings_count").eq("id", data.id).maybeSingle();
    await supabaseAdmin.from("profiles").update({ warnings_count: ((p?.warnings_count as number | undefined) ?? 0) + 1 }).eq("id", data.id);
    await supabaseAdmin.from("system_messages" as never).insert({
      recipient_id: data.id, kind: "warning", title: "Warning from moderators", body: data.note,
    } as never);
    return { ok: true };
  });

// ---------- things ----------
export const adminListThings = createServerFn({ method: "GET" })
  .inputValidator((i: { q?: string; limit?: number; offset?: number; hiddenOnly?: boolean }) =>
    z.object({ q: z.string().optional(), limit: z.number().int().min(1).max(100).default(30), offset: z.number().int().min(0).default(0), hiddenOnly: z.boolean().default(false) }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("things").select(
      "id, user_id, title, raw_text, tags, created_at, hidden, same_count, nah_count, total_votes, report_count, comment_count, is_anonymous",
      { count: "exact" },
    ).order("created_at", { ascending: false }).range(data.offset, data.offset + data.limit - 1);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    if (data.hiddenOnly) q = q.eq("hidden", true);
    const { data: rows, count } = await q;
    return { items: rows ?? [], total: count ?? 0 };
  });

export const adminHideThing = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string; hidden: boolean }) =>
    z.object({ id: z.string().uuid(), hidden: z.boolean() }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("things").update({ hidden: data.hidden }).eq("id", data.id);
    return { ok: true };
  });

export const adminDeleteThing = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("comments").delete().eq("thing_id", data.id);
    await supabaseAdmin.from("votes").delete().eq("thing_id", data.id);
    await supabaseAdmin.from("mentions" as never).delete().eq("thing_id", data.id);
    await supabaseAdmin.from("things").delete().eq("id", data.id);
    return { ok: true };
  });

// ---------- feedback ----------
export const adminListFeedback = createServerFn({ method: "GET" })
  .inputValidator((i: { limit?: number; offset?: number; onlyOpen?: boolean }) =>
    z.object({ limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).default(0), onlyOpen: z.boolean().default(false) }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("feedback").select("id, user_id, message, user_agent, created_at, replied_at", { count: "exact" })
      .order("created_at", { ascending: false }).range(data.offset, data.offset + data.limit - 1);
    if (data.onlyOpen) q = q.is("replied_at", null);
    const { data: rows, count } = await q;
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))) as string[];
    let userMap = new Map<string, { username: string; emoji: string }>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id, username, emoji").in("id", ids);
      userMap = new Map((profs ?? []).map((p) => [p.id, { username: p.username, emoji: p.emoji }]));
    }
    return {
      items: (rows ?? []).map((r) => ({ ...r, user: r.user_id ? userMap.get(r.user_id) ?? null : null })),
      total: count ?? 0,
    };
  });

export const adminReplyFeedback = createServerFn({ method: "POST" })
  .inputValidator((i: { feedback_id: string; message: string }) =>
    z.object({ feedback_id: z.string().uuid(), message: z.string().min(1).max(2000) }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fb } = await supabaseAdmin.from("feedback").select("id, user_id, message").eq("id", data.feedback_id).maybeSingle();
    if (!fb?.user_id) return { ok: false, error: "Feedback has no user." };
    await supabaseAdmin.from("system_messages" as never).insert({
      recipient_id: fb.user_id, kind: "feedback_reply",
      title: "Reply to your feedback",
      body: data.message,
      meta: { original: fb.message, feedback_id: fb.id },
    } as never);
    await supabaseAdmin.from("feedback").update({ replied_at: new Date().toISOString() }).eq("id", data.feedback_id);
    return { ok: true };
  });

// ---------- system messages ----------
export const adminSendSystemMessage = createServerFn({ method: "POST" })
  .inputValidator((i: { recipient_username?: string; broadcast?: boolean; title: string; body: string; link?: string }) =>
    z.object({
      recipient_username: z.string().optional(),
      broadcast: z.boolean().default(false),
      title: z.string().min(1).max(120),
      body: z.string().min(1).max(2000),
      link: z.string().max(500).optional(),
    }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let recipientIds: string[] = [];
    if (data.broadcast) {
      const { data: all } = await supabaseAdmin.from("profiles").select("id");
      recipientIds = (all ?? []).map((p) => p.id);
    } else {
      if (!data.recipient_username) return { ok: false, error: "Username required." };
      const { data: p } = await supabaseAdmin.from("profiles").select("id").eq("username", data.recipient_username.trim().toLowerCase()).maybeSingle();
      if (!p) return { ok: false, error: "User not found." };
      recipientIds = [p.id];
    }
    if (!recipientIds.length) return { ok: false, error: "No recipients." };
    const rows = recipientIds.map((rid) => ({
      recipient_id: rid, kind: "system", title: data.title, body: data.body, link: data.link || null,
    }));
    const { error } = await supabaseAdmin.from("system_messages" as never).insert(rows as never);
    if (error) return { ok: false, error: error.message };
    return { ok: true, count: rows.length };
  });

// ---------- banned words ----------
export const adminListBannedWords = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("banned_words" as never).select("id, word, severity, created_at").order("word");
  return { items: (data as unknown as Array<{ id: string; word: string; severity: string; created_at: string }>) ?? [] };
});

export const adminAddBannedWord = createServerFn({ method: "POST" })
  .inputValidator((i: { word: string; severity?: "warn" | "block" }) =>
    z.object({ word: z.string().min(1).max(60), severity: z.enum(["warn", "block"]).default("warn") }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("banned_words" as never)
      .insert({ word: data.word.trim().toLowerCase(), severity: data.severity } as never);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const adminDeleteBannedWord = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("banned_words" as never).delete().eq("id", data.id);
    return { ok: true };
  });
