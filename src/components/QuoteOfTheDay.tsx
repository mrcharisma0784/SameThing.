import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import {
  EyeOff,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Quote,
  Send,
  Share2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { relativeTime } from "@/lib/thing-helpers";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ProfileGlyph } from "@/components/ProfileGlyph";
import { renderSpecialTerms } from "@/components/MentionTextarea";
import { MyQuoteShareModal } from "@/components/MyQuoteShareModal";
import { useAuth } from "@/hooks/use-auth";
import {
  createQuote,
  deleteQuote,
  getMyQuote,
  getQuotesToday,
  likeQuote,
  unlikeQuote,
  updateQuote,
  restoreQuote,
} from "@/lib/api/quotes.functions";
import { reportTarget } from "@/lib/api/things.functions";

export type QuoteCommentItem = {
  id: string;
  text: string;
  is_anonymous: boolean;
  created_at: string;
  user_id: string | null;
  profile?: {
    username: string;
    emoji: string;
    plan?: string;
  } | null;
};

export type QuoteItem = {
  id: string;
  user_id?: string | null;
  text: string;
  author: string | null;
  is_anonymous: boolean;
  like_count: number;
  comment_count?: number;
  created_at?: string;
  deleted_at?: string | null;
  comments?: QuoteCommentItem[];
  profile?: {
    username: string;
    emoji: string;
    plan?: string;
  } | null;
  liked_by_me?: boolean;
  is_mine?: boolean;
  is_composer?: boolean;
};

export function QuoteOfTheDay() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(getQuotesToday);
  const mineFn = useServerFn(getMyQuote);
  const createFn = useServerFn(createQuote);
  const updateFn = useServerFn(updateQuote);
  const deleteFn = useServerFn(deleteQuote);
  const restoreFn = useServerFn(restoreQuote);
  const likeFn = useServerFn(likeQuote);
  const unlikeFn = useServerFn(unlikeQuote);
  const reportFn = useServerFn(reportTarget);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyLike, setBusyLike] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [localCounts, setLocalCounts] = useState<Record<string, number>>({});
  const [shareQuote, setShareQuote] = useState<QuoteItem | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{
    id: string;
    top: number;
    right: number;
  } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [interactionFx, setInteractionFx] = useState<"like" | "write" | null>(null);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const quotesRef = useRef<HTMLDivElement>(null);
  const slideNodes = useRef<Record<string, HTMLElement | null>>({});
  const [activeCardHeight, setActiveCardHeight] = useState<number | null>(null);

  const triggerInteractionFx = (kind: "like" | "write") => {
    setInteractionFx(kind);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    interactionTimer.current = setTimeout(() => setInteractionFx(null), 520);
  };

  useEffect(() => {
    return () => {
      if (interactionTimer.current) clearTimeout(interactionTimer.current);
    };
  }, []);

  const { data } = useQuery({
    queryKey: ["quotes", "today"],
    queryFn: () => listFn(),
    staleTime: 60_000,
  });
  const { data: mineData } = useQuery({
    queryKey: ["quotes", "mine"],
    queryFn: () => mineFn(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const quotes = useMemo(() => (data?.quotes ?? []) as QuoteItem[], [data]);
  const mine = (mineData?.quote ?? null) as QuoteItem | null;
  const displayQuotes = useMemo(() => {
    const rest = mine ? quotes.filter((item) => item.id !== mine.id) : quotes;
    if (mine) {
      const existingMine = quotes.find((item) => item.id === mine.id);
      return [
        {
          ...(existingMine ?? {}),
          ...mine,
          like_count: existingMine?.like_count ?? mine.like_count ?? 0,
          comment_count: existingMine?.comment_count ?? mine.comment_count ?? 0,
          profile: mine.profile ?? existingMine?.profile ?? null,
          is_mine: true,
        },
        ...rest,
      ];
    }
    if (user) {
      return [
        {
          id: "__quote_composer__",
          user_id: user.id,
          text: "",
          author: null,
          is_anonymous: false,
          like_count: 0,
          comment_count: 0,
          is_composer: true,
        },
        ...rest,
      ];
    }
    return rest;
  }, [mine, quotes, user]);

  const displayQuoteKey = displayQuotes.map((item) => item.id).join("|");
  useEffect(() => {
    setActiveIndex(0);
  }, [displayQuoteKey]);

  const startWriting = () => {
    setText(mine?.text ?? "");
    setAuthor(mine?.author ?? "");
    setAnonymous(mine?.is_anonymous ?? false);
    setOpen(true);
  };

  const save = async () => {
    if (text.trim().length < 8) {
      toast.error("A few more words.");
      return;
    }
    setSaving(true);
    const result = mine
      ? await updateFn({
          data: {
            id: mine.id,
            text: text.trim(),
            author: author.trim() || null,
            is_anonymous: anonymous,
          },
        })
      : await createFn({
          data: { text: text.trim(), author: author.trim() || null, is_anonymous: anonymous },
        });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(mine ? "Your quote was updated." : "Your quote is up for today.");
    triggerInteractionFx("write");
    setOpen(false);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["quotes", "today"] }),
      qc.invalidateQueries({ queryKey: ["quotes", "mine"] }),
    ]);
  };

  const remove = async (item: QuoteItem | null = mine) => {
    if (!item || !window.confirm("Delete this quote?")) return;
    setSaving(true);
    const result = await deleteFn({ data: { id: item.id } });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    const undoDelete = async () => {
      const restored = await restoreFn({ data: { id: item.id } });
      if (restored.error) {
        toast.error(restored.error);
        return;
      }
      toast.success("Quote restored.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["quotes", "today"] }),
        qc.invalidateQueries({ queryKey: ["quotes", "mine"] }),
      ]);
    };
    toast.success("Quote removed from view.", {
      duration: 9000,
      action: { label: "Undo", onClick: () => void undoDelete() },
    });
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["quotes", "today"] }),
      qc.invalidateQueries({ queryKey: ["quotes", "mine"] }),
    ]);
  };

  const closeQuoteMenu = () => {
    setMenuOpenId(null);
    setMenuAnchor(null);
  };

  const editItem = (item: QuoteItem) => {
    setText(item.text);
    setAuthor(item.author ?? "");
    setAnonymous(item.is_anonymous);
    setOpen(true);
    closeQuoteMenu();
  };

  const toggleAnonymous = async (item: QuoteItem) => {
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    setSaving(true);
    const result = await updateFn({
      data: {
        id: item.id,
        text: item.text,
        author: item.author,
        is_anonymous: !item.is_anonymous,
      },
    });
    setSaving(false);
    closeQuoteMenu();
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(item.is_anonymous ? "Your name is visible now." : "Quote is anonymous now.");
    await qc.invalidateQueries({ queryKey: ["quotes", "today"] });
    await qc.invalidateQueries({ queryKey: ["quotes", "mine"] });
  };

  const reportItem = async (item: QuoteItem, reason: string) => {
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    setMenuOpenId(null);
    const result = await reportFn({
      data: { target_type: "quote", target_id: item.id, reason },
    });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Report sent to the admin team.");
  };

  const toggleLike = async (item: QuoteItem) => {
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    if (busyLike) return;
    const isLiked = likedIds.has(item.id) || !!item.liked_by_me;
    setBusyLike(item.id);
    setLikedIds((current) => {
      const next = new Set(current);
      if (isLiked) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    setLocalCounts((current) => ({
      ...current,
      [item.id]: (current[item.id] ?? item.like_count) + (isLiked ? -1 : 1),
    }));
    const result = isLiked
      ? await unlikeFn({ data: { id: item.id } })
      : await likeFn({ data: { id: item.id } });
    setBusyLike(null);
    if (result.error) {
      setLikedIds((current) => {
        const next = new Set(current);
        if (isLiked) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
      setLocalCounts((current) => ({
        ...current,
        [item.id]: (current[item.id] ?? item.like_count) + (isLiked ? 1 : -1),
      }));
      toast.error(result.error);
    } else {
      triggerInteractionFx("like");
    }
  };

  useEffect(() => {
    if (menuOpenId === null) return;
    const closeMenuOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-quote-menu]")) return;
      setMenuOpenId(null);
      setMenuAnchor(null);
    };
    const closeMenuOnViewportChange = () => {
      setMenuOpenId(null);
      setMenuAnchor(null);
    };
    document.addEventListener("pointerdown", closeMenuOnOutsidePointer);
    document.addEventListener("scroll", closeMenuOnViewportChange, true);
    window.addEventListener("resize", closeMenuOnViewportChange);
    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsidePointer);
      document.removeEventListener("scroll", closeMenuOnViewportChange, true);
      window.removeEventListener("resize", closeMenuOnViewportChange);
    };
  }, [menuOpenId]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && cardRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  const openFromCard = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button,a,input,textarea,select,[data-quote-editor]")) return;
    if (!target?.closest("[data-quote-composer]")) return;
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    if (!open) startWriting();
  };

  const openFromCardKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button,a,input,textarea,select,[data-quote-editor]")) return;
    if (!target?.closest("[data-quote-composer]")) return;
    event.preventDefault();
    if (!user) void navigate({ to: "/auth" });
    else if (!open) startWriting();
  };

  const activeQuote = displayQuotes[activeIndex] ?? displayQuotes[0] ?? null;

  useEffect(() => {
    const slide = activeQuote ? slideNodes.current[activeQuote.id] : null;
    if (!slide) return;
    const measure = () => {
      const nextHeight = Math.ceil(slide.getBoundingClientRect().height);
      if (nextHeight > 0) setActiveCardHeight(nextHeight);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(slide);
    return () => observer.disconnect();
  }, [activeQuote, activeIndex, displayQuoteKey, open, text, author]);

  const menuItem =
    displayQuotes.find((item) => item.id === menuOpenId && !item.is_composer) ?? null;
  const menuItemIsOwner = Boolean(
    menuItem && (menuItem.is_mine || (user?.id && menuItem.user_id === user.id)),
  );

  const openComments = (item: QuoteItem) => {
    void navigate({ to: "/quote/$id", params: { id: item.id } });
  };

  return (
    <section
      ref={cardRef}
      aria-label="Quote of the day"
      className={cn(
        "quote-card relative cursor-pointer overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-card to-card/40 p-4",
        interactionFx === "write" && "quote-write-success",
      )}
      onClick={openFromCard}
      onKeyDown={openFromCardKeyboard}
      tabIndex={0}
    >
      <div className="flex items-center justify-between gap-3 pr-8">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-accent">
          <Quote className="h-3 w-3" /> Quote of the Day.
        </p>
      </div>
      {activeQuote && !activeQuote.is_composer && (
        <div
          data-quote-menu
          className="absolute right-3 top-3 z-20"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Quote actions"
            onClick={(event) => {
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              if (menuOpenId === activeQuote.id) {
                closeQuoteMenu();
                return;
              }
              setMenuOpenId(activeQuote.id);
              setMenuAnchor({
                id: activeQuote.id,
                top: Math.min(rect.bottom + 8, Math.max(8, window.innerHeight - 320)),
                right: Math.max(8, window.innerWidth - rect.right),
              });
            }}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      )}
      {displayQuotes.length === 0 ? (
        <p className="mt-3 font-serif text-lg italic text-muted-foreground">
          No quote yet today. Say the thing everyone needed to hear.
        </p>
      ) : (
        <div
          ref={quotesRef}
          style={activeCardHeight ? { height: `${activeCardHeight}px` } : undefined}
          onScroll={(event) => {
            const element = event.currentTarget;
            const step = element.clientWidth + 12;
            if (step > 12) {
              setActiveIndex(
                Math.max(
                  0,
                  Math.min(displayQuotes.length - 1, Math.round(element.scrollLeft / step)),
                ),
              );
            }
            if (menuOpenId) closeQuoteMenu();
          }}
          className="mt-3 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth pb-1 transition-[height] duration-200 ease-out [scrollbar-width:none]"
        >
          {displayQuotes.map((item) => {
            if (item.is_composer) {
              return (
                <article
                  key={item.id}
                  data-quote-composer
                  data-quote-slide
                  ref={(node) => {
                    slideNodes.current[item.id] = node;
                  }}
                  className="relative min-w-0 flex-[0_0_100%] snap-start snap-always pr-1"
                >
                  <p className="font-serif text-2xl italic leading-tight text-foreground">
                    Your words, today<span className="dot">.</span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Tap anywhere on this card to write it.
                  </p>
                </article>
              );
            }
            const liked = likedIds.has(item.id) || !!item.liked_by_me;
            const count = localCounts[item.id] ?? item.like_count;
            const comments = item.comments?.length ?? item.comment_count ?? 0;
            const profileVisible = !item.is_anonymous && !!item.profile;
            const authorRow = profileVisible ? (
              <Link
                to="/u/$username"
                params={{ username: item.profile!.username }}
                className="flex min-w-0 items-center gap-2 hover:text-foreground"
                onClick={(event) => event.stopPropagation()}
              >
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 translate-x-px translate-y-px place-items-center rounded-full border border-border bg-background/60",
                    item.profile!.plan === "premium" && "premium-ring",
                  )}
                >
                  <ProfileGlyph value={item.profile!.emoji} className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-xs text-foreground">@{item.profile!.username}</span>
              </Link>
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 translate-x-px translate-y-px place-items-center rounded-full border border-border bg-background/60 text-xs text-muted-foreground">
                  ?
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {item.author || "Anonymous"}
                </span>
              </div>
            );
            return (
              <article
                key={item.id}
                ref={(node) => {
                  slideNodes.current[item.id] = node;
                }}
                data-quote-slide
                className="relative min-w-0 flex-[0_0_100%] snap-start snap-always pr-1"
              >
                <div className="mb-3 flex items-center justify-between gap-3">{authorRow}</div>
                <p className="pr-8 font-serif text-xl italic leading-snug text-foreground">
                  “{renderSpecialTerms(item.text)}”
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="mr-auto text-[10px] uppercase tracking-widest text-muted-foreground/75">
                    {item.created_at ? relativeTime(item.created_at) : "today"}
                  </span>
                  <button
                    onClick={() => void toggleLike(item)}
                    disabled={busyLike === item.id}
                    className={cn(
                      "pressable like-action flex shrink-0 items-center gap-1 hover:text-foreground disabled:opacity-50",
                      interactionFx === "like" && "like-action-success",
                    )}
                    aria-label={liked ? "Unlike quote" : "Like quote"}
                    aria-pressed={liked}
                  >
                    <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current text-accent" : ""}`} />
                    {count}
                  </button>
                  <button
                    onClick={() => openComments(item)}
                    className="flex shrink-0 items-center gap-1 hover:text-foreground"
                    aria-label="Open quote comments"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {comments}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {menuItem &&
        menuAnchor &&
        menuAnchor.id === menuItem.id &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-quote-menu
            className="fixed z-[80] max-h-[calc(100vh-1rem)] w-60 max-w-[calc(100vw-1rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-2xl"
            style={{ top: menuAnchor.top, right: menuAnchor.right }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setShareQuote(menuItem);
                closeQuoteMenu();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-secondary"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
            {menuItemIsOwner ? (
              <>
                <button
                  type="button"
                  onClick={() => editItem(menuItem)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-secondary"
                >
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void toggleAnonymous(menuItem)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-secondary disabled:opacity-50"
                >
                  <EyeOff className="h-4 w-4" />
                  {menuItem.is_anonymous ? "Make public" : "Make anonymous"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void remove(menuItem)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete quote
                </button>
              </>
            ) : user ? (
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
                ].map((reason) => (
                  <button
                    key={reason.k}
                    type="button"
                    onClick={() => void reportItem(menuItem, reason.k)}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-secondary"
                  >
                    {reason.l}
                  </button>
                ))}
              </div>
            ) : null}
          </div>,
          document.body,
        )}

      {open && (
        <div
          data-quote-editor
          className="mt-4 rounded-xl border border-border bg-background/60 p-3"
          onClick={(event) => event.stopPropagation()}
        >
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, 220))}
            placeholder="Today's words…"
            className="min-h-[80px] bg-card"
            autoFocus
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {text.length}/220 · one per day
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              {anonymous ? "anonymous" : "your name"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setAnonymous((value) => !value)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${anonymous ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground"}`}
            >
              anonymous
            </button>
            <Button
              onClick={() => void save()}
              disabled={saving}
              size="sm"
              className="pressable write-action rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {saving ? "Saving…" : mine ? "Update" : "Send"}
            </Button>
          </div>
          {mine && (
            <button
              onClick={() => void remove()}
              disabled={saving}
              className="mt-2 flex items-center gap-1 text-[10px] uppercase tracking-widest text-destructive"
            >
              <Trash2 className="h-3 w-3" /> delete my quote
            </button>
          )}
        </div>
      )}
      {shareQuote && <MyQuoteShareModal quote={shareQuote} onClose={() => setShareQuote(null)} />}
    </section>
  );
}
