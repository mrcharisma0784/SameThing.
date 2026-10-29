const HAPTICS_STORAGE_KEY = "samething:haptics-enabled:v1";
const HAPTICS_CHANGE_EVENT = "samething:haptics-preference-change";

export function areHapticsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(HAPTICS_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(HAPTICS_STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Keep the preference for this page session even when storage is unavailable.
  }
  window.dispatchEvent(new Event(HAPTICS_CHANGE_EVENT));
}

export function subscribeToHapticsPreference(callback: () => void): () => void {
  window.addEventListener(HAPTICS_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(HAPTICS_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function pulseHaptic(duration = 8): void {
  if (
    !areHapticsEnabled() ||
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  ) {
    return;
  }
  try {
    navigator.vibrate(duration);
  } catch {
    // The Web Vibration API is optional and may be unavailable or restricted.
  }
}
