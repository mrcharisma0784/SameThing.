import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { useAuth } from "@/hooks/use-auth";
import { getSiteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/_authenticated/twin")({
  head: () => ({
    meta: [
      { title: "Find my twin · SameThing." },
      { name: "description", content: "Find the stranger who feels the same things." },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/twin") }],
  }),
  component: TwinPage,
});

function TwinPage() {
  const { profile } = useAuth();
  const premium = profile?.plan === "premium";
  return (
    <OnboardingGate>
      <AppShell>
        <Link
          to="/settings"
          className="mb-3 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> settings
        </Link>
        <h1 className="brand-mark text-3xl text-foreground">
          Find my twin<span className="dot">.</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          the stranger who feels it too
        </p>
        {!premium ? (
          <section className="mt-6 rounded-2xl border border-accent/40 bg-card p-5 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-accent" />
            <p className="mt-2 font-serif text-xl italic text-foreground">
              A PremiumThing. feature.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              We match you with people who voted the same way on the same things.
            </p>
            <Link
              to="/premium"
              className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm text-accent-foreground"
            >
              PremiumThing.
            </Link>
          </section>
        ) : (
          <section className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
            <Users className="mx-auto h-6 w-6 text-accent" />
            <p className="mt-3 font-serif text-xl italic text-foreground">No twin yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Vote on a few more things and we’ll find the person who overlaps with you most.
            </p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-full border border-border px-5 py-2.5 text-sm text-foreground hover:bg-secondary/40"
            >
              Back to the feed
            </Link>
          </section>
        )}
        <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" /> Matches update as you vote. Anonymous things stay
          anonymous.
        </p>
      </AppShell>
    </OnboardingGate>
  );
}
