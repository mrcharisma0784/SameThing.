import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { effectivePlan } from "@/lib/premium";
import { getVisibilityContext, isVisibleTarget } from "@/lib/content-visibility.server";

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

type ThingRow = {
  id: string;
  user_id: string | null;
  is_anonymous?: boolean | null;
  simplified_text?: string | null;
  title?: string | null;
  language?: string | null;
  tags?: string[] | null;
  is_open_to_chat?: boolean | null;
  comments_closed?: boolean | null;
  same_count?: number | null;
  nah_count?: number | null;
  total_votes?: number | null;
  similarity_score?: number | null;
  comment_count?: number | null;
  like_count?: number | null;
  share_count?: number | null;
  share_palette?: string | null;
  share_font?: string | null;
  liked_by_me?: boolean;
  is_rare_thing?: boolean | null;
  boosted_at?: string | null;
  boosted_until?: string | null;
  boost_duration_hours?: number | null;
  created_at?: string | null;
  hidden?: boolean | null;
  safety_flag?: boolean | null;
  text?: string | null;
  parent_id?: string | null;
  pinned_at?: string | null;
};

function maskUser<T extends ThingRow>(row: T, viewerId: string | null): T & { is_mine: boolean } {
  const is_mine = !!viewerId && row.user_id === viewerId;
  if (row.is_anonymous) return { ...row, user_id: null, is_mine } as T & { is_mine: boolean };
  return { ...row, is_mine } as T & { is_mine: boolean };
}

async function attachAuthors<T extends ThingRow>(rows: T[]) {
  const ids = Array.from(
    new Set(rows.filter((r) => !r.is_anonymous && r.user_id).map((r) => r.user_id as string)),
  );
  if (ids.length === 0) return rows.map((r) => ({ ...r, author: null }));
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profs } = (await supabaseAdmin
    .from("profiles")
    .select(
      "id, username, emoji, avatar_url, plan, premium_until, is_test_user, test_user_until, test_user_label",
    )
    .in("id", ids)) as unknown as {
    data: Array<{
      id: string;
      username: string;
      emoji: string;
      avatar_url: string | null;
      plan: string;
      premium_until?: string | null;
      is_test_user?: boolean | null;
      test_user_until?: string | null;
      test_user_label?: string | null;
    }> | null;
  };
  const map = new Map<
    string,
    {
      username: string;
      emoji: string;
      avatar_url: string | null;
      plan: string;
      premium_until?: string | null;
      is_test_user?: boolean | null;
      test_user_until?: string | null;
      test_user_label?: string | null;
    }
  >();
  (profs ?? []).forEach((p) =>
    map.set(p.id, {
      username: p.username,
      emoji: p.emoji,
      avatar_url: p.avatar_url ?? null,
      plan: effectivePlan(p),
      premium_until: p.premium_until ?? null,
      is_test_user: p.is_test_user ?? false,
      test_user_until: p.test_user_until ?? null,
      test_user_label: p.test_user_label ?? null,
    }),
  );
  return rows.map((r) => ({ ...r, author: r.user_id ? (map.get(r.user_id) ?? null) : null }));
}

async function attachThingShares<T extends ThingRow>(rows: T[]) {
  const ids = rows.map((row) => row.id).filter(Boolean);
  if (ids.length === 0) return rows.map((row) => ({ ...row, share_count: 0 }));
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: shares, error } = await supabaseAdmin
    .from("thing_shares" as never)
    .select("thing_id")
    .in("thing_id", ids);
  if (error) {
    console.error("thing share enrichment error", error);
    return rows.map((row) => ({ ...row, share_count: 0 }));
  }
  const counts = new Map<string, number>();
  for (const share of (shares ?? []) as Array<{ thing_id: string }>) {
    counts.set(share.thing_id, (counts.get(share.thing_id) ?? 0) + 1);
  }
  return rows.map((row) => ({ ...row, share_count: counts.get(row.id) ?? 0 }));
}

async function attachThingLikes<T extends ThingRow>(rows: T[], viewerId: string | null) {
  const ids = rows.map((row) => row.id).filter(Boolean);
  if (!viewerId || ids.length === 0) {
    return rows.map((row) => ({
      ...row,
      like_count: Number(row.like_count ?? 0),
      liked_by_me: false,
    }));
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: likes, error } = await supabaseAdmin
    .from("thing_likes")
    .select("thing_id")
    .eq("user_id", viewerId)
    .in("thing_id", ids);
  if (error) console.error("thing like enrichment error", error);
  const likedIds = new Set((likes ?? []).map((like) => like.thing_id));
  return rows.map((row) => ({
    ...row,
    like_count: Number(row.like_count ?? 0),
    liked_by_me: likedIds.has(row.id),
  }));
}

export const getFeed = createServerFn({ method: "GET" })
  .inputValidator((i) => FeedInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const viewerId = await getOptionalUserId();

    let q = supabaseAdmin
      .from("things")
      .select(
        "id, simplified_text, title, language, tags, is_anonymous, is_open_to_chat, comments_closed, same_count, nah_count, total_votes, similarity_score, comment_count, like_count, is_rare_thing, boosted_at, boosted_until, boost_duration_hours, share_palette, share_font, created_at, user_id",
      )
      .eq("hidden", false)
      .eq("safety_flag", false)
      .is("deleted_at", null);

    if (data.language !== "all") q = q.eq("language", data.language);
    if (data.tag) q = q.contains("tags", [data.tag]);

    if (data.filter === "rare") q = q.eq("is_rare_thing", true);

    // New keeps a small, genuinely newest head. Active Boosts are placed directly
    // underneath that head, never above it. Boost has no effect on Trending.
    const candidateLimit =
      data.filter === "trending"
        ? Math.min(Math.max(data.limit * 4, 80), 200)
        : data.filter === "new"
          ? Math.min(Math.max(data.limit * 4, 80), 200)
          : data.limit;
    if (data.filter === "trending") {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      q = q.gte("created_at", since).order("created_at", { ascending: false });
    } else {
      q = q.order("created_at", { ascending: false });
    }

    if (data.cursor && data.filter !== "trending") q = q.lt("created_at", data.cursor);
    q = q.limit(candidateLimit);

    const { data: things, error } = await q;
    if (error) {
      console.error("feed error", error);
      return { things: [] as ThingRow[], nextCursor: null as string | null };
    }

    const candidates = (things ?? []) as unknown as ThingRow[];
    const visibility = await getVisibilityContext(
      viewerId,
      candidates.map((row) => ({ type: "thing" as const, id: row.id, authorId: row.user_id })),
    );
    const visibleCandidates = candidates.filter((row) =>
      isVisibleTarget(visibility, { type: "thing", id: row.id, authorId: row.user_id }),
    );
    const candidatesWithShares = await attachThingShares(visibleCandidates);
    let ordered = candidatesWithShares;
    if (data.filter === "new") {
      const now = Date.now();
      const newestHead = candidatesWithShares.slice(0, 3);
      const boosted = candidatesWithShares
        .slice(3)
        .filter((row) => row.boosted_until && new Date(row.boosted_until).getTime() > now)
        .sort((a, b) => {
          const aTime = a.boosted_at ? new Date(a.boosted_at).getTime() : 0;
          const bTime = b.boosted_at ? new Date(b.boosted_at).getTime() : 0;
          return bTime - aTime;
        });
      const boostedIds = new Set(boosted.map((row) => row.id));
      const remainder = candidatesWithShares.slice(3).filter((row) => !boostedIds.has(row.id));
      ordered = [...newestHead, ...boosted, ...remainder];
    } else if (data.filter === "trending") {
      const now = Date.now();
      const score = (row: ThingRow) => {
        const votes = Number(row.total_votes ?? 0);
        const same = Number(row.same_count ?? 0);
        const likes = Number(row.like_count ?? 0);
        const comments = Number(row.comment_count ?? 0);
        const shares = Number(row.share_count ?? 0);
        const ageHours = Math.max(0, (now - new Date(row.created_at ?? now).getTime()) / 3600000);
        const interest = votes * 2 + same + likes * 3 + comments * 4 + shares * 5;
        return Math.log1p(interest) / Math.pow(ageHours + 2, 0.25);
      };
      ordered = [...candidatesWithShares].sort((a, b) => {
        const delta = score(b) - score(a);
        if (Math.abs(delta) > 0.0001) return delta;
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });
    }

    const visible = ordered.slice(0, data.limit);
    const masked = visible.map((r) => maskUser(r, viewerId));
    const withLikes = await attachThingLikes(masked, viewerId);
    const withAuthors = await attachAuthors(withLikes);
    const nextCursor =
      withAuthors.length === data.limit
        ? (withAuthors[withAuthors.length - 1].created_at as string)
        : null;
    return { things: withAuthors, nextCursor };
  });

export const getThing = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const viewerId = await getOptionalUserId();
    const { data: rawThing } = await supabaseAdmin
      .from("things")
      .select(
        "id, simplified_text, title, language, tags, is_anonymous, is_open_to_chat, comments_closed, same_count, nah_count, total_votes, similarity_score, comment_count, like_count, is_rare_thing, boosted_at, boosted_until, boost_duration_hours, share_palette, share_font, created_at, user_id, hidden, safety_flag",
      )
      .eq("id", data.id)
      .eq("hidden", false)
      .eq("safety_flag", false)
      .is("deleted_at", null)
      .maybeSingle();
    const thing = rawThing as unknown as ThingRow | null;
    if (!thing) return { thing: null, comments: [] };
    const thingVisibility = await getVisibilityContext(viewerId, [
      { type: "thing", id: data.id, authorId: thing.user_id },
    ]);
    if (
      !isVisibleTarget(thingVisibility, { type: "thing", id: data.id, authorId: thing.user_id })
    ) {
      return { thing: null, comments: [] };
    }
    const [maskedThing] = await attachAuthors(
      await attachThingLikes([maskUser(thing as unknown as ThingRow, viewerId)], viewerId),
    );
    const { data: comments } = await supabaseAdmin
      .from("comments")
      .select("id, text, is_anonymous, created_at, edited_at, user_id, parent_id, pinned_at")
      .eq("thing_id", data.id)
      .eq("hidden", false)
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(200);
    const commentRows = (comments ?? []) as Array<ThingRow>;
    const commentVisibility = await getVisibilityContext(
      viewerId,
      commentRows.map((comment) => ({
        type: "comment" as const,
        id: comment.id,
        authorId: comment.user_id,
      })),
    );
    const maskedComments = await attachAuthors(
      commentRows
        .filter((comment) =>
          isVisibleTarget(commentVisibility, {
            type: "comment",
            id: comment.id,
            authorId: comment.user_id,
          }),
        )
        .map((c) => maskUser(c, viewerId)),
    );
    return {
      thing: maskedThing,
      comments: maskedComments,
    };
  });
