import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { MessageCircle, MoreHorizontal, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { voteOnThing, reportTarget } from "@/lib/api/things.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatCount, isBadgeActive, relativeTime, similarityLabel } from "@/lib/thing-helpers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { renderWithMentions } from "@/components/MentionTextarea";
import { useValidMentions } from "@/hooks/use-valid-mentions";

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
  is_rare_thing?: boolean;
  created_at: string;
  user_id?: string | null;
  is_mine?: boolean;
  author?: { username: string; emoji: string; plan?: string } | null;
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
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const vote = useServerFn(voteOnThing);
  const report = useServerFn(reportTarget);
  const [local, setLocal] = useState(thing);
  const [userVote, setUserVote] = useState<"same" | "nah" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mentionTexts = useMemo(() => [local.simplified_text], [local.simplified_text]);
  const validMentions = useValidMentions(mentionTexts);


  useEffect(() => { setLocal(thing); }, [thing]);

  const isOwn = Boolean(local.is_mine || (user && local.user_id && local.user_id === user.id));

  // Load user's existing vote (skip if it's our own thing — owners can't vote)
  useEffect(() => {
    if (!user || isOwn) { setUserVote(null); return; }
    let cancelled = false;
    supabase.from("votes").select("vote_type").eq("thing_id", thing.id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setUserVote((data?.vote_type as "same" | "nah") ?? null); });
    return () => { cancelled = true; };
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
    if (!user) { navigate({ to: "/auth" }); return; }
    if (m.isPending) return;
    m.mutate(t);
  };

  const handleReport = async (reason: string) => {
    if (!user) { navigate({ to: "/auth" }); return; }
    setMenuOpen(false);
    const res = await report({ data: { target_type: "thing", target_id: local.id, reason } });
    if (res.error) toast.error(res.error);
    else toast.success("Reported. Thanks for keeping it safe.");
  };

  const badge = isBadgeActive(local.same_count, local.total_votes);
  const lang = (profile?.language === "tr" ? "tr" : "en") as "en" | "tr";

  const mineTag = isOwn ? "MyThing." : null;
  const titleSize = featured ? "text-2xl sm:text-3xl" : "text-xl";
  const isMyOwnAuthor = local.author && profile && local.author.username === profile.username;

  return (
    <article
      className={cn(
        "thing-card relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5",
        featured && "border-accent/40 bg-gradient-to-b from-card to-card/60",
      )}
    >
      <header className="flex items-start justify-between gap-3">
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
              <div className={`grid h-7 w-7 place-items-center rounded-full border border-border bg-background/60 text-sm ${local.author.plan === "premium" ? "premium-ring" : ""}`}>
                {local.author.emoji}
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
              <div className={`grid h-7 w-7 place-items-center rounded-full border border-border bg-background/60 text-sm ${local.author.plan === "premium" ? "premium-ring" : ""}`}>
                {local.author.emoji}
              </div>
              <span className="truncate text-xs text-foreground">@{local.author.username}</span>
              {local.author.plan === "premium" && (
                <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-accent">
                  ✦
                </span>
              )}
            </Link>
          )}
          {featured && !local.is_rare_thing && (
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
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 w-48 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-2xl">
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">Report</p>
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
                  className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-foreground hover:bg-secondary"
                  onClick={() => handleReport(r.k)}
                >
                  {r.l}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <Link to="/thing/$id" params={{ id: local.id }} className="block">
        <h3 className={cn("font-serif italic leading-snug text-foreground", titleSize)}>
          {renderWithMentions(local.simplified_text, validMentions)}
        </h3>
      </Link>


      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {local.total_votes > 0
            ? (isOwn || userVote)
              ? `Similarity: ${Math.round(local.similarity_score)}% (${local.same_count}/${local.total_votes})`
              : (lang === "tr" ? `${local.total_votes} oy` : `${local.total_votes} ${local.total_votes === 1 ? "vote" : "votes"}`)
            : (lang === "tr" ? "henüz oy yok" : "no votes yet")}
          {" · "}{relativeTime(local.created_at, lang)}
        </span>
        {!local.comments_closed && (
          <Link to="/thing/$id" params={{ id: local.id }} className="flex items-center gap-1 hover:text-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            {formatCount(local.comment_count)}
          </Link>
        )}
      </div>

      {/* Vote bar / buttons */}
      {isOwn ? (
        <OwnerSimilarity local={local} lang={lang} badge={badge} />
      ) : local.total_votes > 0 && userVote ? (
        <SimilarityBar local={local} lang={lang} userVote={userVote} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={m.isPending}
            onClick={() => handleVote("same")}
            className={cn(
              "rounded-xl border border-border bg-[color:var(--same)]/12 px-4 py-3 text-sm font-medium text-[color:var(--same)] transition-all hover:bg-[color:var(--same)]/20 disabled:opacity-50",
            )}
          >
            Same
          </button>
          <button
            disabled={m.isPending}
            onClick={() => handleVote("nah")}
            className="rounded-xl border border-border bg-[color:var(--nah)] px-4 py-3 text-sm font-medium text-[color:var(--nah-foreground)] transition-all hover:bg-[color:var(--nah)]/80 disabled:opacity-50"
          >
            Nah
          </button>
        </div>
      )}
    </article>
  );
}

function SimilarityBar({
  local,
  lang,
  userVote,
}: {
  local: ThingCardData;
  lang: "en" | "tr";
  userVote: "same" | "nah";
}) {
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
          {pct}% · {similarityLabel(pct, local.total_votes, lang)}
        </span>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {lang === "tr" ? "Oyun:" : "You voted:"} {userVote === "same" ? "Same" : "Nah"}
      </p>
    </div>
  );
}

function OwnerSimilarity({ local, lang, badge }: { local: ThingCardData; lang: "en" | "tr"; badge: boolean }) {
  const pct = Math.round(local.similarity_score);
  if (local.total_votes === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-3 text-center text-xs text-muted-foreground">
        {lang === "tr" ? "Henüz oy yok — başkalarının ne hissettiğini bekle." : "No votes yet — waiting on the world."}
      </div>
    );
  }
  if (badge) {
    return (
      <div className="badge-in flex items-center justify-center rounded-xl border border-[color:var(--rare)]/40 bg-[oklch(var(--rare)/0.12)] px-4 py-3 text-center">
        <span className="font-serif text-lg italic text-[color:var(--rare)]">
          {lang === "tr" ? "Bu evrende sadece sen. 🫵" : "You're the only one. 🫵"}
        </span>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="relative h-2.5 overflow-hidden rounded-full bg-[color:var(--nah)]">
        <div className="bar-fill absolute inset-y-0 left-0 rounded-full bg-[color:var(--same)]" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">
          Similarity: {pct}% ({local.same_count}/{local.total_votes})
        </span>
        <span className="font-serif italic text-accent">{similarityLabel(pct, local.total_votes, lang)}</span>
      </div>
    </div>
  );
}
