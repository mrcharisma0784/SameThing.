import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SettingsBackLink } from "@/components/SettingsBackLink";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowLeft, Coins, Hourglass, LockKeyhole, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  createTimeCapsule,
  deleteTimeCapsule,
  listTimeCapsules,
  TIME_CAPSULE_COSTS,
  type TimeCapsuleDuration,
} from "@/lib/api/credits.functions";
import { getSiteUrl } from "@/lib/site-url";
import { toast } from "sonner";

type Capsule = { id: string; text: string; openAt: string; createdAt: string };

const DURATIONS: Array<{ label: string; months: TimeCapsuleDuration }> = [
  { label: "1 month", months: 1 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "1 year", months: 12 },
  { label: "5 years", months: 60 },
];

function addMonths(from: Date, months: number) {
  const date = new Date(from);
  date.setMonth(date.getMonth() + months);
  return date;
}

function toLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatOpenDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export const Route = createFileRoute("/_authenticated/capsules")({
  head: () => ({
    meta: [
      { title: "Time Capsule · SameThing." },
      { name: "description", content: "Seal a thing for your future self." },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/capsules") }],
  }),
  component: CapsulesPage,
});

function CapsulesPage() {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const list = useServerFn(listTimeCapsules);
  const create = useServerFn(createTimeCapsule);
  const remove = useServerFn(deleteTimeCapsule);
  const [text, setText] = useState("");
  const [months, setMonths] = useState<TimeCapsuleDuration>(12);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["time-capsules"],
    queryFn: () => list(),
    enabled: Boolean(profile),
    staleTime: 20_000,
  });
  const capsules = (data?.capsules ?? []) as Capsule[];
  const today = useMemo(() => new Date(), []);
  const openAt = toLocalDateInput(addMonths(today, months));
  const firstCapsule = capsules.length === 0;
  const premium = Boolean(data?.premium);
  const selectedCost = firstCapsule || premium ? 0 : TIME_CAPSULE_COSTS[months];

  const add = async () => {
    if (text.trim().length < 3) {
      toast.error("Write a little more first.");
      return;
    }
    setBusy(true);
    try {
      const result = await create({ data: { text: text.trim(), open_at: openAt, months } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setText("");
      toast.success(
        result.cost > 0
          ? `Sealed for your future self · −${result.cost} Same Credits`
          : "Sealed for your future self.",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["time-capsules"] }),
        refreshProfile(),
      ]);
    } finally {
      setBusy(false);
    }
  };

  const removeCapsule = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await remove({ data: { id } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["time-capsules"] });
      toast.success("Time Capsule removed.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <OnboardingGate>
      <AppShell>
        <SettingsBackLink />
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="brand-mark text-3xl text-foreground">
              Time Capsule<span className="dot">.</span>
            </h1>
            <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              a thing for your future self
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 text-xs text-accent">
            <Coins className="h-3.5 w-3.5" /> {data?.credits ?? profile?.same_credits ?? 0}
          </span>
        </div>

        <section className="mt-5 rounded-3xl border border-border bg-card p-5">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, 600))}
            placeholder="I hope next year I'm happier..."
            className="min-h-[150px] resize-none rounded-2xl bg-background text-base"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {DURATIONS.map((duration) => {
              const selected = duration.months === months;
              const cost = firstCapsule || premium ? 0 : TIME_CAPSULE_COSTS[duration.months];
              return (
                <button
                  key={duration.months}
                  type="button"
                  onClick={() => setMonths(duration.months)}
                  className={`rounded-full border px-3.5 py-2 text-xs transition-colors ${
                    selected
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {duration.label} · {cost === 0 ? "free" : `${cost} credits`}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <Hourglass className="h-4 w-4 shrink-0" />
            <span>
              Opens {formatOpenDate(openAt)} · {text.length}/600
            </span>
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            {premium
              ? "PremiumThing. · every capsule is free"
              : firstCapsule
                ? "Your first Time Capsule is free · later capsules use Same Credits"
                : `This capsule uses ${selectedCost} Same Credits`}
          </p>

          <Button
            onClick={() => void add()}
            disabled={
              busy ||
              text.trim().length < 3 ||
              (!premium && !firstCapsule && (data?.credits ?? 0) < selectedCost)
            }
            className="mt-4 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <LockKeyhole className="mr-2 h-4 w-4" />
            {busy
              ? "Sealing…"
              : selectedCost > 0
                ? `Save · ${selectedCost} credits`
                : "Save as Time Capsule"}
          </Button>
          <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Private · only you ever read it
          </p>
        </section>

        <h2 className="mt-7 font-serif text-2xl italic text-foreground">Still sealed.</h2>

        <section className="mt-3 space-y-2">
          {isLoading ? (
            <div className="h-20 animate-pulse rounded-2xl border border-border bg-card" />
          ) : capsules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nothing sealed yet.
            </div>
          ) : (
            capsules.map((capsule) => (
              <article key={capsule.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <LockKeyhole className="h-4 w-4 shrink-0 text-[color:var(--rare)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      Opens {formatOpenDate(capsule.openAt)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      sealed {formatOpenDate(capsule.createdAt.slice(0, 10))}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={deletingId === capsule.id}
                    onClick={() => void removeCapsule(capsule.id)}
                    className="rounded-full p-2 text-muted-foreground hover:text-destructive disabled:opacity-50"
                    aria-label="Delete capsule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </AppShell>
    </OnboardingGate>
  );
}
