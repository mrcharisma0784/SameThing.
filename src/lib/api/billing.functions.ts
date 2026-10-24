import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PaymentMethod = {
  id: string;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean;
  created_at: string;
};

export const getPaymentMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("payment_methods" as never)
      .select("id, brand, last4, exp_month, exp_year, is_default, created_at")
      .eq("user_id", context.userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      console.error("getPaymentMethods", error);
      return { methods: [] as PaymentMethod[] };
    }
    return { methods: (data ?? []) as unknown as PaymentMethod[] };
  });

export const preparePaymentMethodSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ provider: z.enum(["stripe"]).default("stripe") }).parse(input),
  )
  .handler(async () => {
    const enabled = Boolean(
      process.env.PAYMENT_PROVIDER_SECRET_KEY && process.env.PAYMENT_PROVIDER_PUBLIC_KEY,
    );
    if (!enabled) {
      return {
        enabled: false,
        error: "Secure card entry is not connected yet. No card data is collected or charged.",
      };
    }
    // Provider setup-intent creation belongs here once the operator enables test/live billing.
    // The browser must receive only a client secret or equivalent token, never provider secrets.
    return {
      enabled: false,
      error: "Billing is intentionally disabled until the payment provider is enabled.",
    };
  });
