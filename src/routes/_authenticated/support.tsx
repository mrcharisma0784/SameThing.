import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ChevronDown, LifeBuoy, ImagePlus, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { sendSupportRequest } from "@/lib/api/support.functions";
import { getSiteUrl } from "@/lib/site-url";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [
      { title: "Support · SameThing." },
      { name: "description", content: "Find common fixes and contact SameThing. support." },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/support") }],
  }),
  component: SupportPage,
});

const FIXES = [
  {
    title: "I can’t vote on my own thing.",
    body: "You can only vote on things posted by other people. Your own posts stay outside the Same/Nah voting flow.",
  },
  {
    title: "My comment or thing wouldn't post.",
    body: "Check your connection, make sure the text is not empty, and try again. If it still fails, send us the page and exact error.",
  },
  {
    title: "AI tag suggestions aren't showing.",
    body: "Suggestions may take a moment to appear. If they stay missing, refresh the page and make sure the thing has enough text for a useful suggestion.",
  },
  {
    title: "I can't change my username.",
    body: "Usernames have uniqueness and formatting rules. If a new name is rejected, try another available name without spaces.",
  },
  {
    title: "Someone can't be @mentioned.",
    body: "The other person may have mentions disabled, or the username may not match exactly. Check Settings → Account & privacy.",
  },
  {
    title: "A theme or icon is locked.",
    body: "Locked themes and gold profile icons are PremiumThing. features. Upgrade from Subscription & payment to unlock them.",
  },
  {
    title: "My Rare Thing badge disappeared.",
    body: "Rare status can change when the underlying votes or visibility conditions change. Open the thing again to see its current status.",
  },
  {
    title: "I want my account and data deleted.",
    body: "Go to Settings → Account & privacy and request a data export or account deletion. Requests are reviewed within several business days.",
  },
];

function SupportPage() {
  const { user } = useAuth();
  const sendFn = useServerFn(sendSupportRequest);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (subject.trim().length < 2 || message.trim().length < 3) {
      toast.error("Add a short subject and tell us what happened.");
      return;
    }
    setSending(true);
    const result = await sendFn({
      data: {
        subject: subject.trim(),
        message: message.trim(),
        screenshot_name: screenshot?.name,
        user_agent: typeof navigator === "undefined" ? "" : navigator.userAgent.slice(0, 500),
      },
    });
    setSending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setSubject("");
    setMessage("");
    setScreenshot(null);
    toast.success("Thanks — we read every one.");
  };

  const chooseScreenshot = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("The image must be 3 MB or smaller.");
      return;
    }
    setScreenshot(file);
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
          Support<span className="dot">.</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          quick fixes first, then us
        </p>

        <section className="mt-5 rounded-3xl border border-border bg-card p-4">
          <p className="px-2 pb-3 text-xs uppercase tracking-widest text-muted-foreground">
            Common problems
          </p>
          <div>
            {FIXES.map((item, index) => {
              const expanded = openIndex === index;
              return (
                <div key={item.title} className="border-b border-border/60 last:border-0">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(expanded ? null : index)}
                    className="flex w-full items-center gap-3 px-2 py-3.5 text-left"
                    aria-expanded={expanded}
                  >
                    <span className="flex-1 text-sm text-foreground">{item.title}</span>
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 rotate-180 text-muted-foreground" />
                    ) : (
                      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {expanded && (
                    <p className="px-2 pb-4 text-xs leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <Link
            to="/faq"
            className="mt-4 block text-center text-sm text-accent hover:underline underline-offset-4"
          >
            Read the full FAQ
          </Link>
        </section>

        <section className="mt-5 rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <LifeBuoy className="h-4 w-4" /> Still stuck? Write to us
          </div>

          <label className="mt-5 block text-[10px] uppercase tracking-widest text-muted-foreground">
            Subject
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value.slice(0, 120))}
              placeholder="Short summary"
              className="mt-2 h-12 rounded-xl bg-background text-base"
            />
          </label>

          <label className="mt-5 block text-[10px] uppercase tracking-widest text-muted-foreground">
            What happened?
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 3000))}
              placeholder="Steps you took, what you expected, what you saw..."
              className="mt-2 min-h-[150px] resize-none rounded-xl bg-background text-base"
            />
            <span className="mt-1 block text-[10px] text-muted-foreground">
              {message.length}/3000
            </span>
          </label>

          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Screenshot (optional)
            </p>
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
              <ImagePlus className="h-4 w-4" />
              {screenshot ? screenshot.name : "Attach an image (max 3 MB)"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => chooseScreenshot(event.target.files?.[0])}
              />
            </label>
          </div>

          <Button
            onClick={submit}
            disabled={sending || !user || subject.trim().length < 2 || message.trim().length < 3}
            className="mt-4 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {sending ? "Sending…" : "Send to support"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            We reply straight to your inbox.
          </p>
        </section>
      </AppShell>
    </OnboardingGate>
  );
}
