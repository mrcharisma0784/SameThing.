import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationItem = {
  id: string;
  kind: "comment" | "same" | "nah" | "mention" | "system";
  thing_id: string;
  thing_title: string;
  preview: string | null;
  created_at: string;
  comment_id?: string | null;
  link?: string | null;
  system_id?: string | null;
};

export const getMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const { data: myThings } = await supabaseAdmin
      .from("things").select("id, title").eq("user_id", userId).limit(200);
    const ids = (myThings ?? []).map((t) => t.id);
    const titleMap = new Map((myThings ?? []).map((t) => [t.id, t.title]));

    const [commentsRes, votesRes, profRes, mentionsRes, systemRes] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("comments").select("id, thing_id, text, created_at")
            .in("thing_id", ids).eq("hidden", false).neq("user_id", userId)
            .order("created_at", { ascending: false }).limit(50)
        : Promise.resolve({ data: [] as Array<{ id: string; thing_id: string; text: string; created_at: string }> }),
      ids.length
        ? supabaseAdmin.from("votes").select("id, thing_id, vote_type, created_at, user_id")
            .in("thing_id", ids).neq("user_id", userId)
            .order("created_at", { ascending: false }).limit(50)
        : Promise.resolve({ data: [] as Array<{ id: string; thing_id: string; vote_type: string; created_at: string }> }),
      supabaseAdmin.from("profiles").select("inbox_seen_at, notification_prefs").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("mentions" as never).select("id, comment_id, thing_id, created_at")
        .eq("mentioned_user_id", userId)
        .order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("system_messages" as never)
        .select("id, title, body, link, created_at, kind")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false }).limit(50),
    ]);

    const profRow = profRes.data as { inbox_seen_at?: string; notification_prefs?: Record<string, boolean> } | null;
    const prefs = { same: true, nah: true, comment: true, mention: true, only_one: true, system: true, ...(profRow?.notification_prefs ?? {}) };
    const seenAt = profRow?.inbox_seen_at ? +new Date(profRow.inbox_seen_at) : 0;
    const items: NotificationItem[] = [];
    for (const c of commentsRes.data ?? []) {
      items.push({ id: `c-${c.id}`, kind: "comment", thing_id: c.thing_id,
        thing_title: titleMap.get(c.thing_id) ?? "your thing",
        preview: (c.text ?? "").slice(0, 140), created_at: c.created_at, comment_id: c.id });
    }
    for (const v of votesRes.data ?? []) {
      items.push({ id: `v-${v.id}`, kind: v.vote_type === "same" ? "same" : "nah",
        thing_id: v.thing_id, thing_title: titleMap.get(v.thing_id) ?? "your thing",
        preview: null, created_at: v.created_at });
    }
    const mentions = (mentionsRes.data as unknown as Array<{ id: string; comment_id: string; thing_id: string; created_at: string }>) ?? [];
    if (mentions.length) {
      const cids = mentions.map((m) => m.comment_id);
      const tids = Array.from(new Set(mentions.map((m) => m.thing_id)));
      const [ct, tt] = await Promise.all([
        supabaseAdmin.from("comments").select("id, text").in("id", cids),
        supabaseAdmin.from("things").select("id, title").in("id", tids),
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
    const sys = (systemRes.data as unknown as Array<{ id: string; title: string; body: string; link: string | null; created_at: string; kind: string }>) ?? [];
    for (const m of sys) {
      items.push({
        id: `s-${m.id}`,
        kind: "system",
        thing_id: "",
        thing_title: `[System] ${m.title}`,
        preview: (m.body ?? "").slice(0, 200),
        created_at: m.created_at,
        link: m.link,
        system_id: m.id,
      });
    }
    // Filter by user notification prefs
    const filtered = items.filter((i) => {
      if (i.kind === "comment") return prefs.comment;
      if (i.kind === "same") return prefs.same;
      if (i.kind === "nah") return prefs.nah;
      if (i.kind === "mention") return prefs.mention;
      if (i.kind === "system") return prefs.system;
      return true;
    });
    filtered.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    const unread = filtered.filter((i) => +new Date(i.created_at) > seenAt).length;
    return { items: filtered.slice(0, 80), unread };
  });

export const getInboxUnread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;
    const { data: myThings } = await supabaseAdmin
      .from("things").select("id").eq("user_id", userId).limit(200);
    const ids = (myThings ?? []).map((t) => t.id);
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("inbox_seen_at").eq("id", userId).maybeSingle();
    const seen = (prof as { inbox_seen_at?: string } | null)?.inbox_seen_at ?? new Date(0).toISOString();
    const [c, v, m, s] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("comments").select("id", { count: "exact", head: true })
            .in("thing_id", ids).eq("hidden", false).neq("user_id", userId).gt("created_at", seen)
        : Promise.resolve({ count: 0 }),
      ids.length
        ? supabaseAdmin.from("votes").select("id", { count: "exact", head: true })
            .in("thing_id", ids).neq("user_id", userId).gt("created_at", seen)
        : Promise.resolve({ count: 0 }),
      supabaseAdmin.from("mentions" as never).select("id", { count: "exact", head: true })
        .eq("mentioned_user_id", userId).gt("created_at", seen),
      supabaseAdmin.from("system_messages" as never).select("id", { count: "exact", head: true })
        .eq("recipient_id", userId).gt("created_at", seen),
    ]);
    return { unread: (c.count ?? 0) + (v.count ?? 0) + (m.count ?? 0) + (s.count ?? 0) };
  });

export const markInboxSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ inbox_seen_at: new Date().toISOString() }).eq("id", context.userId);
    return { ok: true };
  });
