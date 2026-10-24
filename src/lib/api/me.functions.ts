import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PROFILE_COLS =
  "id, username, emoji, bio, language, is_anon_default, rare_thing_count, onboarded_at, last_post_at, last_comment_at, custom_tags, warnings_count, muted_until, plan, messages_open, username_changed_at, inbox_seen_at, allow_mentions, gender, age_range, demographics_completed_at, theme, feed_tags, notification_prefs";

async function attachOwnAuthor<T extends { user_id?: string | null; is_anonymous?: boolean | null }>(
  rows: T[],
  prof: { id: string; username: string; emoji: string; plan?: string | null } | null,
) {
  if (!prof) return rows.map((r) => ({ ...r, author: null, is_mine: true }));
  return rows.map((r) => ({
    ...r,
    is_mine: true,
    author: r.is_anonymous
      ? null
      : { username: prof.username, emoji: prof.emoji, plan: prof.plan ?? "free" },
    user_id: r.is_anonymous ? null : r.user_id ?? null,
  }));
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("id", context.userId)
      .maybeSingle();
    if (error) {
      console.error("getMyProfile", error);
      return { profile: null };
    }
    return { profile: data };
  });

export const getMyThings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("id, username, emoji, plan").eq("id", context.userId).maybeSingle();
    const { data, error } = await supabaseAdmin
      .from("things")
      .select("id, simplified_text, title, language, tags, is_anonymous, is_open_to_chat, comments_closed, same_count, nah_count, total_votes, similarity_score, comment_count, is_rare_thing, created_at, user_id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("getMyThings", error);
      return { things: [] as any[] };
    }
    const withAuthor = await attachOwnAuthor(data ?? [], prof);
    return { things: withAuthor as any[] };
  });

// ---- Custom tags --------------------------------------------------
const TagInput = z.object({ tag: z.string().min(1).max(24).regex(/^[a-z0-9 _-]+$/i, "letters/numbers only") });

export const addCustomTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => TagInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tag = data.tag.trim().toLowerCase();
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("custom_tags, plan").eq("id", context.userId).maybeSingle();
    const current: string[] = (prof?.custom_tags as string[] | null) ?? [];
    const limit = prof?.plan === "premium" ? 15 : 5;
    if (current.includes(tag)) return { error: null, tags: current };
    if (current.length >= limit)
      return {
        error: prof?.plan === "premium"
          ? "Tag limit reached (15)."
          : "Free limit reached (5). ✦ PremiumThing. gives you 15.",
        tags: current,
      };

    const next = [...current, tag];
    const { error } = await supabaseAdmin.from("profiles").update({ custom_tags: next }).eq("id", context.userId);
    if (error) return { error: "Could not save tag.", tags: current };
    return { error: null as string | null, tags: next };
  });

// ---- Edit profile -------------------------------------------------
const EditInput = z.object({
  username: z.string().min(2).max(24).regex(/^[a-z0-9_]+$/).optional(),
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

    // PremiumThing. gating for themes and premium profile icons
    if (data.theme !== undefined || data.emoji !== undefined) {
      const { isPremiumTheme, isValidTheme } = await import("@/lib/themes");
      const { isPremiumAvatar } = await import("@/lib/avatars");
      const { data: planRow } = await supabaseAdmin
        .from("profiles").select("plan").eq("id", context.userId).maybeSingle();
      const isPremium = (planRow?.plan ?? "free") === "premium";
      if (data.theme !== undefined) {
        if (!isValidTheme(data.theme)) return { error: "Unknown theme." };
        if (isPremiumTheme(data.theme) && !isPremium) return { error: "That theme is PremiumThing. only." };
      }
      if (data.emoji !== undefined && isPremiumAvatar(data.emoji) && !isPremium) {
        return { error: "That icon is PremiumThing. only." };
      }
    }

    if (data.username !== undefined) {
      const { data: prof } = await supabaseAdmin
        .from("profiles").select("username, username_changed_at").eq("id", context.userId).maybeSingle();
      if (prof && data.username !== prof.username) {
        if (prof.username_changed_at) {
          const diffDays = (Date.now() - +new Date(prof.username_changed_at)) / 86400000;
          if (diffDays < USERNAME_COOLDOWN_DAYS) {
            const wait = Math.ceil(USERNAME_COOLDOWN_DAYS - diffDays);
            return { error: `You can change your username again in ${wait} day${wait === 1 ? "" : "s"}.` };
          }
        }
        update.username_changed_at = new Date().toISOString();
      } else {
        delete update.username;
      }
    }

    const { error } = await supabaseAdmin.from("profiles").update(update as never).eq("id", context.userId);
    if (error) {
      if (String(error.message).toLowerCase().includes("unique")) return { error: "Username taken." };
      return { error: "Could not save profile." };
    }
    return { error: null as string | null };
  });

// ---- Public profile by username ----------------------------------
export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ username: z.string().min(1).max(24) }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id, username, emoji, bio, plan, rare_thing_count, onboarded_at")
      .eq("username", data.username)
      .maybeSingle();
    if (!prof) return { profile: null, things: [] as any[] };
    const { data: things } = await supabaseAdmin
      .from("things")
      .select("id, simplified_text, title, language, tags, is_anonymous, is_open_to_chat, comments_closed, same_count, nah_count, total_votes, similarity_score, comment_count, is_rare_thing, created_at, user_id")
      .eq("user_id", prof.id)
      .eq("is_anonymous", false)
      .eq("hidden", false)
      .eq("safety_flag", false)
      .order("created_at", { ascending: false })
      .limit(50);
    const withAuthor = (things ?? []).map((t) => ({
      ...t,
      author: { username: prof.username, emoji: prof.emoji, plan: prof.plan ?? "free" },
      is_mine: false,
    }));
    return { profile: prof, things: withAuthor as any[] };
  });

// ---- Update demographics (one-time) ------------------------------
const DemoInput = z.object({
  gender: z.string().min(1).max(24),
  age_range: z.string().min(1).max(24),
});
export const saveDemographics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => DemoInput.parse(i))
  .handler(async ({ data, context }) => {
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

// ---- Delete account ----------------------------------------------
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    // Wipe user-owned content first (cascades handle most links).
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
