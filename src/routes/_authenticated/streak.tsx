import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CalendarCheck2,
  Check,
  Flame,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { useAuth } from "@/hooks/use-auth";
import { getStreakOverview, purchaseStreakFreeze, startStreak } from "@/lib/api/streak.functions";
import { getSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import { effectivePlan } from "@/lib/premium";
import { isLabThingActive } from "@/lib/test-user";

export const Route = createFileRoute("/_authenticated/streak")({
  head: () => ({
    meta: [
      { title: "Streak · SameThing." },
      { name: "description", content: "Return each day and keep your SameThing. Streak alive." },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/streak") }],
  }),
  component: StreakPage,
});

function StreakPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const begin = useServerFn(startStreak);
  const buyFreeze = useServerFn(purchaseStreakFreeze);
  const getOverview = useServerFn(getStreakOverview);
  const [celebrating, setCelebrating] = useState(false);

  const {
    data: streak,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["streak", "overview", profile?.id],
    queryFn: () => getOverview({ data: {} }),
    enabled: Boolean(profile),
    staleTime: 60_000,
  });
  const startMutation = useMutation({
    mutationFn: () => begin({ data: {} }),
    onSuccess: (next) => {
      queryClient.setQueryData(["streak", "overview", profile?.id], next);
      void queryClient.invalidateQueries({ queryKey: ["achievements"] });
      if (next.extended_today) {
        setCelebrating(true);
        window.setTimeout(() => setCelebrating(false), 1200);
      }
    },
  });

  const nextMilestone = streak?.next_milestone ?? 3;
  const current = streak?.current_streak ?? 0;
  const isStarted = streak?.is_started ?? false;
  const lastCheckin = streak?.last_checkin_date
    ? new Date(`${streak.last_checkin_date}T00:00:00Z`).getTime()
    : 0;
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const daysSinceCheckin = lastCheckin
    ? Math.floor((todayStart.getTime() - lastCheckin) / 86_400_000)
    : Infinity;
  const flameActive = isStarted && daysSinceCheckin <= 1;
  const isLab = isLabThingActive(profile);
  const hasPremiumProtection = effectivePlan(profile) === "premium" || isLab;
  const freezeTotal = hasPremiumProtection ? 3 : (streak?.freeze_purchased_count ?? 0);
  const freezeMutation = useMutation({
    mutationFn: (count: number) => buyFreeze({ data: { count } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["streak", "overview", profile?.id] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
  const progress = useMemo(
    () => Math.min(100, Math.round((current / Math.max(nextMilestone, 1)) * 100)),
    [current, nextMilestone],
  );

  return (
    <OnboardingGate>
      <AppShell>
        <Link
          to="/settings"
          className="mb-4 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> settings
        </Link>

        <header className="relative overflow-hidden rounded-[2rem] border border-accent/30 bg-card px-5 py-6 sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-accent/15" />
          <div className="pointer-events-none absolute right-3 top-3 h-32 w-32 rounded-full border border-accent/10" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-accent">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.7} /> return to the room
              </p>
              <h1 className="brand-mark text-4xl text-foreground sm:text-5xl">
                Streak<span className="dot">.</span>
              </h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                One small visit each day. Keep the quiet flame moving forward.
              </p>
            </div>
            <span
              className={cn(
                "streak-flame grid h-16 w-16 shrink-0 place-items-center rounded-[1.5rem] border sm:h-20 sm:w-20",
                flameActive && "streak-flame-active",
                celebrating && "streak-flame-complete",
              )}
              aria-label={`${current} day Streak`}
            >
              <Flame className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.45} />
            </span>
          </div>
        </header>

        {isLoading && (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-3xl border border-border bg-card px-5 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-accent" /> Loading your flame…
          </div>
        )}

        {isError && (
          <div className="mt-5 rounded-3xl border border-destructive/25 bg-card px-5 py-8 text-center">
            <p className="font-serif text-xl italic text-foreground">
              The flame could not be reached.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try opening Streak again in a moment.
            </p>
          </div>
        )}

        {!isLoading && !isError && streak && (
          <>
            <section className="mt-5 rounded-3xl border border-accent/25 bg-card p-5 sm:p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    your current flame
                  </p>
                  <p className="mt-1 font-serif text-5xl italic leading-none text-foreground sm:text-6xl">
                    {current}
                    <span className="ml-2 text-xl not-italic text-muted-foreground">
                      {current === 1 ? "day" : "days"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span>Next ember</span>
                  <span>
                    {current} / {nextMilestone} days
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-[color:var(--rare)] transition-[width] duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {!isStarted
                    ? "Your flame starts at zero. Begin whenever you are ready."
                    : nextMilestone - current === 1
                      ? "One more day and the next milestone is yours."
                      : `${nextMilestone - current} days until the next milestone.`}
                </p>
                {!isStarted && (
                  <button
                    type="button"
                    onClick={() => startMutation.mutate()}
                    disabled={startMutation.isPending}
                    className="pressable mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-medium text-accent-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {startMutation.isPending ? "Starting…" : "Start my Streak"}
                  </button>
                )}
                {startMutation.isError && (
                  <p className="mt-3 text-xs text-destructive">
                    We could not start your Streak. Please try again.
                  </p>
                )}
              </div>
            </section>

            <section className="mt-4 grid grid-cols-3 gap-2">
              <StreakMetric label="Current" value={current} />
              <StreakMetric label="Best" value={streak.best_streak} />
              <StreakMetric label="Returns" value={streak.total_checkins} />
            </section>

            <section className="mt-5 rounded-3xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--rare)]/30 bg-[color:var(--rare)]/10 text-[color:var(--rare)]">
                    <ShieldCheck className="h-5 w-5" strokeWidth={1.6} />
                  </span>
                  <div>
                    <h2 className="font-serif text-2xl italic text-foreground">Streak Freeze</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Protect one missed UTC day without losing your chain.
                    </p>
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-xs tabular-nums text-foreground"
                  aria-label={`${freezeTotal} total freezes, ${streak.freeze_balance} remaining`}
                >
                  {freezeTotal}/{streak.freeze_balance}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Premium and LabThing. accounts receive up to three Freezes. Other accounts can buy
                up to three for 30 Same Credits each.
              </p>
              {streak.freeze_balance < 3 && hasPremiumProtection && (
                <p className="mt-3 text-xs text-accent">
                  Your Premium pass included three Freezes; used protection is not automatically
                  replenished.
                </p>
              )}
              {!hasPremiumProtection && streak.freeze_purchased_count < 3 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {[1, Math.min(3, 3 - streak.freeze_purchased_count)]
                    .filter((value, index, values) => values.indexOf(value) === index)
                    .map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => freezeMutation.mutate(count)}
                        disabled={freezeMutation.isPending || !isStarted}
                        className="pressable rounded-full border border-accent/35 bg-accent/10 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {freezeMutation.isPending
                          ? "Adding…"
                          : `Add ${count} · ${count * 30} Credits`}
                      </button>
                    ))}
                </div>
              )}
              {!isStarted && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Start your Streak first to add a Freeze.
                </p>
              )}
              {freezeMutation.isError && (
                <p className="mt-3 text-xs text-destructive">{freezeMutation.error.message}</p>
              )}
            </section>

            <section className="mt-5 rounded-3xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-background text-accent">
                  <CalendarCheck2 className="h-5 w-5" strokeWidth={1.6} />
                </span>
                <div>
                  <h2 className="font-serif text-2xl italic text-foreground">
                    Keep the chain warm.
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    After you start, your daily visit is recorded automatically when you open this
                    page.
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                <StreakRule>
                  Start whenever you are ready; your first check-in is day one.
                </StreakRule>
                <StreakRule>After starting, return once every UTC day to continue.</StreakRule>
                <StreakRule>
                  Missing a day resets the current flame unless a Freeze protects that day.
                </StreakRule>
                <StreakRule>
                  Milestones stay with you and can be claimed in Achievements.
                </StreakRule>
              </div>
            </section>
          </>
        )}
      </AppShell>
    </OnboardingGate>
  );
}

function StreakMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl italic text-foreground">{value}</p>
    </div>
  );
}

function StreakRule({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.8} />
      <span>{children}</span>
    </p>
  );
}
