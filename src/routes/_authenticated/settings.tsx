import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OnboardingGate } from "@/components/OnboardingGate";
import { Bell, ShieldCheck, MessageSquareText, HelpCircle, LogOut, CreditCard, SlidersHorizontal } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { sendFeedback } from "@/lib/api/feedback.functions";
import { updateMyProfile } from "@/lib/api/me.functions";
import { THEMES, DEFAULT_THEME } from "@/lib/themes";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings · SameThing." },
      { name: "description", content: "Manage your SameThing. account preferences." },
    ],
    links: [{ rel: "canonical", href: "https://samething.lovable.app/settings" }],
  }),
  component: SettingsPage,
});

const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" }, { code: "tr", label: "Türkçe" }, { code: "es", label: "Español" },
  { code: "fr", label: "Français" }, { code: "de", label: "Deutsch" }, { code: "pt", label: "Português" },
  { code: "it", label: "Italiano" }, { code: "ru", label: "Русский" }, { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" }, { code: "bn", label: "বাংলা" }, { code: "ur", label: "اردو" },
  { code: "id", label: "Bahasa Indonesia" }, { code: "ms", label: "Bahasa Melayu" }, { code: "vi", label: "Tiếng Việt" },
  { code: "th", label: "ไทย" }, { code: "fa", label: "فارسی" }, { code: "pl", label: "Polski" },
  { code: "nl", label: "Nederlands" }, { code: "sv", label: "Svenska" }, { code: "uk", label: "Українська" },
  { code: "el", label: "Ελληνικά" }, { code: "he", label: "עברית" },
  { code: "ja", label: "日本語" }, { code: "ko", label: "한국어" }, { code: "zh", label: "中文" },
];

function SettingsPage() {
  const navigate = useNavigate();
  const { profile, refreshProfile, signOut } = useAuth();
  const [language, setLanguage] = useState(profile?.language || "en");
  const [saving, setSaving] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const sendFn = useServerFn(sendFeedback);
  const updateFn = useServerFn(updateMyProfile);
  const isPremium = (profile?.plan ?? "free") === "premium";
  const theme = profile?.theme ?? DEFAULT_THEME;

  const pickTheme = async (key: string, premium: boolean) => {
    if (premium && !isPremium) { toast.error("That theme is PremiumThing. only."); return; }
    const res = await updateFn({ data: { theme: key } });
    if (res.error) { toast.error(res.error); return; }
    toast.success("Theme applied.");
    await refreshProfile();
  };
  const feedbackRef = useRef<HTMLDivElement>(null);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ language }).eq("id", profile.id);
    setSaving(false);
    if (error) toast.error("Couldn't save.");
    else { toast.success("Saved."); await refreshProfile(); }
  };

  const openFeedback = () => {
    setFeedbackOpen(true);
    setTimeout(() => {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };

  const submitFeedback = async () => {
    if (feedback.trim().length < 3) { toast.error("A little more, please."); return; }
    setSending(true);
    const res = await sendFn({ data: { message: feedback.trim(), user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : "" } });
    setSending(false);
    if (res.error) { toast.error(res.error); return; }
    setFeedback(""); setFeedbackOpen(false);
    toast.success("Thanks — we read every one.");
  };

  return (
    <OnboardingGate>
      <AppShell>
        <h1 className="brand-mark text-3xl text-foreground">Settings<span className="dot">.</span></h1>

        <section className="mt-5 space-y-2">
          <Row icon={<Bell className="h-4 w-4" />} label="Notifications" hint="What you want to hear about" onClick={() => navigate({ to: "/notif-prefs" })} />
          <Row icon={<ShieldCheck className="h-4 w-4" />} label="Account & privacy" hint="Email, password, mentions, messages, delete" onClick={() => navigate({ to: "/account" })} />
          <Row icon={<CreditCard className="h-4 w-4" />} label="Subscription & payment" hint="PremiumThing. plans, themes & icons" onClick={() => navigate({ to: "/premium" })} />
          <Row icon={<MessageSquareText className="h-4 w-4" />} label="Send feedback" hint="Bugs, ideas, love — reaches us directly" onClick={openFeedback} />
          <Row icon={<SlidersHorizontal className="h-4 w-4" />} label="Feed filters" hint="Tag pills on your feed — add, remove, reorder" onClick={() => navigate({ to: "/feed-prefs" })} />
          <Row icon={<HelpCircle className="h-4 w-4" />} label="FAQ" hint="How SameThing. works" onClick={() => navigate({ to: "/faq" })} />
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Feed language</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`rounded-full border px-3 py-1.5 text-xs tracking-wide ${language === l.code ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground"}`}
              >{l.label}</button>
            ))}
          </div>
          <Button onClick={save} disabled={saving} className="mt-4 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? "Saving…" : "Save"}
          </Button>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Theme</Label>
          <p className="mt-1 text-xs text-muted-foreground">Applies everywhere you use SameThing.</p>
          <div className="mt-3 space-y-2">
            {THEMES.map((t) => {
              const locked = t.premium && !isPremium;
              const selected = theme === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => pickTheme(t.key, t.premium)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${selected ? "border-accent bg-accent/10" : "border-border hover:bg-secondary/40"}`}
                >
                  <span className="flex shrink-0 gap-1">
                    {t.swatch.map((c) => (
                      <span key={c} className="h-6 w-3 rounded-sm border border-border" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="brand-mark text-base text-foreground">{t.name}</span>
                      {t.premium && (
                        <span className="rounded-full bg-[color:var(--rare)]/15 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-[color:var(--rare)]">
                          ✦ Premium
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground">{t.hint}</span>
                  </span>
                  {locked ? <Lock className="h-3.5 w-3.5 shrink-0 text-[color:var(--rare)]" /> : selected ? <span className="text-accent">✓</span> : null}
                </button>
              );
            })}
          </div>
          {!isPremium && (
            <Link to="/premium" className="mt-3 block text-center text-xs text-accent underline-offset-2 hover:underline">
              Unlock themes with PremiumThing.
            </Link>
          )}
        </section>

        <button
          onClick={async () => { await signOut(); navigate({ to: "/" }); }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>

        {feedbackOpen && (
          <section ref={feedbackRef} className="mt-5 rounded-2xl border border-accent/40 bg-card p-4">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Your feedback</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value.slice(0, 2000))}
              placeholder="What's on your mind? Bugs, ideas, love…"
              className="mt-2 min-h-[120px] bg-background"
              autoFocus
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => { setFeedbackOpen(false); setFeedback(""); }}>Cancel</Button>
              <Button onClick={submitFeedback} disabled={sending} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                {sending ? "Sending…" : "Send"}
              </Button>
            </div>
          </section>
        )}

        <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Terms</Link> ·{" "}
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link> ·{" "}
          <Link to="/faq" className="hover:text-foreground">FAQ</Link>
        </p>
      </AppShell>
    </OnboardingGate>
  );
}

function Row({ icon, label, hint, onClick, disabled }: { icon: React.ReactNode; label: string; hint: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/40 disabled:opacity-50"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-background text-muted-foreground">{icon}</div>
        <div>
          <p className="text-sm text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <span className="text-muted-foreground">›</span>
    </button>
  );
}
