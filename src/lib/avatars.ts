export type Avatar = { char: string; premium: boolean };

const P = (char: string): Avatar => ({ char, premium: true });
const F = (char: string): Avatar => ({ char, premium: false });

// The order is a stable asset contract: existing char values keep their positions when the visual family changes.
// The first row and the first icon of the second row are PremiumThing. only; the remaining catalog is free.
export const AVATARS: Avatar[] = [
  P("✦"),
  P("✧"),
  P("✺"),
  P("✶"),
  P("♨"),
  P("✵"),
  P("☆"),
  P("◇"),
  P("⌘"),
  F("✷"),
  F("✸"),
  F("✹"),
  F("❂"),
  F("⦿"),
  F("✣"),
  F("❧"),
  F("✱"),
  F("✿"),
  F("❀"),
  F("❁"),
  F("❃"),
  F("❄"),
  F("❅"),
  F("❆"),
  F("❉"),
  F("❋"),
  F("✤"),
  F("✥"),
  F("✻"),
  F("✼"),
  F("❖"),
  F("◈"),
  F("⬦"),
  F("△"),
  F("▽"),
  F("⁕"),
  F("☾"),
  F("⬡"),
  F("⚘"),
  F("☘"),
  F("⊙"),
  F("⌂"),
  F("◌"),
  F("⊹"),
  F("▱"),
  F("◍"),
  F("⌁"),
  F("∿"),
  F("⟡"),
];

// The final legacy glyph remains renderable for existing profiles but is no longer selectable.
export const SELECTABLE_AVATARS: Avatar[] = AVATARS.slice(0, -1);

export const DEFAULT_AVATAR = "✹";

export function isPremiumAvatar(char: string): boolean {
  return AVATARS.some((avatar) => avatar.char === char && avatar.premium);
}
