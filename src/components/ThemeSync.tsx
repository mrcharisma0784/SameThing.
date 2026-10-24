import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DEFAULT_THEME, isPremiumTheme, isValidTheme } from "@/lib/themes";

/**
 * Applies the signed-in user's theme (PremiumThing. feature) to <html>.
 * Falls back to the original "ember" theme for free accounts / guests.
 */
export function ThemeSync() {
  const { profile } = useAuth();
  const raw = profile?.theme ?? DEFAULT_THEME;
  const plan = profile?.plan ?? "free";
  const theme =
    isValidTheme(raw) && !(isPremiumTheme(raw) && plan !== "premium") ? raw : DEFAULT_THEME;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme !== "paper");
  }, [theme]);

  return null;
}
