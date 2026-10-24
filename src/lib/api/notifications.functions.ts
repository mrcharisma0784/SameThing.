import { createServerFn } from "@tanstack/react-start";
/* eslint-disable @typescript-eslint/no-explicit-any -- live Supabase notification projections are cast at this server boundary. */
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationItem = {
  id: string;
  kind:
    | "comment"
    | "like"
    | "quote_comment"
    | "quote_like"
    | "same"
    | "nah"
    | "mention"
    | "follow"
    | "system";
  thing_id: string;
  thing_title: string;
  preview: string | null;
  created_at: string;
  comment_id?: string | null;
  link?: string | null;
  system_id?: string | null;
};

type NotificationPrefs = {
  same: boolean;
  nah: boolean;
  comment: boolean;
  like: boolean;
  quote_activity: boolean;
  mention: boolean;
  only_one: boolean;
  follow: boolean;
  system: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  same: true,
  nah: true,
  comment: true,
  like: true,
  quote_activity: true,
  mention: true,
  only_one: true,
  follow: true,
  system: true,
};

const RETENTION_DEFAULT_HOURS = 720;

function getRetentionCutoff(hours: number): string {
  const safeHours = [24, 168, 360, 720].includes(hours) ? hours : RETENTION_DEFAULT_HOURS;
  return new Date(Date.now() - safeHours * 60 * 60 * 1000).toISOString();
}

export const getMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const { data: myThings } = await supabaseAdmin
      .from("things")
      .select("id, title")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .limit(200);
    const ids = (myThings ?? []).map((t) => t.id);
    const titleMap = new Map((myThings ?? []).map((t) => [t.id, t.title]));
    const { data: myQuotes } = await (supabaseAdmin as any)
      .from("quotes")
      .select("id, text")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .limit(200);
    const quoteIds = (myQuotes ?? []).map((quote: { id: string }) => quote.id);
    const quoteTitleMap = new Map<string, string>(
      (myQuotes ?? []).map((quote: { id: string; text: string }) => [
        quote.id,
        quote.text.slice(0, 80),
      ]),
    );

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("inbox_seen_at, notification_prefs, notification_retention_hours")
      .eq("id", userId)
      .maybeSingle();
    const profRow = prof as {
      inbox_seen_at?: string;
      notification_prefs?: Partial<NotificationPrefs>;
      notification_retention_hours?: number;
    } | null;
    const prefs: NotificationPrefs = {
      ...DEFAULT_PREFS,
      ...(profRow?.notification_prefs ?? {}),
    };
    const cutoff = getRetentionCutoff(
      Number(profRow?.notification_retention_hours ?? RETENTION_DEFAULT_HOURS),
    );
    const seenAt = profRow?.inbox_seen_at ? +new Date(profRow.inbox_seen_at) : 0;

    const [
      commentsRes,
      votesRes,
      likesRes,
      quoteCommentsRes,
      quoteLikesRes,
      mentionsRes,
      systemRes,
    ] = await Promise.all([
      ids.length
        ? supabaseAdmin
            .from("comments")
            .select("id, thing_id, text, created_at")
            .in("thing_id", ids)
            .eq("hidden", false)
            .neq("user_id", userId)
            .gte("created_at", cutoff)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({
            data: [] as Array<{ id: string; thing_id: string; text: string; created_at: string }>,
          }),
      ids.length
        ? supabaseAdmin
            .from("votes")
            .select("id, thing_id, vote_type, created_at, user_id")
            .in("thing_id", ids)
            .neq("user_id", userId)
            .gte("created_at", cutoff)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({
            data: [] as Array<{
              id: string;
              thing_id: string;
              vote_type: string;
              created_at: string;
            }>,
          }),
      ids.length
        ? (supabaseAdmin as any)
            .from("thing_likes")
            .select("id, thing_id, created_at")
            .in("thing_id", ids)
            .neq("user_id", userId)
            .gte("created_at", cutoff)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [] }),
      quoteIds.length
        ? (supabaseAdmin as any)
            .from("comments")
            .select("id, quote_id, text, created_at")
            .in("quote_id", quoteIds)
            .eq("hidden", false)
            .neq("user_id", userId)
            .gte("created_at", cutoff)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [] }),
      quoteIds.length
        ? (supabaseAdmin as any)
            .from("quote_likes")
            .select("id, quote_id, created_at")
            .in("quote_id", quoteIds)
            .neq("user_id", userId)
            .gte("created_at", cutoff)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [] }),
      supabaseAdmin
        .from("mentions" as never)
        .select("id, comment_id, thing_id, created_at")
        .eq("mentioned_user_id", userId)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("system_messages" as never)
        .select("id, title, body, link, created_at, kind, meta")
        .eq("recipient_id", userId)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const items: NotificationItem[] = [];
    for (const c of commentsRes.data ?? []) {
      if (!c.thing_id) continue;
      items.push({
        id: `c-${c.id}`,
        kind: "comment",
        thing_id: c.thing_id,
        thing_title: titleMap.get(c.thing_id) ?? "your thing",
        preview: (c.text ?? "").slice(0, 140),
        created_at: c.created_at,
        comment_id: c.id,
      });
    }
    for (const v of votesRes.data ?? []) {
      items.push({
        id: `v-${v.id}`,
        kind: v.vote_type === "same" ? "same" : "nah",
        thing_id: v.thing_id,
        thing_title: titleMap.get(v.thing_id) ?? "your thing",
        preview: null,
        created_at: v.created_at,
      });
    }

    for (const like of likesRes.data ?? []) {
      items.push({
        id: `l-${like.id}`,
        kind: "like",
        thing_id: like.thing_id,
        thing_title: titleMap.get(like.thing_id) ?? "your thing",
        preview: null,
        created_at: like.created_at,
      });
    }
    for (const comment of quoteCommentsRes.data ?? []) {
      items.push({
        id: `qc-${comment.id}`,
        kind: "quote_comment",
        thing_id: comment.quote_id,
        thing_title: quoteTitleMap.get(comment.quote_id) ?? "your Quote",
        preview: (comment.text ?? "").slice(0, 140),
        created_at: comment.created_at,
        comment_id: comment.id,
        link: `/quote/${comment.quote_id}`,
      });
    }
    for (const like of quoteLikesRes.data ?? []) {
      items.push({
        id: `ql-${like.id}`,
        kind: "quote_like",
        thing_id: like.quote_id,
        thing_title: quoteTitleMap.get(like.quote_id) ?? "your Quote",
        preview: null,
        created_at: like.created_at,
        link: `/quote/${like.quote_id}`,
      });
    }

    const mentions =
      (mentionsRes.data as unknown as Array<{
        id: string;
        comment_id: string;
        thing_id: string;
        created_at: string;
      }>) ?? [];
    if (mentions.length) {
      const cids = mentions.map((m) => m.comment_id);
      const tids = Array.from(new Set(mentions.map((m) => m.thing_id)));
      const [ct, tt] = await Promise.all([
        supabaseAdmin.from("comments").select("id, text").in("id", cids),
        supabaseAdmin.from("things").select("id, title").in("id", tids).is("deleted_at", null),
      ]);
      const cmap = new Map((ct.data ?? []).map((c) => [c.id, c.text]));
      const tmap = new Map((tt.data ?? []).map((t) => [t.id, t.title]));
      for (const m of mentions) {
        items.push({
          id: `m-${m.id}`,
          kind: "mention",
          thing_id: m.thing_id,
          thing_title: tmap.get(m.thing_id) ?? "a thing",
          preview: (cmap.get(m.comment_id) ?? "").slice(0, 140),
          created_at: m.created_at,
          comment_id: m.comment_id,
        });
      }
    }

    const system =
      (systemRes.data as unknown as Array<{
        id: string;
        title: string;
        body: string;
        link: string | null;
        created_at: string;
        kind: string;
        meta?: Record<string, unknown> | null;
      }>) ?? [];
    for (const m of system) {
      const follow = m.kind === "follow";
      const meta = m.meta ?? {};
      items.push({
        id: `s-${m.id}`,
        kind: follow ? "follow" : "system",
        thing_id: String(meta.target_id ?? ""),
        thing_title: follow ? m.title : `[System] ${m.title}`,
        preview: (m.body ?? "").slice(0, 200),
        created_at: m.created_at,
        link: m.link,
        system_id: m.id,
      });
    }

    const filtered = items.filter((item) => {
      if (item.kind === "comment") return prefs.comment;
      if (item.kind === "like") return prefs.like;
      if (item.kind === "quote_comment" || item.kind === "quote_like") return prefs.quote_activity;
      if (item.kind === "same") return prefs.same;
      if (item.kind === "nah") return prefs.nah;
      if (item.kind === "mention") return prefs.mention;
      if (item.kind === "follow") return prefs.follow;
      if (item.kind === "system") return prefs.system;
      return true;
    });
    filtered.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    const unread = filtered.filter((item) => +new Date(item.created_at) > seenAt).length;
    return { items: filtered.slice(0, 80), unread };
  });

export const getInboxUnread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;
    const { data: myThings } = await supabaseAdmin
      .from("things")
      .select("id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .limit(200);
    const ids = (myThings ?? []).map((t) => t.id);
    const { data: myQuotes } = await (supabaseAdmin as any)
      .from("quotes")
      .select("id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .limit(200);
    const quoteIds = (myQuotes ?? []).map((quote: { id: string }) => quote.id);
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("inbox_seen_at, notification_prefs, notification_retention_hours")
      .eq("id", userId)
      .maybeSingle();
    const profRow = prof as {
      inbox_seen_at?: string;
      notification_prefs?: Partial<NotificationPrefs>;
      notification_retention_hours?: number;
    } | null;
    const prefs: NotificationPrefs = { ...DEFAULT_PREFS, ...(profRow?.notification_prefs ?? {}) };
    const cutoff = getRetentionCutoff(
      Number(profRow?.notification_retention_hours ?? RETENTION_DEFAULT_HOURS),
    );
    const seen = profRow?.inbox_seen_at ?? new Date(0).toISOString();
    const enabledVoteTypes = [prefs.same ? "same" : null, prefs.nah ? "nah" : null].filter(
      Boolean,
    ) as string[];
    const [c, v, l, qc, ql, m, s, f] = await Promise.all([
      ids.length && prefs.comment
        ? supabaseAdmin
            .from("comments")
            .select("id", { count: "exact", head: true })
            .in("thing_id", ids)
            .eq("hidden", false)
            .neq("user_id", userId)
            .gte("created_at", cutoff)
            .gt("created_at", seen)
        : Promise.resolve({ count: 0 }),
      ids.length && enabledVoteTypes.length
        ? supabaseAdmin
            .from("votes")
            .select("id", { count: "exact", head: true })
            .in("thing_id", ids)
            .in("vote_type", enabledVoteTypes)
            .neq("user_id", userId)
            .gte("created_at", cutoff)
            .gt("created_at", seen)
        : Promise.resolve({ count: 0 }),
      ids.length && prefs.like
        ? (supabaseAdmin as any)
            .from("thing_likes")
            .select("id", { count: "exact", head: true })
            .in("thing_id", ids)
            .neq("user_id", userId)
            .gte("created_at", cutoff)
            .gt("created_at", seen)
        : Promise.resolve({ count: 0 }),
      quoteIds.length && prefs.quote_activity
        ? (supabaseAdmin as any)
            .from("comments")
            .select("id", { count: "exact", head: true })
            .in("quote_id", quoteIds)
            .eq("hidden", false)
            .neq("user_id", userId)
            .gte("created_at", cutoff)
            .gt("created_at", seen)
        : Promise.resolve({ count: 0 }),
      quoteIds.length && prefs.quote_activity
        ? (supabaseAdmin as any)
            .from("quote_likes")
            .select("id", { count: "exact", head: true })
            .in("quote_id", quoteIds)
            .neq("user_id", userId)
            .gte("created_at", cutoff)
            .gt("created_at", seen)
        : Promise.resolve({ count: 0 }),
      prefs.mention
        ? supabaseAdmin
            .from("mentions" as never)
            .select("id", { count: "exact", head: true })
            .eq("mentioned_user_id", userId)
            .gte("created_at", cutoff)
            .gt("created_at", seen)
        : Promise.resolve({ count: 0 }),
      prefs.system
        ? supabaseAdmin
            .from("system_messages" as never)
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", userId)
            .neq("kind", "follow")
            .gte("created_at", cutoff)
            .gt("created_at", seen)
        : Promise.resolve({ count: 0 }),
      prefs.follow
        ? supabaseAdmin
            .from("system_messages" as never)
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", userId)
            .eq("kind", "follow")
            .gte("created_at", cutoff)
            .gt("created_at", seen)
        : Promise.resolve({ count: 0 }),
    ]);
    return {
      unread:
        (c.count ?? 0) +
        (v.count ?? 0) +
        (l.count ?? 0) +
        (qc.count ?? 0) +
        (ql.count ?? 0) +
        (m.count ?? 0) +
        (s.count ?? 0) +
        (f.count ?? 0),
    };
  });

export const markInboxSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("profiles")
      .update({ inbox_seen_at: new Date().toISOString() })
      .eq("id", context.userId);
    return { ok: true };
  });
