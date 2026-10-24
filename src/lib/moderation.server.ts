// Server-side moderation helper: banned-word scan + auto system message.
export type BannedHit = { word: string; severity: "warn" | "block" };

export async function scanBannedWords(text: string): Promise<BannedHit[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("banned_words" as never).select("word, severity");
  const list = (data as unknown as Array<{ word: string; severity: string }>) ?? [];
  if (!list.length) return [];
  const lower = text.toLowerCase();
  const hits: BannedHit[] = [];
  for (const w of list) {
    const needle = w.word.toLowerCase();
    if (!needle) continue;
    const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower))
      hits.push({ word: w.word, severity: w.severity === "block" ? "block" : "warn" });
  }
  return hits;
}

export async function sendBannedWordWarning(
  userId: string,
  hits: BannedHit[],
  where: "thing" | "comment",
) {
  if (!hits.length) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const words = hits.map((h) => `"${h.word}"`).join(", ");
  await supabaseAdmin.from("system_messages" as never).insert({
    recipient_id: userId,
    kind: "warning",
    title: "Forbidden word used",
    body: `Your ${where} contained forbidden word(s): ${words}. Please review the Forbidden Words guidelines.`,
    link: "/faq#forbidden-words",
    meta: { words: hits.map((h) => h.word), where },
  } as never);
  // increment warning counter
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("warnings_count")
    .eq("id", userId)
    .maybeSingle();
  const next = ((prof?.warnings_count as number | undefined) ?? 0) + 1;
  await supabaseAdmin.from("profiles").update({ warnings_count: next }).eq("id", userId);
}
