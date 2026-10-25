import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CreditCard, Gift, LockKeyhole, Receipt, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { getPaymentMethods, preparePaymentMethodSetup } from "@/lib/api/billing.functions";
import { getSiteUrl } from "@/lib/site-url";
import { toast } from "sonner";
import { PREMIUM_MONTHLY_SAME_CREDITS } from "@/lib/api/api-catalog";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({
    meta: [
      { title: "Subscription · SameThing." },
      { name: "description", content: "Manage your SameThing. plan and payment preferences." },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/subscription") }],
  }),
  component: SubscriptionPage,
});

const PLANS = [
  { key: "monthly", name: "Monthly", price: 3.99, suffix: "/ month" },
  { key: "yearly", name: "Yearly", price: 29.99, suffix: "/ year" },
] as const;

type PlanKey = (typeof PLANS)[number]["key"];

type Method = {
  id: string;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean;
};

function SubscriptionPage() {
  const { profile } = useAuth();
  const premium = profile?.plan === "premium";
  const [selected, setSelected] = useState<PlanKey>("yearly");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const plan = PLANS.find((item) => item.key === selected) ?? PLANS[1];
  const total = discount ? plan.price * 0.7 : plan.price;
  const listMethods = useServerFn(getPaymentMethods);
  const prepareSetup = useServerFn(preparePaymentMethodSetup);
  const { data: paymentData } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => listMethods(),
  });
  const methods = (paymentData?.methods ?? []) as Method[];

  const applyCode = () => {
    if (code.trim().toUpperCase() !== "SAME2026") {
      setDiscount(false);
      toast.error("That code isn't valid.");
      return;
    }
    setDiscount(true);
    toast.success("Code applied — 30% off your first term.");
  };

  const openSetup = async () => {
    setSetupOpen(true);
    const result = await prepareSetup({ data: { provider: "stripe" } });
    if (result.error) toast.info(result.error);
  };

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
          Subscription<span className="dot">.</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          plan · payment · receipts
        </p>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Current plan
              </p>
              <p className="brand-mark mt-1 text-2xl text-foreground">
                {premium ? "PremiumThing" : "SimpleThing"}
                <span className="dot">.</span>
              </p>
            </div>
            {premium && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-[color:var(--rare)]/15 px-2.5 py-1 text-[10px] uppercase tracking-widest text-[color:var(--rare)]">
                <Gift className="h-3 w-3" /> active
              </span>
            )}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {premium
              ? `PremiumThing. is active. Your themes, Premium profile icons, AI tag suggestions, extra tag room, Boost and Time Capsule Credit exemption, and ${PREMIUM_MONTHLY_SAME_CREDITS} monthly Same Credits are available.`
              : "You’re on the free plan. PremiumThing. brings the full icon and card-theme catalogue, AI tag suggestions, more tag room, Credit-free Boost and Time Capsule, and a monthly Same Credit allowance."}
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Payment method</p>
          {methods.length > 0 ? (
            <div className="mt-3 space-y-2">
              {methods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3"
                >
                  <CreditCard className="h-5 w-5 text-accent" />
                  <div className="flex-1 text-sm text-foreground">
                    {method.brand ?? "Card"} ···· {method.last4 ?? "••••"}
                    <p className="text-xs text-muted-foreground">
                      Expires {method.exp_month}/{method.exp_year}
                    </p>
                  </div>
                  {method.is_default && (
                    <span className="text-[10px] uppercase tracking-widest text-accent">
                      default
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/40 p-4">
              <ShieldCheck className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">No card on file</p>
                <p className="text-xs text-muted-foreground">
                  Secure card entry is prepared but payment is not connected yet.
                </p>
              </div>
            </div>
          )}
          <Button
            variant="secondary"
            onClick={() => void openSetup()}
            className="mt-3 w-full rounded-full"
          >
            <CreditCard className="mr-1 h-4 w-4" /> Add payment method
          </Button>
          {setupOpen && (
            <div className="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
              <p className="flex items-center gap-2 text-sm text-foreground">
                <LockKeyhole className="h-4 w-4 text-accent" /> Secure card entry
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Card details will be entered in the payment provider’s tokenised form when billing
                is enabled. SameThing. never needs your full card number or security code. Nothing
                is collected or charged in this release.
              </p>
              <button
                type="button"
                onClick={() => setSetupOpen(false)}
                className="mt-3 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                close
              </button>
            </div>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-accent/20 bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Premium includes
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              "All Premium profile icons, with the same privacy rules as every account.",
              "Locked share-card palettes for MyThing. and MyQuote.; theme saves are free.",
              "Font changes on share cards without the non-Premium extra Credit charge.",
              "AI tag suggestions and a larger custom-tag allowance.",
              "Boost MyThing. and Time Capsule without spending Same Credits.",
              `${PREMIUM_MONTHLY_SAME_CREDITS} Same Credits once per active month for other in-app paths.`,
              "Premium styling on your public profile and eligible content surfaces.",
              "The Research API is under development and temporarily unavailable.",
            ].map((feature) => (
              <div
                key={feature}
                className="flex gap-2 rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-xs leading-5 text-muted-foreground"
              >
                <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </section>

        {!premium && (
          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Choose a plan</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {PLANS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelected(item.key)}
                  className={`rounded-2xl border p-3 text-left transition-colors ${selected === item.key ? "border-accent bg-accent/10" : "border-border hover:bg-secondary/40"}`}
                >
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {item.name}
                  </p>
                  <p className="mt-1 font-serif text-xl text-foreground">
                    ${item.price.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{item.suffix}</p>
                </button>
              ))}
            </div>
            <Label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">
              Discount code
            </Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 20))}
                placeholder="e.g. SAME2026"
                className="h-10 bg-background"
              />
              <Button
                variant="secondary"
                onClick={applyCode}
                className="h-10 shrink-0 rounded-full px-4"
              >
                Apply
              </Button>
            </div>
            {discount && (
              <p className="mt-1.5 text-xs text-accent">30% off your first term applied.</p>
            )}
            <div className="mt-4 space-y-1 border-t border-border pt-3">
              <Summary label="Subtotal" value={`$${plan.price.toFixed(2)}`} />
              {discount && (
                <Summary label="Discount" value={`−$${(plan.price - total).toFixed(2)}`} />
              )}
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Total
                </span>
                <span className="font-serif text-2xl text-foreground">${total.toFixed(2)}</span>
              </div>
            </div>
            <Button
              disabled
              className="mt-4 w-full rounded-full bg-accent text-accent-foreground opacity-60"
            >
              Payments unavailable
            </Button>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> No card is charged in this release.
            </p>
          </section>
        )}

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
            <Receipt className="h-3.5 w-3.5" /> Payment history
          </p>
          <p className="mt-3 text-sm text-muted-foreground">No payments yet.</p>
        </section>
        <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>{" "}
          ·{" "}
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </p>
      </AppShell>
    </OnboardingGate>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
