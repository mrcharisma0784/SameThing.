import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notif-prefs")({
  head: () => ({ meta: [{ title: "Notifications · SameThing." }] }),
  component: NotifPrefsPage,
});

type Prefs = {
  same: boolean; nah: boolean; comment: boolean;
  mention: boolean; only_one: boolean; system: boolean;
};
const DEFAULTS: Prefs = { same: true, nah: true, comment: true, mention: true, only_one: true, system: true };

const ITEMS: Array<{ key: keyof Prefs; label: string; hint: string }> = [
  { key: "same",     label: "Someone said Same",       hint: "When a stranger agrees with your thing." },
  { key: "nah",      label: "Someone said Nah",        hint: "When someone disagrees." },
  { key: "comment",  label: "New comments & replies",  hint: "Comments on your things and replies to yours." },
  { key: "mention",  label: "Mentions (@username)",    hint: "When someone tags you in a thing or comment." },
  { key: "only_one", label: "\u201cYou're the only one\u201d", hint: "When your thing becomes rare." },
  { key: "system",   label: "System messages",         hint: "Warnings, replies from support, announcements. Always on." },
];

function NotifPrefsPage() {
  const { profile, refreshProfile } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = (profile as { notification_prefs?: Partial<Prefs> } | null)?.notification_prefs;
    if (p) setPrefs({ ...DEFAULTS, ...p });
  }, [profile]);

  const toggle = async (k: keyof Prefs) => {
    if (!profile) return;
    if (k === "system") { toast.info("System messages can't be turned off."); return; }
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ notification_prefs: next } as never).eq("id", profile.id);
    setSaving(false);
    if (error) { toast.error("Couldn't save."); setPrefs(prefs); }
    else { void refreshProfile(); }
  };

  return (
    <OnboardingGate>
      <AppShell>
        <Link to="/settings" className="mb-3 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" /> settings
        </Link>
        <h1 className="brand-mark text-3xl text-foreground">Notifications<span className="dot">.</span></h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">what reaches you</p>

        <section className="mt-5 space-y-2">
          {ITEMS.map((it) => (
            <div key={it.key} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0">
                <p className="text-sm text-foreground">{it.label}</p>
                <p className="text-xs text-muted-foreground">{it.hint}</p>
              </div>
              <button
                role="switch"
                aria-checked={it.key === "system" ? true : prefs[it.key]}
                aria-label={it.label}
                onClick={() => toggle(it.key)}
                disabled={saving || it.key === "system"}
                className={`h-6 w-11 shrink-0 rounded-full border transition-colors ${(it.key === "system" ? true : prefs[it.key]) ? "border-accent bg-accent" : "border-border bg-background"} ${it.key === "system" ? "opacity-60" : ""}`}
              >
                <span className={`block h-4 w-4 rounded-full bg-card shadow transition-transform ${(it.key === "system" ? true : prefs[it.key]) ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </section>

        <p className="mt-6 text-xs text-muted-foreground">
          Turning something off hides those items from your Inbox and stops in-app toasts. You'll still see aggregate counts on your things.
        </p>
      </AppShell>
    </OnboardingGate>
  );
}
