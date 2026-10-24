import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Check, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "PremiumThing. — themes, icons & more · SameThing." },
      { name: "description", content: "PremiumThing. unlocks app themes, exclusive profile icons, the golden ring and deeper feed controls on SameThing." },
      { property: "og:title", content: "PremiumThing. · SameThing." },
      { property: "og:description", content: "Unlock themes, exclusive icons and the golden ring on SameThing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://samething.lovable.app/premium" }],
  }),
  component: PremiumPage,
});

const PLANS = [
  {
    key: "monthly",
    name: "Monthly",
    price: "$3.99",
    per: "/ month",
    note: "Cancel anytime.",
  },
  {
    key: "yearly",
    name: "Yearly",
    price: "$29.99",
    per: "/ year",
    note: "Two months free — best value.",
    highlight: true,
  },
];

const PERKS = [
  "PremiumThing. badge on your profile and things",
  "15 custom tags instead of 5",
  "AI tag suggestions while you write",
  "All app themes — Midnight. and Paper.",
  "Exclusive profile icons",
  "Golden ring around your icon, everywhere",
  "Full feed filter control",
  "Priority on feedback replies",
];


function PremiumPage() {
  const { profile } = useAuth();
  const isPremium = (profile?.plan ?? "free") === "premium";

  return (
    <AppShell>
      <h1 className="brand-mark text-4xl text-foreground">
        PremiumThing<span className="dot">.</span>
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isPremium ? "You're in. Thank you for keeping this place quiet and ad-free." : "Small price. Nicer place."}
      </p>

      {isPremium && (
        <div className="mt-5 rounded-2xl border border-[color:var(--rare)]/40 bg-card p-5 text-center">
          <p className="brand-mark text-2xl text-[color:var(--rare)]">✦ Active</p>
          <p className="mt-1 text-xs text-muted-foreground">Manage or cancel any time from Settings.</p>
        </div>
      )}

      <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">What you get</p>
        <ul className="mt-3 space-y-2">
          {PERKS.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {p}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5 grid gap-3">
        {PLANS.map((p) => (
          <div
            key={p.key}
            className={`rounded-2xl border p-5 ${p.highlight ? "border-accent/50 bg-accent/5" : "border-border bg-card"}`}
          >
            <div className="flex items-baseline justify-between">
              <p className="text-sm uppercase tracking-widest text-muted-foreground">{p.name}</p>
              <p className="font-serif text-2xl text-foreground">
                {p.price} <span className="text-xs text-muted-foreground">{p.per}</span>
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>
            <Button
              disabled={isPremium}
              onClick={() => toast.info("Card payments are being set up — you'll be able to subscribe here shortly.")}
              className="mt-4 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
            >
              {isPremium ? "Current plan" : `Subscribe — ${p.price}`}
            </Button>
          </div>
        ))}
      </section>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" /> Card payments are being connected. Nothing is charged yet.
      </p>

      <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        <Link to="/terms" className="hover:text-foreground">Terms</Link> ·{" "}
        <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
      </p>
    </AppShell>
  );
}
