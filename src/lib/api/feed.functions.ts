import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const FeedInput = z.object({
  filter: z.enum(["all", "trending", "new", "rare"]).default("new"),
  language: z.string().default("all"),
  tag: z.string().optional().nullable(),
  cursor: z.string().nullable().optional(),
  limit: z.number().min(1).max(40).default(20),
});

// Best-effort: read userId from bearer token if present. Doesn't throw.
async function getOptionalUserId(): Promise<string | null> {
  try {
    const req = getRequest();
    const auth = req?.headers?.get("authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    if (!token) return null;
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await sb.auth.getClaims(token);
    return (data?.claims?.sub as string) ?? null;
  } catch {
    return null;
  }
}

type ThingRow = Record<string, any> & {
  id: string; user_id: string | null; is_anonymous?: boolean | null;
};

function maskUser<T extends ThingRow>(row: T, viewerId: string | null): T & { is_mine: boolean } {
  const is_mine = !!viewerId && row.user_id === viewerId;
  if (row.is_anonymous) return { ...row, user_id: null, is_mine } as T & { is_mine: boolean };
  return { ...row, is_mine } as T & { is_mine: boolean };
}

async function attachAuthors<T extends ThingRow>(rows: T[]) {
  const ids = Array.from(new Set(rows.filter((r) => !r.is_anonymous && r.user_id).map((r) => r.user_id as string)));
  if (ids.length === 0) return rows.map((r) => ({ ...r, author: null }));
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profs } = await supabaseAdmin
    .from("profiles").select("id, username, emoji, plan").in("id", ids);
  const map = new Map<string, { username: string; emoji: string; plan: string }>();
  (profs ?? []).forEach((p) => map.set(p.id, { username: p.username, emoji: p.emoji, plan: p.plan ?? "free" }));
  return rows.map((r) => ({ ...r, author: r.user_id ? map.get(r.user_id) ?? null : null }));
}

export const getFeed = createServerFn({ method: "GET" })
  .inputValidator((i) => FeedInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const viewerId = await getOptionalUserId();

    let q = supabaseAdmin
      .from("things")
      .select("id, simplified_text, title, language, tags, is_anonymous, is_open_to_chat, comments_closed, same_count, nah_count, total_votes, similarity_score, comment_count, is_rare_thing, created_at, user_id")
      .eq("hidden", false)
      .eq("safety_flag", false);

    if (data.language !== "all") q = q.eq("language", data.language);
    if (data.tag) q = q.contains("tags", [data.tag]);

    if (data.filter === "rare") q = q.eq("is_rare_thing", true);
    if (data.filter === "trending") {
      const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
      q = q.gte("created_at", since).order("same_count", { ascending: false }).order("created_at", { ascending: false });
    } else {
      q = q.order("created_at", { ascending: false });
    }

    if (data.cursor && data.filter !== "trending") q = q.lt("created_at", data.cursor);
    q = q.limit(data.limit);

    const { data: things, error } = await q;
    if (error) {
      console.error("feed error", error);
      return { things: [] as any[], nextCursor: null as string | null };
    }
    const masked = (things ?? []).map((r) => maskUser(r as ThingRow, viewerId));
    const withAuthors = await attachAuthors(masked);
    const nextCursor = withAuthors.length === data.limit ? withAuthors[withAuthors.length - 1].created_at as string : null;
    return { things: withAuthors, nextCursor };
  });

export const getThing = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const viewerId = await getOptionalUserId();
    const { data: thing } = await supabaseAdmin
      .from("things")
      .select("id, simplified_text, title, language, tags, is_anonymous, is_open_to_chat, comments_closed, same_count, nah_count, total_votes, similarity_score, comment_count, is_rare_thing, created_at, user_id, hidden, safety_flag")
      .eq("id", data.id)
      .eq("hidden", false)
      .eq("safety_flag", false)
      .maybeSingle();
    if (!thing) return { thing: null, comments: [] };
    const { data: comments } = await supabaseAdmin
      .from("comments")
      .select("id, text, is_anonymous, created_at, user_id, parent_id, pinned_at")
      .eq("thing_id", data.id)
      .eq("hidden", false)
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(200);
    const [maskedThing] = await attachAuthors([maskUser(thing as ThingRow, viewerId)]);
    const maskedComments = await attachAuthors(
      (comments ?? []).map((c) => maskUser(c as ThingRow, viewerId)),
    );
    return {
      thing: maskedThing,
      comments: maskedComments,
    };
  });
