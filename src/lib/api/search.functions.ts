import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SearchInput = z.object({
  q: z.string().min(1).max(80),
  limit: z.number().min(1).max(40).default(30),
});

function maskUser<T extends { is_anonymous?: boolean | null; user_id?: string | null }>(row: T): T {
  if (row.is_anonymous) return { ...row, user_id: null } as T;
  return row;
}

export const searchThings = createServerFn({ method: "GET" })
  .inputValidator((i) => SearchInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const term = data.q.trim();
    const safe = term.replace(/[\\%_]/g, (c) => `\\${c}`);
    const pattern = `%${safe}%`;
    const lowerTag = term.toLowerCase();

    const { data: rows, error } = await supabaseAdmin
      .from("things")
      .select(
        "id, simplified_text, title, language, tags, is_anonymous, is_open_to_chat, same_count, nah_count, total_votes, similarity_score, comment_count, is_rare_thing, created_at, user_id",
      )
      .eq("hidden", false)
      .eq("safety_flag", false)
      .or(`title.ilike.${pattern},simplified_text.ilike.${pattern},tags.cs.{${lowerTag}}`)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (error) {
      console.error("search error", error);
      return { things: [] as any[] };
    }
    return { things: (rows ?? []).map(maskUser) };
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
    if (!term) return { users: [] as any[] };
    const safe = term.replace(/[\\%_]/g, (c) => `\\${c}`);
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("username, emoji, bio, plan")
      .ilike("username", `${safe}%`)
      .order("username", { ascending: true })
      .limit(data.limit);
    if (error) {
      console.error("user search error", error);
      return { users: [] as any[] };
    }
    return { users: rows ?? [] };
  });
