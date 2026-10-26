import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Heart,
  MessageCircle,
  MessageSquare,
  MessageSquareOff,
  MoreHorizontal,
  Pencil,
  Rocket,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  boostThing,
  deleteThing,
  restoreThing,
  likeThing,
  reportTarget,
  unlikeThing,
  updateThing,
  voteOnThing,
} from "@/lib/api/things.functions";
import { useAuth } from "@/hooks/use-auth";
import { effectivePlan } from "@/lib/premium";
import { isLabThingActive } from "@/lib/test-user";
import { supabase } from "@/integrations/supabase/client";
import { formatCount, isBadgeActive, relativeTime, similarityLabel } from "@/lib/thing-helpers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { renderWithMentions } from "@/components/MentionTextarea";
import { ProfileGlyph } from "@/components/ProfileGlyph";
import { useValidMentions } from "@/hooks/use-valid-mentions";
import { MyThingShareModal } from "@/components/MyThingShareModal";
import { BOOST_CREDIT_COSTS } from "@/lib/api/credits.functions";

export type ThingCardData = {
  id: string;
  title: string | null;
  simplified_text: string;
  language?: string;
  tags?: string[];
  is_anonymous?: boolean;
  is_open_to_chat?: boolean;
  comments_closed?: boolean;
  same_count: number;
  nah_count: number;
  total_votes: number;
  similarity_score: number;
  comment_count: number;
  like_count: number;
  liked_by_me?: boolean;
  is_rare_thing?: boolean;
  created_at: string;
  deleted_at?: string | null;
  boosted_at?: string | null;
  boosted_until?: string | null;
  boost_duration_hours?: number | null;
  share_palette?: string | null;
  share_font?: string | null;
  user_id?: string | null;
  is_mine?: boolean;
  author?: {
    username: string;
    emoji: string;
    plan?: string;
  } | null;
};

export function ThingCard({
  thing,
  featured = false,
  onUpdate,
}: {
  thing: ThingCardData;
  featured?: boolean;
  onUpdate?: (next: Partial<ThingCardData>) => void;
}) {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const vote = useServerFn(voteOnThing);
  const report = useServerFn(reportTarget);
  const like = useServerFn(likeThing);
  const unlike = useServerFn(unlikeThing);
  const update = useServerFn(updateThing);
  const remove = useServerFn(deleteThing);
  const restore = useServerFn(restoreThing);
  const boost = useServerFn(boostThing);
  const [local, setLocal] = useState(thing);
  const [reportOtherOpen, setReportOtherOpen] = useState(false);
  const [reportOtherReason, setReportOtherReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [userVote, setUserVote] = useState<"same" | "nah" | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [ownerActionBusy, setOwnerActionBusy] = useState(false);
  const [interactionFx, setInteractionFx] = useState<"same" | "nah" | "like" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mentionTexts = useMemo(() => [local.simplified_text], [local.simplified_text]);
  const validMentions = useValidMentions(mentionTexts);

  const triggerInteractionFx = (kind: "same" | "nah" | "like") => {
    setInteractionFx(kind);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    interactionTimer.current = setTimeout(() => setInteractionFx(null), 520);
  };

  useEffect(() => {
    return () => {
      if (interactionTimer.current) clearTimeout(interactionTimer.current);
    };
  }, []);

  useEffect(() => {
    setLocal(thing);
  }, [thing]);

  const isOwn = Boolean(local.is_mine || (user && local.user_id && local.user_id === user.id));

  // Load user's existing vote (skip if it's our own thing — owners can't vote)
  useEffect(() => {
    if (!user || isOwn) {
      setUserVote(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("votes")
      .select("vote_type")
      .eq("thing_id", thing.id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setUserVote((data?.vote_type as "same" | "nah") ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, thing.id, isOwn]);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [menuOpen]);

  const m = useMutation({
    mutationFn: async (vote_type: "same" | "nah") => {
      const res = await vote({ data: { thing_id: local.id, vote_type } });
      if (res.error) throw new Error(res.error);
      return { vote_type, thing: res.thing };
    },
    onSuccess: ({ vote_type, thing: updated }) => {
      setUserVote(vote_type);
      triggerInteractionFx(vote_type);
      if (updated) {
        const next = { ...local, ...updated };
        setLocal(next);
        onUpdate?.(updated);
      }
      void qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleVote = (t: "same" | "nah") => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (m.isPending) return;
    m.mutate(t);
  };

  const submitReport = async (reason: string) => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setMenuOpen(false);
    const res = await report({ data: { target_type: "thing", target_id: local.id, reason } });
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Report sent to the admin team.");
  };

  const handleReport = async (reason: string) => {
    if (reason === "other") {
      setMenuOpen(false);
      setReportOtherReason("");
      setReportOtherOpen(true);
      return;
    }
    await submitReport(reason);
  };

  const submitOtherReport = async () => {
    if (!reportOtherReason.trim()) return;
    setReportBusy(true);
    await submitReport(reportOtherReason.trim());
    setReportBusy(false);
    setReportOtherOpen(false);
    setReportOtherReason("");
  };

  const openShare = () => {
    setMenuOpen(false);
    setEditOpen(false);
    setShareOpen(true);
  };

  const ownerUpdate = async (patch: { is_anonymous?: boolean; comments_closed?: boolean }) => {
    if (!user || !isOwn) return;
    setOwnerActionBusy(true);
    const res = await update({ data: { id: local.id, ...patch } });
    setOwnerActionBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    const next = { ...local, ...patch };
    setLocal(next);
    onUpdate?.(patch);
  };

  const removeOwnThing = async () => {
    if (!window.confirm("Remove this Thing from view? You can undo this now.")) return;
    setOwnerActionBusy(true);
    const res = await remove({ data: { id: local.id } });
    setOwnerActionBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    const deletedAt = res.thing?.deleted_at ?? new Date().toISOString();
    setLocal((current) => ({ ...current, deleted_at: deletedAt }));
    onUpdate?.({ deleted_at: deletedAt });
    setMenuOpen(false);
    const undoDelete = async () => {
      const restored = await restore({ data: { id: local.id } });
      if (restored.error) {
        toast.error(restored.error);
        return;
      }
      setLocal((current) => ({ ...current, deleted_at: null }));
      onUpdate?.({ deleted_at: null });
      toast.success("Thing restored.");
      await qc.invalidateQueries({ queryKey: ["feed"] });
    };
    toast.success("Thing removed from view.", {
      duration: 9000,
      action: { label: "Undo", onClick: () => void undoDelete() },
    });
    await qc.invalidateQueries({ queryKey: ["feed"] });
  };

  const labThingActive = isLabThingActive(profile);
  const isPremium = effectivePlan(profile) === "premium";
  const credits = profile?.same_credits ?? 0;
  const boostCost = (duration_hours: 6 | 24 | 72) =>
    isPremium || labThingActive ? 0 : BOOST_CREDIT_COSTS[duration_hours];
  const canBoost =
    isPremium || labThingActive || credits >= Math.min(...Object.values(BOOST_CREDIT_COSTS));

  const boostOwnThing = async (duration_hours: 6 | 24 | 72) => {
    const cost = boostCost(duration_hours);
    if (!isPremium && !labThingActive && credits < cost) {
      toast.error(`You need ${cost} Same Credits for this Boost.`);
      return;
    }
    setOwnerActionBusy(true);
    const res = await boost({ data: { id: local.id, duration_hours } });
    setOwnerActionBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    const next = { ...local, ...res.thing };
    setLocal(next);
    onUpdate?.(res.thing ?? {});
    toast.success(
      cost > 0
        ? `MyThing. highlighted for ${duration_hours === 72 ? "3 days" : `${duration_hours} hours`} · −${cost} credits.`
        : `MyThing. highlighted for ${duration_hours === 72 ? "3 days" : `${duration_hours} hours`}.`,
    );
    setMenuOpen(false);
    setEditOpen(false);
    await refreshProfile();
    void qc.invalidateQueries({ queryKey: ["feed"] });
  };

  const handleLike = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (likeBusy) return;
    const wasLiked = Boolean(local.liked_by_me);
    setLikeBusy(true);
    setLocal((current) => ({
      ...current,
      liked_by_me: !wasLiked,
      like_count: Math.max(0, (current.like_count ?? 0) + (wasLiked ? -1 : 1)),
    }));
    const result = wasLiked
      ? await unlike({ data: { id: local.id } })
      : await like({ data: { thing_id: local.id } });
    setLikeBusy(false);
    if (result.error) {
      setLocal((current) => ({
        ...current,
        liked_by_me: wasLiked,
        like_count: Math.max(0, (current.like_count ?? 0) + (wasLiked ? 1 : -1)),
      }));
      toast.error(result.error);
      return;
    }
    onUpdate?.({ liked_by_me: !wasLiked, like_count: local.like_count + (wasLiked ? -1 : 1) });
    triggerInteractionFx("like");
    void qc.invalidateQueries({ queryKey: ["feed"] });
  };

  const badge = isBadgeActive(local.same_count, local.total_votes);
  const mineTag = isOwn ? "MyThing." : null;
  const titleSize = featured ? "text-2xl sm:text-3xl" : "text-xl";
  const isMyOwnAuthor = local.author && profile && local.author.username === profile.username;
  const isPremiumThing = local.author?.plan === "premium";
  const isBoostActive = Boolean(
    local.boosted_until && new Date(local.boosted_until).getTime() > Date.now(),
  );
  if (local.deleted_at) return null;

  return (
    <article
      className={cn(
        "thing-card relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5",
        featured && "border-accent/40 bg-gradient-to-b from-card to-card/60",
        isPremiumThing &&
          "border-[color:var(--rare)]/80 shadow-[0_0_24px_color-mix(in_srgb,var(--rare)_16%,transparent)]",
      )}
    >
      {isPremiumThing && (
        <span
          aria-label="PremiumThing."
          className="premium-thing-star absolute left-3 top-3 grid h-5 w-5 place-items-center rounded-full border border-accent/30 bg-accent/10 text-accent"
        >
          <Sparkles className="h-3 w-3" strokeWidth={1.8} />
        </span>
      )}
      <header className={cn("flex items-start justify-between gap-3", isPremiumThing && "pl-5")}>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {local.is_anonymous || !local.author ? (
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full border border-border bg-background/60 text-xs text-muted-foreground">
                ?
              </div>
              <span className="text-xs text-muted-foreground">anonymous</span>
            </div>
          ) : isMyOwnAuthor ? (
            <Link
              to="/me"
              className="flex min-w-0 items-center gap-2 hover:opacity-80"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`grid h-7 w-7 place-items-center rounded-full border border-border bg-background/60 text-sm ${local.author.plan === "premium" ? "premium-ring" : ""}`}
              >
                <ProfileGlyph value={local.author.emoji} className="h-3.5 w-3.5" />
              </div>
              <span className="truncate text-xs text-foreground">@{local.author.username}</span>
            </Link>
          ) : (
            <Link
              to="/u/$username"
              params={{ username: local.author.username }}
              className="flex min-w-0 items-center gap-2 hover:opacity-80"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`grid h-7 w-7 place-items-center rounded-full border border-border bg-background/60 text-sm ${local.author.plan === "premium" ? "premium-ring" : ""}`}
              >
                <ProfileGlyph value={local.author.emoji} className="h-3.5 w-3.5" />
              </div>
              <span className="truncate text-xs text-foreground">@{local.author.username}</span>
            </Link>
          )}
          {isBoostActive && (
            <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent">
              <Sparkles className="h-3 w-3" /> Featured
            </span>
          )}
          {mineTag && (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-accent">
              {mineTag}
            </span>
          )}
          {local.is_rare_thing && (
            <span className="rounded-full bg-[oklch(var(--rare)/0.18)] px-2 py-0.5 text-[10px] uppercase tracking-widest text-[color:var(--rare)]">
              ✦ Rare
            </span>
          )}
          {(local.tags ?? []).map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
        <div ref={menuRef} className="relative">
          <button
            aria-label="More"
            className="pressable rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-60 overflow-hidden rounded-2xl border border-border bg-popover p-1 shadow-2xl">
              {!editOpen ? (
                <>
                  <button
                    type="button"
                    onClick={openShare}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-foreground hover:bg-secondary"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                  {isOwn ? (
                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-foreground hover:bg-secondary"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                  ) : (
                    <div className="mt-1 border-t border-border pt-1">
                      <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                        Report
                      </p>
                      {[
                        { k: "harmful", l: "Harmful / violence" },
                        { k: "spam", l: "Spam" },
                        { k: "hate", l: "Hate speech" },
                        { k: "sexual", l: "Sexual content" },
                        { k: "self-harm risk", l: "Self-harm risk" },
                        { k: "other", l: "Other" },
                      ].map((r) => (
                        <button
                          key={r.k}
                          type="button"
                          className="block w-full rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
                          onClick={() => void handleReport(r.k)}
                        >
                          {r.l}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-secondary"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Edit Thing
                  </button>
                  <button
                    type="button"
                    disabled={ownerActionBusy}
                    onClick={() => void ownerUpdate({ is_anonymous: !local.is_anonymous })}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-foreground hover:bg-secondary disabled:opacity-50"
                  >
                    {local.is_anonymous ? (
                      <>
                        <Eye className="h-4 w-4" /> Make public
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4" /> Make anonymous
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={ownerActionBusy}
                    onClick={() => void ownerUpdate({ comments_closed: !local.comments_closed })}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-foreground hover:bg-secondary disabled:opacity-50"
                  >
                    {local.comments_closed ? (
                      <>
                        <MessageSquare className="h-4 w-4" /> Open comments
                      </>
                    ) : (
                      <>
                        <MessageSquareOff className="h-4 w-4" /> Close comments
                      </>
                    )}
                  </button>
                  <div className="mt-1 border-t border-border pt-1">
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Boost MyThing. ·{" "}
                      {isPremium || labThingActive
                        ? "LabThing. free"
                        : `${credits} credits available`}
                    </p>
                    {([6, 24, 72] as const).map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        disabled={
                          ownerActionBusy ||
                          (!isPremium && !labThingActive && credits < boostCost(hours))
                        }
                        onClick={() => void boostOwnThing(hours)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50 ${canBoost ? "hover:bg-secondary" : "opacity-45"}`}
                      >
                        <Rocket className="h-4 w-4" /> Under newest ·{" "}
                        {hours === 72 ? "3 days" : `${hours} hours`} ·{" "}
                        {boostCost(hours) === 0 ? "free" : `${boostCost(hours)} credits`}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1 border-t border-border pt-1">
                    <button
                      type="button"
                      disabled={ownerActionBusy}
                      onClick={() => void removeOwnThing()}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" /> Delete thing
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <Link to="/thing/$id" params={{ id: local.id }} className="block">
        <h3 className={cn("font-serif italic leading-snug text-foreground", titleSize)}>
          {renderWithMentions(local.simplified_text, validMentions)}
        </h3>
      </Link>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">
          {local.total_votes > 0
            ? isOwn || userVote
              ? `Similarity: ${Math.round(local.similarity_score)}% (${local.same_count}/${local.total_votes})`
              : `${local.total_votes} ${local.total_votes === 1 ? "vote" : "votes"}`
            : "no votes yet"}
          {" · "}
          {relativeTime(local.created_at)}
        </span>
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={handleLike}
            disabled={likeBusy}
            className={cn(
              "pressable like-action flex items-center gap-1 hover:text-foreground disabled:opacity-50",
              interactionFx === "like" && "like-action-success",
            )}
            aria-label={local.liked_by_me ? "Unlike Thing" : "Like Thing"}
            aria-pressed={Boolean(local.liked_by_me)}
          >
            <Heart
              className={`h-3.5 w-3.5 ${local.liked_by_me ? "fill-current text-accent" : ""}`}
            />
            {formatCount(local.like_count ?? 0)}
          </button>
          {!local.comments_closed && (
            <Link
              to="/thing/$id"
              params={{ id: local.id }}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {formatCount(local.comment_count)}
            </Link>
          )}
        </div>
      </div>

      {/* Vote bar / buttons */}
      {isOwn ? (
        <OwnerSimilarity local={local} badge={badge} />
      ) : local.total_votes > 0 && userVote ? (
        <SimilarityBar local={local} userVote={userVote} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={m.isPending}
            onClick={() => handleVote("same")}
            className={cn(
              "pressable vote-action same-action rounded-xl border border-border bg-[color:var(--same)]/12 px-4 py-3 text-sm font-medium text-[color:var(--same)] transition-all hover:bg-[color:var(--same)]/20 disabled:opacity-50",
              interactionFx === "same" && "same-action-success",
            )}
          >
            Same
          </button>
          <button
            disabled={m.isPending}
            onClick={() => handleVote("nah")}
            className={cn(
              "pressable vote-action nah-action rounded-xl border border-border bg-[color:var(--nah)] px-4 py-3 text-sm font-medium text-[color:var(--nah-foreground)] transition-all hover:bg-[color:var(--nah)]/80 disabled:opacity-50",
              interactionFx === "nah" && "nah-action-success",
            )}
          >
            Nah
          </button>
        </div>
      )}
      {shareOpen && <MyThingShareModal thing={local} onClose={() => setShareOpen(false)} />}
      {reportOtherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-foreground shadow-2xl">
            <h2 className="font-serif text-2xl font-normal">Report this Thing</h2>
            <p className="mt-3 text-sm leading-5 text-muted-foreground">
              Tell us what feels wrong. Your report will be reviewed by the SameThing team.
            </p>
            <textarea
              autoFocus
              value={reportOtherReason}
              onChange={(event) => setReportOtherReason(event.target.value)}
              rows={4}
              maxLength={60}
              placeholder="Reason for reporting…"
              className="mt-4 w-full rounded-2xl border border-border bg-background px-3 py-3 text-sm leading-5 outline-none focus:border-accent"
            />
            <div className="mt-4 flex justify-start gap-2">
              <button
                type="button"
                disabled={reportBusy || !reportOtherReason.trim()}
                onClick={() => void submitOtherReport()}
                className="rounded-full bg-accent px-4 py-2.5 text-sm text-accent-foreground disabled:opacity-50"
              >
                {reportBusy ? "Reporting…" : "Submit report"}
              </button>
              <button
                type="button"
                disabled={reportBusy}
                onClick={() => setReportOtherOpen(false)}
                className="rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function SimilarityBar({ local, userVote }: { local: ThingCardData; userVote: "same" | "nah" }) {
  const pct = useMemo(() => Math.round(local.similarity_score), [local.similarity_score]);
  return (
    <div className="space-y-2">
      <div className="relative h-2.5 overflow-hidden rounded-full bg-[color:var(--nah)]">
        <div
          className="bar-fill absolute inset-y-0 left-0 rounded-full bg-[color:var(--same)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">
          {formatCount(local.same_count)} Same · {formatCount(local.nah_count)} Nah
        </span>
        <span className="font-serif italic text-accent">
          {pct}% · {similarityLabel(pct, local.total_votes)}
        </span>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        You voted: {userVote === "same" ? "Same" : "Nah"}
      </p>
    </div>
  );
}

function OwnerSimilarity({ local, badge }: { local: ThingCardData; badge: boolean }) {
  const pct = Math.round(local.similarity_score);
  if (local.total_votes === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-3 text-center text-xs text-muted-foreground">
        No votes yet — waiting on the world.
      </div>
    );
  }
  if (badge) {
    return (
      <div className="badge-in flex items-center justify-center rounded-xl border border-[color:var(--rare)]/40 bg-[oklch(var(--rare)/0.12)] px-4 py-3 text-center">
        <span className="font-serif text-lg italic text-[color:var(--rare)]">
          You're the only one. 🫵
        </span>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="relative h-2.5 overflow-hidden rounded-full bg-[color:var(--nah)]">
        <div
          className="bar-fill absolute inset-y-0 left-0 rounded-full bg-[color:var(--same)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">
          Similarity: {pct}% ({local.same_count}/{local.total_votes})
        </span>
        <span className="font-serif italic text-accent">
          {similarityLabel(pct, local.total_votes)}
        </span>
      </div>
    </div>
  );
}
