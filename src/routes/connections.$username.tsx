import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Eye, Star, Users } from "lucide-react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ProfileGlyph } from "@/components/ProfileGlyph";
import { getProfileConnections } from "@/lib/api/social.functions";
import { effectivePlan } from "@/lib/premium";
import { z } from "zod";
import { displayBio } from "@/lib/profile-display";

export const Route = createFileRoute("/connections/$username")({
  validateSearch: z.object({
    list: z.enum(["followers", "following"]).default("followers"),
    from: z.enum(["me", "profile"]).default("profile"),
  }),
  head: ({ params }) => ({
    meta: [{ title: `Connections · @${params.username} · SameThing.` }],
  }),
  component: ConnectionsPage,
});

type Connection = {
  id: string;
  username: string;
  emoji: string;
  avatar_url?: string | null;
  plan: string;
  bio: string | null;
};

function ConnectionsPage() {
  const { username } = Route.useParams();
  const { list, from } = Route.useSearch();
  const getConnections = useServerFn(getProfileConnections);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["profile-connections", username, list],
    queryFn: () => getConnections({ data: { username, list } }),
  });

  const items = (data?.items ?? []) as Connection[];
  const label = list === "following" ? "Watching" : "Watchers";
  const description =
    list === "following" ? "Profiles this thinker watches." : "People watching this thinker.";

  return (
    <AppShell>
      {from === "me" ? (
        <Link
          to="/me"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> My profile
        </Link>
      ) : (
        <Link
          to="/u/$username"
          params={{ username }}
          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> @{username}
        </Link>
      )}
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="brand-mark text-3xl text-foreground">
            {label}
            <span className="dot">.</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-muted-foreground">
          {list === "following" ? <Eye className="h-4 w-4" /> : <Users className="h-4 w-4" />}
        </div>
      </div>

      {isLoading && (
        <div className="mt-5 h-24 animate-pulse rounded-2xl border border-border bg-card" />
      )}
      {isError && (
        <p className="mt-5 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          This list is unavailable right now.
        </p>
      )}
      {!isLoading && !isError && items.length === 0 && (
        <p className="mt-5 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No {label.toLowerCase()} yet.
        </p>
      )}
      <div className="mt-5 space-y-2">
        {items.map((person) => {
          const premium = effectivePlan(person) === "premium";
          return (
            <Link
              key={person.id}
              to="/u/$username"
              params={{ username: person.username }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-accent/50 hover:bg-secondary/30"
            >
              <span
                className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-background ${premium ? "premium-ring" : ""}`}
              >
                {premium && (
                  <span className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-[color:var(--rare)]/80 bg-background text-[color:var(--rare)] shadow-[0_0_14px_color-mix(in_srgb,var(--rare)_24%,transparent)]">
                    <Star className="h-3 w-3 fill-current" aria-label="PremiumThing." />
                  </span>
                )}
                <ProfileGlyph
                  value={person.emoji}
                  photoUrl={person.avatar_url}
                  photoClassName="h-full w-full"
                  className="h-5 w-5"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm text-foreground">@{person.username}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {displayBio(person.bio)}
                </span>
              </span>
              <span className="text-muted-foreground">›</span>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
