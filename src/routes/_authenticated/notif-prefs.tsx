import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BellOff, ChevronLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  getWebNotificationPermission,
  requestWebNotificationPermission,
} from "@/components/WebInboxNotifications";

export const Route = createFileRoute("/_authenticated/notif-prefs")({
  head: () => ({ meta: [{ title: "Notifications · SameThing." }] }),
  component: NotifPrefsPage,
});

type PrefKey =
  | "same"
  | "nah"
  | "comment"
  | "like"
  | "quote_activity"
  | "mention"
  | "only_one"
  | "follow"
  | "system";
type Prefs = {
  same: boolean;
  nah: boolean;
  comment: boolean;
  like: boolean;
  quote_activity: boolean;
  mention: boolean;
  only_one: boolean;
  follow: boolean;
  system: boolean;
};

const DEFAULTS: Prefs = {
  same: true,
  nah: true,
  comment: true,
  like: true,
  quote_activity: true,
  mention: true,
  only_one: true,
  follow: true,
  system: true,
};

const ITEMS: Array<{ key: PrefKey; label: string; hint: string }> = [
  {
    key: "same",
    label: "Same votes",
    hint: "When someone relates to one of your Things.",
  },
  {
    key: "nah",
    label: "Nah votes",
    hint: "When someone votes Nah on one of your Things.",
  },
  {
    key: "like",
    label: "Likes",
    hint: "Likes on your Things.",
  },
  {
    key: "comment",
    label: "New comments & replies",
    hint: "Comments on your things and replies to yours.",
  },
  {
    key: "quote_activity",
    label: "Quote activity",
    hint: "New comments and likes on your Quotes.",
  },
  {
    key: "mention",
    label: "Mentions (@username)",
    hint: "When someone tags you in a thing or comment.",
  },
  { key: "only_one", label: "“You're the only one”", hint: "When your thing becomes rare." },
  {
    key: "follow",
    label: "People you watch",
    hint: "When someone you keep an eye on drops something new.",
  },
  {
    key: "system",
    label: "System messages",
    hint: "Warnings, replies from support, announcements. Always on.",
  },
];

const RETENTION_OPTIONS = [
  { hours: 24, label: "24h" },
  { hours: 168, label: "7d" },
  { hours: 360, label: "15d" },
  { hours: 720, label: "30d" },
] as const;

function NotifPrefsPage() {
  const { profile, refreshProfile } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [retentionHours, setRetentionHours] = useState(720);
  const [saving, setSaving] = useState(false);
  const [webPermission, setWebPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );

  useEffect(() => {
    const refreshPermission = () => setWebPermission(getWebNotificationPermission());
    refreshPermission();
    window.addEventListener("focus", refreshPermission);
    document.addEventListener("visibilitychange", refreshPermission);
    return () => {
      window.removeEventListener("focus", refreshPermission);
      document.removeEventListener("visibilitychange", refreshPermission);
    };
  }, []);

  useEffect(() => {
    const p = profile as {
      notification_prefs?: Partial<Prefs>;
      notification_retention_hours?: number;
    } | null;
    if (p) {
      setPrefs({ ...DEFAULTS, ...(p.notification_prefs ?? {}) });
      if ([24, 168, 360, 720].includes(Number(p.notification_retention_hours))) {
        setRetentionHours(Number(p.notification_retention_hours));
      }
    }
  }, [profile]);

  const save = async (nextPrefs: Prefs, nextRetentionHours: number) => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        notification_prefs: nextPrefs,
        notification_retention_hours: nextRetentionHours,
      } as never)
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save notification settings.");
      return false;
    }
    void refreshProfile();
    return true;
  };

  const toggle = async (key: PrefKey) => {
    if (key === "system") return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    const ok = await save(next, retentionHours);
    if (!ok) setPrefs(prefs);
  };

  const selectRetention = async (hours: number) => {
    const previous = retentionHours;
    setRetentionHours(hours);
    const ok = await save(prefs, hours);
    if (!ok) setRetentionHours(previous);
  };

  return (
    <OnboardingGate>
      <AppShell>
        <Link
          to="/settings"
          className="mb-4 inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> back to settings
        </Link>
        <h1 className="brand-mark text-3xl text-foreground">
          Notifications<span className="dot">.</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          what reaches you
        </p>

        {webPermission !== "granted" && (
          <section className="mt-5 rounded-3xl border border-accent/25 bg-accent/5 p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-accent/30 bg-accent/10 text-accent">
                <BellOff className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">Web app notifications</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Show new Inbox items as browser or installed-app notifications. Your category
                  choices above still apply.
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-accent">
                  {webPermission === "denied"
                    ? "blocked in browser settings"
                    : webPermission === "unsupported"
                      ? "not supported by this browser"
                      : "not enabled"}
                </p>
              </div>
            </div>
            {webPermission !== "unsupported" && (
              <button
                type="button"
                onClick={async () => {
                  const next = await requestWebNotificationPermission();
                  setWebPermission(next);
                  if (next === "granted") toast.success("Web app notifications enabled.");
                  else if (next === "denied")
                    toast.error("Allow notifications in browser settings.");
                }}
                className="mt-4 w-full rounded-full border border-accent/40 bg-background px-4 py-2.5 text-xs uppercase tracking-[0.12em] text-accent transition-colors hover:bg-accent/10"
              >
                Enable web notifications
              </button>
            )}
          </section>
        )}

        <section className="mt-5 space-y-3">
          {ITEMS.map((item) => {
            const checked = item.key === "system" ? true : prefs[item.key];
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 rounded-3xl border border-border/80 bg-card p-5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                </div>
                <Switch
                  checked={checked}
                  onCheckedChange={() => void toggle(item.key)}
                  aria-label={item.label}
                  disabled={saving || item.key === "system"}
                  className="h-5 w-9 border-transparent data-[state=checked]:bg-accent data-[state=unchecked]:bg-background"
                />
              </div>
            );
          })}
        </section>

        <section className="mt-5 rounded-3xl border border-border/80 bg-card p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Keep notifications for
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {RETENTION_OPTIONS.map((option) => (
              <button
                key={option.hours}
                type="button"
                onClick={() => void selectRetention(option.hours)}
                disabled={saving}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  retentionHours === option.hours
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Older notifications are cleared automatically. Default is 30 days.
          </p>
        </section>

        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          Turning something off hides those items from your Inbox and stops web-app alerts for that
          category. You&apos;ll still see aggregate counts on your things. Browser permission can
          also be revoked at any time from the site settings in your browser.
        </p>
      </AppShell>
    </OnboardingGate>
  );
}
