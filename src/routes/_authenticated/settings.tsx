import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OnboardingGate } from "@/components/OnboardingGate";
import {
  Bell,
  ShieldCheck,
  MessageSquareText,
  HelpCircle,
  LogOut,
  CreditCard,
  Flame,
  SlidersHorizontal,
  Users,
  Share2,
  LifeBuoy,
  Hourglass,
  Medal,
  Trophy,
  Coins,
  FlaskConical,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { sendFeedback } from "@/lib/api/feedback.functions";
import { getAchievementOverview } from "@/lib/api/achievements.functions";
import { getSiteUrl } from "@/lib/site-url";
import { getMaintenanceStatus } from "@/lib/api/maintenance.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings · SameThing." },
      { name: "description", content: "Manage your SameThing. account preferences." },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/settings") }],
  }),
  component: SettingsPage,
});

const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "it", label: "Italiano" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
  { code: "bn", label: "বাংলা" },
  { code: "ur", label: "اردو" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "th", label: "ไทย" },
  { code: "fa", label: "فارسی" },
  { code: "pl", label: "Polski" },
  { code: "nl", label: "Nederlands" },
  { code: "sv", label: "Svenska" },
  { code: "uk", label: "Українська" },
  { code: "el", label: "Ελληνικά" },
  { code: "he", label: "עברית" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
];

function SettingsPage() {
  const navigate = useNavigate();
  const { profile, refreshProfile, signOut } = useAuth();
  const [language, setLanguage] = useState(profile?.language || "en");
  const [languagesExpanded, setLanguagesExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const achievementOverviewFn = useServerFn(getAchievementOverview);
  const maintenanceStatusFn = useServerFn(getMaintenanceStatus);
  const { data: maintenanceStatus } = useQuery({
    queryKey: ["maintenance-status"],
    queryFn: () => maintenanceStatusFn(),
    staleTime: 20_000,
  });
  const { data: achievementOverview } = useQuery({
    queryKey: ["achievements", "overview"],
    queryFn: () => achievementOverviewFn(),
    staleTime: 30_000,
  });
  const hasUnclaimedAchievement = Boolean(
    achievementOverview?.items?.some((item) => item.claimable),
  );
  const isMaintenancePaused = (path: string) =>
    Boolean(
      maintenanceStatus?.enabled ||
      maintenanceStatus?.targets?.some(
        (target) => target.enabled && Boolean(target.path) && path.startsWith(target.path!),
      ),
    );
  const maintenanceAdornment = (path: string) =>
    isMaintenancePaused(path) ? (
      <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
        Maintenance
      </span>
    ) : null;

  useEffect(() => {
    if (profile?.language) setLanguage(profile.language);
  }, [profile?.language]);

  const warningCount = Math.max(0, profile?.warnings_count ?? 0);
  const warningDisplay = Math.min(warningCount, 3);
  const hasActiveMute = Boolean(
    profile?.muted_until && new Date(profile.muted_until).getTime() > Date.now(),
  );
  const record =
    profile?.banned_at || hasActiveMute || warningCount >= 3
      ? {
          label: "Suspended",
          className: "bg-destructive/15 text-destructive",
          message: "Your record has reached the warning limit. Some actions may be suspended.",
        }
      : warningCount === 2
        ? {
            label: "Watch",
            className: "bg-[color:var(--rare)]/15 text-[color:var(--rare)]",
            message: "One more violation may lead to account restrictions.",
          }
        : warningCount === 1
          ? {
              label: "Warning",
              className: "bg-[color:var(--rare)]/15 text-[color:var(--rare)]",
              message: "Please review the community rules before posting again.",
            }
          : {
              label: "Clear",
              className: "bg-emerald-500 text-emerald-950 shadow-sm",
              message: "No warnings. Your record is clean.",
            };

  const compactLanguages = LANGUAGES.slice(0, 8);
  const selectedLanguage = LANGUAGES.find((item) => item.code === language);
  const visibleLanguages = languagesExpanded
    ? LANGUAGES
    : selectedLanguage && !compactLanguages.some((item) => item.code === language)
      ? [...compactLanguages, selectedLanguage]
      : compactLanguages;
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const sendFn = useServerFn(sendFeedback);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ language }).eq("id", profile.id);
    setSaving(false);
    if (error) toast.error("Couldn't save.");
    else {
      toast.success("Saved.");
      await refreshProfile();
    }
  };

  const openFeedback = () => {
    setFeedbackOpen(true);
    setTimeout(() => {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };

  const submitFeedback = async () => {
    if (feedback.trim().length < 3) {
      toast.error("A little more, please.");
      return;
    }
    setSending(true);
    const res = await sendFn({
      data: {
        message: feedback.trim(),
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : "",
      },
    });
    setSending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setFeedback("");
    setFeedbackOpen(false);
    toast.success("Thanks — we read every one.");
  };

  return (
    <OnboardingGate>
      <AppShell>
        <h1 className="brand-mark text-3xl text-foreground">
          Settings<span className="dot">.</span>
        </h1>

        <div className="mt-5 space-y-6 md:grid md:grid-cols-2 md:items-start md:gap-x-8 md:gap-y-8 md:space-y-0">
          <SettingsGroup title="Account settings">
            <Row
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Account & privacy"
              hint="Email, password, mentions & privacy"
              onClick={() => navigate({ to: "/account" })}
            />
            <Row
              icon={<Bell className="h-4 w-4" />}
              label="Notifications"
              hint="Choose what reaches your inbox"
              onClick={() => navigate({ to: "/notif-prefs" })}
            />
            <Row
              icon={<CreditCard className="h-4 w-4" />}
              label="Subscription & payment"
              hint="Plans, themes & Premium features"
              onClick={() => navigate({ to: "/subscription" })}
            />
            <Row
              icon={<Coins className="h-4 w-4" />}
              label="Credit"
              hint="Balance, activity & ways to spend"
              onClick={() => navigate({ to: "/credits" })}
            />
            <Row
              icon={<Share2 className="h-4 w-4" />}
              label="Reference"
              hint={
                isMaintenancePaused("/reference")
                  ? "Temporarily unavailable"
                  : "Invite once · +10 Credits / +5 for them"
              }
              disabled={isMaintenancePaused("/reference")}
              endAdornment={maintenanceAdornment("/reference")}
              onClick={() => navigate({ to: "/reference" })}
            />
            <Row
              icon={<SlidersHorizontal className="h-4 w-4" />}
              label="Appearance"
              hint="Themes & feed filter pills"
              onClick={() => navigate({ to: "/appearance" })}
            />
          </SettingsGroup>

          <SettingsGroup title="Activity & discovery">
            <Row
              icon={<Flame className="h-4 w-4" />}
              label="Streak"
              hint={
                isMaintenancePaused("/streak")
                  ? "Temporarily unavailable"
                  : "Start when you are ready, then return daily"
              }
              disabled={true}
              onClick={() => {}}
            />
            <Row
              icon={<Trophy className="h-4 w-4" />}
              label="Achievements"
              hint={
                isMaintenancePaused("/achievements")
                  ? "Temporarily unavailable"
                  : "One-time, daily & weekly Same Credits"
              }
              disabled={isMaintenancePaused("/achievements")}
              endAdornment={maintenanceAdornment("/achievements")}
              onClick={() => navigate({ to: "/achievements" })}
              topRightAdornment={
                hasUnclaimedAchievement ? (
                  <span
                    aria-label="Unclaimed achievement reward"
                    className="block h-2 w-2 rounded-full bg-accent shadow-[0_0_0_3px_hsl(var(--accent)/0.14)]"
                  />
                ) : null
              }
            />
            <Row
              icon={<Medal className="h-4 w-4" />}
              label="Leaderboard"
              hint={
                isMaintenancePaused("/leaderboard")
                  ? "Temporarily unavailable"
                  : "Weekly leagues for Things, Quotes & People"
              }
              disabled={isMaintenancePaused("/leaderboard")}
              endAdornment={maintenanceAdornment("/leaderboard")}
              onClick={() => navigate({ to: "/leaderboard" })}
            />
            <Row
              icon={<Users className="h-4 w-4" />}
              label="Find my twin"
              hint={
                isMaintenancePaused("/twin")
                  ? "Temporarily unavailable"
                  : "Meet someone who sees things like you"
              }
              disabled={isMaintenancePaused("/twin")}
              endAdornment={maintenanceAdornment("/twin")}
              onClick={() => navigate({ to: "/twin" })}
            />
            <Row
              icon={<Hourglass className="h-4 w-4" />}
              label="Time Capsule"
              hint={
                isMaintenancePaused("/capsules")
                  ? "Temporarily unavailable"
                  : "Seal a Thing for your future self"
              }
              disabled={isMaintenancePaused("/capsules")}
              endAdornment={maintenanceAdornment("/capsules")}
              onClick={() => navigate({ to: "/capsules" })}
            />
          </SettingsGroup>

          <SettingsGroup title="Feedback & support">
            <Row
              icon={<MessageSquareText className="h-4 w-4" />}
              label="Send feedback"
              hint="Bugs, ideas and love — sent directly"
              onClick={openFeedback}
            />
            <Row
              icon={<LifeBuoy className="h-4 w-4" />}
              label="Support"
              hint="Help with account, safety and payments"
              onClick={() => navigate({ to: "/support" })}
            />
            <Row
              icon={<HelpCircle className="h-4 w-4" />}
              label="FAQ"
              hint="Answers about how SameThing. works"
              onClick={() => navigate({ to: "/faq" })}
            />
            {feedbackOpen && (
              <div ref={feedbackRef} className="rounded-2xl border border-accent/40 bg-card p-4">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Your feedback
                </Label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value.slice(0, 2000))}
                  placeholder="What's on your mind? Bugs, ideas, love…"
                  className="mt-2 min-h-[120px] bg-background"
                  autoFocus
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFeedbackOpen(false);
                      setFeedback("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={submitFeedback}
                    disabled={sending}
                    className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {sending ? "Sending…" : "Send"}
                  </Button>
                </div>
              </div>
            )}
          </SettingsGroup>

          <SettingsGroup title="Early access">
            <Row
              icon={<FlaskConical className="h-4 w-4" />}
              label="Test Users"
              hint="Early access trials and feedback"
              disabled={true}
              onClick={() => {}}
            />
          </SettingsGroup>

          <SettingsGroup title="Record status">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest ${record.className}`}
                >
                  {record.label}
                </span>
                <span className="text-sm text-muted-foreground">{warningDisplay}/3 warnings</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{record.message}</p>
            </div>
          </SettingsGroup>

          <SettingsGroup title="Feed language">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap gap-2">
                {visibleLanguages.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => setLanguage(item.code)}
                    className={`rounded-full border px-3 py-1.5 text-xs tracking-wide transition-colors ${language === item.code ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  aria-expanded={languagesExpanded}
                  onClick={() => setLanguagesExpanded((expanded) => !expanded)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs tracking-wide text-muted-foreground hover:text-foreground"
                >
                  {languagesExpanded ? "− less" : "+ more"}
                </button>
              </div>
              <Button
                onClick={save}
                disabled={saving}
                className="mt-5 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </SettingsGroup>
        </div>

        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>

        <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>{" "}
          ·{" "}
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link to="/faq" className="hover:text-foreground">
            FAQ
          </Link>
        </p>
      </AppShell>
    </OnboardingGate>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="px-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({
  icon,
  label,
  hint,
  onClick,
  disabled,
  endAdornment,
  topRightAdornment,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick?: () => void;
  disabled?: boolean;
  endAdornment?: React.ReactNode;
  topRightAdornment?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/40 disabled:opacity-50"
    >
      {topRightAdornment && <span className="absolute right-3 top-3">{topRightAdornment}</span>}
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-background text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate whitespace-nowrap text-sm text-foreground">{label}</p>
          <p className="truncate whitespace-nowrap text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <span className="flex items-center gap-2 text-muted-foreground">
        {endAdornment}
        <span aria-hidden="true">›</span>
      </span>
    </button>
  );
}
