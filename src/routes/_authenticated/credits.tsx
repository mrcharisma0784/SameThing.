import { Link, createFileRoute } from "@tanstack/react-router";
import { SettingsBackLink } from "@/components/SettingsBackLink";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Clock3,
  CreditCard,
  Gift,
  History,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { useAuth } from "@/hooks/use-auth";
import { getSiteUrl } from "@/lib/site-url";
import { isLabThingActive } from "@/lib/test-user";
import { createSameCreditPurchaseIntent, getCreditLedger } from "@/lib/api/credits.functions";
import {
  formatUsdCents,
  PREMIUM_MONTHLY_SAME_CREDITS,
  SAME_CREDIT_PACKS,
} from "@/lib/api/api-catalog";

export const Route = createFileRoute("/_authenticated/credits")({
  head: () => ({
    meta: [
      { title: "Credit · SameThing." },
      {
        name: "description",
        content: "See your Same Credits balance, history, purchases and ways to spend.",
      },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/credits") }],
  }),
  component: CreditsPage,
});

type LedgerEntry = {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
};

function reasonLabel(reason: string) {
  if (reason === "referral_referrer") return "Reference reward";
  if (reason === "referral_referred") return "Welcome from a reference";
  if (reason === "time_capsule") return "Time Capsule";
  if (reason.startsWith("boost:")) return "Boost MyThing.";
  if (reason.startsWith("achievement:")) return "Achievement reward";
  if (reason.startsWith("streak_freeze:")) return "Streak Freeze";
  return "Same Credits activity";
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

function CreditsPage() {
  const { profile } = useAuth();
  const getLedger = useServerFn(getCreditLedger);
  const createPurchase = useServerFn(createSameCreditPurchaseIntent);
  const [purchaseBusy, setPurchaseBusy] = useState<string | null>(null);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["credits", "ledger"],
    queryFn: () => getLedger(),
    enabled: Boolean(profile),
    staleTime: 20_000,
  });

  const entries = useMemo(() => (data?.entries ?? []) as LedgerEntry[], [data?.entries]);
  const unlimitedCredits = Boolean(isLabThingActive(profile));
  const requestPurchase = async (packKey: "small" | "medium" | "large") => {
    setPurchaseBusy(packKey);
    const result = await createPurchase({ data: { pack_key: packKey } });
    setPurchaseBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.info(result.message);
  };
  const totals = useMemo(() => {
    return entries.reduce(
      (summary, entry) => {
        if (entry.amount > 0) summary.earned += entry.amount;
        else summary.spent += Math.abs(entry.amount);
        return summary;
      },
      { earned: 0, spent: 0 },
    );
  }, [entries]);

  return (
    <OnboardingGate>
      <AppShell>
        <SettingsBackLink />

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="brand-mark text-3xl text-foreground">
              Credit<span className="dot">.</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A small balance for the things that feel worth keeping.
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-accent/35 bg-accent/10 text-accent">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        <section className="relative mt-5 overflow-hidden rounded-2xl border border-accent/30 bg-card p-5">
          <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full border border-accent/15" />
          <div className="pointer-events-none absolute -right-2 -top-4 h-20 w-20 rounded-full border border-accent/10" />
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Available now</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-serif text-5xl italic leading-none text-foreground">
              {isLoading
                ? "—"
                : unlimitedCredits
                  ? "∞"
                  : (data?.credits ?? profile?.same_credits ?? 0)}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">Same Credits</span>
          </div>
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {unlimitedCredits
              ? "LabThing. pilot access keeps PremiumThing. paths open and gives you unlimited Same Credits for the active test window."
              : data?.premium
                ? "PremiumThing. keeps Time Capsule and Boost costs at zero. Your balance stays ready for future paths."
                : "Earn credits through achievements and references. Spend them on Time Capsule or Boost MyThing."}
          </p>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <SummaryCard
            icon={<ArrowDownLeft className="h-3.5 w-3.5" />}
            label="earned"
            value={totals.earned}
            accent
          />
          <SummaryCard
            icon={<ArrowUpRight className="h-3.5 w-3.5" />}
            label="spent"
            value={totals.spent}
          />
        </section>

        <section className="mt-5 rounded-2xl border border-accent/20 bg-card p-5">
          {unlimitedCredits ? (
            <div className="rounded-2xl border border-accent/25 bg-accent/5 p-4">
              <p className="text-sm text-foreground">LabThing. pilot balance · ∞</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Same Credits are unlimited while your approved Test User window is active. There is
                no need to buy a pack for pilot testing.
              </p>
            </div>
          ) : null}
          {!unlimitedCredits && (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5 text-accent" /> Buy Same Credits
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Choose a small top-up for future features. Payments are prepared but not
                  connected; no card is charged and no balance is added in this release.
                </p>
              </div>
            </div>
          )}
          {!unlimitedCredits && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {SAME_CREDIT_PACKS.map((pack) => (
                <PurchasePackCard
                  key={pack.key}
                  label={pack.label}
                  credits={pack.credits}
                  price={formatUsdCents(pack.amountCents)}
                  detail={pack.description}
                  busy={purchaseBusy === pack.key}
                  onPurchase={() => void requestPurchase(pack.key)}
                />
              ))}
            </div>
          )}
          {data?.premium && !unlimitedCredits && (
            <p className="mt-3 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-xs leading-5 text-foreground">
              PremiumThing. includes {PREMIUM_MONTHLY_SAME_CREDITS} Same Credits once per active
              month, added automatically when you open your Credit page.
            </p>
          )}
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-accent" /> spend your Credits
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <SpendCard
              href="/capsules"
              icon={<Clock3 className="h-4 w-4" />}
              title="Time Capsule"
              detail="Seal a thought for a future date. Free once, then 10–60 credits by duration."
            />
            <SpendCard
              href="/me"
              icon={<Sparkles className="h-4 w-4" />}
              title="Boost MyThing."
              detail="Move one of your Things directly below the newest posts in New for 6, 24 or 72 hours."
            />
            <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Streak and Streak Freeze are currently unavailable. Existing Streak data is preserved.
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <History className="h-3.5 w-3.5" /> activity
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {isLoading
                ? "latest 10"
                : `latest ${showAllEntries ? entries.length : Math.min(entries.length, 10)}`}
            </span>
          </div>
          {isError ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Credit activity is temporarily unavailable.
            </p>
          ) : entries.length === 0 && !isLoading ? (
            <div className="mt-5 text-center">
              <Gift className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 font-serif text-lg italic text-foreground">No activity yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your first achievement or reference reward will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-3 divide-y divide-border/70">
              {isLoading
                ? [1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="flex animate-pulse items-center justify-between gap-3 py-3"
                    >
                      <div className="h-3 w-40 rounded-full bg-secondary" />
                      <div className="h-3 w-12 rounded-full bg-secondary" />
                    </div>
                  ))
                : (showAllEntries ? entries : entries.slice(0, 10)).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">
                          {reasonLabel(entry.reason)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDate(entry.created_at)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-sm ${entry.amount > 0 ? "text-emerald-400" : "text-muted-foreground"}`}
                      >
                        {entry.amount > 0 ? "+" : "−"}
                        {Math.abs(entry.amount)}
                      </span>
                    </div>
                  ))}
            </div>
          )}
          {!isLoading && !isError && entries.length > 10 ? (
            <button
              type="button"
              onClick={() => setShowAllEntries((showing) => !showing)}
              className="mx-auto mt-4 flex min-w-32 items-center justify-center rounded-full border border-border px-4 py-2 text-[10px] uppercase tracking-widest text-accent transition-colors hover:border-accent/50 hover:text-foreground"
            >
              {showAllEntries ? "Show less" : "Show more"}
            </button>
          ) : null}
        </section>
      </AppShell>
    </OnboardingGate>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <span className={accent ? "text-emerald-400" : "text-muted-foreground"}>{icon}</span>{" "}
        {label}
      </div>
      <p className="mt-2 font-serif text-3xl italic text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Same Credits</p>
    </div>
  );
}

function SpendCard({
  href,
  icon,
  title,
  detail,
}: {
  href: "/capsules" | "/me" | "/streak";
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Link
      to={href}
      className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent/40 hover:bg-secondary/30"
    >
      <div className="flex items-center gap-2 text-accent">
        {icon}
        <span className="text-xs uppercase tracking-widest">{title}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{detail}</p>
    </Link>
  );
}

function PurchasePackCard({
  label,
  credits,
  price,
  detail,
  busy,
  onPurchase,
}: {
  label: string;
  credits: number;
  price: string;
  detail: string;
  busy: boolean;
  onPurchase: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl italic text-foreground">{credits}</p>
      <p className="text-xs text-muted-foreground">Same Credits</p>
      <p className="mt-3 text-sm text-foreground">{price}</p>
      <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{detail}</p>
      <button
        type="button"
        onClick={onPurchase}
        disabled={busy}
        className="mt-3 w-full rounded-full border border-accent/40 px-3 py-2 text-[10px] uppercase tracking-widest text-accent hover:bg-accent/10 disabled:opacity-50"
      >
        {busy ? "Preparing…" : "Continue to checkout"}
      </button>
    </div>
  );
}
