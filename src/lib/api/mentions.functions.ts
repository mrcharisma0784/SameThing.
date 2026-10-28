import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Autocomplete for the composer — only users who accept mentions. */
export const suggestMentions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ q: z.string().min(1).max(24) }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const term = data.q.replace(/^@/, "").trim().toLowerCase();
    if (!term)
      return { users: [] as Array<{ username: string; emoji: string; avatar_url: string | null }> };
    const safe = term.replace(/[\\%_]/g, (c) => `\\${c}`);
    const { data: rows } = await supabaseAdmin
      .from("profiles")
      .select("username, emoji, avatar_url, allow_mentions")
      .ilike("username", `${safe}%`)
      .order("username", { ascending: true })
      .limit(20);
    const filtered = (rows ?? [])
      .filter((u: { allow_mentions?: boolean }) => u.allow_mentions !== false)
      .slice(0, 8)
      .map((u: { username: string; emoji: string; avatar_url: string | null }) => ({
        username: u.username,
        emoji: u.emoji,
        avatar_url: u.avatar_url,
      }));
    return { users: filtered };
  });

/** Validate which usernames exist (used to know which @mentions to linkify). */
export const validateUsernames = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ names: z.array(z.string().min(1).max(24)).max(50) }).parse(i))
  .handler(async ({ data }) => {
    if (!data.names.length) return { valid: [] as string[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const names = Array.from(new Set(data.names.map((n) => n.toLowerCase())));
    const { data: rows } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .in("username", names);
    return { valid: ((rows ?? []) as Array<{ username: string }>).map((r) => r.username) };
  });
