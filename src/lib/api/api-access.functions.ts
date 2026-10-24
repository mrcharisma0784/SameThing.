/* eslint-disable @typescript-eslint/no-explicit-any -- API service tables are service-role-only and migrations precede generated types. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  API_CREDIT_PACKS,
  API_CREDIT_WELCOME,
  API_SCOPES,
  type ApiCreditPackKey,
  type ApiScope,
} from "@/lib/api/api-catalog";

const ApiAccessRequestInput = z.object({
  applicant_name: z.string().trim().min(2).max(120),
  organization: z.string().trim().max(160).optional().or(z.literal("")),
  use_case: z.string().trim().min(20).max(3000),
  requested_scopes: z.array(z.enum(API_SCOPES)).min(1).max(API_SCOPES.length),
  expected_volume: z.enum(["pilot", "standard", "bulk"]),
});

const ApiCreditPackInput = z.object({
  pack_key: z.enum(["starter", "builder", "studio"]),
});

const PROCESSED_APPLICATION_STATUSES = ["approved", "waitlist", "declined"] as const;

async function encryptionKey() {
  const { createHash } = await import("node:crypto");
  const secret = process.env.API_KEY_ENCRYPTION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("API key encryption is not configured.");
  return createHash("sha256").update(secret, "utf8").digest();
}

async function hashApiKey(value: string) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function encryptApiKey(value: string) {
  const { createCipheriv, randomBytes } = await import("node:crypto");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", await encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString("base64url")).join(".");
}

async function decryptApiKey(value: string) {
  try {
    const { createDecipheriv } = await import("node:crypto");
    const [ivText, tagText, ciphertextText] = value.split(".");
    if (!ivText || !tagText || !ciphertextText) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      await encryptionKey(),
      Buffer.from(ivText, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextText, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

async function safeKey(row: any) {
  return {
    id: row.id,
    request_id: row.request_id,
    name: row.name,
    key_prefix: row.key_prefix,
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    rate_plan: row.rate_plan,
    created_at: row.created_at,
    last_used_at: row.last_used_at,
    expires_at: row.expires_at,
    revoked_at: row.revoked_at,
    api_key: row.secret_ciphertext ? await decryptApiKey(row.secret_ciphertext) : null,
  };
}

function ratePlanFromVolume(volume: "pilot" | "standard" | "bulk") {
  return volume;
}

/** Issues one encrypted, owner-readable key after an approved request. Admin never calls this directly. */
export async function issueApiKeyForApprovedRequest(requestId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data: request, error: requestError } = await db
    .from("api_access_requests")
    .select("id, user_id, applicant_name, organization, requested_scopes, expected_volume, status")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError || !request) return { ok: false as const, error: "Request not found." };
  if (request.status !== "approved")
    return { ok: false as const, error: "Approve the application before issuing access." };
  if (!request.user_id)
    return { ok: false as const, error: "This request is not linked to a signed-in workspace." };

  const { data: existing } = await db
    .from("api_keys")
    .select("id, secret_ciphertext")
    .eq("request_id", request.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: true as const, created: false as const, key_id: existing.id };

  const { randomBytes } = await import("node:crypto");
  const token = `st_live_${randomBytes(32).toString("base64url")}`;
  const { data: authUser } = await db.auth.admin.getUserById(request.user_id);
  const workspaceEmail = authUser?.user?.email ?? "workspace-account";
  const { data: key, error } = await db
    .from("api_keys")
    .insert({
      request_id: request.id,
      user_id: request.user_id,
      name: `${request.organization || request.applicant_name} API`,
      applicant_name: request.applicant_name,
      email: workspaceEmail,
      organization: request.organization ?? null,
      key_prefix: token.slice(0, 20),
      secret_hash: await hashApiKey(token),
      secret_ciphertext: await encryptApiKey(token),
      scopes: Array.from(new Set(request.requested_scopes as string[])),
      rate_plan: ratePlanFromVolume(request.expected_volume),
      expires_at: null,
      created_by: null,
    })
    .select("id")
    .single();
  if (error || !key)
    return { ok: false as const, error: error?.message ?? "Could not issue access." };

  const { error: welcomeError } = await db.rpc("grant_api_welcome_credits", {
    _user_id: request.user_id,
    _request_id: request.id,
    _amount: API_CREDIT_WELCOME,
  });
  if (welcomeError) {
    await db.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", key.id);
    return { ok: false as const, error: "Could not initialize the API workspace allowance." };
  }

  return { ok: true as const, created: true as const, key_id: key.id };
}

export const submitApiAccessRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ApiAccessRequestInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const authEmail =
      typeof context.claims.email === "string"
        ? context.claims.email.toLowerCase()
        : "workspace-account";
    const { data: recent } = await db
      .from("api_access_requests")
      .select("id, status, created_at, retry_after")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent && ["pending", "reviewing", "approved"].includes(recent.status)) {
      return {
        ok: true as const,
        duplicate: true as const,
        message: "Your workspace already has an active API access request.",
        request: recent,
      };
    }
    if (recent?.retry_after && new Date(recent.retry_after).getTime() > Date.now()) {
      const waitDays = Math.max(
        1,
        Math.ceil((new Date(recent.retry_after).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      );
      return {
        ok: false as const,
        cooldown: true as const,
        error: `Please wait ${waitDays} more day${waitDays === 1 ? "" : "s"} before re-applying.`,
        retry_after: recent.retry_after,
      };
    }

    const { data: request, error } = await db
      .from("api_access_requests")
      .insert({
        user_id: context.userId,
        applicant_name: data.applicant_name,
        email: authEmail,
        organization: data.organization?.trim() || null,
        use_case: data.use_case,
        requested_scopes: [...new Set(data.requested_scopes)],
        expected_volume: data.expected_volume,
        application_notice_seen_at: null,
        retry_after: null,
      })
      .select("id, status, created_at, requested_scopes, expected_volume")
      .single();
    if (error || !request)
      return { ok: false as const, error: "We could not save your API access request." };
    return {
      ok: true as const,
      duplicate: false as const,
      message: "Request received. We will review the scope before access is enabled.",
      request,
    };
  });

export const getMyApiDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [{ data: requests, error: requestError }, { data: profile, error: profileError }] =
      await Promise.all([
        db
          .from("api_access_requests")
          .select(
            "id, applicant_name, organization, use_case, requested_scopes, expected_volume, status, admin_note, reviewed_at, created_at, updated_at, application_notice_seen_at, retry_after",
          )
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(10),
        db
          .from("profiles")
          .select("api_credits, plan, premium_until")
          .eq("id", context.userId)
          .maybeSingle(),
      ]);
    if (requestError || profileError)
      throw new Error("The API workspace is temporarily unavailable.");

    const activeRequest = (requests ?? [])[0] ?? null;
    let applicationNotice = null;
    if (
      activeRequest &&
      PROCESSED_APPLICATION_STATUSES.includes(
        activeRequest.status as (typeof PROCESSED_APPLICATION_STATUSES)[number],
      ) &&
      !activeRequest.application_notice_seen_at
    ) {
      const { data: claimed } = await db.rpc("claim_api_application_notice", {
        _user_id: context.userId,
        _request_id: activeRequest.id,
      });
      if (claimed) applicationNotice = activeRequest;
    }
    if (activeRequest?.status === "approved") {
      await db.rpc("grant_api_welcome_credits", {
        _user_id: context.userId,
        _request_id: activeRequest.id,
        _amount: API_CREDIT_WELCOME,
      });
    }

    const { data: ledger, error: ledgerError } = await db
      .from("api_credit_ledger")
      .select("id, amount, reason, request_id, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (ledgerError) throw new Error("The API workspace is temporarily unavailable.");

    const { data: keys, error: keyError } = await db
      .from("api_keys")
      .select(
        "id, request_id, name, key_prefix, scopes, rate_plan, created_at, last_used_at, expires_at, revoked_at, secret_ciphertext",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (keyError) throw new Error("The API workspace is temporarily unavailable.");

    const { data: refreshedProfile } = await db
      .from("profiles")
      .select("api_credits, plan, premium_until")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      requests: requests ?? [],
      active_request: activeRequest,
      application_notice: applicationNotice,
      keys: await Promise.all((keys ?? []).map(safeKey)),
      api_credits: Number(refreshedProfile?.api_credits ?? profile?.api_credits ?? 0),
      ledger: ledger ?? [],
      welcome_credits: API_CREDIT_WELCOME,
      plans: {
        free: "Access begins with a one-time 500 API Credit welcome allowance after approval.",
        premium:
          "Premium does not remove API request usage; it includes 25 Same Credits each active month for the main app.",
      },
    };
  });

export const createApiCreditPurchaseIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ApiCreditPackInput.parse(input))
  .handler(async ({ data, context }) => {
    const pack = API_CREDIT_PACKS.find((item) => item.key === data.pack_key) as
      (typeof API_CREDIT_PACKS)[number] | undefined;
    if (!pack) return { ok: false as const, error: "That API Credit pack is not available." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: intent, error } = await (supabaseAdmin as any)
      .from("api_credit_purchase_intents")
      .insert({
        user_id: context.userId,
        pack_key: pack.key,
        credits: pack.credits,
        amount_cents: pack.amountCents,
        currency: "USD",
        status: "pending",
        provider: null,
      })
      .select("id, pack_key, credits, amount_cents, currency, status, created_at")
      .single();
    if (error || !intent) return { ok: false as const, error: "We could not prepare checkout." };
    return {
      ok: true as const,
      intent,
      message:
        "Checkout is prepared but payments are not connected yet. No card was charged and no Credits were added.",
    };
  });

export const listMyApiCreditPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("api_credit_purchase_intents")
      .select("id, pack_key, credits, amount_cents, currency, status, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error("Purchase history is temporarily unavailable.");
    return { items: data ?? [] };
  });

export type ApiDashboardData = Awaited<ReturnType<typeof getMyApiDashboard>>;
export type ApiDashboardScope = ApiScope;
export type ApiDashboardPackKey = ApiCreditPackKey;
