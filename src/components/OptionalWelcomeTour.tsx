import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProfileGlyph } from "@/components/ProfileGlyph";
import { useAuth } from "@/hooks/use-auth";
import { completeServiceTour } from "@/lib/api/me.functions";

const STEPS = [
  {
    icon: "✦",
    title: "PremiumThing.",
    body: "Themes, extra icons, AI tag suggestions, Boost MyThing. and Find my twin. Invite friends from Settings › Reference to earn days free.",
  },
  {
    icon: "✧",
    title: "Inbox & Search.",
    body: "Inbox collects votes, comments and mentions. Search finds things by text, title or tag — and people with @username.",
  },
  {
    icon: "❂",
    title: "RareThing.",
    body: "If almost nobody says Same, your thing becomes rare — and if it holds, it is locked in permanently on your profile.",
  },
  {
    icon: "✵",
    title: "Anonymous by default off.",
    body: "You choose per thing whether your username shows. You can flip it later from the card menu, or close comments entirely.",
  },
  {
    icon: "◈",
    title: "Same or Nah.",
    body: "Others vote Same if they feel it too, Nah if they do not. The similarity score only unlocks after you have voted.",
  },
  {
    icon: "✦",
    title: "One thing at a time.",
    body: "SameThing. is for the small, strange things you assume nobody else feels. Drop one, and the world answers.",
  },
] as const;

export function OptionalWelcomeTour() {
  const { user, profile, refreshProfile } = useAuth();
  const complete = useServerFn(completeServiceTour);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const localGuideSeen = Boolean(
    typeof window !== "undefined" &&
    user &&
    window.localStorage.getItem(`samething:guide-shown:${user.id}`) === "1",
  );
  const eligible = Boolean(
    user &&
    profile?.onboarded_at &&
    profile?.demographics_completed_at &&
    !profile?.tour_completed_at &&
    !localGuideSeen,
  );

  useEffect(() => {
    if (eligible && user && typeof window !== "undefined") {
      window.localStorage.setItem(`samething:guide-shown:${user.id}`, "1");
    }
  }, [eligible, user]);

  useEffect(() => {
    if (!eligible) {
      setDismissed(false);
      setStep(0);
    }
  }, [eligible]);

  useEffect(() => {
    const dismissOnTextSelection = () => {
      if (window.getSelection()?.toString().trim()) setDismissed(true);
    };
    document.addEventListener("selectionchange", dismissOnTextSelection);
    return () => document.removeEventListener("selectionchange", dismissOnTextSelection);
  }, []);

  if (!eligible || dismissed) return null;
  const current = STEPS[step];

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    const result = await complete({ data: undefined });
    setSaving(false);
    setDismissed(true);
    if (!result.error) await refreshProfile();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) void finish();
      }}
    >
      <DialogContent
        className="[&>button:last-child]:hidden fixed bottom-3 left-1/2 top-auto z-50 grid w-[calc(100%-1.5rem)] max-w-[440px] translate-x-[-50%] translate-y-0 gap-0 overflow-hidden rounded-[1.35rem] border-border bg-card p-0 shadow-2xl sm:bottom-6"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <div className="p-4 pb-[calc(0.85rem+env(safe-area-inset-bottom))] sm:p-5 sm:pb-5">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => void finish()}
              aria-label="Close guide"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-xl border border-border bg-background text-lg text-accent">
            <ProfileGlyph value={current.icon} className="h-6 w-6" />
          </div>

          <h2 className="mt-3 max-w-[34rem] font-serif text-[1.45rem] italic leading-tight text-foreground sm:text-[1.6rem]">
            {current.title}
          </h2>
          <p className="mt-2 max-w-[36rem] text-[13px] leading-5 text-muted-foreground sm:text-sm">
            {current.body}
          </p>

          <div className="mt-4 flex gap-2" aria-label={`Guide step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((item, index) => (
              <span
                key={item.title}
                className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-accent" : "bg-background"}`}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep((value) => Math.max(0, value - 1))}
              disabled={step === 0 || saving}
              className="pressable inline-flex h-9 items-center gap-1 rounded-full border border-border bg-background px-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground disabled:opacity-35"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={() => void finish()}
              disabled={saving}
              className="pressable -ml-1 inline-flex h-9 items-center rounded-full border border-border bg-background px-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground disabled:opacity-50"
            >
              Skip
            </button>
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={() => setStep((value) => value + 1)}
                disabled={saving}
                className="pressable ml-auto h-9 rounded-full bg-accent px-3.5 text-xs font-medium text-accent-foreground hover:bg-accent/90"
              >
                Next <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void finish()}
                disabled={saving}
                className="pressable ml-auto h-9 rounded-full bg-accent px-3.5 text-xs font-medium text-accent-foreground hover:bg-accent/90"
              >
                {saving ? "Saving…" : "Start"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
