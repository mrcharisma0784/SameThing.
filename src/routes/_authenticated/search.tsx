import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, X, AtSign, Hash, Star } from "lucide-react";
import { ProfileGlyph } from "@/components/ProfileGlyph";
import { searchThings, searchUsers } from "@/lib/api/search.functions";
import { ThingCard, type ThingCardData } from "@/components/ThingCard";
import { OnboardingGate } from "@/components/OnboardingGate";
import { useAuth } from "@/hooks/use-auth";
import { profileDisplayTags } from "@/lib/test-user";
import { displayBio } from "@/lib/profile-display";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search · SameThing." }] }),
  component: SearchPage,
});

type UserHit = {
  username: string;
  emoji: string;
  bio: string | null;
  plan?: string;
  premium_until?: string | null;
  is_test_user?: boolean | null;
  test_user_until?: string | null;
  test_user_label?: string | null;
};

function SearchPage() {
  const { profile } = useAuth();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [demoText, setDemoText] = useState("");
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoStarted = useRef(false);

  useEffect(() => {
    if (!profile?.onboarded_at || !profile.demographics_completed_at || demoStarted.current) return;
    const seenKey = "samething:search-type-demo:v1";
    try {
      if (localStorage.getItem(seenKey)) return;
    } catch {
      // Continue without persistence when storage is unavailable.
    }
    demoStarted.current = true;

    const samples = ["@username", "#tag"];
    let sampleIndex = 0;
    let typed = 0;
    let erased = 0;
    let typeTimer: number | undefined;
    let pauseTimer: number | undefined;
    let eraseTimer: number | undefined;

    const typeSample = () => {
      const sample = samples[sampleIndex];
      typed = 0;
      erased = sample.length;
      typeTimer = window.setInterval(() => {
        typed += 1;
        setDemoText(sample.slice(0, typed));
        if (typed >= sample.length) {
          window.clearInterval(typeTimer);
          pauseTimer = window.setTimeout(() => {
            eraseTimer = window.setInterval(() => {
              erased -= 1;
              setDemoText(sample.slice(0, erased));
              if (erased <= 0) {
                window.clearInterval(eraseTimer);
                setDemoText("");
                sampleIndex += 1;
                if (sampleIndex < samples.length) {
                  pauseTimer = window.setTimeout(typeSample, 300);
                } else {
                  try {
                    localStorage.setItem(seenKey, "done");
                  } catch {
                    // The animation can still complete without persistence.
                  }
                }
              }
            }, 75);
          }, 500);
        }
      }, 95);
    };

    const startTimer = window.setTimeout(typeSample, 500);

    return () => {
      window.clearTimeout(startTimer);
      if (typeTimer !== undefined) window.clearInterval(typeTimer);
      if (pauseTimer !== undefined) window.clearTimeout(pauseTimer);
      if (eraseTimer !== undefined) window.clearInterval(eraseTimer);
    };
  }, [profile?.demographics_completed_at, profile?.onboarded_at]);

  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setDebounced(q.trim()), 300);
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, [q]);

  const isUserMode = debounced.startsWith("@");
  const userTerm = debounced.replace(/^@/, "");
  const isTagMode = debounced.startsWith("#");
  const tagTerm = debounced.replace(/^#/, "").trim();

  const { data: things, isFetching: thingsFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: async () =>
      debounced.length >= 2
        ? ((await searchThings({ data: { q: debounced } })).things as ThingCardData[])
        : [],
    enabled: !isUserMode && (isTagMode ? tagTerm.length >= 1 : debounced.length >= 2),
  });

  const { data: users, isFetching: usersFetching } = useQuery({
    queryKey: ["user-search", userTerm],
    queryFn: async () =>
      userTerm.length >= 1
        ? ((await searchUsers({ data: { q: userTerm } })).users as UserHit[])
        : [],
    enabled: isUserMode && userTerm.length >= 1,
  });

  const isFetching = isUserMode ? usersFetching : thingsFetching;
  const ready = isUserMode
    ? userTerm.length >= 1
    : isTagMode
      ? tagTerm.length >= 1
      : debounced.length >= 2;

  return (
    <OnboardingGate>
      <AppShell>
        <h1 className="brand-mark text-4xl text-foreground">
          Search<span className="dot">.</span>
        </h1>
        <div className="mt-5 relative">
          {isUserMode || demoText.startsWith("@") ? (
            <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
          ) : isTagMode || demoText.startsWith("#") ? (
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
          ) : (
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 80))}
            placeholder={
              q ? "" : demoText || (isUserMode ? "@username" : "What are you looking for?")
            }
            className="bg-card pl-9 pr-9 py-6 text-base"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-card hover:text-foreground"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {!ready && (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-xs uppercase tracking-widest text-muted-foreground">
              {isUserMode
                ? "Type a username after @"
                : isTagMode
                  ? "Type a tag after #"
                  : "Type at least 2 characters"}
            </p>
          )}
          {ready && isFetching && (
            <div className="h-20 animate-pulse rounded-2xl border border-border bg-card" />
          )}

          {isUserMode && ready && !isFetching && (users?.length ?? 0) === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No users matched “@{userTerm}”.
            </p>
          )}
          {isUserMode &&
            users?.map((u) => {
              const isMe = profile?.username === u.username;
              return (
                <Link
                  key={u.username}
                  to={isMe ? "/me" : "/u/$username"}
                  params={isMe ? undefined : { username: u.username }}
                  className={`relative flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-accent/40 ${
                    u.plan === "premium"
                      ? "border-[color:var(--rare)]/80 shadow-[0_0_24px_color-mix(in_srgb,var(--rare)_16%,transparent)]"
                      : "border-border"
                  }`}
                >
                  {u.plan === "premium" && (
                    <span className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-[color:var(--rare)]/80 bg-background text-[color:var(--rare)] shadow-[0_0_14px_color-mix(in_srgb,var(--rare)_24%,transparent)]">
                      <Star className="h-3 w-3 fill-current" aria-label="PremiumThing." />
                    </span>
                  )}
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-foreground ${u.plan === "premium" ? "premium-ring" : ""}`}
                  >
                    <ProfileGlyph value={u.emoji} photoUrl={u.avatar_url} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-serif text-base text-foreground">@{u.username}</p>
                      {profileDisplayTags(u).map((tag) => (
                        <span
                          key={tag}
                          className={
                            tag === "PremiumThing." || tag === "LabThing."
                              ? "rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-accent"
                              : "rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground"
                          }
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{displayBio(u.bio)}</p>
                  </div>
                </Link>
              );
            })}

          {!isUserMode && ready && !isFetching && (things?.length ?? 0) === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nothing matched “{debounced}”.
            </p>
          )}
          {!isUserMode && things?.map((t) => <ThingCard key={t.id} thing={t} />)}
        </div>
      </AppShell>
    </OnboardingGate>
  );
}
