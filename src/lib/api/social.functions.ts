import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { effectivePlan } from "@/lib/premium";

const UserIdInput = z.object({ user_id: z.string().uuid() });

async function getTargetProfile(userId: string, targetId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, username")
    .eq("id", targetId)
    .maybeSingle();
  if (!data) return null;
  if (data.id === userId) return { error: "You can't use this action on yourself." } as const;
  return data;
}

async function hasRelationship(table: "follows" | "blocks", first: string, second: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from(table as never)
    .select("created_at")
    .eq(table === "follows" ? "follower_id" : "blocker_id", first)
    .eq(table === "follows" ? "followed_id" : "blocked_id", second)
    .maybeSingle();
  return Boolean(data);
}

export const followUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UserIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const target = await getTargetProfile(context.userId, data.user_id);
    if (!target) return { error: "User not found." };
    if ("error" in target) return target;
    if (
      (await hasRelationship("blocks", context.userId, data.user_id)) ||
      (await hasRelationship("blocks", data.user_id, context.userId))
    ) {
      return { error: "You can't watch this profile." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("follows" as never).insert({
      follower_id: context.userId,
      followed_id: data.user_id,
    } as never);
    if (error && error.code !== "23505") return { error: "Could not update watch state." };
    return { error: null as string | null, watching: true };
  });

export const unfollowUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UserIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("follows" as never)
      .delete()
      .eq("follower_id", context.userId)
      .eq("followed_id", data.user_id);
    if (error) return { error: "Could not stop watching this profile." };
    return { error: null as string | null, watching: false };
  });

export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UserIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const target = await getTargetProfile(context.userId, data.user_id);
    if (!target) return { error: "User not found." };
    if ("error" in target) return target;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("blocks" as never).insert({
      blocker_id: context.userId,
      blocked_id: data.user_id,
    } as never);
    if (error && error.code !== "23505") return { error: "Could not block this profile." };
    await Promise.all([
      supabaseAdmin
        .from("follows" as never)
        .delete()
        .eq("follower_id", context.userId)
        .eq("followed_id", data.user_id),
      supabaseAdmin
        .from("follows" as never)
        .delete()
        .eq("follower_id", data.user_id)
        .eq("followed_id", context.userId),
    ]);
    return { error: null as string | null, blocked: true };
  });

export const listMyBlockedUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: blocks, error: blockError } = await supabaseAdmin
      .from("blocks" as never)
      .select("blocked_id, created_at")
      .eq("blocker_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (blockError) throw new Error("Blocked profiles are temporarily unavailable.");
    const ids = Array.from(
      new Set(
        ((blocks ?? []) as Array<{ blocked_id: string }>)
          .map((row) => row.blocked_id)
          .filter(Boolean),
      ),
    );
    if (!ids.length) return { items: [] };
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, username, emoji, avatar_url, plan, premium_until, bio")
      .in("id", ids)
      .is("banned_at", null);
    if (profileError) throw new Error("Blocked profiles are temporarily unavailable.");
    const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    return {
      items: ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((profile) => ({ ...profile, plan: effectivePlan(profile) })),
    };
  });

export const unblockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UserIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("blocks" as never)
      .delete()
      .eq("blocker_id", context.userId)
      .eq("blocked_id", data.user_id);
    if (error) return { error: "Could not unblock this profile." };
    return { error: null as string | null, blocked: false };
  });

const ConnectionsInput = z.object({
  username: z.string().min(1).max(24),
  list: z.enum(["followers", "following"]),
});

export const getProfileConnections = createServerFn({ method: "GET" })
  .inputValidator((input) => ConnectionsInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const viewerId = await (async () => {
      try {
        const { getRequest } = await import("@tanstack/react-start/server");
        const authorization = getRequest()?.headers?.get("authorization") ?? "";
        if (!authorization.startsWith("Bearer ")) return null;
        const token = authorization.slice(7);
        if (!token) return null;
        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { data: claims } = await client.auth.getClaims(token);
        return (claims?.claims?.sub as string) ?? null;
      } catch {
        return null;
      }
    })();

    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("id, username, emoji, avatar_url, plan, premium_until")
      .eq("username", data.username)
      .maybeSingle();
    if (!owner) return { owner: null, items: [] };

    const relationColumn = data.list === "followers" ? "follower_id" : "followed_id";
    const ownerColumn = data.list === "followers" ? "followed_id" : "follower_id";
    const { data: relations, error: relationError } = await supabaseAdmin
      .from("follows" as never)
      .select(`${relationColumn}, created_at`)
      .eq(ownerColumn, owner.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (relationError) throw new Error(relationError.message);

    const ids = Array.from(
      new Set(
        ((relations ?? []) as Array<Record<string, unknown>>)
          .map((row) => String(row[relationColumn] ?? ""))
          .filter(Boolean),
      ),
    );
    if (!ids.length) {
      return {
        owner: { ...owner, plan: effectivePlan(owner) },
        items: [],
      };
    }

    let visibleIds = ids;
    if (viewerId) {
      const [{ data: viewerBlocks }, { data: blockedByViewer }] = await Promise.all([
        supabaseAdmin
          .from("blocks" as never)
          .select("blocked_id")
          .eq("blocker_id", viewerId)
          .in("blocked_id", ids),
        supabaseAdmin
          .from("blocks" as never)
          .select("blocker_id")
          .eq("blocked_id", viewerId)
          .in("blocker_id", ids),
      ]);
      const hidden = new Set([
        ...((viewerBlocks ?? []) as Array<{ blocked_id: string }>).map((row) => row.blocked_id),
        ...((blockedByViewer ?? []) as Array<{ blocker_id: string }>).map((row) => row.blocker_id),
      ]);
      visibleIds = ids.filter((id) => !hidden.has(id));
    }

    if (!visibleIds.length) {
      return {
        owner: { ...owner, plan: effectivePlan(owner) },
        items: [],
      };
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, username, emoji, avatar_url, plan, premium_until, bio")
      .in("id", visibleIds)
      .is("banned_at", null);
    if (profilesError) throw new Error(profilesError.message);
    const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    return {
      owner: { ...owner, plan: effectivePlan(owner) },
      items: visibleIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((profile) => ({ ...profile, plan: effectivePlan(profile) })),
    };
  });

export const getMyConnectionCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ count: followers }, { count: following }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from("follows" as never)
        .select("follower_id", { count: "exact", head: true })
        .eq("followed_id", context.userId),
      supabaseAdmin
        .from("follows" as never)
        .select("followed_id", { count: "exact", head: true })
        .eq("follower_id", context.userId),
      supabaseAdmin.from("profiles").select("username").eq("id", context.userId).maybeSingle(),
    ]);
    return {
      username: profile?.username ?? null,
      followers: followers ?? 0,
      following: following ?? 0,
    };
  });
