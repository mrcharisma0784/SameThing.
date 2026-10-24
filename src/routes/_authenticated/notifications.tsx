import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import {
  getMyNotifications,
  markInboxSeen,
  type NotificationItem,
} from "@/lib/api/notifications.functions";
import {
  MessageCircle,
  MessageSquareQuote,
  Heart,
  ThumbsUp,
  ThumbsDown,
  AtSign,
  Trash2,
  Pin,
  Megaphone,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/thing-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Inbox · SameThing." }] }),
  component: NotificationsPage,
});

const DISMISS_KEY = "inbox:dismissed";
const PIN_KEY = "inbox:pinned";
const MAX_PINS = 3;

function loadSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}
function saveSet(key: string, s: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(s)));
  } catch {
    /* noop */
  }
}

function iconFor(n: NotificationItem) {
  if (n.kind === "comment") return MessageCircle;
  if (n.kind === "like" || n.kind === "quote_like") return Heart;
  if (n.kind === "quote_comment") return MessageSquareQuote;
  if (n.kind === "same") return ThumbsUp;
  if (n.kind === "nah") return ThumbsDown;
  if (n.kind === "follow") return Eye;
  if (n.kind === "system") return Megaphone;
  return AtSign;
}
function labelFor(n: NotificationItem) {
  if (n.kind === "comment") return "New comment";
  if (n.kind === "like") return "New Like";
  if (n.kind === "quote_comment") return "New Quote comment";
  if (n.kind === "quote_like") return "New Quote Like";
  if (n.kind === "same") return "Someone said Same";
  if (n.kind === "nah") return "Someone said Nah";
  if (n.kind === "follow") return "People you watch";
  if (n.kind === "system") return "System message";
  return "You were mentioned";
}

function Row({
  n,
  pinned,
  dx,
  tutorial,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onNavigate,
}: {
  n: NotificationItem;
  pinned: boolean;
  dx: number;
  tutorial: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onNavigate: () => void;
}) {
  const Icon = iconFor(n);
  // Swipe LEFT (dx < 0) reveals RIGHT bg → PIN action
  // Swipe RIGHT (dx > 0) reveals LEFT bg → DISMISS action
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 left-0 flex items-center gap-2 bg-destructive/15 px-4 text-destructive">
        <Trash2 className="h-4 w-4" />
        <span className="text-xs uppercase tracking-widest">dismiss</span>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center gap-2 bg-accent/15 px-4 text-accent">
        <Pin className="h-4 w-4" />
        <span className="text-xs uppercase tracking-widest">{pinned ? "unpin" : "pin"}</span>
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translateX(${dx}px)`,
          transition: tutorial
            ? "transform 720ms cubic-bezier(0.22, 0.61, 0.36, 1)"
            : dx === 0 || Math.abs(dx) >= 400
              ? "transform 160ms ease-out"
              : "none",
          touchAction: "pan-y",
        }}
      >
        <div
          className={cn(
            "flex items-start gap-3 rounded-2xl border p-4 bg-card",
            pinned ? "border-accent/50" : "border-border",
          )}
          onClick={(e) => {
            if (Math.abs(dx) > 6) {
              e.preventDefault();
              return;
            }
            onNavigate();
          }}
        >
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-full",
              n.kind === "same"
                ? "bg-accent/15 text-accent"
                : n.kind === "nah"
                  ? "bg-muted text-muted-foreground"
                  : n.kind === "mention" ||
                      n.kind === "follow" ||
                      n.kind === "like" ||
                      n.kind === "quote_like" ||
                      n.kind === "quote_comment"
                    ? "bg-accent/15 text-accent"
                    : "bg-background text-foreground border border-border",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              {pinned && <Pin className="h-3 w-3 text-accent" />} {labelFor(n)}
            </p>
            <p className="mt-0.5 truncate font-serif text-base text-foreground">{n.thing_title}</p>
            {n.preview && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">“{n.preview}”</p>
            )}
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {relativeTime(n.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadSet(DISMISS_KEY));
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => loadSet(PIN_KEY));
  const [rowDx, setRowDx] = useState<Record<string, number>>({});
  const [tutorialId, setTutorialId] = useState<string | null>(null);
  const startX = useRef<number | null>(null);
  const dragging = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: async () => (await getMyNotifications()).items,
  });

  useEffect(() => {
    void markInboxSeen().then(() => {
      void qc.invalidateQueries({ queryKey: ["inbox-unread"] });
    });
  }, [qc]);

  const dismissOne = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveSet(DISMISS_KEY, next);
      return next;
    });
    setPinnedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      saveSet(PIN_KEY, next);
      return next;
    });
  };
  const togglePin = (id: string): boolean => {
    let ok = true;
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= MAX_PINS) {
          ok = false;
          return prev;
        }
        next.add(id);
      }
      saveSet(PIN_KEY, next);
      return next;
    });
    return ok;
  };

  const visible = useMemo(
    () => (data ?? []).filter((n) => !dismissed.has(n.id)),
    [data, dismissed],
  );
  const sorted = useMemo(
    () =>
      [...visible].sort((a, b) => {
        const pa = pinnedIds.has(a.id) ? 0 : 1;
        const pb = pinnedIds.has(b.id) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return +new Date(b.created_at) - +new Date(a.created_at);
      }),
    [visible, pinnedIds],
  );

  useEffect(() => {
    if (isLoading || !data) return;
    const welcome = data.find(
      (n) =>
        n.kind === "system" &&
        n.thing_title.replace(/^\[System\]\s*/, "") === "Welcome to SameThing.",
    );
    if (!welcome) return;
    const seenKey = `samething:inbox-swipe-demo:${welcome.system_id ?? welcome.id}`;
    try {
      if (localStorage.getItem(seenKey)) return;
      localStorage.setItem(seenKey, "done");
    } catch {
      return;
    }

    const id = welcome.id;
    setTutorialId(id);
    const moveTo = (x: number) => setRowDx((current) => ({ ...current, [id]: x }));
    const timers = [
      window.setTimeout(() => moveTo(88), 550),
      window.setTimeout(() => moveTo(-88), 1550),
      window.setTimeout(() => moveTo(0), 2550),
      window.setTimeout(() => setTutorialId(null), 3350),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [data, isLoading]);

  const onDown = (_id: string) => (e: React.PointerEvent) => {
    startX.current = e.clientX;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (id: string) => (e: React.PointerEvent) => {
    if (!dragging.current || startX.current === null) return;
    const d = e.clientX - startX.current;
    setRowDx((prev) => ({ ...prev, [id]: d }));
  };
  const onUp = (id: string) => (e: React.PointerEvent) => {
    dragging.current = false;
    startX.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    const d = rowDx[id] ?? 0;
    if (Math.abs(d) > 110) {
      if (d > 0) {
        // Right swipe → DISMISS
        setRowDx((prev) => ({ ...prev, [id]: 500 }));
        setTimeout(() => {
          dismissOne(id);
          setRowDx((prev) => {
            const n = { ...prev };
            delete n[id];
            return n;
          });
        }, 160);
      } else {
        // Left swipe → PIN toggle
        const ok = togglePin(id);
        if (!ok) toast.error(`You can pin up to ${MAX_PINS}.`);
        setRowDx((prev) => ({ ...prev, [id]: 0 }));
      }
    } else {
      setRowDx((prev) => ({ ...prev, [id]: 0 }));
    }
  };

  const goTo = (n: NotificationItem) => {
    if (n.link) {
      window.location.href = n.link;
      return;
    }
    if (n.kind === "system" || n.kind === "follow") return;
    navigate({
      to: "/thing/$id",
      params: { id: n.thing_id },
      hash: n.comment_id ? `c-${n.comment_id}` : undefined,
    });
  };

  return (
    <OnboardingGate>
      <AppShell>
        <div>
          <h1 className="brand-mark text-4xl text-foreground">
            Inbox<span className="dot">.</span>
          </h1>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {isLoading && (
            <div className="h-20 animate-pulse rounded-2xl border border-border bg-card" />
          )}
          {!isLoading && sorted.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nothing yet. Drop a thing and see who relates.
            </p>
          )}
          {sorted.map((n) => (
            <Row
              key={n.id}
              n={n}
              pinned={pinnedIds.has(n.id)}
              dx={rowDx[n.id] ?? 0}
              tutorial={tutorialId === n.id}
              onPointerDown={onDown(n.id)}
              onPointerMove={onMove(n.id)}
              onPointerUp={onUp(n.id)}
              onNavigate={() => goTo(n)}
            />
          ))}
        </div>
      </AppShell>
    </OnboardingGate>
  );
}
