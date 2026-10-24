import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, X } from "lucide-react";
import { toast } from "sonner";
import {
  getActiveFeedbackPrompt,
  submitFeedbackPromptResponse,
} from "@/lib/api/feedback-prompt.functions";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function FeedbackPrompt() {
  const { user, profile } = useAuth();
  const readPrompt = useServerFn(getActiveFeedbackPrompt);
  const sendResponse = useServerFn(submitFeedbackPromptResponse);
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data } = useQuery({
    queryKey: ["active-feedback-prompt", user?.id ?? "guest"],
    queryFn: () => readPrompt(),
    enabled: Boolean(user && profile?.onboarded_at),
    staleTime: 0,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });
  const prompt = data?.prompt;

  useEffect(() => {
    if (!prompt || typeof window === "undefined") return;
    const dismissed = localStorage.getItem(`samething:feedback-prompt:${prompt.id}`);
    if (dismissed) return;
    const timer = window.setTimeout(() => setVisible(true), 280);
    return () => window.clearTimeout(timer);
  }, [prompt]);

  if (!user || !profile?.onboarded_at || !prompt || !visible) return null;

  const dismiss = () => {
    localStorage.setItem(`samething:feedback-prompt:${prompt.id}`, "dismissed");
    setVisible(false);
  };

  const submit = async () => {
    if (rating === 0) {
      toast.error("Choose a rating first.");
      return;
    }
    const result = await sendResponse({
      data: { prompt_id: prompt.id, rating, comment: comment.trim() || null },
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    localStorage.setItem(`samething:feedback-prompt:${prompt.id}`, "submitted");
    setVisible(false);
    toast.success("Thanks for helping shape SameThing.");
  };

  return (
    <div className="feedback-prompt-enter fixed inset-x-0 bottom-20 z-40 px-3 sm:bottom-6 sm:px-5">
      <section
        role="dialog"
        aria-modal="false"
        aria-label={prompt.title}
        className="mx-auto max-w-md rounded-3xl border border-accent/25 bg-card/95 p-4 shadow-[0_18px_50px_color-mix(in_srgb,var(--background)_50%,transparent)] backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-accent">A small check-in</p>
            <h2 className="mt-1 font-serif text-xl italic text-foreground">{prompt.title}</h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss feedback form"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{prompt.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-border bg-background/50 px-3 py-2.5">
          <span className="text-xs text-muted-foreground">How does it feel?</span>
          <div className="flex gap-1" aria-label="Choose a rating from 1 to 5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                aria-pressed={rating === value}
                className="rounded-full p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-5 w-5",
                    value <= rating ? "fill-accent text-accent" : "text-muted-foreground/50",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value.slice(0, 2000))}
          rows={2}
          placeholder="Anything you want us to know? (optional)"
          className="mt-3 w-full resize-none rounded-2xl border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground transition-transform active:scale-[.98]"
          >
            {prompt.button_label}
          </button>
        </div>
      </section>
    </div>
  );
}
