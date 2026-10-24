import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  message: z.string().trim().min(3).max(2000),
  user_agent: z.string().max(500).optional().nullable(),
});

export const sendFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("feedback" as never).insert({
      user_id: context.userId,
      message: data.message,
      user_agent: data.user_agent ?? null,
    } as never);
    if (error) {
      console.error("feedback error", error);
      return { error: "Could not send feedback." };
    }
    return { error: null as string | null };
  });
