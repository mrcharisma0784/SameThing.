import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, Flag, MessageSquare, Pin, PinOff, Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ThingCard, type ThingCardData } from "@/components/ThingCard";
import { getThing } from "@/lib/api/feed.functions";
import {
  addComment,
  reportTarget,
  pinComment,
  updateComment,
  deleteComment,
} from "@/lib/api/things.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/thing-helpers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MentionTextarea, renderWithMentions } from "@/components/MentionTextarea";
import { ProfileGlyph } from "@/components/ProfileGlyph";
import { useValidMentions } from "@/hooks/use-valid-mentions";
import { getSiteUrl } from "@/lib/site-url";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/thing/$id")({
  loader: async ({ params }) => {
    try {
      const res = await getThing({ data: { id: params.id } });
      return { thing: (res as { thing: unknown }).thing };
    } catch {
      return { thing: null };
    }
  },
  head: ({ params, loaderData }) => {
    const t = loaderData?.thing as
      { simplified_text?: string; title?: string | null; created_at?: string } | null | undefined;
    const url = getSiteUrl(`/thing/${params.id}`);
    const raw = t?.title || t?.simplified_text || "A thing on SameThing.";
    const title = (raw.length > 55 ? `${raw.slice(0, 55)}…` : raw) + " · SameThing.";
    const descRaw =
      t?.simplified_text ||
      "Same or Nah? Vote on this thing on SameThing. and find out you're not the only one.";
    const description =
      descRaw.length > 160
        ? `${descRaw.slice(0, 157)}…`
        : descRaw.length < 50
          ? `${descRaw} Vote Same or Nah on SameThing. and discover you're not the only one.`
          : descRaw;
    const scripts = t
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SocialMediaPosting",
              headline: raw,
              datePublished: t.created_at,
              author: { "@type": "Person", name: "Anonymous" },
              url,
            }),
          },
        ]
      : [];
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts,
    };
  },
  component: ThingDetail,
});

type CommentRow = {
  id: string;
  text: string;
  is_anonymous: boolean;
  created_at: string;
  edited_at?: string | null;
  user_id: string | null;
  parent_id: string | null;
  pinned_at: string | null;
  is_mine?: boolean;
  author?: {
    username: string;
    emoji: string;
    avatar_url?: string | null;
    plan?: string;
  } | null;
};

function ThingDetail() {
  const { id } = Route.useParams();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const fetch = useServerFn(getThing);
  const comment = useServerFn(addComment);
  const report = useServerFn(reportTarget);
  const pin = useServerFn(pinComment);
  const editComment = useServerFn(updateComment);
  const removeComment = useServerFn(deleteComment);
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("harmful");
  const [reportBusy, setReportBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["thing", id],
    queryFn: () => fetch({ data: { id } }),
  });

  useEffect(() => {
    const ch = supabase
      .channel(`thing-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `thing_id=eq.${id}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["thing", id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "things", filter: `id=eq.${id}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["thing", id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [id, qc]);

  const m = useMutation({
    mutationFn: async (vars: { text: string; parent_id: string | null }) => {
      const res = await comment({
        data: {
          thing_id: id,
          text: vars.text.trim(),
          is_anonymous: anon,
          parent_id: vars.parent_id,
        },
      });
      if ((res as { error?: string }).error) throw new Error((res as { error: string }).error);
    },
    onSuccess: () => {
      setText("");
      setReplyText("");
      setReplyTo(null);
      void qc.invalidateQueries({ queryKey: ["thing", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = data as
    { thing: (ThingCardData & { is_mine?: boolean }) | null; comments: CommentRow[] } | undefined;
  const mentionTexts = d?.thing
    ? [d.thing.simplified_text, ...(d.comments ?? []).map((c) => c.text)]
    : [];
  const validMentions = useValidMentions(mentionTexts);
  if (isLoading) {
    return (
      <AppShell>
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
      </AppShell>
    );
  }
  if (!d?.thing) {
    return (
      <AppShell>
        <p className="text-center font-serif text-xl italic text-muted-foreground">Not found.</p>
      </AppShell>
    );
  }

  const thing = d.thing;
  const isOwner = Boolean(thing.is_mine);
  const commentsClosed = Boolean(thing.comments_closed);
  const visibleCommentCount = user ? d.comments.length : Number(thing.comment_count ?? 0);

  const top = d.comments.filter((c) => !c.parent_id);
  const repliesBy = new Map<string, CommentRow[]>();
  d.comments
    .filter((c) => c.parent_id)
    .forEach((c) => {
      const arr = repliesBy.get(c.parent_id!) ?? [];
      arr.push(c);
      repliesBy.set(c.parent_id!, arr);
    });

  const reportComment = (cid: string) => {
    setReportCommentId(cid);
    setReportReason("harmful");
  };

  const submitCommentReport = async () => {
    if (!reportCommentId || !reportReason) return;
    setReportBusy(true);
    const r = await report({
      data: { target_type: "comment", target_id: reportCommentId, reason: reportReason },
    });
    setReportBusy(false);
    if ((r as { error?: string }).error) {
      toast.error((r as { error: string }).error);
      return;
    }
    setReportCommentId(null);
    toast.success("Comment reported. Thanks for keeping it safe.");
  };

  const togglePin = async (c: CommentRow) => {
    const r = await pin({ data: { comment_id: c.id, pin: !c.pinned_at } });
    if ((r as { error?: string }).error) toast.error((r as { error: string }).error!);
    else {
      toast.success(c.pinned_at ? "Unpinned." : "Pinned.");
      void qc.invalidateQueries({ queryKey: ["thing", id] });
    }
  };

  const startEditing = (c: CommentRow) => {
    setEditingCommentId(c.id);
    setEditingText(c.text);
    setReplyTo(null);
  };

  const saveEditedComment = async (c: CommentRow) => {
    const r = await editComment({ data: { id: c.id, text: editingText } });
    if ((r as { error?: string }).error) {
      toast.error((r as { error: string }).error);
      return;
    }
    setEditingCommentId(null);
    setEditingText("");
    toast.success("Comment updated.");
    void qc.invalidateQueries({ queryKey: ["thing", id] });
  };

  const removeOwnComment = (c: CommentRow) => {
    setDeleteCommentId(c.id);
  };

  const confirmRemoveOwnComment = async () => {
    if (!deleteCommentId) return;
    const commentId = deleteCommentId;
    setDeletingCommentId(commentId);
    const r = await removeComment({ data: { id: commentId } });
    setDeletingCommentId(null);
    if ((r as { error?: string }).error) {
      toast.error((r as { error: string }).error);
      return;
    }
    setDeleteCommentId(null);
    toast.success("Comment deleted.");
    void qc.invalidateQueries({ queryKey: ["thing", id] });
  };

  const creatorId = (thing as { user_id?: string | null }).user_id ?? null;

  const renderComment = (c: CommentRow, depth = 0) => {
    const mine = Boolean(c.is_mine);
    const isCreator = !c.is_anonymous && !!c.user_id && !!creatorId && c.user_id === creatorId;
    const creatorBadge = isCreator ? (
      <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-accent">
        creator
      </span>
    ) : null;
    const authorNode =
      c.is_anonymous || !c.author ? (
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-full border border-border bg-background/60 text-[10px] text-muted-foreground">
            ?
          </div>
          <span className="text-xs text-muted-foreground">anonymous</span>
        </div>
      ) : (
        <Link
          to={mine ? "/me" : "/u/$username"}
          params={mine ? undefined : { username: c.author.username }}
          className="flex items-center gap-2 hover:opacity-80"
        >
          <div className="grid h-6 w-6 place-items-center rounded-full border border-border bg-background/60 text-[13px]">
            <ProfileGlyph
              value={c.author.emoji}
              photoUrl={c.author.avatar_url}
              className="h-3 w-3"
            />
          </div>
          <span className="text-xs text-foreground">@{c.author.username}</span>
          {creatorBadge}
        </Link>
      );
    return (
      <li key={c.id} className={depth > 0 ? "ml-6 mt-3" : ""}>
        <div
          className={`rounded-2xl border bg-card p-4 ${c.pinned_at ? "border-accent/50" : "border-border"}`}
        >
          {/* Header: author top-left, action icons top-right */}
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {c.pinned_at && <Pin className="h-3 w-3 text-accent" />}
              {authorNode}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
              {isOwner && (
                <button
                  aria-label={c.pinned_at ? "Unpin comment" : "Pin comment"}
                  onClick={() => togglePin(c)}
                  className="hover:text-foreground"
                  title={c.pinned_at ? "Unpin" : "Pin"}
                >
                  {c.pinned_at ? (
                    <PinOff className="h-3.5 w-3.5" />
                  ) : (
                    <Pin className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              {user && !commentsClosed && depth === 0 && (
                <button
                  aria-label="Reply"
                  onClick={() => {
                    setReplyTo(replyTo === c.id ? null : c.id);
                    setReplyText("");
                  }}
                  className="hover:text-foreground"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
              )}
              {mine && (
                <>
                  <button
                    aria-label="Edit comment"
                    onClick={() => startEditing(c)}
                    className="hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label="Delete comment"
                    onClick={() => void removeOwnComment(c)}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              {user && !mine && (
                <button
                  aria-label="Report comment"
                  onClick={() => reportComment(c.id)}
                  className="hover:text-foreground"
                >
                  <Flag className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          {editingCommentId === c.id ? (
            <div className="rounded-xl border border-border bg-background/50 p-3">
              <MentionTextarea
                value={editingText}
                onChange={setEditingText}
                placeholder="Edit your comment…"
                className="min-h-[76px] resize-none border-0 bg-transparent focus-visible:ring-0"
              />
              <div className="flex items-center justify-end gap-2 border-t border-border pt-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={editingText.trim().length === 0}
                  onClick={() => void saveEditedComment(c)}
                  className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground">{renderWithMentions(c.text, validMentions)}</p>
          )}

          {/* Footer: timestamp plus edited state */}
          <p className="mt-2 text-[10px] text-muted-foreground">
            {relativeTime(c.created_at)}
            {c.edited_at ? " · Edited" : ""}
          </p>
        </div>
        {replyTo === c.id && (
          <div className="ml-6 mt-2 rounded-2xl border border-border bg-card p-3">
            <MentionTextarea
              value={replyText}
              onChange={setReplyText}
              placeholder="Write a reply…"
              className="min-h-[60px] resize-none border-0 bg-transparent focus-visible:ring-0"
            />
            <div className="flex items-center justify-end gap-2 border-t border-border pt-2">
              <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={replyText.trim().length === 0 || m.isPending}
                onClick={() => m.mutate({ text: replyText, parent_id: c.id })}
                className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Reply
              </Button>
            </div>
          </div>
        )}
        {(repliesBy.get(c.id) ?? []).length > 0 && (
          <ul className="space-y-2">
            {(repliesBy.get(c.id) ?? []).map((r) => renderComment(r, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  // Sort top-level: pinned first
  const sortedTop = [...top].sort((a, b) => {
    if (a.pinned_at && !b.pinned_at) return -1;
    if (!a.pinned_at && b.pinned_at) return 1;
    return +new Date(a.created_at) - +new Date(b.created_at);
  });

  return (
    <>
      <AppShell>
        <Link
          to="/"
          className="mb-3 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> back to feed
        </Link>

        <h1 className="sr-only">
          {thing.title || thing.simplified_text || "A thing on SameThing."}
        </h1>

        <ThingCard thing={thing} featured />

        {commentsClosed ? (
          <section className="mt-8">
            <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Comments are closed on this thing.
            </p>
          </section>
        ) : (
          <section className="mt-8">
            <h2 className="brand-mark text-2xl text-foreground">
              {visibleCommentCount} {visibleCommentCount === 1 ? "comment" : "comments"}
              <span className="dot">.</span>
            </h2>

            {user ? (
              <div className="mt-3 rounded-2xl border border-border bg-card p-3">
                <MentionTextarea
                  value={text}
                  onChange={setText}
                  placeholder="Add your thoughts…"
                  className="min-h-[80px] resize-none border-0 bg-transparent focus-visible:ring-0"
                />
                <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={anon}
                      onChange={(e) => setAnon(e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    anonymous
                  </label>
                  <Button
                    size="sm"
                    disabled={text.trim().length === 0 || m.isPending}
                    onClick={() => m.mutate({ text, parent_id: null })}
                    className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    Send
                  </Button>
                </div>
              </div>
            ) : (
              <Link
                to="/auth"
                className="mt-3 block rounded-2xl border border-border bg-card p-4 text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Sign in to add your thoughts.
              </Link>
            )}

            <ul className="mt-5 space-y-3">
              {sortedTop.map((c) => renderComment(c, 0))}
              {d.comments.length === 0 && (
                <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No comments yet. Be the first.
                </li>
              )}
            </ul>
          </section>
        )}
      </AppShell>
      <AlertDialog
        open={Boolean(deleteCommentId)}
        onOpenChange={(open) => {
          if (!open && !deletingCommentId) setDeleteCommentId(null);
        }}
      >
        <AlertDialogContent className="mx-6 w-[calc(100%-3rem)] max-w-md rounded-3xl border-border bg-card p-6 text-foreground sm:mx-0 sm:w-full sm:p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl font-normal not-italic">
              Delete this comment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This comment will be removed from the conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={Boolean(deletingCommentId)}
              className="rounded-full border-border bg-background text-foreground hover:bg-secondary"
            >
              Keep it
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(deletingCommentId)}
              onClick={(event) => {
                event.preventDefault();
                void confirmRemoveOwnComment();
              }}
              className="rounded-full bg-[oklch(0.56_0.24_25)] text-white hover:bg-[oklch(0.49_0.24_25)]"
            >
              {deletingCommentId ? "Deleting…" : "Delete comment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(reportCommentId)}
        onOpenChange={(open) => {
          if (!open && !reportBusy) setReportCommentId(null);
        }}
      >
        <AlertDialogContent className="mx-6 w-[calc(100%-3rem)] max-w-md rounded-3xl border-border bg-card p-6 text-foreground sm:mx-0 sm:w-full sm:p-7">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl font-normal not-italic">
              Report this comment
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose the reason that best describes the problem. The report will appear in the Admin
              reports queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <select
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
          >
            <option value="harmful">Harmful or violent</option>
            <option value="spam">Spam or unwanted promotion</option>
            <option value="hate">Hate speech</option>
            <option value="sexual">Sexual content</option>
            <option value="self-harm risk">Self-harm risk</option>
            <option value="harassment">Harassment or bullying</option>
            <option value="other">Other</option>
          </select>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={reportBusy}
              className="rounded-full border-border bg-background text-foreground hover:bg-secondary"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={reportBusy || !reportReason}
              onClick={(event) => {
                event.preventDefault();
                void submitCommentReport();
              }}
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {reportBusy ? "Reporting…" : "Submit report"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
