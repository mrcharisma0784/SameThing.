import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  Award,
  CalendarHeart,
  Check,
  Clock3,
  Coins,
  Eye,
  Flame,
  Hand,
  Heart,
  Link2,
  Loader2,
  LockKeyhole,
  MessageCircle,
  MessageSquare,
  PenLine,
  Quote as QuoteIcon,
  Share2,
  Sparkles,
  UserRound,
  UsersRound,
  Vote,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { getAchievementOverview, claimAchievement } from "@/lib/api/achievements.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements · SameThing." },
      { name: "description", content: "Earn Same Credits by taking part in SameThing." },
    ],
  }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const { profile, refreshProfile } = useAuth();
  const getOverview = useServerFn(getAchievementOverview);
  const claim = useServerFn(claimAchievement);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["achievements"],
    queryFn: () => getOverview(),
    enabled: Boolean(profile),
    staleTime: 20_000,
  });

  const claimTask = async (key: string) => {
    const result = await claim({ data: { key } });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`+${result.reward} Same Credits`);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["achievements"] }),
      refreshProfile(),
    ]);
  };

  const items = (data?.items ?? []) as AchievementItem[];
  const oneTime = items.filter((item) => item.cadence === "one_time" && !item.claimed);
  const daily = [...items.filter((item) => item.cadence === "daily")].sort(
    (a, b) => Number(a.completed) - Number(b.completed),
  );
  const weekly = [...items.filter((item) => item.cadence === "weekly")].sort(
    (a, b) => Number(a.completed) - Number(b.completed),
  );

  return (
    <OnboardingGate>
      <AppShell>
        <Link
          to="/settings"
          className="mb-3 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> settings
        </Link>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="brand-mark text-3xl text-foreground">
              Achievements<span className="dot">.</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Small actions. A little more Same.</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm text-accent">
            <Coins className="h-4 w-4" /> {data?.credits ?? profile?.same_credits ?? 0}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 flex justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <AchievementSection title="First times" items={oneTime} onClaim={claimTask} />
            <AchievementSection title="Every day" items={daily} onClaim={claimTask} />
            <AchievementSection title="This week" items={weekly} onClaim={claimTask} />
          </>
        )}
        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          Same Credits are kept server-side and can’t be claimed twice in the same task cycle.
        </p>
      </AppShell>
    </OnboardingGate>
  );
}

type AchievementItem = {
  key: string;
  title: string;
  description: string;
  reward: number;
  iconKey: string;
  completed: boolean;
  claimed: boolean;
  claimable: boolean;
  cadence: "one_time" | "daily" | "weekly";
  difficulty?: "gentle" | "steady" | "rare" | "legendary";
};

function AchievementIcon({ iconKey }: { iconKey: string }) {
  const icons: Record<string, typeof Award> = {
    sparkles: Sparkles,
    vote: Vote,
    profile: UserRound,
    comment: MessageCircle,
    quote: QuoteIcon,
    feedback: PenLine,
    capsule: Clock3,
    follow: Eye,
    followers: UsersRound,
    share: Share2,
    rare: Award,
    "daily-quote": CalendarHeart,
    "daily-vote": Hand,
    "daily-comment": MessageSquare,
    "daily-thing": Link2,
    like: Heart,
    "weekly-thing": Link2,
    "weekly-vote": Vote,
    "weekly-comment": MessageCircle,
    "weekly-like": Heart,
    "weekly-quote": CalendarHeart,
    "weekly-share": Share2,
    collection: Award,
    signal: Vote,
    thread: MessageCircle,
    spark: Sparkles,
    orbit: UsersRound,
    streak: Flame,
    open: Eye,
    "heart-milestone": Heart,
    "vote-milestone": Vote,
    "comment-milestone": MessageSquare,
    "legend-heart": Award,
    "legend-vote": Vote,
    "legend-comment": MessageCircle,
    "daily-signal": Hand,
    "daily-thread": MessageSquare,
    "daily-duo": Link2,
    "daily-heart": Heart,
    "weekly-stack": Link2,
    "weekly-signal": Vote,
    "weekly-thread": MessageCircle,
    "weekly-heart": Heart,
    "weekly-voice": CalendarHeart,
    "weekly-outward": Share2,
  };
  const Icon = icons[iconKey] ?? Sparkles;
  return <Icon className="h-5 w-5" strokeWidth={1.7} />;
}

function AchievementSection({
  title,
  items,
  onClaim,
}: {
  title: string;
  items: AchievementItem[];
  onClaim: (key: string) => Promise<void>;
}) {
  const [rowDx, setRowDx] = useState<Record<string, number>>({});
  const startX = useRef<number | null>(null);
  const activeKey = useRef<string | null>(null);
  const dragging = useRef(false);

  const onPointerDown = (item: AchievementItem) => (event: React.PointerEvent<HTMLElement>) => {
    if (!item.claimable) return;
    startX.current = event.clientX;
    activeKey.current = item.key;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (item: AchievementItem) => (event: React.PointerEvent<HTMLElement>) => {
    if (!dragging.current || activeKey.current !== item.key || startX.current === null) return;
    setRowDx((current) => ({
      ...current,
      [item.key]: Math.max(0, event.clientX - startX.current!),
    }));
  };
  const onPointerUp = (item: AchievementItem) => async (event: React.PointerEvent<HTMLElement>) => {
    if (!dragging.current || activeKey.current !== item.key) return;
    dragging.current = false;
    startX.current = null;
    activeKey.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const dx = rowDx[item.key] ?? 0;
    if (item.claimable && dx > 96) {
      setRowDx((current) => ({ ...current, [item.key]: 260 }));
      await onClaim(item.key);
    }
    setRowDx((current) => ({ ...current, [item.key]: 0 }));
  };

  return (
    <section className="mt-5">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <div className="mt-2 space-y-2">
        {!items.length && (
          <p className="rounded-2xl border border-dashed border-border bg-card/40 px-4 py-5 text-center text-sm text-muted-foreground">
            {title === "First times"
              ? "All first-time achievements are complete."
              : "No active tasks right now."}
          </p>
        )}
        {items.map((item) => {
          const dx = rowDx[item.key] ?? 0;
          return (
            <div key={item.key} className="relative overflow-hidden rounded-2xl">
              {item.claimable && (
                <div className="absolute inset-0 bg-accent/10" aria-hidden="true" />
              )}
              <article
                className={`relative flex items-center gap-3 rounded-2xl border p-3 transition-colors ${item.claimable ? "border-accent/50 bg-accent/5" : "border-border bg-card"}`}
                style={{
                  transform: `translateX(${dx}px)`,
                  transition:
                    dx === 0 || dx > 96 ? "transform 180ms cubic-bezier(0.23, 1, 0.32, 1)" : "none",
                  touchAction: item.claimable ? "pan-y" : undefined,
                }}
                onPointerDown={onPointerDown(item)}
                onPointerMove={onPointerMove(item)}
                onPointerUp={(event) => void onPointerUp(item)(event)}
                onPointerCancel={(event) => void onPointerUp(item)(event)}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background font-serif text-lg text-accent">
                  <AchievementIcon iconKey={item.iconKey} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    {item.difficulty && (
                      <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                        {item.difficulty}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                </div>
                {item.claimed ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-accent" /> claimed
                  </span>
                ) : item.claimable ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onClaim(item.key);
                    }}
                    className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-transform active:scale-[0.97]"
                  >
                    +{item.reward}
                  </button>
                ) : item.completed ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5" /> done
                  </span>
                ) : (
                  <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                )}
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}
