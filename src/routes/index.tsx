import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFeed } from "@/lib/api/feed.functions";
import { AppShell } from "@/components/AppShell";
import { ThingCard } from "@/components/ThingCard";
import { useAuth } from "@/hooks/use-auth";
import { TAGS } from "@/lib/thing-helpers";
import { Brand } from "@/components/Brand";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingGate } from "@/components/OnboardingGate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:url", content: "https://samething.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://samething.lovable.app/" },
    ],
  }),
  component: FeedPage,
});

type FilterKey = "new" | "trending";

function FeedPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const feed = useServerFn(getFeed);
  const [filter, setFilter] = useState<FilterKey>("new");
  const [tag, setTag] = useState<string | null>(null);
  const [langScope, setLangScope] = useState<"mine" | "all">(() => {
    if (typeof window === "undefined") return "mine";
    return (localStorage.getItem("feed:langScope") as "mine" | "all") || "mine";
  });

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("feed:langScope", langScope);
  }, [langScope]);

  const language = langScope === "all" ? "all" : profile?.language || "all";
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
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);

  const things = data?.things ?? [];
  const featured = things[0];
  const rest = things.slice(1);

  const heading = useMemo(() => {
    if (filter === "trending") return "Trending.";
    return "Today.";
  }, [filter]);

  return (
    <OnboardingGate>
      <AppShell>
      <section className="mb-5">
        <h1 className="brand-mark text-5xl text-foreground">
          {heading.replace(".", "")}
          <span className="dot">.</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {things.length} {things.length === 1 ? "thing" : "things"} ·
          {" "}
          <button
            onClick={() => setLangScope((s) => (s === "mine" ? "all" : "mine"))}
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            {langScope === "all" ? "global" : `local (${(profile?.language || "en").toLowerCase()})`}
          </button>
        </p>
      </section>

      {/* Filter pills */}
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
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
        <button
          onClick={() => setTag(null)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs lowercase tracking-wide",
            tag === null ? "border-foreground/30 text-foreground" : "border-border text-muted-foreground",
          )}
        >
          all
        </button>
        {feedTags.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t === tag ? null : t)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs lowercase tracking-wide",
              tag === t ? "border-accent text-accent" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
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

      <div className="flex flex-col gap-4">
        {featured && <ThingCard thing={featured} featured />}
        {rest.map((t) => (
          <ThingCard key={t.id} thing={t} />
        ))}
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
