import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Copy, Gift, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { useAuth } from "@/hooks/use-auth";
import { getSiteUrl } from "@/lib/site-url";
import { claimReferralCode, getReferenceData } from "@/lib/api/me.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reference")({
  head: () => ({
    meta: [
      { title: "Reference · SameThing." },
      { name: "description", content: "Share your SameThing. reference ID." },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/reference") }],
  }),
  component: ReferencePage,
});

function ReferencePage() {
  const { profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const getData = useServerFn(getReferenceData);
  const claim = useServerFn(claimReferralCode);
  const [copied, setCopied] = useState(false);
  const [claimCode, setClaimCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const code = profile?.referral_code ?? "—";
  const { data } = useQuery({
    queryKey: ["reference"],
    queryFn: () => getData(),
    enabled: Boolean(profile),
    staleTime: 30_000,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Reference ID copied.");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn’t copy — select it manually.");
    }
  };

  const applyCode = async () => {
    if (!claimCode.trim()) return;
    setClaiming(true);
    const result = await claim({ data: { code: claimCode.trim() } });
    setClaiming(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setClaimCode("");
    toast.success(`You received ${result.reward} Same credits.`);
    await Promise.all([qc.invalidateQueries({ queryKey: ["reference"] }), refreshProfile()]);
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
          Reference<span className="dot">.</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite someone once. They receive 5 Same credits; you receive 10.
        </p>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Your reference ID
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 truncate rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm tracking-widest text-foreground">
              {code}
            </code>
            <button
              onClick={copy}
              aria-label="Copy reference ID"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground transition-opacity hover:opacity-90"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            The reward is granted only once per new account and cannot be applied to your own
            account.
          </p>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> references
            </div>
            <p className="mt-2 font-serif text-3xl italic text-foreground">{data?.count ?? 0}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              invited thinkers
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" /> same credits
            </div>
            <p className="mt-2 font-serif text-3xl italic text-foreground">
              {data?.credits ?? profile?.same_credits ?? 0}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              balance to spend
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Gift className="h-3.5 w-3.5" /> use a reference ID
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            If someone invited you, enter their code. This can be used once and gives you 5 Same
            credits.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={claimCode}
              onChange={(event) => setClaimCode(event.target.value.slice(0, 80))}
              placeholder="e.g. alex-1a2b3c"
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => void applyCode()}
              disabled={claiming || !claimCode.trim()}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm text-accent-foreground disabled:opacity-50"
            >
              {claiming ? "Applying…" : "Apply"}
            </button>
          </div>
        </section>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          Same Credits can be spent on Time Capsule and Boost MyThing. Free accounts use 10–60
          credits by duration, including 60 credits for five years; PremiumThing. accounts are
          exempt.
        </p>

        <section className="mt-5 rounded-2xl border border-dashed border-border p-6 text-center">
          {data?.referrals?.length ? (
            <div className="text-left">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Your referrals
              </p>
              <ul className="mt-3 space-y-2">
                {data.referrals.map((referral: { id: string; username: string }) => (
                  <li
                    key={referral.id}
                    className="flex items-center justify-between rounded-xl bg-background/50 px-3 py-2 text-sm"
                  >
                    <span>@{referral.username}</span>
                    <span className="text-xs text-muted-foreground">+10 credits</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <p className="font-serif text-lg italic text-foreground">
                Nobody yet. Share your ID.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your successful referrals will appear here.
              </p>
            </>
          )}
        </section>
      </AppShell>
    </OnboardingGate>
  );
}
