/* eslint-disable @typescript-eslint/no-explicit-any -- feedback prompt tables are introduced by a paired migration. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getActiveFeedbackPrompt = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("feedback_prompts")
      .select("id, title, body, button_label, expires_at")
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(10);
    if (error) {
      console.error("active feedback prompt read failed", error);
      return { prompt: null };
    }
    const prompt = (data ?? []).find(
      (item: { expires_at?: string | null }) =>
        !item.expires_at || new Date(item.expires_at).getTime() > Date.now(),
    );
    return { prompt: prompt ?? null };
  });

const FeedbackResponseInput = z.object({
  prompt_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).nullable().optional(),
});

export const submitFeedbackPromptResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => FeedbackResponseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prompt } = await (supabaseAdmin as any)
      .from("feedback_prompts")
      .select("id, expires_at")
      .eq("id", data.prompt_id)
      .eq("active", true)
      .maybeSingle();
    if (!prompt || (prompt.expires_at && new Date(prompt.expires_at).getTime() <= Date.now()))
      return { ok: false as const, error: "This feedback form is no longer active." };

    const { error } = await (supabaseAdmin as any).from("feedback_prompt_responses").upsert(
      {
        prompt_id: data.prompt_id,
        user_id: context.userId,
        rating: data.rating,
        comment: data.comment?.trim() || null,
      },
      { onConflict: "prompt_id,user_id" },
    );
    if (error) {
      console.error("feedback prompt response failed", error);
      return { ok: false as const, error: "Could not send your feedback yet." };
    }
    return { ok: true as const };
  });
