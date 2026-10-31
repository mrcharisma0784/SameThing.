import { useEffect } from "react";
import { pulseHaptic } from "@/lib/haptics";

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "[role='button']",
  "[role='switch']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='menuitemcheckbox']",
  "[role='menuitemradio']",
  "[role='tab']",
  "[role='menuitem']",
  "input[type='checkbox']",
  "input[type='radio']",
  "input[type='range']",
  "input[type='button']",
  "input[type='submit']",
  "input[type='reset']",
  "select",
  "summary",
].join(",");

function findEligibleControl(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  const control = target.closest(INTERACTIVE_SELECTOR);
  if (!control) return null;
  if (control.closest(":disabled, [aria-disabled='true'], [inert], [data-haptic='off']")) {
    return null;
  }
  return control;
}

function vibrateForControl(target: EventTarget | null) {
  if (findEligibleControl(target)) pulseHaptic(10);
}

export function HapticFeedback() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => vibrateForControl(event.target);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.repeat && (event.key === "Enter" || event.key === " ")) {
        vibrateForControl(event.target);
      }
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}
