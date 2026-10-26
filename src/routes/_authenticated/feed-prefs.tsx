import { createFileRoute, Link } from "@tanstack/react-router";
import { SettingsBackLink } from "@/components/SettingsBackLink";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { updateMyProfile } from "@/lib/api/me.functions";
import { TAGS } from "@/lib/thing-helpers";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ChevronLeft, Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/feed-prefs")({
  head: () => ({
    meta: [
      { title: "Feed filters · SameThing." },
      {
        name: "description",
        content: "Choose which tag filters appear on your SameThing. feed, and in what order.",
      },
    ],
  }),
  component: FeedPrefsPage,
});

function FeedPrefsPage() {
  const { profile, refreshProfile } = useAuth();
  const updateFn = useServerFn(updateMyProfile);

  const allTags = [...TAGS, ...((profile?.custom_tags ?? []) as string[])];
  const activeTags = (profile?.feed_tags?.length ? profile.feed_tags : allTags) as string[];
  const remaining = allTags.filter((t) => !activeTags.includes(t));

  const save = async (next: string[]) => {
    const res = await updateFn({ data: { feed_tags: next } });
    if (res.error) {
      toast.error(res.error);
      return;
    }
    await refreshProfile();
  };

  return (
    <OnboardingGate>
      <AppShell>
        <SettingsBackLink />
        <h1 className="brand-mark text-3xl text-foreground">
          Feed filters<span className="dot">.</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          what shows next to new & trending
        </p>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Active pills
          </Label>
          <div className="mt-3 space-y-1.5">
            {activeTags.map((t, i) => (
              <div
                key={t}
                className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
              >
                <span className="flex-1 truncate text-sm text-foreground">{t}</span>
                <button
                  aria-label={`Move ${t} up`}
                  disabled={i === 0}
                  onClick={() => {
                    const n = [...activeTags];
                    [n[i - 1], n[i]] = [n[i], n[i - 1]];
                    void save(n);
                  }}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label={`Move ${t} down`}
                  disabled={i === activeTags.length - 1}
                  onClick={() => {
                    const n = [...activeTags];
                    [n[i + 1], n[i]] = [n[i], n[i + 1]];
                    void save(n);
                  }}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label={`Remove ${t}`}
                  onClick={() => void save(activeTags.filter((x) => x !== t))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {activeTags.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No tag pills — only New and Trending will show.
              </p>
            )}
          </div>

          {remaining.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Add back
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {remaining.map((t) => (
                  <button
                    key={t}
                    onClick={() => void save([...activeTags, t])}
                    className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" /> {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </AppShell>
    </OnboardingGate>
  );
}
