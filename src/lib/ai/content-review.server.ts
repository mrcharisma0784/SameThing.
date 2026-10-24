import {
  getCloudflareChatContent,
  requestCloudflareChatCompletion,
} from "@/lib/ai/cloudflare.server";

type ReviewResult = { ok: true } | { ok: false; reason: "unsafe" | "unavailable"; message: string };

type ParsedReview = {
  allow?: boolean;
  category?: string;
  reason?: string;
};

// GLM-4.7-Flash may need a few seconds for a synchronous response. Keep a
// bounded timeout below the serverless request ceiling, but do not fail at 4s.
const REVIEW_TIMEOUT_MS = 8_000;

/**
 * Server-only preflight for user-created Things. The deterministic banned-word
 * scan remains separate and runs before this AI review in the write handler.
 */
export async function reviewThingContent(text: string): Promise<ReviewResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REVIEW_TIMEOUT_MS);
  try {
    const response = await requestCloudflareChatCompletion(
      [
        {
          role: "system",
          content:
            'You are a safety classifier for a small social app. Return one compact JSON object and no other text: {"allow":true|false,"category":"safe|violence|hate|sexual|self_harm|harassment|illegal|spam|other","reason":"short reason"}. Set allow false for credible promotion or instruction of serious harm, hate or dehumanization, sexual content involving minors, targeted harassment, self-harm encouragement, or illegal wrongdoing. Personal experiences, sadness, disagreement, and ordinary edgy language can be allowed. Do not rewrite or quote the user content.',
        },
        {
          role: "user",
          content: `Classify this Thing for publication:\n"""${text.trim()}"""`,
        },
      ],
      {
        temperature: 0,
        max_completion_tokens: 128,
        reasoning_effort: "low",
        signal: controller.signal,
      },
    );
    const raw = getCloudflareChatContent(response);
    let parsed: ParsedReview | null = null;
    try {
      parsed = JSON.parse(raw) as ParsedReview;
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]) as ParsedReview;
        } catch {
          parsed = null;
        }
      }
    }
    if (!parsed || typeof parsed.allow !== "boolean") {
      return {
        ok: false,
        reason: "unavailable",
        message: "AI review returned an unreadable result.",
      };
    }
    if (!parsed.allow) {
      return {
        ok: false,
        reason: "unsafe",
        message: "This Thing needs a quick safety check before it can be posted.",
      };
    }
    return { ok: true };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    console.error("reviewThingContent", timedOut ? "timeout" : "request failed");
    return {
      ok: false,
      reason: "unavailable",
      message: "Safety check is temporarily unavailable. Please try again in a moment.",
    };
  } finally {
    clearTimeout(timer);
  }
}
