import { useMemo, useState } from "react";
import { SettingsBackLink } from "@/components/SettingsBackLink";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  CircleUserRound,
  Crown,
  Flame,
  Heart,
  Loader2,
  MessageCircle,
  Quote,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { ProfileGlyph } from "@/components/ProfileGlyph";
import {
  getLeaderboard,
  type LeaderboardCategory,
  type LeaderboardEntry,
  type LeaderboardLeague,
} from "@/lib/api/leaderboard.functions";
import { getSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard · SameThing." },
      { name: "description", content: "Weekly leagues for Things, Quotes and people." },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/leaderboard") }],
  }),
  component: LeaderboardPage,
});

type CategoryFilter = "all" | LeaderboardCategory;

const categoryFilters: Array<{ key: CategoryFilter; label: string; icon: typeof Trophy }> = [
  { key: "all", label: "All leagues", icon: Trophy },
  { key: "thing", label: "Things", icon: BarChart3 },
  { key: "quote", label: "Quotes", icon: Quote },
  { key: "user", label: "People", icon: Users },
];

const categoryCopy: Record<LeaderboardCategory, string> = {
  thing: "Thing league",
  quote: "Quote league",
  user: "People league",
};

function LeaderboardPage() {
  const load = useServerFn(getLeaderboard);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leaderboard", "current-week"],
    queryFn: () => load({ data: {} }),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const leagues = useMemo(
    () => (data?.leagues ?? []).filter((league) => filter === "all" || league.category === filter),
    [data?.leagues, filter],
  );

  return (
    <OnboardingGate>
      <AppShell>
        <SettingsBackLink />

        <header className="relative overflow-hidden rounded-[2rem] border border-accent/25 bg-card px-5 py-6 sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-accent/15" />
          <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full border border-accent/10" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="max-w-xl">
              <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-accent">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.7} /> weekly leagues
              </p>
              <h1 className="brand-mark text-4xl text-foreground sm:text-5xl">
                Leaderboard<span className="dot">.</span>
              </h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                A slower kind of ranking: the Things, Quotes and people carrying the clearest signal
                this week.
              </p>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-accent sm:h-14 sm:w-14">
              <Crown className="h-6 w-6" strokeWidth={1.5} />
            </span>
          </div>
          <div className="relative mt-6 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="rounded-full border border-border bg-background/60 px-3 py-1.5">
              {data?.weekLabel ? `This week · ${data.weekLabel}` : "This week"}
            </span>
            <span className="rounded-full border border-border bg-background/60 px-3 py-1.5">
              {data?.leagues.length ?? 0} leagues
            </span>
          </div>
        </header>

        <div
          className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1"
          aria-label="Leaderboard categories"
        >
          {categoryFilters.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "pressable flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs transition-colors",
                filter === key
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
              {label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-3xl border border-border bg-card px-5 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-accent" /> Reading this week’s signals…
          </div>
        )}

        {isError && (
          <div className="mt-5 rounded-3xl border border-destructive/25 bg-card px-5 py-8 text-center">
            <p className="font-serif text-xl italic text-foreground">The orbit went quiet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Leaderboard signals could not be loaded. Try again shortly.
            </p>
          </div>
        )}

        {!isLoading && !isError && leagues.length === 0 && (
          <div className="mt-5 rounded-3xl border border-border bg-card px-5 py-10 text-center">
            <Trophy className="mx-auto h-7 w-7 text-accent" strokeWidth={1.5} />
            <p className="mt-3 font-serif text-xl italic text-foreground">
              No league in this orbit yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">The next signal can be yours.</p>
          </div>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {leagues.map((league, index) => (
            <LeagueCard key={league.id} league={league} index={index} />
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          Rankings reset every Monday at 00:00 UTC. Scores reflect this week’s public activity, not
          lifetime noise.
        </p>
      </AppShell>
    </OnboardingGate>
  );
}

function LeagueCard({ league, index }: { league: LeaderboardLeague; index: number }) {
  const Icon =
    league.category === "thing" ? BarChart3 : league.category === "quote" ? Quote : Users;
  const AccentIcon = index === 0 ? Flame : index === 1 ? Sparkles : Icon;

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card">
      <header className="border-b border-border/70 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
              <AccentIcon className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {categoryCopy[league.category]} · this week
              </p>
              <h2 className="mt-1 truncate font-serif text-2xl italic text-foreground">
                {league.name}
              </h2>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-border bg-background/50 px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            {league.metric}
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{league.description}</p>
      </header>

      {league.entries.length > 0 ? (
        <div className="divide-y divide-border/60">
          {league.entries.map((entry) => (
            <LeaderboardRow key={`${league.id}-${entry.id}`} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-center">
          <p className="font-serif text-lg italic text-foreground">Waiting for the first signal.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This league opens as the week unfolds.
          </p>
        </div>
      )}
    </section>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const content = (
    <>
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-medium",
          entry.rank === 1
            ? "border-accent/40 bg-accent/15 font-serif text-accent"
            : "border-border bg-background/60 text-muted-foreground",
        )}
      >
        {entry.rank === 1 ? (
          <Crown className="h-3.5 w-3.5" strokeWidth={1.7} />
        ) : (
          `0${entry.rank}`.slice(-2)
        )}
      </span>

      {entry.category === "user" || entry.category === "quote" ? (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background/60 text-sm">
          {entry.emoji ? (
            <ProfileGlyph value={entry.emoji} className="h-4 w-4" />
          ) : (
            <CircleUserRound className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">{entry.label}</span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-muted-foreground">
          {entry.secondary}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-right">
          <span className="block text-xs font-medium text-accent">{entry.scoreLabel}</span>
          {entry.category === "thing" && entry.rank === 1 ? (
            <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
              <Sparkles className="h-3 w-3" /> top signal
            </span>
          ) : null}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
      </span>
    </>
  );

  if (entry.category === "thing") {
    return (
      <Link
        to="/thing/$id"
        params={{ id: entry.id }}
        className="pressable flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/60 sm:px-5"
      >
        {content}
      </Link>
    );
  }

  if (entry.category === "quote") {
    return (
      <Link
        to="/quote/$id"
        params={{ id: entry.id }}
        className="pressable flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/60 sm:px-5"
      >
        {content}
      </Link>
    );
  }

  if (entry.username) {
    return (
      <Link
        to="/u/$username"
        params={{ username: entry.username }}
        className="pressable flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/60 sm:px-5"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">{content}</div>;
}
