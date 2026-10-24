/* eslint-disable @typescript-eslint/no-explicit-any -- support_requests is introduced by the paired Supabase migration. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SupportInput = z.object({
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(3).max(4000),
  screenshot_name: z.string().trim().max(200).optional(),
  user_agent: z.string().trim().max(500).optional(),
});

export const sendSupportRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SupportInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: request, error } = await (supabaseAdmin as any)
      .from("support_requests")
      .insert({
        user_id: context.userId,
        subject: data.subject,
        message: data.user_agent
          ? `${data.message}\n\n[User agent: ${data.user_agent}]`
          : data.message,
        screenshot_name: data.screenshot_name || null,
      })
      .select("id, subject, status, created_at")
      .single();
    if (error) return { error: "Could not send your Support request." };
    return { error: null as string | null, request };
  });
