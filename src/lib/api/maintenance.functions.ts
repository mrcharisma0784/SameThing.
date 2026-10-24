/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase table rows are typed locally for this source snapshot. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAccess, recordAdminAudit } from "@/lib/admin-rbac.server";
import { readMaintenanceStatus } from "@/lib/maintenance.server";

const MaintenanceInput = z.object({
  enabled: z.boolean(),
  note: z.string().trim().max(500).nullable().optional(),
});

const MaintenanceTargetsInput = z.object({
  targets: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(120),
        target_type: z.enum(["page", "feature"]).optional(),
        path: z.string().trim().max(240).nullable().optional(),
        label: z.string().trim().max(160).optional(),
        description: z.string().trim().max(500).optional(),
        enabled: z.boolean(),
        note: z.string().trim().max(500).nullable().optional(),
      }),
    )
    .min(1)
    .max(30),
});

const TARGET_DEFAULTS: Record<
  string,
  { target_type: "page" | "feature"; path: string | null; label: string; description: string }
> = {
  "page:streak": {
    target_type: "page",
    path: "/streak",
    label: "Streak",
    description: "Daily return streak and flame milestones",
  },
  "page:leaderboard": {
    target_type: "page",
    path: "/leaderboard",
    label: "Leaderboard",
    description: "Weekly leagues and ranking previews",
  },
  "page:capsules": {
    target_type: "page",
    path: "/capsules",
    label: "Time Capsule",
    description: "Time capsules and future-opened notes",
  },
  "page:twin": {
    target_type: "page",
    path: "/twin",
    label: "Find my twin",
    description: "Similarity matching and twin discovery",
  },
  "page:achievements": {
    target_type: "page",
    path: "/achievements",
    label: "Achievements",
    description: "Tasks, rewards and Same Credits",
  },
  "page:reference": {
    target_type: "page",
    path: "/reference",
    label: "Reference",
    description: "Referral invitations and credit rewards",
  },
  "page:credits": {
    target_type: "page",
    path: "/credits",
    label: "Credit",
    description: "Balance, purchase intents and spending history",
  },
  "page:research-api": {
    target_type: "page",
    path: "/research-api",
    label: "Research API",
    description: "Public API guide and access entry point",
  },
  "page:api-dashboard": {
    target_type: "page",
    path: "/api-dashboard",
    label: "API Dashboard",
    description: "Workspace application, key and usage limits",
  },
  "page:documentation": {
    target_type: "page",
    path: "/documentation",
    label: "Documentation",
    description: "Product and API reference documentation",
  },
};

function fallbackLabel(key: string) {
  const readable = key
    .replace(/^[^:]+:/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return readable.replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Maintenance target";
}

type SiteSettingsWrite = {
  id: boolean;
  maintenance_enabled: boolean;
  maintenance_note: string | null;
  updated_at: string;
};

type SiteSettingsWriter = {
  upsert: (
    values: SiteSettingsWrite,
    options: { onConflict: string },
  ) => Promise<{ error: { message: string } | null }>;
};

export const getMaintenanceStatus = createServerFn({ method: "GET" }).handler(async () => {
  return readMaintenanceStatus();
});

export const adminGetMaintenanceStatus = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminAccess("maintenance:write");
  return readMaintenanceStatus();
});

export const adminSetMaintenanceMode = createServerFn({ method: "POST" })
  .inputValidator((input) => MaintenanceInput.parse(input))
  .handler(async ({ data }) => {
    await requireAdminAccess("maintenance:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const note = data.note?.trim() || null;
    const table = supabaseAdmin.from("site_settings" as never) as unknown as SiteSettingsWriter;
    const { error } = await table.upsert(
      {
        id: true,
        maintenance_enabled: data.enabled,
        maintenance_note: note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);
    await recordAdminAudit({
      action: "maintenance.mode.update",
      permission: "maintenance:write",
      targetType: "maintenance",
      metadata: { enabled: data.enabled, has_note: Boolean(note) },
    });
    return readMaintenanceStatus();
  });

export const adminSetMaintenanceTargets = createServerFn({ method: "POST" })
  .inputValidator((input) => MaintenanceTargetsInput.parse(input))
  .handler(async ({ data }) => {
    await requireAdminAccess("maintenance:write");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updatedAt = new Date().toISOString();
    const rows = data.targets.map((target) => {
      const defaults = TARGET_DEFAULTS[target.key];
      return {
        key: target.key,
        target_type: target.target_type ?? defaults?.target_type ?? "page",
        path: target.path ?? defaults?.path ?? null,
        label: target.label?.trim() || defaults?.label || fallbackLabel(target.key),
        description: target.description?.trim() || defaults?.description || "",
        enabled: target.enabled,
        note: target.note?.trim() || null,
        updated_at: updatedAt,
      };
    });
    const { error } = await (supabaseAdmin as any)
      .from("maintenance_targets")
      .upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
    await recordAdminAudit({
      action: "maintenance.targets.update",
      permission: "maintenance:write",
      targetType: "maintenance_targets",
      metadata: {
        target_count: rows.length,
        enabled_count: rows.filter((row) => row.enabled).length,
      },
    });
    return readMaintenanceStatus();
  });
