import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TAGS } from "@/lib/thing-helpers";

const Input = z.object({
  text: z.string().min(4).max(1000),
  extra_tags: z.array(z.string().min(1).max(24)).max(20).optional().default([]),
});

/** Ask Lovable AI to pick 1–3 tags that best fit the text. */
export const suggestTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { tags: [] as string[], error: "AI not configured." };

    // AI tag suggestions are a PremiumThing. feature
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("plan").eq("id", context.userId).maybeSingle();
    if (prof?.plan !== "premium") {
      return { tags: [] as string[], error: "premium" as string | null };
    }


    const allowed = Array.from(new Set([...TAGS, ...data.extra_tags.map((t) => t.toLowerCase())]));
    const sys = `You classify a short personal note into 1-3 tags from a fixed list. Return STRICT JSON: {"tags": ["tag1", ...]}. Only pick tags from the allowed list. Prefer 1-2 tags unless clearly relevant.`;
    const user = `Allowed tags:\n${allowed.map((t) => `- ${t}`).join("\n")}\n\nNote:\n"""${data.text.trim()}"""`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: sys }, { role: "user", content: user }],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) return { tags: [], error: null as string | null };
      const body = await res.json();
      const raw: string = body?.choices?.[0]?.message?.content ?? "{}";
      let parsed: { tags?: string[] } = {};
      try { parsed = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : {};
      }
      const set = new Set(allowed);
      const tags = (parsed.tags ?? [])
        .map((t) => String(t).toLowerCase().trim())
        .filter((t) => set.has(t))
        .slice(0, 3);
      return { tags, error: null as string | null };
    } catch (e) {
      console.error("suggestTags", e);
      return { tags: [], error: null as string | null };
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
    const warn = hits.filter((h) => h.severity === "warn").map((h) => h.word);
    const block = hits.filter((h) => h.severity === "block").map((h) => h.word);

    const raw = text.match(/@([a-z0-9_]{2,24})/gi) ?? [];
    const usernames = Array.from(new Set(raw.map((m) => m.slice(1).toLowerCase())));
    const blockedMentions: string[] = [];
    if (usernames.length) {
      const { data: users } = await supabaseAdmin
        .from("profiles").select("id, username, allow_mentions").in("username", usernames);
      for (const u of (users as unknown as Array<{ id: string; username: string; allow_mentions?: boolean }>) ?? []) {
        if (u.allow_mentions === false && u.id !== userId) blockedMentions.push(u.username);
      }
    }
    const warnings: string[] = [];
    if (warn.length) warnings.push(`Watch your words: ${warn.map((w) => `"${w}"`).join(", ")}.`);
    if (block.length) warnings.push(`Forbidden word(s): ${block.map((w) => `"${w}"`).join(", ")}.`);
    if (blockedMentions.length) warnings.push(`@${blockedMentions[0]} doesn't accept mentions.`);
    return {
      warnings,
      block: block.length > 0 || blockedMentions.length > 0,
    };
  });

