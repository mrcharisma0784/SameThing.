/* eslint-disable @typescript-eslint/no-explicit-any -- Share-card RPC parameters are defined by the applied Supabase migration. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SHARE_FONTS,
  SHARE_PALETTES,
  SHARE_THEME_CHANGE_COST,
  type ShareFontKey,
  type SharePaletteKey,
} from "@/lib/share-card-themes";

export { SHARE_FONT_CHANGE_COST, SHARE_THEME_CHANGE_COST } from "@/lib/share-card-themes";

const ShareThemeInput = z.object({
  target_type: z.enum(["thing", "quote"]),
  target_id: z.string().uuid(),
  palette: z.enum(Object.keys(SHARE_PALETTES) as [SharePaletteKey, ...SharePaletteKey[]]),
  font: z.enum(Object.keys(SHARE_FONTS) as [ShareFontKey, ...ShareFontKey[]]),
});

export const setShareCardTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ShareThemeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await (supabaseAdmin as any).rpc("set_share_card_theme", {
      _user_id: context.userId,
      _target_type: data.target_type,
      _target_id: data.target_id,
      _palette: data.palette,
      _font: data.font,
    });
    if (error) {
      console.error("setShareCardTheme", error);
      return { ok: false as const, error: "Could not save this card style." };
    }

    const payload = (result ?? {}) as {
      ok?: boolean;
      reason?: string;
      changed?: boolean;
      cost?: number;
      credits?: number;
      palette?: SharePaletteKey;
      font?: ShareFontKey;
    };
    if (!payload.ok) {
      const errors: Record<string, string> = {
        invalid: "That card style is not available.",
        profile_not_found: "Your account could not be found.",
        target_not_found: "This content is no longer available.",
        not_owner: "Only the owner can save a card style for this content.",
        insufficient_credits: `You need ${payload.cost ?? SHARE_THEME_CHANGE_COST} Same Credits for a new card style.`,
      };
      return {
        ok: false as const,
        error: errors[payload.reason ?? ""] ?? "Could not save this card style.",
        reason: payload.reason,
        cost: payload.cost ?? SHARE_THEME_CHANGE_COST,
        credits: payload.credits ?? 0,
      };
    }

    return {
      ok: true as const,
      changed: payload.changed ?? false,
      cost: payload.cost ?? 0,
      credits: payload.credits ?? 0,
      palette: payload.palette ?? data.palette,
      font: payload.font ?? data.font,
    };
  });
