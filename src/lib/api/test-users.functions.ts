/* eslint-disable @typescript-eslint/no-explicit-any -- service-role reads the pilot tables before generated types refresh. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(permission: "users:read" | "users:write") {
  const { requireAdminAccess } = await import("@/lib/admin-rbac.server");
  return requireAdminAccess(permission);
}

async function recordAdminAction(
  action: string,
  permission: "users:read" | "users:write",
  targetId?: string,
  metadata?: Record<string, unknown>,
) {
  const { recordAdminAudit } = await import("@/lib/admin-rbac.server");
  await recordAdminAudit({
    action,
    permission,
    targetType: targetId ? "test_user_application" : null,
    targetId: targetId ?? null,
    metadata,
  });
}

const APPLICATION_FIELDS =
  "id, user_id, first_name, last_name, reason, test_areas, status, approved_duration_days, decision_note, reviewed_by, reviewed_at, created_at, updated_at";

const ApplicationStatus = z.enum(["submitted", "reviewing", "approved", "declined", "revoked"]);

export const submitTestUserApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        first_name: z.string().trim().min(1).max(80),
        last_name: z.string().trim().min(1).max(80),
        reason: z.string().trim().max(1200).optional().default(""),
        test_areas: z.string().trim().max(1200).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: existing } = await db
      .from("test_user_applications")
      .select("id, status")
      .eq("user_id", context.userId)
      .in("status", ["submitted", "reviewing", "approved"])
      .maybeSingle();
    if (existing) {
      return {
        ok: false as const,
        error:
          existing.status === "approved"
            ? "You already have an active Test User pass."
            : "Your Test User request is already in review.",
      };
    }

    const { data: application, error } = await db
      .from("test_user_applications")
      .insert({
        user_id: context.userId,
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        reason: data.reason.trim() || null,
        test_areas: data.test_areas.trim() || null,
      })
      .select(APPLICATION_FIELDS)
      .single();
    if (error) {
      if (error.code === "23505") {
        return { ok: false as const, error: "Your Test User request is already in review." };
      }
      console.error("test user application submit", error);
      return { ok: false as const, error: "Could not send your Test User request." };
    }
    return { ok: true as const, application };
  });

export const getMyTestUserApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("test_user_applications")
      .select(APPLICATION_FIELDS)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error("Could not load Test User requests.");
    return { items: data ?? [] };
  });

export const adminListTestUserApplications = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ status: ApplicationStatus.or(z.literal("all")).default("all") }).parse(input),
  )
  .handler(async ({ data }) => {
    await assertAdmin("users:read");
    await recordAdminAction("adminListTestUserApplications", "users:read");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    let query = db
      .from("test_user_applications")
      .select(APPLICATION_FIELDS)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load Test User applications.");
    const userIds = Array.from(new Set((rows ?? []).map((row: any) => row.user_id)));
    const { data: profiles } = userIds.length
      ? await db
          .from("profiles")
          .select(
            "id, username, emoji, gender, age_range, is_test_user, test_user_until, test_user_label, plan, premium_until, same_credits, same_credits_unlimited",
          )
          .in("id", userIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
    return {
      items: (rows ?? []).map((row: any) => ({
        ...row,
        profile: profileMap.get(row.user_id) ?? null,
      })),
    };
  });

const ReviewInput = z.object({
  application_id: z.string().uuid(),
  status: z.enum(["reviewing", "approved", "declined", "revoked"]),
  duration_days: z.number().int().min(7).max(30).nullable().optional().default(null),
  decision_note: z.string().trim().max(1200).optional().default(""),
});

export const adminReviewTestUserApplication = createServerFn({ method: "POST" })
  .inputValidator((input) => ReviewInput.parse(input))
  .handler(async ({ data }) => {
    const actor = await assertAdmin("users:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: application, error: applicationError } = await db
      .from("test_user_applications")
      .select("id, user_id, first_name, last_name, status")
      .eq("id", data.application_id)
      .maybeSingle();
    if (applicationError || !application) {
      return { ok: false as const, error: "Test User application not found." };
    }

    const { data: result, error } = await db.rpc("review_test_user_application", {
      _application_id: data.application_id,
      _user_id: application.user_id,
      _status: data.status,
      _duration_days: data.duration_days ?? null,
      _decision_note: data.decision_note.trim() || null,
      _reviewed_by: actor.userId,
    });
    if (error) {
      console.error("test user application review", error);
      return { ok: false as const, error: "Could not update Test User access." };
    }
    const payload = (result ?? {}) as {
      ok?: boolean;
      reason?: string;
      test_user_until?: string | null;
    };
    if (!payload.ok) {
      const errors: Record<string, string> = {
        not_reviewable: "This application is no longer reviewable.",
        not_active: "This Test User pass is no longer active.",
        duration_too_short: "Test User access must be at least 7 days.",
        duration_out_of_range: "Test User access must be between 7 and 30 days.",
      };
      return {
        ok: false as const,
        error: errors[payload.reason ?? ""] ?? "Could not update Test User access.",
      };
    }

    const message =
      data.status === "approved"
        ? `Your Test User request was approved. LabThing. access is active${payload.test_user_until ? ` until ${new Date(payload.test_user_until).toLocaleDateString("en-US")}` : ""}. PremiumThing. features and unlimited Same Credits are enabled for the 7–30 day pilot.`
        : data.status === "declined"
          ? `Your Test User request was not approved this time.${data.decision_note.trim() ? ` Note: ${data.decision_note.trim()}` : " You can apply again after the review window."}`
          : data.status === "revoked"
            ? `Your LabThing. pilot access has ended.${data.decision_note.trim() ? ` Note: ${data.decision_note.trim()}` : ""}`
            : `Your Test User application is now being reviewed.${data.decision_note.trim() ? ` Note: ${data.decision_note.trim()}` : ""}`;
    const title =
      data.status === "approved"
        ? "LabThing. access approved"
        : data.status === "declined"
          ? "Test User application update"
          : data.status === "revoked"
            ? "LabThing. access ended"
            : "Test User application in review";
    await db.from("system_messages").insert({
      recipient_id: application.user_id,
      sender_admin_id: actor.userId,
      kind: "system",
      title,
      body: message,
      link: "/test-users",
      meta: { test_user_application_id: data.application_id, status: data.status },
    });
    await recordAdminAction("adminReviewTestUserApplication", "users:write", data.application_id, {
      status: data.status,
      duration_days: data.duration_days,
    });
    return {
      ok: true as const,
      status: data.status,
      test_user_until: payload.test_user_until ?? null,
    };
  });
