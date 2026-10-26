import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MentionTextarea } from "@/components/MentionTextarea";
import { dropThing } from "@/lib/api/things.functions";
import { addCustomTag, getMyProfile } from "@/lib/api/me.functions";
import { suggestTags, scanContent } from "@/lib/api/ai.functions";
import { TAGS } from "@/lib/thing-helpers";
import { cn } from "@/lib/utils";
import { effectivePlan } from "@/lib/premium";
import { toast } from "sonner";
import { OnboardingGate } from "@/components/OnboardingGate";
import { Plus, Sparkles } from "lucide-react";

const EMPTY_TAGS: string[] = [];

export const Route = createFileRoute("/_authenticated/drop")({
  head: () => ({ meta: [{ title: "Drop a Thing · SameThing." }] }),
  component: DropPage,
});

function DropPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const drop = useServerFn(dropThing);
  const addTag = useServerFn(addCustomTag);
  const fetchProfile = useServerFn(getMyProfile);
  const suggest = useServerFn(suggestTags);
  const scan = useServerFn(scanContent);

  const [warnings, setWarnings] = useState<string[]>([]);
  const [blocked, setBlocked] = useState(false);

  const [raw, setRaw] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [safetyStatus, setSafetyStatus] = useState<
    "idle" | "scanning" | "safe" | "blocked" | "review"
  >("idle");
  const [anonymous, setAnonymous] = useState(false);
  const [commentsClosed, setCommentsClosed] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [dropComplete, setDropComplete] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanRunRef = useRef(0);

  const { data: profileData } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });
  const customTags: string[] =
    (profileData?.profile as { custom_tags?: string[] } | null)?.custom_tags ?? EMPTY_TAGS;
  const isPremium = effectivePlan(profileData?.profile);
  const tagLimit = isPremium ? 15 : 5;

  // Debounced AI tag suggestion (premium) + content scan
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const runId = ++scanRunRef.current;
    if (raw.trim().length < 3) {
      setSuggested([]);
      setThinking(false);
      setSafetyStatus("idle");
      setWarnings([]);
      setBlocked(false);
      return;
    }
    setThinking(true);
    setSafetyStatus("scanning");
    debounceRef.current = setTimeout(async () => {
      try {
        const [tagRes, scanRes] = await Promise.all([
          isPremium && raw.trim().length >= 8
            ? suggest({ data: { text: raw, extra_tags: customTags } })
            : Promise.resolve({ tags: [] as string[] }),
          scan({ data: { text: raw } }),
        ]);
        if (runId !== scanRunRef.current) return;
        setSuggested(tagRes.tags ?? []);
        setWarnings(scanRes.warnings ?? []);
        setBlocked(!!scanRes.block);
        setSafetyStatus(scanRes.safety ?? (scanRes.block ? "blocked" : "safe"));
      } catch {
        if (runId !== scanRunRef.current) return;
        setSuggested([]);
        setWarnings([]);
        setBlocked(false);
        setSafetyStatus("review");
      } finally {
        if (runId === scanRunRef.current) setThinking(false);
      }
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [raw, suggest, scan, customTags, isPremium]);

  const toggleTag = (t: string) => {
    setTags((cur) =>
      cur.includes(t) ? cur.filter((x) => x !== t) : cur.length >= 3 ? cur : [...cur, t],
    );
  };

  const handleAddTag = async () => {
    const t = newTag.trim().toLowerCase();
    if (!t) return;
    if (!/^[a-z0-9 _-]+$/.test(t)) {
      toast.error("Letters, numbers, dashes only.");
      return;
    }
    setAddingTag(true);
    const res = await addTag({ data: { tag: t } });
    setAddingTag(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setNewTag("");
    toast.success("Tag saved.");
    void qc.invalidateQueries({ queryKey: ["my-profile"] });
    setTags((cur) => (cur.includes(t) || cur.length >= 3 ? cur : [...cur, t]));
  };

  const m = useMutation({
    mutationFn: async () => {
      const res = await drop({
        data: {
          raw_text: raw,
          tags,
          is_anonymous: anonymous,
          comments_closed: commentsClosed,
          ai_review: safetyStatus === "safe" ? "safe" : "review",
        },
      });
      if (res.error) throw new Error(res.error);
      return res.thing;
    },
    onSuccess: () => {
      setDropComplete(true);
      toast.success("Dropped.");
      window.setTimeout(() => navigate({ to: "/" }), 420);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const charCount = raw.length;
  const isSuggested = (t: string) => suggested.includes(t) && !tags.includes(t);

  return (
    <OnboardingGate>
      <AppShell>
        <h1 className="brand-mark text-4xl text-foreground">
          Drop a Thing<span className="dot">.</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">What did you think only you felt?</p>

        <div className="mt-5 space-y-4">
          <div>
            <Label
              htmlFor="raw"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              The thing
            </Label>
            <MentionTextarea
              value={raw}
              onChange={setRaw}
              maxLength={1000}
              placeholder="The exact thought, fear, habit, or moment... use @username to tag someone"
              className="mt-1 min-h-[140px] resize-none bg-card font-serif text-lg italic placeholder:not-italic placeholder:font-sans placeholder:text-base placeholder:text-muted-foreground"
            />
            <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>{charCount}/1000</span>
              {thinking && (
                <span className="flex items-center gap-1">
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                  <span className="ml-1">reading…</span>
                </span>
              )}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              Your Thing text is sent to Cloudflare for a safety review after posting. For Premium
              accounts, text of 8 or more characters is also sent as you type to suggest tags; using
              a suggestion is optional. Your post may include personal or sensitive details. Read
              our{" "}
              <Link to="/privacy" className="underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
            {warnings.length > 0 && (
              <div
                className={cn(
                  "mt-2 rounded-xl border px-3 py-2 text-xs",
                  blocked
                    ? "border-destructive/60 bg-destructive/10 text-destructive"
                    : "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                )}
              >
                {warnings.map((w, i) => (
                  <p key={i}>· {w}</p>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Tags
              </Label>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {tags.length}/3
              </span>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              {isPremium && suggested.length > 0 && (
                <span className="flex items-center gap-1 text-accent">
                  <Sparkles className="h-3 w-3" /> ai suggestions ready — tap to accept
                </span>
              )}
              {!isPremium && (
                <Link
                  to="/premium"
                  className="flex items-center gap-1 text-accent/80 hover:text-accent"
                >
                  <Sparkles className="h-3 w-3" /> ✦ ai tag suggestions — premium
                </Link>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs lowercase tracking-wide transition-colors",
                    tags.includes(t)
                      ? "border-accent bg-accent/15 text-accent"
                      : isSuggested(t)
                        ? "border-accent/50 bg-accent/5 text-accent"
                        : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isSuggested(t) && <Sparkles className="mr-1 inline h-3 w-3" />}
                  {t}
                </button>
              ))}
              {customTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs lowercase tracking-wide transition-colors",
                    tags.includes(t)
                      ? "border-accent bg-accent/15 text-accent"
                      : isSuggested(t)
                        ? "border-accent/50 bg-accent/5 text-accent border-dashed"
                        : "border-dashed border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isSuggested(t) && <Sparkles className="mr-1 inline h-3 w-3" />}
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value.slice(0, 24))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleAddTag();
                  }
                }}
                placeholder="add your own tag…"
                className="h-9 flex-1 bg-background text-sm"
              />
              <Button
                type="button"
                onClick={() => void handleAddTag()}
                disabled={addingTag || !newTag.trim()}
                size="sm"
                variant="secondary"
                className="h-9 gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> add
              </Button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Custom tags
              </Label>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {customTags.length}/{tagLimit}
              </span>
            </div>
            {!isPremium && (
              <Link to="/premium" className="mt-1 block text-[10px] text-accent hover:underline">
                ✦ Premium: 15 tags
              </Link>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <ToggleRow
              label="Post anonymously"
              hint="Your username stays hidden."
              checked={anonymous}
              onChange={setAnonymous}
            />
            <ToggleRow
              label="Close to comments"
              hint="No one can comment on this thing."
              checked={commentsClosed}
              onChange={setCommentsClosed}
            />
          </div>

          <Button
            onClick={() => {
              if (m.isPending) return;
              if (raw.trim().length < 3) {
                toast.error("Write your thing first (at least 3 characters).");
                return;
              }
              if (tags.length < 1) {
                toast.error("Pick at least 1 tag.");
                return;
              }
              if (tags.length > 3) {
                toast.error("Up to 3 tags only.");
                return;
              }
              if (safetyStatus === "scanning") {
                toast.error("Wait for the safety check to finish.");
                return;
              }
              if (safetyStatus === "blocked") {
                toast.error(warnings[0] ?? "Please fix the highlighted issue.");
                return;
              }
              m.mutate();
            }}
            disabled={
              m.isPending ||
              thinking ||
              safetyStatus === "scanning" ||
              safetyStatus === "blocked" ||
              raw.trim().length < 3 ||
              tags.length < 1 ||
              tags.length > 3 ||
              blocked
            }
            data-inactive={
              m.isPending ||
              thinking ||
              safetyStatus === "scanning" ||
              safetyStatus === "blocked" ||
              raw.trim().length < 3 ||
              tags.length < 1 ||
              tags.length > 3 ||
              blocked
                ? "true"
                : undefined
            }
            className={cn(
              "pressable drop-action w-full rounded-full bg-accent py-6 text-base font-medium text-accent-foreground hover:bg-accent/90 data-[inactive=true]:bg-muted data-[inactive=true]:text-muted-foreground data-[inactive=true]:hover:bg-muted",
              dropComplete && "drop-action-success",
            )}
          >
            {dropComplete
              ? "Dropped."
              : m.isPending
                ? "Posting…"
                : thinking || safetyStatus === "scanning"
                  ? "Reading safety…"
                  : blocked
                    ? "Fix issues to drop"
                    : "Drop it →"}
          </Button>
        </div>
      </AppShell>
    </OnboardingGate>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = `toggle-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <Label htmlFor={id} className="text-sm text-foreground">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
