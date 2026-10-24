/* eslint-disable @typescript-eslint/no-explicit-any -- Research API tables are intentionally service-role-only and precede generated type refresh. */
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { apiError } from "@/lib/api/v1/response";

export type ApiKeyContext = {
  id: string;
  user_id: string;
  request_id: string;
  scopes: string[];
  rate_plan: "pilot" | "standard" | "bulk";
};

type AuthFailure = { ok: false; response: Response; keyId?: string };
type AuthSuccess = { ok: true; key: ApiKeyContext };

const RATE_LIMITS: Record<ApiKeyContext["rate_plan"], number> = {
  pilot: 60,
  standard: 120,
  bulk: 30,
};

export async function authenticateApiRequest(
  request: Request,
  requestId: string,
  requiredScope?: string,
): Promise<AuthFailure | AuthSuccess> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return {
      ok: false,
      response: apiError(401, "unauthorized", "A Bearer API key is required.", requestId),
    };
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!token || token.length > 300) {
    return {
      ok: false,
      response: apiError(401, "unauthorized", "The API key is invalid.", requestId),
    };
  }

  const secretHash = createHash("sha256").update(token, "utf8").digest("hex");
  const { data: key, error } = await (supabaseAdmin as any)
    .from("api_keys")
    .select("id, user_id, request_id, scopes, rate_plan, expires_at, revoked_at")
    .eq("secret_hash", secretHash)
    .maybeSingle();
  if (
    error ||
    !key ||
    !key.user_id ||
    key.revoked_at ||
    (key.expires_at && new Date(key.expires_at) <= new Date())
  ) {
    return {
      ok: false,
      response: apiError(401, "unauthorized", "The API key is invalid or inactive.", requestId),
    };
  }

  const { data: accessRequest } = await (supabaseAdmin as any)
    .from("api_access_requests")
    .select("status")
    .eq("id", key.request_id)
    .maybeSingle();
  if (!accessRequest || accessRequest.status !== "approved") {
    return {
      ok: false,
      response: apiError(401, "unauthorized", "The API access request is not active.", requestId),
    };
  }

  const scopes = Array.isArray(key.scopes) ? (key.scopes as string[]) : [];
  if (requiredScope && !scopes.includes(requiredScope)) {
    return {
      ok: false,
      response: apiError(
        403,
        "insufficient_scope",
        "This API key does not allow that resource.",
        requestId,
      ),
    };
  }

  const plan = (key.rate_plan as ApiKeyContext["rate_plan"]) || "pilot";
  const bucketStart = new Date();
  bucketStart.setUTCSeconds(0, 0);
  const { data: allowed, error: rateError } = await (supabaseAdmin as any).rpc(
    "consume_api_rate_limit",
    {
      _api_key_id: key.id,
      _bucket_start: bucketStart.toISOString(),
      _limit: RATE_LIMITS[plan],
    },
  );
  if (rateError || allowed !== true) {
    return {
      ok: false,
      keyId: key.id,
      response: apiError(429, "rate_limited", "Too many requests. Try again later.", requestId, {
        "Retry-After": "60",
      }),
    };
  }

  const { data: creditResult, error: creditError } = await (supabaseAdmin as any).rpc(
    "consume_api_credit",
    {
      _user_id: key.user_id,
      _api_key_id: key.id,
      _request_id: requestId,
    },
  );
  const creditPayload = (creditResult ?? {}) as { ok?: boolean; reason?: string; credits?: number };
  if (creditError) {
    return {
      ok: false,
      keyId: key.id,
      response: apiError(
        503,
        "api_credits_unavailable",
        "API Credit accounting is temporarily unavailable. Try again later.",
        requestId,
      ),
    };
  }
  if (!creditPayload.ok && creditPayload.reason === "insufficient_api_credits") {
    return {
      ok: false,
      keyId: key.id,
      response: apiError(
        402,
        "api_credits_exhausted",
        "This workspace has no API Credits remaining. Add more Credits from the API Dashboard.",
        requestId,
        { "X-API-Credits-Remaining": String(creditPayload.credits ?? 0) },
      ),
    };
  }
  if (!creditPayload.ok) {
    return {
      ok: false,
      keyId: key.id,
      response: apiError(
        401,
        "unauthorized",
        "The API key is not active for a workspace.",
        requestId,
      ),
    };
  }

  await (supabaseAdmin as any)
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id);

  return {
    ok: true,
    key: {
      id: key.id,
      user_id: key.user_id,
      request_id: key.request_id,
      scopes,
      rate_plan: plan,
    },
  };
}

export async function recordApiRequest(input: {
  keyId: string | null;
  requestId: string;
  endpoint: string;
  method?: string;
  statusCode: number;
  rowsReturned?: number;
  startedAt: number;
}) {
  try {
    await (supabaseAdmin as any).from("api_request_logs").insert({
      api_key_id: input.keyId,
      request_id: input.requestId,
      method: input.method ?? "GET",
      endpoint: input.endpoint.slice(0, 200),
      status_code: input.statusCode,
      rows_returned: Math.max(0, input.rowsReturned ?? 0),
      latency_ms: Math.max(0, Math.round(performance.now() - input.startedAt)),
    });
  } catch (error) {
    console.error("api request log failed", error);
  }
}

export function apiCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const allowed =
    process.env.RESEARCH_API_ALLOWED_ORIGINS?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    Vary: "Origin",
  };
}
