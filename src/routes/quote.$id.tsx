import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Flag,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Send,
  Share2,
  Trash2,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ProfileGlyph } from "@/components/ProfileGlyph";
import { MyQuoteShareModal } from "@/components/MyQuoteShareModal";
import { useAuth } from "@/hooks/use-auth";
import {
  addQuoteComment,
  deleteQuote,
  getQuoteDetail,
  pinQuoteComment,
  updateQuote,
} from "@/lib/api/quotes.functions";
import { deleteComment, reportTarget, updateComment } from "@/lib/api/things.functions";
import { getSiteUrl } from "@/lib/site-url";
import { relativeTime } from "@/lib/thing-helpers";
import { MentionTextarea, renderWithMentions } from "@/components/MentionTextarea";
import { useValidMentions } from "@/hooks/use-valid-mentions";
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
import { toast } from "sonner";

export const Route = createFileRoute("/quote/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Quote · SameThing." },
      { name: "description", content: "A quote shared on SameThing." },
    ],
    links: [{ rel: "canonical", href: getSiteUrl(`/quote/${params.id}`) }],
  }),
  component: QuoteDetailPage,
});

type Quote = {
  id: string;
  user_id: string | null;
  text: string;
  author: string | null;
  is_anonymous: boolean;
  like_count: number;
  comment_count?: number;
  created_at: string;
  profile?: { username: string; emoji: string; plan?: string } | null;
  is_mine?: boolean;
};

type CommentRow = {
  id: string;
  text: string;
  is_anonymous: boolean;
  created_at: string;
  edited_at?: string | null;
  user_id: string | null;
  parent_id?: string | null;
  pinned_at?: string | null;
  is_mine?: boolean;
  profile?: { username: string; emoji: string; plan?: string } | null;
};

function QuoteDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetch = useServerFn(getQuoteDetail);
  const addComment = useServerFn(addQuoteComment);
  const editQuote = useServerFn(updateQuote);
  const removeQuote = useServerFn(deleteQuote);
  const report = useServerFn(reportTarget);
  const editComment = useServerFn(updateComment);
  const removeCommentServer = useServerFn(deleteComment);
  const pinComment = useServerFn(pinQuoteComment);
  const [commentText, setCommentText] = useState("");
  const [commentAnonymous, setCommentAnonymous] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState(false);
  const [editingText, setEditingText] = useState("");
  const [editingAuthor, setEditingAuthor] = useState("");
  const [editingAnonymous, setEditingAnonymous] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("harmful");
  const [reportBusy, setReportBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => fetch({ data: { id } }),
  });
  const d = data as
    | { quote: Quote | null; comments: CommentRow[]; previous: Quote | null; next: Quote | null }
    | undefined;
  const validMentions = useValidMentions((d?.comments ?? []).map((comment) => comment.text));
  const quote = d?.quote;
  const isOwner = Boolean(quote?.is_mine || (user?.id && quote?.user_id === user.id));

  const refresh = () => void qc.invalidateQueries({ queryKey: ["quote", id] });

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setBusy(true);
    const result = await addComment({
      data: {
        quote_id: id,
        text: commentText.trim(),
        is_anonymous: commentAnonymous,
        parent_id: replyTo,
      },
    });
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setCommentText("");
    setReplyText("");
    setReplyTo(null);
    refresh();
  };

  const saveQuote = async () => {
    if (!quote || !editingText.trim()) return;
    setBusy(true);
    const result = await editQuote({
      data: {
        id: quote.id,
        text: editingText.trim(),
        author: editingAuthor.trim() || null,
        is_anonymous: editingAnonymous,
      },
    });
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setEditingQuote(false);
    toast.success("Quote updated.");
    refresh();
  };

  const remove = async () => {
    if (!quote || !window.confirm("Delete this quote?")) return;
    setBusy(true);
    const result = await removeQuote({ data: { id: quote.id } });
    setBusy(false);
    if (result.error) toast.error(result.error);
    else window.location.href = "/";
  };

  const submitReport = async () => {
    const result = await report({
      data: { target_type: "quote", target_id: id, reason: "harmful" },
    });
    if (result.error) toast.error(result.error);
    else toast.success("Reported.");
    setMenuOpen(false);
  };

  const reportComment = (commentId: string) => {
    setReportCommentId(commentId);
    setReportReason("harmful");
  };

  const submitCommentReport = async () => {
    if (!reportCommentId || !reportReason) return;
    setReportBusy(true);
    const result = await report({
      data: { target_type: "comment", target_id: reportCommentId, reason: reportReason },
    });
    setReportBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setReportCommentId(null);
    toast.success("Comment reported. Thanks for keeping it safe.");
  };

  const togglePin = async (comment: CommentRow) => {
    const result = await pinComment({ data: { comment_id: comment.id, pin: !comment.pinned_at } });
    if (result.error) toast.error(result.error);
    else {
      toast.success(comment.pinned_at ? "Unpinned." : "Pinned.");
      refresh();
    }
  };

  const submitReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    setBusy(true);
    const result = await addComment({
      data: {
        quote_id: id,
        text: replyText.trim(),
        is_anonymous: commentAnonymous,
        parent_id: commentId,
      },
    });
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setReplyText("");
    setReplyTo(null);
    refresh();
  };

  const saveComment = async (comment: CommentRow) => {
    const result = await editComment({ data: { id: comment.id, text: editingCommentText } });
    if (result.error) toast.error(result.error);
    else {
      setEditingCommentId(null);
      setEditingCommentText("");
      refresh();
    }
  };

  const removeComment = (comment: CommentRow) => {
    setDeleteCommentId(comment.id);
  };

  const confirmRemoveComment = async () => {
    if (!deleteCommentId) return;
    const commentId = deleteCommentId;
    setDeletingCommentId(commentId);
    const result = await removeCommentServer({ data: { id: commentId } });
    setDeletingCommentId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setDeleteCommentId(null);
    toast.success("Comment deleted.");
    refresh();
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
      </AppShell>
    );
  }
  if (!quote) {
    return (
      <AppShell>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back home
        </Link>
        <p className="mt-12 text-center font-serif text-xl italic text-muted-foreground">
          Quote not found.
        </p>
      </AppShell>
    );
  }

  const author = quote.is_anonymous || !quote.profile ? null : quote.profile;
  const comments = d?.comments ?? [];
  const topComments = comments
    .filter((comment) => !comment.parent_id)
    .sort((a, b) => {
      if (a.pinned_at && !b.pinned_at) return -1;
      if (!a.pinned_at && b.pinned_at) return 1;
      return +new Date(a.created_at) - +new Date(b.created_at);
    });
  const repliesBy = new Map<string, CommentRow[]>();
  comments
    .filter((comment) => comment.parent_id)
    .forEach((comment) => {
      const list = repliesBy.get(comment.parent_id!) ?? [];
      list.push(comment);
      repliesBy.set(comment.parent_id!, list);
    });

  const renderComment = (comment: CommentRow, depth = 0): ReactNode => {
    const commentAuthor = comment.is_anonymous || !comment.profile ? null : comment.profile;
    return (
      <li key={comment.id} className={depth > 0 ? "ml-6 mt-3" : ""}>
        <div
          className={`rounded-2xl border bg-card p-4 ${comment.pinned_at ? "border-accent/50" : "border-border"}`}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {comment.pinned_at && <Pin className="h-3 w-3 text-accent" />}
              {commentAuthor ? (
                <Link
                  to={comment.is_mine ? "/me" : "/u/$username"}
                  params={comment.is_mine ? undefined : { username: commentAuthor.username }}
                  className="flex items-center gap-2 hover:opacity-80"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full border border-border bg-background/60 text-[13px]">
                    <ProfileGlyph value={commentAuthor.emoji} className="h-3 w-3" />
                  </span>
                  <span className="text-xs text-foreground">@{commentAuthor.username}</span>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full border border-border bg-background/60 text-[10px] text-muted-foreground">
                    ?
                  </span>
                  <span className="text-xs text-muted-foreground">anonymous</span>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
              {isOwner && (
                <button
                  aria-label={comment.pinned_at ? "Unpin comment" : "Pin comment"}
                  onClick={() => void togglePin(comment)}
                  className="hover:text-foreground"
                >
                  {comment.pinned_at ? (
                    <PinOff className="h-3.5 w-3.5" />
                  ) : (
                    <Pin className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              {user && depth === 0 && (
                <button
                  aria-label="Reply"
                  onClick={() => {
                    setReplyTo(replyTo === comment.id ? null : comment.id);
                    setReplyText("");
                  }}
                  className="hover:text-foreground"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
              )}
              {comment.is_mine && (
                <>
                  <button
                    aria-label="Edit comment"
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditingCommentText(comment.text);
                    }}
                    className="hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label="Delete comment"
                    onClick={() => void removeComment(comment)}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              {user && !comment.is_mine && (
                <button
                  aria-label="Report comment"
                  onClick={() => reportComment(comment.id)}
                  className="hover:text-foreground"
                >
                  <Flag className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {editingCommentId === comment.id ? (
            <div className="rounded-xl border border-border bg-background/50 p-3">
              <MentionTextarea
                value={editingCommentText}
                onChange={setEditingCommentText}
                placeholder="Edit your comment…"
                className="min-h-[76px] resize-none border-0 bg-transparent focus-visible:ring-0"
              />
              <div className="flex items-center justify-end gap-2 border-t border-border pt-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!editingCommentText.trim() || busy}
                  onClick={() => void saveComment(comment)}
                  className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground">
              {renderWithMentions(comment.text, validMentions)}
            </p>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">
            {relativeTime(comment.created_at)}
            {comment.edited_at ? " · Edited" : ""}
          </p>
        </div>
        {replyTo === comment.id && (
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
                disabled={!replyText.trim() || busy}
                onClick={() => void submitReply(comment.id)}
                className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Reply
              </Button>
            </div>
          </div>
        )}
        {(repliesBy.get(comment.id) ?? []).length > 0 && (
          <ul className="space-y-2">
            {(repliesBy.get(comment.id) ?? []).map((reply) => renderComment(reply, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      <AppShell>
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Quote of the day
          </Link>
          <div className="relative">
            <button
              type="button"
              aria-label="Quote actions"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-full p-2 text-muted-foreground hover:bg-card hover:text-foreground"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                <button
                  onClick={() => {
                    setShareOpen(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-background"
                >
                  <Share2 className="h-4 w-4" /> Share
                </button>
                {isOwner ? (
                  <>
                    <button
                      onClick={() => {
                        setEditingText(quote.text);
                        setEditingAuthor(quote.author ?? "");
                        setEditingAnonymous(quote.is_anonymous);
                        setEditingQuote(true);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-background"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                    <button
                      onClick={() => void remove()}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </>
                ) : user ? (
                  <button
                    onClick={() => void submitReport()}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                  >
                    Report
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <article className="relative mt-5 rounded-3xl border border-border bg-card p-6 shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Quote of the day
          </p>
          <blockquote className="mt-7 font-serif text-2xl leading-tight text-foreground sm:text-3xl">
            “{quote.text}”
          </blockquote>
          {quote.author && !quote.is_anonymous && (
            <p className="mt-5 text-sm italic text-muted-foreground">— {quote.author}</p>
          )}
          <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-4">
            {author ? (
              <Link
                to={isOwner ? "/me" : "/u/$username"}
                params={isOwner ? undefined : { username: author.username }}
                className="flex items-center gap-2 text-sm hover:opacity-80"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full border border-border bg-background">
                  <ProfileGlyph value={author.emoji} className="h-3.5 w-3.5" />
                </span>
                <span>@{author.username}</span>
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">anonymous</span>
            )}
            <span className="text-xs text-muted-foreground">{relativeTime(quote.created_at)}</span>
          </div>
        </article>

        <div className="mt-4 flex items-center justify-between gap-2">
          {d?.previous ? (
            <Link
              to="/quote/$id"
              params={{ id: d.previous.id }}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> previous
            </Link>
          ) : (
            <span />
          )}
          {d?.next ? (
            <Link
              to="/quote/$id"
              params={{ id: d.next.id }}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              next <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span />
          )}
        </div>

        {editingQuote && (
          <section className="mt-5 rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Edit quote</p>
            <textarea
              value={editingText}
              onChange={(event) => setEditingText(event.target.value.slice(0, 220))}
              className="mt-3 min-h-28 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-accent"
            />
            <input
              value={editingAuthor}
              onChange={(event) => setEditingAuthor(event.target.value.slice(0, 80))}
              placeholder="Source / author (optional)"
              className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-accent"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={editingAnonymous}
                onChange={(event) => setEditingAnonymous(event.target.checked)}
              />{" "}
              Make anonymous
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingQuote(false)}>
                Cancel
              </Button>
              <Button onClick={() => void saveQuote()} disabled={busy || !editingText.trim()}>
                Save
              </Button>
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="brand-mark text-2xl text-foreground">
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
            <span className="dot">.</span>
          </h2>

          {user ? (
            <div className="mt-3 rounded-2xl border border-border bg-card p-3">
              <MentionTextarea
                value={commentText}
                onChange={setCommentText}
                placeholder="Add your thoughts…"
                className="min-h-[80px] resize-none border-0 bg-transparent focus-visible:ring-0"
              />
              <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={commentAnonymous}
                    onChange={(event) => setCommentAnonymous(event.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  anonymous
                </label>
                <Button
                  size="sm"
                  onClick={() => void submitComment()}
                  disabled={busy || !commentText.trim()}
                  className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Send className="mr-1 h-3.5 w-3.5" /> Send
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
            {topComments.map((comment) => renderComment(comment))}
            {comments.length === 0 && (
              <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No comments yet. Be the first.
              </li>
            )}
          </ul>
        </section>
        {shareOpen && <MyQuoteShareModal quote={quote} onClose={() => setShareOpen(false)} />}
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
                void confirmRemoveComment();
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
