import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { ThingCard, type ThingCardData } from "@/components/ThingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { getMyThings, updateMyProfile } from "@/lib/api/me.functions";
import { OnboardingGate } from "@/components/OnboardingGate";
import { Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { AVATARS } from "@/lib/avatars";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({
    meta: [
      { title: "My Profile · SameThing." },
      { name: "description", content: "Your profile on SameThing. — see the things you've dropped, your rare finds, and how many people said Same." },
    ],
    links: [{ rel: "canonical", href: "https://samething.lovable.app/me" }],
  }),
  component: MePage,
});

function MePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const update = useServerFn(updateMyProfile);

  const [editing, setEditing] = useState(false);
  const [emoji, setEmoji] = useState(profile?.emoji || "✦");
  const [bio, setBio] = useState(profile?.bio || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [saving, setSaving] = useState(false);

  const { data: things = [], isLoading } = useQuery({
    queryKey: ["my-things", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await getMyThings();
      return (res.things ?? []) as ThingCardData[];
    },
    enabled: !!user,
  });

  const rareCount = things.filter((t) => t.is_rare_thing).length;
  const plan = profile?.plan ?? "free";

  const saveEdit = async () => {
    setSaving(true);
    const res = await update({ data: { emoji, bio, username: username !== profile?.username ? username : undefined } });
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Saved.");
    setEditing(false);
    await refreshProfile();
  };

  return (
    <OnboardingGate>
      <AppShell>
        <h1 className="sr-only">My Profile</h1>
        <section className="mb-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            <div className={`grid h-14 w-14 place-items-center rounded-full bg-background text-2xl ${plan === "premium" ? "premium-ring" : ""}`}>{profile?.emoji}</div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-serif text-xl text-foreground">@{profile?.username}</p>
                <span
                  className={
                    plan === "premium"
                      ? "rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent"
                      : "rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground"
                  }
                >
                  {plan === "premium" ? "✦ PremiumThing" : "SimpleThing"}
                </span>
              </div>
              {profile?.bio && !editing && <p className="mt-1 text-xs text-foreground">{profile.bio}</p>}
            </div>
            <button
              onClick={() => navigate({ to: "/settings" })}
              aria-label="Settings"
              className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="MyThings" value={things.length} />
            <Stat label="Rare Things" value={rareCount} accent />
          </div>

          {!editing ? (
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => setEditing(true)}
                variant="secondary"
                className={plan === "premium" ? "mx-auto w-2/3 rounded-full" : "flex-1 rounded-full"}
              >
                Edit profile
              </Button>
              {plan !== "premium" && (
                <Button
                  onClick={() => navigate({ to: "/premium" })}
                  variant="outline"
                  className="flex-1 rounded-full border-accent/40 text-accent"
                >
                  ✦ Upgrade
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-3 rounded-xl border border-border bg-background p-3">
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className="mt-1 h-9 bg-card" />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Emoji</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {AVATARS.map((a) => {
                    const locked = a.premium && plan !== "premium";
                    return (
                      <button
                        key={a.char}
                        onClick={() => {
                          if (locked) { toast.error("PremiumThing. icon — upgrade to use it."); return; }
                          setEmoji(a.char);
                        }}
                        aria-label={locked ? `${a.char} (PremiumThing. only)` : a.char}
                        className={`grid h-8 w-8 place-items-center rounded-full border text-base ${
                          emoji === a.char ? "border-accent bg-accent/15" : "border-border"
                        } ${locked ? "cursor-not-allowed text-[color:var(--rare)] opacity-70" : ""}`}
                      >{a.char}</button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Gold icons are PremiumThing. only.
                </p>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 160))}
                  placeholder="A line about you…"
                  className="mt-1 min-h-[60px] resize-none bg-card text-sm"
                />
                <p className="mt-0.5 text-[10px] text-muted-foreground">{bio.length}/160</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveEdit} disabled={saving} className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button onClick={() => setEditing(false)} variant="ghost" className="flex-1 rounded-full">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>

        <h2 className="brand-mark text-3xl text-foreground">
          MyThings<span className="dot">.</span>
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          {isLoading && <div className="h-44 animate-pulse rounded-2xl border border-border bg-card" />}
          {!isLoading && things.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nothing yet. <Link to="/drop" className="text-accent">Drop your first.</Link>
            </p>
          )}
          {things.map((t) => <ThingCard key={t.id} thing={t} />)}
        </div>
      </AppShell>
    </OnboardingGate>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className={`font-serif text-2xl ${accent ? "text-[color:var(--rare)]" : "text-foreground"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
