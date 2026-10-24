/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase rows are intentionally typed locally for this source snapshot. */
import type { MaintenanceTarget } from "@/lib/maintenance-targets";

export type MaintenanceStatus = {
  enabled: boolean;
  note: string | null;
  updated_at: string | null;
  targets: MaintenanceTarget[];
};

const DEFAULT_STATUS: MaintenanceStatus = {
  enabled: false,
  note: null,
  updated_at: null,
  targets: [],
};

type SiteSettingsRow = {
  maintenance_enabled?: boolean | null;
  maintenance_note?: string | null;
  updated_at?: string | null;
};

type TargetRow = {
  key?: string | null;
  target_type?: "page" | "feature" | null;
  path?: string | null;
  label?: string | null;
  description?: string | null;
  enabled?: boolean | null;
  note?: string | null;
  updated_at?: string | null;
};

function mapTarget(row: TargetRow): MaintenanceTarget | null {
  if (!row.key || !row.label) return null;
  return {
    key: row.key,
    target_type: row.target_type === "feature" ? "feature" : "page",
    path: row.path ?? null,
    label: row.label,
    description: row.description ?? "",
    enabled: Boolean(row.enabled),
    note: row.note ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export async function readMaintenanceStatus(): Promise<MaintenanceStatus> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("site_settings")
      .select("maintenance_enabled, maintenance_note, updated_at")
      .eq("id", true)
      .maybeSingle();
    if (error) {
      console.error("[maintenance] read failed", error.message);
      return DEFAULT_STATUS;
    }

    const { data: targetRows, error: targetError } = await (supabaseAdmin as any)
      .from("maintenance_targets")
      .select("key, target_type, path, label, description, enabled, note, updated_at")
      .order("label", { ascending: true });
    if (targetError) {
      console.warn("[maintenance] targets read failed", targetError.message);
    }

    return {
      enabled: Boolean(data?.maintenance_enabled),
      note: typeof data?.maintenance_note === "string" ? data.maintenance_note : null,
      updated_at: typeof data?.updated_at === "string" ? data.updated_at : null,
      targets: (targetRows ?? []).map(mapTarget).filter(Boolean) as MaintenanceTarget[],
    };
  } catch (error) {
    console.error("[maintenance] read failed", error);
    return DEFAULT_STATUS;
  }
}

export function renderMaintenancePage(note?: string | null): string {
  const safeNote = (note || "We’re making a few careful improvements. Please check back soon.")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
  return `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0f0e0c" />
    <title>Maintain · SameThing.</title>
    <style>
      :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; background: #0f0e0c; color: #f4efe6; }
      * { box-sizing: border-box; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; background: radial-gradient(circle at 50% 10%, rgba(190,151,95,.14), transparent 42%), #0f0e0c; }
      main { width: min(100%, 430px); text-align: center; }
      .mark { width: 80px; height: 80px; margin: 0 auto 28px; padding: 0; display: grid; place-items: center; border: 1px solid rgba(190,151,95,.38); border-radius: 24px; background: #f4efe6; box-shadow: 0 20px 60px rgba(0,0,0,.28); }
      .mark img { width: 100%; height: 100%; display: block; object-fit: contain; }
      h1 { margin: 0; font: italic 42px/1.05 Georgia, serif; font-weight: 400; letter-spacing: -.03em; }
      .dot { color: #c49a61; }
      p { margin: 18px auto 0; max-width: 34ch; color: #a8a094; font-size: 15px; line-height: 1.65; }
      .status { display: inline-flex; margin-top: 28px; padding: 9px 14px; border: 1px solid rgba(190,151,95,.28); border-radius: 999px; color: #c49a61; font-size: 10px; letter-spacing: .18em; text-transform: uppercase; }
    </style>
  </head>
  <body>
    <main>
      <div class="mark" aria-hidden="true"><img src="/pp-logo.png" alt="SameThing." /></div>
      <h1>Maintain<span class="dot">.</span></h1>
      <p>${safeNote}</p>
      <span class="status">Maintain</span>
    </main>
  </body>
</html>`;
}

export function isMaintenanceExemptPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/_build/") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.png" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/pp-logo.png" ||
    pathname === "/pwa-icon-192.png" ||
    pathname === "/pwa-icon-512.png" ||
    pathname === "/pwa-icon-maskable-512.png" ||
    pathname === "/manifest.json" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}
