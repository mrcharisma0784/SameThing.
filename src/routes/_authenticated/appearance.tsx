import { createFileRoute, Link } from "@tanstack/react-router";
import { SettingsBackLink } from "@/components/SettingsBackLink";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, Lock, Plus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { updateMyProfile } from "@/lib/api/me.functions";
import { DEFAULT_THEME, THEMES } from "@/lib/themes";
import { TAGS } from "@/lib/thing-helpers";
import { effectivePlan } from "@/lib/premium";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/appearance")({
  head: () => ({
    meta: [
      { title: "Appearance · SameThing." },
      { name: "description", content: "Choose your SameThing. theme and feed filters." },
    ],
  }),
  component: AppearancePage,
});

function AppearancePage() {
  const { profile, refreshProfile } = useAuth();
  const updateFn = useServerFn(updateMyProfile);
  const isPremium = effectivePlan(profile) === "premium";
  const theme = profile?.theme ?? DEFAULT_THEME;
  const allTags = useMemo(() => [...TAGS, ...(profile?.custom_tags ?? [])], [profile?.custom_tags]);
  const savedTags = useMemo(
    () => (profile?.feed_tags?.length ? profile.feed_tags : allTags),
    [allTags, profile?.feed_tags],
  );
  const [draftTags, setDraftTags] = useState<string[]>(savedTags);
  const [savingTags, setSavingTags] = useState(false);
  useEffect(() => setDraftTags(savedTags), [savedTags]);
  const inactiveTags = allTags.filter((tag) => !draftTags.includes(tag));
  const tagsDirty = draftTags.join("\u0000") !== savedTags.join("\u0000");
  const tagEditCost = tagsDirty && !isPremium ? 5 : 0;

  const saveTags = async (next: string[]) => {
    setDraftTags(next);
    setSavingTags(true);
    try {
      const result = await updateFn({ data: { feed_tags: next } });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.cost) toast.success(`Feed filter pills updated · −${result.cost} Credits.`);
      await refreshProfile();
    } finally {
      setSavingTags(false);
    }
  };

  const chooseTheme = async (key: string, premium: boolean) => {
    if (premium && !isPremium) {
      toast.error("That theme is PremiumThing. only.");
      return;
    }
    const result = await updateFn({ data: { theme: key } });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Theme applied.");
    await refreshProfile();
  };

  return (
    <OnboardingGate>
      <AppShell>
        <SettingsBackLink />
        <h1 className="brand-mark text-3xl text-foreground">
          Appearance<span className="dot">.</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          how SameThing. looks & what your feed shows
        </p>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Theme</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Applies everywhere you use SameThing.
          </p>
          <div className="mt-3 space-y-2">
            {THEMES.map((item) => {
              const locked = item.premium && !isPremium;
              const selected = theme === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => chooseTheme(item.key, item.premium)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${selected ? "border-accent bg-accent/10" : "border-border hover:bg-secondary/40"}`}
                >
                  <span className="flex shrink-0 gap-1">
                    {item.swatch.map((color) => (
                      <span
                        key={color}
                        className="h-6 w-3 rounded-sm border border-border"
                        style={{ background: color }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="brand-mark text-base text-foreground">{item.name}</span>
                      {item.premium && !isPremium && (
                        <span className="rounded-full bg-[color:var(--rare)]/15 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-[color:var(--rare)]">
                          ✦ Premium
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground">{item.hint}</span>
                  </span>
                  {locked ? (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-[color:var(--rare)]" />
                  ) : selected ? (
                    <span className="text-accent">✓</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {!isPremium && (
            <Link
              to="/premium"
              className="mt-3 block text-center text-xs text-accent underline-offset-2 hover:underline"
            >
              Unlock themes with PremiumThing.
            </Link>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Feed filter pills
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">What shows next to New & Trending.</p>
          {tagsDirty && (
            <p className="mt-2 text-[10px] uppercase tracking-widest text-accent">
              {isPremium ? "Premium · free" : `Save filters · −${tagEditCost} Credits`}
            </p>
          )}
          <div className="mt-3 space-y-1.5">
            {draftTags.map((tag, index) => (
              <div
                key={tag}
                className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
              >
                <span className="flex-1 truncate text-sm text-foreground">{tag}</span>
                <button
                  aria-label={`Move ${tag} up`}
                  disabled={savingTags || index === 0}
                  onClick={() => {
                    const next = [...draftTags];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    void saveTags(next);
                  }}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label={`Move ${tag} down`}
                  disabled={savingTags || index === draftTags.length - 1}
                  onClick={() => {
                    const next = [...draftTags];
                    [next[index + 1], next[index]] = [next[index], next[index + 1]];
                    void saveTags(next);
                  }}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label={`Remove ${tag}`}
                  onClick={() => void saveTags(draftTags.filter((value) => value !== tag))}
                  disabled={savingTags}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {draftTags.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No tag pills — only New and Trending will show.
              </p>
            )}
          </div>
          {inactiveTags.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Add back
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {inactiveTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => void saveTags([...draftTags, tag])}
                    disabled={savingTags}
                    className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <Plus className="h-3 w-3" /> {tag}
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
