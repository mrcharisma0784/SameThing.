// SameThing. — AI simplification + moderation via Lovable AI Gateway
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are SameThing.'s post-simplification + moderation engine.

Given a user's raw personal experience, return STRICT JSON:
{
  "simplified_text": string,
  "language": "tr" | "en" | "other",
  "safety_flag": boolean,
  "suggested_title": string,
  "moderation": "ok" | "profanity" | "sexual" | "suicide" | "violence"
}

Rules:
- Remove first-person pronouns (I/me/my/benim/ben). Use gerunds or second person.
- Preserve the emotional core exactly.
- Shared human truth, not individual story.
- 5–14 words, hard max 20.
- Detect language; output in the SAME language. Do NOT translate.
- safety_flag = true ONLY for explicit self-harm/suicide/violence content.
- moderation: "suicide" for self-harm/suicide intent or ideation; "sexual" for explicit sexual content; "profanity" for heavy slurs/profanity targeting people; "violence" for graphic violence; otherwise "ok".
- suggested_title <= 6 words.

Return ONLY the JSON object.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    let authorized = false;
    if (token && serviceRoleKey && token === serviceRoleKey) {
      authorized = true;
    } else if (token && supabaseUrl && anonKey) {
      const uRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
      });
      if (uRes.ok) {
        const u = await uRes.json();
        if (u?.id) authorized = true;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { raw_text } = await req.json();
    if (typeof raw_text !== "string" || raw_text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "raw_text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (raw_text.length > 1000) {
      return new Response(JSON.stringify({ error: "raw_text too long (max 1000)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = Deno.env.get("LOVABLE_MODEL") ?? "google/gemini-3-flash-preview";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Raw experience:\n"""${raw_text.trim()}"""` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("lovable ai error", aiRes.status, t);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI provider error", detail: t.slice(0, 300) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "{}";

    let parsed: { simplified_text?: string; language?: string; safety_flag?: boolean; suggested_title?: string; moderation?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    const simplified_text = (parsed.simplified_text || "").trim() || raw_text.trim().slice(0, 140);
    const language = ["tr", "en"].includes(String(parsed.language)) ? String(parsed.language) : "en";
    const safety_flag = Boolean(parsed.safety_flag);
    let suggested_title = (parsed.suggested_title || "").trim();
    if (!suggested_title) suggested_title = simplified_text.split(/\s+/).slice(0, 5).join(" ");
    const allowedMod = ["ok", "profanity", "sexual", "suicide", "violence"];
    const moderation = allowedMod.includes(String(parsed.moderation)) ? String(parsed.moderation) : "ok";

    return new Response(JSON.stringify({ simplified_text, language, safety_flag, suggested_title, moderation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("simplify-thing error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
