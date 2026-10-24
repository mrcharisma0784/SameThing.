// App themes. "ember" is the original, free theme. Others are PremiumThing only.
export type ThemeKey = "ember" | "midnight" | "paper" | "moss" | "plum" | "noir";

export const THEMES: Array<{
  key: ThemeKey;
  name: string;
  hint: string;
  premium: boolean;
  swatch: [string, string, string];
}> = [
  {
    key: "ember",
    name: "Ember.",
    hint: "The original — warm dark, beige accent.",
    premium: false,
    swatch: ["#0f0e0c", "#1a1917", "#c8b8a2"],
  },
  {
    key: "midnight",
    name: "Midnight.",
    hint: "Cool slate blue, quiet and late.",
    premium: true,
    swatch: ["#0b1018", "#141c28", "#8fb3d9"],
  },
  {
    key: "paper",
    name: "Paper.",
    hint: "Off-white, printed, almost analogue.",
    premium: true,
    swatch: ["#f6f4ee", "#fffdf8", "#8a6a45"],
  },
  {
    key: "moss",
    name: "Moss.",
    hint: "Forest dark, quiet green glow.",
    premium: true,
    swatch: ["#07120f", "#10352a", "#8fd9b3"],
  },
  {
    key: "plum",
    name: "Plum.",
    hint: "Late-night violet, soft and moody.",
    premium: true,
    swatch: ["#100b1d", "#25163b", "#b58bea"],
  },
  {
    key: "noir",
    name: "Noir.",
    hint: "Pure monochrome. Nothing but contrast.",
    premium: true,
    swatch: ["#070707", "#151515", "#f1f1ef"],
  },
];

export const DEFAULT_THEME: ThemeKey = "ember";

export function isValidTheme(v: string): v is ThemeKey {
  return THEMES.some((t) => t.key === v);
}

export function isPremiumTheme(v: string): boolean {
  return THEMES.some((t) => t.key === v && t.premium);
}
