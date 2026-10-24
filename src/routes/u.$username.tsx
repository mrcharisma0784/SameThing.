import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { ThingCard, type ThingCardData } from "@/components/ThingCard";
import { getPublicProfile } from "@/lib/api/me.functions";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} · SameThing.` },
      { name: "description", content: `Public things from @${params.username} on SameThing.` },
    ],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { username } = Route.useParams();
  const fetchProfile = useServerFn(getPublicProfile);
  const { data, isLoading } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => fetchProfile({ data: { username } }),
  });

  const profile = data?.profile;
  const things = (data?.things ?? []) as ThingCardData[];

  return (
    <AppShell>
      <h1 className="sr-only">@{username}</h1>
      {isLoading && <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />}
      {!isLoading && !profile && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No one with that name. <Link to="/" className="text-accent">Back home</Link>
        </p>
      )}
      {profile && (
        <>
          <section className="mb-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-4">
              <div className={`grid h-14 w-14 place-items-center rounded-full bg-background text-2xl ${profile.plan === "premium" ? "premium-ring" : ""}`}>{profile.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-serif text-xl text-foreground">@{profile.username}</p>
                  <span
                    className={
                      profile.plan === "premium"
                        ? "rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent"
                        : "rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground"
                    }
                  >
                    {profile.plan === "premium" ? "✦ PremiumThing" : "SimpleThing"}
                  </span>
                </div>
                {profile.bio && <p className="mt-1 text-xs text-muted-foreground">{profile.bio}</p>}
              </div>
            </div>
          </section>

          <h2 className="brand-mark text-2xl text-foreground">
            Public Things<span className="dot">.</span>
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            {things.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nothing public yet.
              </p>
            )}
            {things.map((t) => <ThingCard key={t.id} thing={t} />)}
          </div>
        </>
      )}
    </AppShell>
  );
}
