import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { effectivePlan } from "@/lib/premium";
import { getVisibilityContext, isVisibleTarget } from "@/lib/content-visibility.server";

const SearchInput = z.object({
  q: z.string().min(1).max(80),
  limit: z.number().min(1).max(40).default(30),
});

type SearchThingRow = {
  id: string;
  simplified_text: string;
  title: string | null;
  language: string | null;
  tags: string[] | null;
  is_anonymous: boolean | null;
  is_open_to_chat: boolean | null;
  same_count: number;
  nah_count: number;
  total_votes: number;
  similarity_score: number;
  comment_count: number;
  like_count: number;
  is_rare_thing: boolean;
  share_palette: string | null;
  share_font: string | null;
  created_at: string;
  user_id: string | null;
};

type SearchUserRow = {
  id: string;
  username: string;
  emoji: string | null;
  avatar_url: string | null;
  bio: string | null;
  plan: string | null;
  premium_until: string | null;
  is_test_user: boolean | null;
  test_user_until: string | null;
  test_user_label: string | null;
};

function maskUser<T extends { is_anonymous?: boolean | null; user_id?: string | null }>(row: T): T {
  if (row.is_anonymous) return { ...row, user_id: null } as T;
  return row;
}

async function getOptionalUserId(): Promise<string | null> {
  try {
    const authorization = getRequest()?.headers?.get("authorization") ?? "";
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

export const searchThings = createServerFn({ method: "GET" })
  .inputValidator((i) => SearchInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const term = data.q.trim();
    const isTagSearch = term.startsWith("#");
    const normalizedTag = term.replace(/^#/, "").trim().toLowerCase();
    if (isTagSearch && !normalizedTag) return { things: [] as SearchThingRow[] };
    const safe = term.replace(/[\\%_]/g, (c) => `\\${c}`);
    const pattern = `%${safe}%`;
    const lowerTag = term.toLowerCase();

    const viewerId = await getOptionalUserId();
    const baseQuery = supabaseAdmin
      .from("things")
      .select(
        "id, simplified_text, title, language, tags, is_anonymous, is_open_to_chat, same_count, nah_count, total_votes, similarity_score, comment_count, like_count, is_rare_thing, share_palette, share_font, created_at, user_id",
      )
      .eq("hidden", false)
      .eq("safety_flag", false)
      .is("deleted_at", null);
    const filteredQuery = isTagSearch
      ? baseQuery.contains("tags", [normalizedTag])
      : baseQuery.or(
          `title.ilike.${pattern},simplified_text.ilike.${pattern},tags.cs.{${lowerTag}}`,
        );
    const { data: rows, error } = await filteredQuery
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit * 4, 120));

    if (error) {
      console.error("search error", error);
      return { things: [] as SearchThingRow[] };
    }
    const safeRows = (rows ?? []) as unknown as SearchThingRow[];
    const visibility = await getVisibilityContext(
      viewerId,
      safeRows.map((row) => ({
        type: "thing" as const,
        id: String(row.id),
        authorId: row.user_id,
      })),
    );
    const visibleRows = safeRows
      .filter((row) =>
        isVisibleTarget(visibility, {
          type: "thing",
          id: String(row.id),
          authorId: row.user_id,
        }),
      )
      .slice(0, data.limit);
    const authorIds = [
      ...new Set(
        visibleRows
          .filter((row) => !row.is_anonymous && row.user_id)
          .map((row) => row.user_id as string),
      ),
    ];
    const profilesById = new Map<
      string,
      Pick<
        SearchUserRow,
        | "username"
        | "emoji"
        | "avatar_url"
        | "plan"
        | "is_test_user"
        | "test_user_until"
        | "test_user_label"
      >
    >();
    if (authorIds.length > 0) {
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select(
          "id, username, emoji, avatar_url, plan, is_test_user, test_user_until, test_user_label",
        )
        .in("id", authorIds);
      if (profileError) {
        console.error("search author profile error", profileError);
      } else {
        for (const profile of profiles ?? []) {
          profilesById.set(profile.id, {
            username: profile.username,
            emoji: profile.emoji,
            avatar_url: profile.avatar_url,
            plan: profile.plan,
            is_test_user: profile.is_test_user,
            test_user_until: profile.test_user_until,
            test_user_label: profile.test_user_label,
          });
        }
      }
    }
    return {
      things: visibleRows.map((row) =>
        maskUser({
          ...row,
          author: !row.is_anonymous && row.user_id ? (profilesById.get(row.user_id) ?? null) : null,
        }),
      ),
    };
  });

// ---- User search (by @username) -----------------------------------
const UserSearchInput = z.object({
  q: z.string().min(1).max(40),
  limit: z.number().min(1).max(20).default(15),
});

export const searchUsers = createServerFn({ method: "GET" })
  .inputValidator((i) => UserSearchInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const term = data.q.replace(/^@/, "").trim().toLowerCase();
    if (!term) return { users: [] as SearchUserRow[] };
    const safe = term.replace(/[\\%_]/g, (c) => `\\${c}`);
    const viewerId = await getOptionalUserId();
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, username, emoji, avatar_url, bio, plan, premium_until, is_test_user, test_user_until, test_user_label",
      )
      .ilike("username", `${safe}%`)
      .order("username", { ascending: true })
      .limit(data.limit);
    if (error) {
      console.error("user search error", error);
      return { users: [] as SearchUserRow[] };
    }
    const candidates = (rows ?? []) as unknown as SearchUserRow[];
    const visibility = await getVisibilityContext(
      viewerId,
      candidates.map((row) => ({ type: "user" as const, id: row.id, authorId: row.id })),
    );
    return {
      users: candidates
        .filter((row) =>
          isVisibleTarget(visibility, { type: "user", id: row.id, authorId: row.id }),
        )
        .map((row) => ({
          ...row,
          plan: effectivePlan(row),
        }))
        .slice(0, data.limit),
    };
  });
