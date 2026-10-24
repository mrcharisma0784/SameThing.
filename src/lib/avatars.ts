// Profile icons. `premium` ones are only selectable on PremiumThing.
export type Avatar = { char: string; premium: boolean };

const P = (char: string): Avatar => ({ char, premium: true });
const F = (char: string): Avatar => ({ char, premium: false });

export const AVATARS: Avatar[] = [
  // 1-4 → premium
  P("✦"), P("✧"), P("✺"), P("✶"),
  // free set
  F("✷"), F("✸"), F("✹"), F("❂"), F("◉"), F("◐"), F("◑"), F("◒"),
  F("✿"), F("❀"), F("❁"), F("❃"), F("❄"), F("❅"), F("❆"), F("❉"),
  F("❋"), F("✤"), F("✥"), F("✻"), F("✼"), F("❖"), F("◈"), F("◇"),
  F("△"), F("▽"), F("◍"), F("☾"), F("☼"), F("⚘"),
  // a few beautiful premium picks
  P("❦"), P("⚜"), P("✵"),
  // second-to-last → premium
  P("✩"), F("☘"),
];

export const DEFAULT_AVATAR = "✷";

export function isPremiumAvatar(char: string): boolean {
  return AVATARS.some((a) => a.char === char && a.premium);
}
