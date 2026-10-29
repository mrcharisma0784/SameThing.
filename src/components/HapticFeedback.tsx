import { useEffect } from "react";
import { areHapticsEnabled, pulseHaptic, subscribeToHapticsPreference } from "@/lib/haptics";

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
    let previousSelectionText = "";
    let pendingSelectionPulses = 0;
    let selectionTimer: number | undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") vibrateForControl(event.target);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.repeat && (event.key === "Enter" || event.key === " ")) {
        vibrateForControl(event.target);
      }
    };
    const onSelectionChange = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString() ?? "";
      if (!areHapticsEnabled() || selectedText.length === 0) {
        previousSelectionText = selectedText;
        pendingSelectionPulses = 0;
        if (selectionTimer !== undefined) window.clearTimeout(selectionTimer);
        selectionTimer = undefined;
        return;
      }
      let commonPrefix = 0;
      while (
        commonPrefix < previousSelectionText.length &&
        commonPrefix < selectedText.length &&
        previousSelectionText[commonPrefix] === selectedText[commonPrefix]
      ) {
        commonPrefix += 1;
      }
      let commonSuffix = 0;
      while (
        commonSuffix < previousSelectionText.length - commonPrefix &&
        commonSuffix < selectedText.length - commonPrefix &&
        previousSelectionText[previousSelectionText.length - commonSuffix - 1] ===
          selectedText[selectedText.length - commonSuffix - 1]
      ) {
        commonSuffix += 1;
      }
      const difference =
        previousSelectionText.length -
        commonPrefix -
        commonSuffix +
        selectedText.length -
        commonPrefix -
        commonSuffix;
      previousSelectionText = selectedText;
      // Pace character pulses and bound exceptionally large whole-page selections.
      pendingSelectionPulses = Math.min(256, pendingSelectionPulses + difference);
      if (selectionTimer !== undefined || pendingSelectionPulses === 0) return;
      const pulseNextCharacter = () => {
        if (!areHapticsEnabled() || pendingSelectionPulses <= 0) {
          selectionTimer = undefined;
          return;
        }
        pulseHaptic(6);
        pendingSelectionPulses -= 1;
        selectionTimer =
          pendingSelectionPulses > 0 ? window.setTimeout(pulseNextCharacter, 25) : undefined;
      };
      selectionTimer = window.setTimeout(pulseNextCharacter, 0);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("selectionchange", onSelectionChange);
    const unsubscribePreference = subscribeToHapticsPreference(() => {
      if (!areHapticsEnabled()) {
        pendingSelectionPulses = 0;
        if (selectionTimer !== undefined) window.clearTimeout(selectionTimer);
        selectionTimer = undefined;
      }
    });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("selectionchange", onSelectionChange);
      unsubscribePreference();
      if (selectionTimer !== undefined) window.clearTimeout(selectionTimer);
    };
  }, []);

  return null;
}
