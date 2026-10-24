import { supabase } from "@/integrations/supabase/client";

export type SimplifyResult = {
  simplified_text: string;
  language: "en" | "tr" | "other";
  safety_flag: boolean;
  suggested_title: string;
};

/** Client-side preview call — invokes the edge function directly. */
export async function simplifyPreview(raw_text: string): Promise<SimplifyResult | null> {
  if (!raw_text.trim()) return null;
  const { data, error } = await supabase.functions.invoke<SimplifyResult>("simplify-thing", {
    body: { raw_text },
  });
  if (error) {
    console.error("simplify preview", error);
    return null;
  }
  return data;
}
