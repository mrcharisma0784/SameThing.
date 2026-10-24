// System messages — user-facing reads.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SystemMessage = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export const listMySystemMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("system_messages" as never)
      .select("id, kind, title, body, link, read_at, created_at")
      .eq("recipient_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(80);
    return { items: (data as unknown as SystemMessage[]) ?? [] };
  });

export const ensureWelcomeSystemMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("system_messages" as never)
      .select("id")
      .eq("recipient_id", context.userId)
      .eq("kind", "welcome")
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return { created: false };

    const { error } = await supabaseAdmin.from("system_messages" as never).insert({
      recipient_id: context.userId,
      kind: "welcome",
      title: "Welcome to SameThing.",
      body: "Thanks for joining us — we're so glad you're here. You're never the only one.",
      link: "/notifications",
    } as never);
    if (error) throw error;
    return { created: true };
  });

export const markSystemMessageRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("system_messages" as never)
      .update({ read_at: new Date().toISOString() } as never)
      .eq("id", data.id)
      .eq("recipient_id", context.userId);
    return { ok: true };
  });
