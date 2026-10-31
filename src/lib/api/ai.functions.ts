import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getCloudflareChatContent,
  requestCloudflareChatCompletion,
} from "@/lib/ai/cloudflare.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TAGS } from "@/lib/thing-helpers";
import { effectivePlan } from "@/lib/premium";

const Input = z.object({
  text: z.string().min(4).max(1000),
  extra_tags: z.array(z.string().min(1).max(24)).max(20).optional().default([]),
});

/** Ask the configured Cloudflare AI model to pick 1–3 tags that best fit the text. */
export const suggestTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => Input.parse(i))
  .handler(async ({ data, context }) => {
    // AI tag suggestions are a PremiumThing. feature
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("plan, premium_until, is_test_user")
      .eq("id", context.userId)
      .maybeSingle();
    if (effectivePlan(prof) !== "premium") {
      return { tags: [] as string[], error: "premium" as string | null };
    }

    const allowed = Array.from(new Set([...TAGS, ...data.extra_tags.map((t) => t.toLowerCase())]));
    const sys = `You classify a short personal note into 1-3 tags from a fixed list. Return one compact JSON object and no other text: {"tags":["tag1"]}. Only pick tags from the allowed list. Prefer 1-2 tags unless clearly relevant.`;
    const user = `Allowed tags:\n${allowed.map((t) => `- ${t}`).join("\n")}\n\nNote:\n"""${data.text.trim()}"""`;

    try {
      const response = await requestCloudflareChatCompletion(
        [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        {
          temperature: 0.2,
          max_completion_tokens: 256,
          reasoning_effort: "low",
        },
      );
      const raw = getCloudflareChatContent(response);
      let parsed: { tags?: string[] } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : {};
      }
      const set = new Set(allowed);
      const tags = (parsed.tags ?? [])
        .map((t) => String(t).toLowerCase().trim())
        .filter((t) => set.has(t))
        .slice(0, 3);
      return { tags, error: null as string | null };
    } catch (e) {
      console.error("suggestTags request failed");
      const message = e instanceof Error ? e.message : "";
      return {
        tags: [],
        error: message.includes("not configured") ? "AI not configured." : (null as string | null),
      };
    }
  });

// ---- Pre-flight content scanner (banned words + blocked-mention check) --
const ScanInput = z.object({
  text: z.string().min(0).max(2000),
});
export const scanContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ScanInput.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { scanBannedWords } = await import("@/lib/moderation.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const text = data.text;
    const hits = await scanBannedWords(text);

    const raw = text.match(/@([a-z0-9_]{2,24})/gi) ?? [];
    const usernames = Array.from(new Set(raw.map((m) => m.slice(1).toLowerCase())));
    const blockedMentions: string[] = [];
    if (usernames.length) {
      const { data: users } = await supabaseAdmin
        .from("profiles")
        .select("id, username, allow_mentions")
        .in("username", usernames);
      for (const u of (users as unknown as Array<{
        id: string;
        username: string;
        allow_mentions?: boolean;
      }>) ?? []) {
        if (u.allow_mentions === false && u.id !== userId) blockedMentions.push(u.username);
      }
    }
    const warnings: string[] = [];
    if (hits.length)
      warnings.push(
        `Forbidden word(s): ${hits.map((hit) => `"${hit.word}"`).join(", ")}. Please change the text before posting.`,
      );
    if (blockedMentions.length) warnings.push(`@${blockedMentions[0]} doesn't accept mentions.`);

    // Every configured Forbidden Word is a hard pre-publish stop. The former
    // warn/block distinction allowed a configured word through, which made the
    // editor and the publish endpoint disagree.
    const deterministicBlock = hits.length > 0 || blockedMentions.length > 0;
    // Model review is intentionally deferred until after publish. This preflight
    // remains fast and only enforces deterministic platform rules.
    const safety: "safe" | "blocked" | "review" = deterministicBlock ? "blocked" : "review";
    return {
      warnings,
      forbiddenWords: hits.map((hit) => hit.word),
      block: deterministicBlock,
      safety,
    };
  });
