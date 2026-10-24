export type SharePaletteKey = "ember" | "moss" | "night" | "violet";
export type ShareFontKey = "editorial" | "clean" | "mono";

export type SharePalette = {
  label: string;
  start: string;
  middle: string;
  end: string;
  ink: string;
  muted: string;
  accent: string;
  line: string;
  swatch: string;
};

export const SHARE_PALETTES: Record<SharePaletteKey, SharePalette> = {
  ember: {
    label: "Ember",
    start: "#261a14",
    middle: "#5a3823",
    end: "#0d0b0a",
    ink: "#f7efe4",
    muted: "rgba(247,239,228,.68)",
    accent: "#e2b86d",
    line: "rgba(235,205,157,.28)",
    swatch: "#b8784d",
  },
  moss: {
    label: "Moss",
    start: "#17221d",
    middle: "#304b3a",
    end: "#0a0d0b",
    ink: "#edf4e9",
    muted: "rgba(237,244,233,.68)",
    accent: "#b8d39a",
    line: "rgba(196,224,175,.28)",
    swatch: "#88aa75",
  },
  night: {
    label: "Night",
    start: "#111921",
    middle: "#23394b",
    end: "#070a0d",
    ink: "#edf4f8",
    muted: "rgba(237,244,248,.68)",
    accent: "#9fc6d8",
    line: "rgba(188,221,235,.28)",
    swatch: "#6f9ab0",
  },
  violet: {
    label: "Violet",
    start: "#211827",
    middle: "#4b315b",
    end: "#0c090f",
    ink: "#f4edf8",
    muted: "rgba(244,237,248,.68)",
    accent: "#d0a9de",
    line: "rgba(225,193,235,.28)",
    swatch: "#a87bbb",
  },
};

export const SHARE_FONTS: Record<ShareFontKey, { label: string; family: string }> = {
  editorial: { label: "Editorial", family: "Georgia, serif" },
  clean: { label: "Clean", family: "Arial, sans-serif" },
  mono: { label: "Signal", family: "'Courier New', monospace" },
};

export const SHARE_THEME_CHANGE_COST = 5;
export const SHARE_FONT_CHANGE_COST = 2;

export function sharePaletteRequiresPremium(key: SharePaletteKey) {
  return key !== "ember";
}

export function shareThemeCost(
  currentPalette: SharePaletteKey,
  currentFont: ShareFontKey,
  nextPalette: SharePaletteKey,
  nextFont: ShareFontKey,
  premium: boolean,
) {
  if (currentPalette === nextPalette && currentFont === nextFont) return 0;
  if (premium) return 0;
  return (
    (sharePaletteRequiresPremium(nextPalette) && currentPalette !== nextPalette
      ? SHARE_THEME_CHANGE_COST
      : 0) + (currentFont !== nextFont ? SHARE_FONT_CHANGE_COST : 0)
  );
}

export const SHARE_FORMATS = [
  { key: "story", label: "Story", width: 1080, height: 1920 },
  { key: "post", label: "Post", width: 1080, height: 1350 },
] as const;

export type ShareFormat = (typeof SHARE_FORMATS)[number]["key"];
