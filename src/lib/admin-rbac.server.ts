/* eslint-disable @typescript-eslint/no-explicit-any -- Service-role tables are introduced by live migrations before generated types refresh. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminSession } from "@/lib/admin-session.server";

const FOUNDER_ADMIN_USERNAME = "jeonwx_0";

export const ADMIN_PERMISSIONS = [
  "admin:read",
  "users:read",
  "users:write",
  "users:delete",
  "content:read",
  "content:write",
  "content:delete",
  "reports:read",
  "reports:write",
  "support:read",
  "support:write",
  "ads:read",
  "ads:write",
  "api:read",
  "api:write",
  "maintenance:write",
  "messages:write",
  "admin:manage",
  "logs:read",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export type AdminActor = {
  userId: string | null;
  username: string;
  permissions: AdminPermission[];
  mode: "account" | "breakglass";
};

function hasPermission(permissions: string[], required: AdminPermission): boolean {
  return permissions.includes(required) || permissions.includes("admin:manage");
}

async function getAccountActor(userId: string): Promise<AdminActor | null> {
  const { data: member } = await (supabaseAdmin as any)
    .from("admin_members")
    .select("user_id, username, permissions, active")
    .eq("user_id", userId)
    .maybeSingle();
  if (!member?.active) return null;
  const { data: profile } = await (supabaseAdmin as any)
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  const username = profile?.username ?? member.username;
  const permissions = (Array.isArray(member.permissions) ? member.permissions : []).filter(
    (value: string): value is AdminPermission =>
      (ADMIN_PERMISSIONS as readonly string[]).includes(value),
  );
  return {
    userId,
    username,
    permissions,
    mode: "account",
  };
}

export async function getOptionalAdminActorId(): Promise<string | null> {
  const session = await getAdminSession();
  if (
    !session.data.unlocked ||
    session.data.mode !== "breakglass" ||
    session.data.username !== FOUNDER_ADMIN_USERNAME
  )
    return null;
  return session.data.actor_user_id ?? null;
}

export async function getCurrentAdminActor(): Promise<AdminActor | null> {
  const session = await getAdminSession();
  if (
    !session.data.unlocked ||
    session.data.mode !== "breakglass" ||
    session.data.username !== FOUNDER_ADMIN_USERNAME
  )
    return null;
  return {
    userId: session.data.actor_user_id ?? null,
    username: FOUNDER_ADMIN_USERNAME,
    permissions: (session.data.permissions ?? ADMIN_PERMISSIONS) as AdminPermission[],
    mode: "breakglass",
  };
}

export async function recordAdminAudit(input: {
  action: string;
  permission?: AdminPermission | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const actor = await getCurrentAdminActor();
  if (!actor) return;
  const metadata = Object.fromEntries(
    Object.entries(input.metadata ?? {})
      .filter(([key]) => !/(password|secret|token|authorization|api_key)/i.test(key))
      .map(([key, value]) => [
        key,
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
          ? value
          : String(value),
      ]),
  );
  try {
    await (supabaseAdmin as any).from("admin_audit_logs").insert({
      actor_user_id: actor.userId,
      actor_username: actor.username,
      actor_mode: actor.mode,
      action: input.action.slice(0, 120),
      permission: input.permission ?? null,
      target_type: input.targetType?.slice(0, 80) ?? null,
      target_id: input.targetId?.slice(0, 200) ?? null,
      metadata,
    });
  } catch (error) {
    console.error("admin audit write failed", error);
  }
}

export async function requireAdminAccess(
  required: AdminPermission = "admin:read",
): Promise<AdminActor> {
  const session = await getAdminSession();
  if (
    !session.data.unlocked ||
    session.data.mode !== "breakglass" ||
    session.data.username !== FOUNDER_ADMIN_USERNAME
  ) {
    throw new Error("Founder admin login required");
  }
  const permissions = (session.data.permissions ?? ADMIN_PERMISSIONS) as AdminPermission[];
  if (!hasPermission(permissions, required)) throw new Error("Admin permission denied");
  return {
    userId: session.data.actor_user_id ?? null,
    username: FOUNDER_ADMIN_USERNAME,
    permissions,
    mode: "breakglass",
  };
}

export async function getAdminStatus(): Promise<{
  unlocked: boolean;
  account: boolean;
  username: string | null;
  permissions: AdminPermission[];
  mode: "account" | "breakglass" | null;
}> {
  const session = await getAdminSession();
  const founderSession =
    session.data.unlocked &&
    session.data.mode === "breakglass" &&
    session.data.username === FOUNDER_ADMIN_USERNAME;
  return {
    unlocked: Boolean(founderSession),
    account: false,
    username: founderSession ? FOUNDER_ADMIN_USERNAME : null,
    permissions: founderSession
      ? ((session.data.permissions ?? ADMIN_PERMISSIONS) as AdminPermission[])
      : [],
    mode: founderSession ? "breakglass" : null,
  };
}
