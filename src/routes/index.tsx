import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFeed } from "@/lib/api/feed.functions";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { ThingCard, type ThingCardData } from "@/components/ThingCard";
import { QuoteOfTheDay } from "@/components/QuoteOfTheDay";
import { useAuth } from "@/hooks/use-auth";
import { TAGS } from "@/lib/thing-helpers";
import { Brand } from "@/components/Brand";
import { PublicLanding } from "@/components/PublicLanding";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getSiteUrl } from "@/lib/site-url";
import { LANGUAGES } from "@/lib/languages";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ property: "og:url", content: getSiteUrl("/") }],
    links: [{ rel: "canonical", href: getSiteUrl("/") }],
  }),
  component: FeedPage,
});

type FilterKey = "new" | "trending";

function FeedPage() {
  const { user, profile, loading } = useAuth();

  if (loading) return <LandingLoading />;
  if (!user) return <PublicLanding />;

  return <AuthenticatedFeedPage profile={profile} />;
}

function LandingLoading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-6 text-foreground">
      <div className="text-center">
        <Brand size="lg" />
        <div className="mt-5 flex justify-center gap-1.5" aria-label="Loading">
          <span className="ai-dot" />
          <span className="ai-dot" />
          <span className="ai-dot" />
        </div>
      </div>
    </div>
  );
}

function AuthenticatedFeedPage({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const qc = useQueryClient();
  const feed = useServerFn(getFeed);
  const [filter, setFilter] = useState<FilterKey>("new");
  const [tag, setTag] = useState<string | null>(null);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const tagSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const tagSwipeHandled = useRef(false);
  const [langScope, setLangScope] = useState<string>(() => {
    if (typeof window === "undefined") return "mine";
    const stored = localStorage.getItem("feed:langScope");
    return stored === "all" || stored === "mine" || LANGUAGES.some((item) => item.code === stored)
      ? stored
      : "mine";
  });
  const [languageExpanded, setLanguageExpanded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("feed:langScope", langScope);
  }, [langScope]);

  const language =
    langScope === "all" ? "all" : langScope === "mine" ? profile?.language || "all" : langScope;
  const languageLabel =
    language === "all"
      ? "global"
      : LANGUAGES.find((item) => item.code === language)?.label || language;
  const feedTags = (profile?.feed_tags?.length ? profile.feed_tags : [...TAGS]) as string[];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["feed", filter, language, tag],
    queryFn: () => feed({ data: { filter, language, tag, limit: 30 } }),
  });

  // Realtime updates → refetch lightly
  useEffect(() => {
    const ch = supabase
      .channel("things-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "things" }, () => {
        void qc.invalidateQueries({ queryKey: ["feed"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  const things = (data?.things ?? []) as ThingCardData[];
  const featured = things[0];
  const rest = things.slice(1);

  const heading = useMemo(() => {
    if (filter === "trending") return "Trending.";
    return "Today.";
  }, [filter]);

  return (
    <OnboardingGate>
      <AppShell>
        <div className="md:mx-auto md:max-w-4xl lg:max-w-5xl">
          <div className="mb-7">
            <QuoteOfTheDay />
          </div>

          <section className="mb-5">
            <h1 className="brand-mark text-5xl text-foreground">
              {heading.replace(".", "")}
              <span className="dot">.</span>
            </h1>
            <div className="mt-2 flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden">
              <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs tracking-wide text-muted-foreground">
                {things.length} {things.length === 1 ? "thing" : "things"}
              </span>
              <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setLanguageExpanded((expanded) => !expanded)}
                  aria-expanded={languageExpanded}
                  aria-label={`Feed language: ${languageLabel}. ${languageExpanded ? "Collapse" : "Change language"}`}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                    languageExpanded
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {languageLabel}
                  <ChevronRight className="h-3 w-3" />
                </button>
                <div
                  aria-hidden={!languageExpanded}
                  className={cn(
                    "no-scrollbar flex shrink-0 items-center gap-1.5 overflow-x-auto overflow-y-hidden transition-[max-width,opacity,transform] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    languageExpanded
                      ? "max-w-[calc(100vw-15rem)] translate-x-0 opacity-100 md:max-w-[34rem]"
                      : "pointer-events-none max-w-0 -translate-x-3 opacity-0",
                  )}
                >
                  {language !== "all" && (
                    <button
                      type="button"
                      tabIndex={languageExpanded ? 0 : -1}
                      onClick={() => {
                        setLangScope("all");
                        setLanguageExpanded(false);
                      }}
                      className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      global
                    </button>
                  )}
                  {LANGUAGES.filter((item) => item.code !== language).map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      tabIndex={languageExpanded ? 0 : -1}
                      onClick={() => {
                        setLangScope(item.code);
                        setLanguageExpanded(false);
                      }}
                      className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Filter pills */}
          <div className="mb-4 flex min-w-0 max-w-full items-center gap-2 overflow-hidden">
            {(["new", "trending"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs uppercase tracking-widest transition-colors",
                  filter === f
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
            <span className="mx-1 self-center text-muted-foreground/40">·</span>
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              <button
                type="button"
                onPointerDown={(event) => {
                  tagSwipeStart.current = { x: event.clientX, y: event.clientY };
                  tagSwipeHandled.current = false;
                }}
                onPointerUp={(event) => {
                  const start = tagSwipeStart.current;
                  tagSwipeStart.current = null;
                  if (
                    start &&
                    event.clientX - start.x > 36 &&
                    Math.abs(event.clientY - start.y) < 28
                  ) {
                    tagSwipeHandled.current = true;
                    setTagsExpanded(true);
                  }
                }}
                onPointerCancel={() => {
                  tagSwipeStart.current = null;
                }}
                onClick={() => {
                  if (tagSwipeHandled.current) {
                    tagSwipeHandled.current = false;
                    return;
                  }
                  setTagsExpanded((expanded) => !expanded);
                }}
                aria-expanded={tagsExpanded}
                aria-label={`Feed tag: ${tag ?? "all"}. ${tagsExpanded ? "Collapse tags" : "Show tags"}`}
                className={cn(
                  "inline-flex shrink-0 touch-pan-y items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs lowercase tracking-wide transition-colors",
                  tag === null
                    ? "border-foreground/30 text-foreground"
                    : "border-accent text-accent",
                  tagsExpanded && "bg-accent text-accent-foreground",
                )}
              >
                {tag ?? "all"}
                <ChevronRight className="h-3 w-3" />
              </button>
              <div
                aria-hidden={!tagsExpanded}
                className={cn(
                  "no-scrollbar flex shrink-0 items-center gap-1.5 overflow-x-auto overflow-y-hidden transition-[max-width,opacity,transform] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  tagsExpanded
                    ? "max-w-[calc(100vw-12rem)] translate-x-0 opacity-100 md:max-w-[34rem]"
                    : "pointer-events-none max-w-0 -translate-x-3 opacity-0",
                )}
              >
                {tag !== null && (
                  <button
                    type="button"
                    tabIndex={tagsExpanded ? 0 : -1}
                    onClick={() => {
                      setTag(null);
                      setTagsExpanded(false);
                    }}
                    className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs lowercase text-muted-foreground transition-colors hover:text-foreground"
                  >
                    all
                  </button>
                )}
                {feedTags
                  .filter((t) => t !== tag)
                  .map((t) => (
                    <button
                      key={t}
                      type="button"
                      tabIndex={tagsExpanded ? 0 : -1}
                      onClick={() => {
                        setTag(t);
                        setTagsExpanded(false);
                      }}
                      className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs lowercase text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {isLoading && <FeedSkeleton />}
          {isError && (
            <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Couldn't load the feed. Try again in a moment.
            </p>
          )}

          {!isLoading && things.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <Brand size="lg" />
              <p className="mt-4 font-serif text-xl italic text-foreground">No things yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Be the first to drop one.</p>
              <Link
                to="/drop"
                className="mt-4 inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground"
              >
                Drop a Thing
              </Link>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {featured && (
              <div className="md:col-span-2">
                <ThingCard thing={featured} featured />
              </div>
            )}
            {rest.map((t) => (
              <ThingCard key={t.id} thing={t} />
            ))}
          </div>
        </div>
      </AppShell>
    </OnboardingGate>
  );
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-card" />
      ))}
    </div>
  );
}
