import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
      const missing = [
        ...(!supabaseUrl ? ["SUPABASE_URL"] : []),
        ...(!publishableKey ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
      ];
      const message = `Missing server environment variable(s): ${missing.join(", ")}. Add them to Vercel server environment variables.`;
      console.error(`[Supabase] ${message}`);
      throw new Error(message);
    }

    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");

    if (!authHeader) throw new Error("Unauthorized: No authorization header provided");
    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Only Bearer tokens are supported");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) throw new Error("Unauthorized: No token provided");

    const supabase = createClient<Database>(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) throw new Error("Unauthorized: Invalid token");
    if (!data.claims.sub) throw new Error("Unauthorized: No user ID found in token");

    const userId = data.claims.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_test_user, plan, same_credits_unlimited")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw new Error("Could not verify account access.");
    if (
      profile?.is_test_user &&
      (profile.plan === "premium" || profile.same_credits_unlimited === true)
    ) {
      const { error: revokeError } = await supabaseAdmin
        .from("profiles")
        .update({ plan: "free", premium_until: null, same_credits_unlimited: false })
        .eq("id", userId)
        .eq("is_test_user", true);
      if (revokeError) throw new Error("Could not retire legacy Test User access.");
    }

    return next({
      context: {
        supabase,
        userId,
        claims: data.claims,
      },
    });
  },
);
