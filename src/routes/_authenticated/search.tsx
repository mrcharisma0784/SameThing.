import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, X, AtSign } from "lucide-react";
import { searchThings, searchUsers } from "@/lib/api/search.functions";
import { ThingCard, type ThingCardData } from "@/components/ThingCard";
import { OnboardingGate } from "@/components/OnboardingGate";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search · SameThing." }] }),
  component: SearchPage,
});

type UserHit = { username: string; emoji: string; bio: string | null; plan?: string };

function SearchPage() {
  const { profile } = useAuth();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setDebounced(q.trim()), 300);
    return () => { if (t.current) clearTimeout(t.current); };
  }, [q]);

  const isUserMode = debounced.startsWith("@");
  const userTerm = debounced.replace(/^@/, "");

  const { data: things, isFetching: thingsFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: async () => (debounced.length >= 2 ? (await searchThings({ data: { q: debounced } })).things as ThingCardData[] : []),
    enabled: !isUserMode && debounced.length >= 2,
  });

  const { data: users, isFetching: usersFetching } = useQuery({
    queryKey: ["user-search", userTerm],
    queryFn: async () => (userTerm.length >= 1 ? (await searchUsers({ data: { q: userTerm } })).users as UserHit[] : []),
    enabled: isUserMode && userTerm.length >= 1,
  });

  const isFetching = isUserMode ? usersFetching : thingsFetching;
  const ready = isUserMode ? userTerm.length >= 1 : debounced.length >= 2;

  return (
    <OnboardingGate>
      <AppShell>
        <h1 className="brand-mark text-4xl text-foreground">
          Search<span className="dot">.</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Title, content, or tag — or type <span className="font-mono text-foreground">@</span> to find people.
        </p>

        <div className="mt-5 relative">
          {isUserMode
            ? <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            : <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 80))}
            placeholder={isUserMode ? "@username" : "What are you looking for?"}
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
              {isUserMode ? "Type a username after @" : "Type at least 2 characters"}
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
          {isUserMode && users?.map((u) => {
            const isMe = profile?.username === u.username;
            return (
              <Link
                key={u.username}
                to={isMe ? "/me" : "/u/$username"}
                params={isMe ? undefined : { username: u.username }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent/40"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-background text-xl">{u.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-serif text-base text-foreground">
                    @{u.username}
                    {u.plan === "premium" && <span className="text-xs text-accent">✦</span>}
                  </p>
                  {u.bio && <p className="truncate text-xs text-muted-foreground">{u.bio}</p>}
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
