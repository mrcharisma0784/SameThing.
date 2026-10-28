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
import { getSiteUrl } from "@/lib/site-url";
import { ProfileGlyph } from "@/components/ProfileGlyph";
import { ProfilePhotoPicker, type PreparedProfilePhoto } from "@/components/ProfilePhotoPicker";
import { uploadMyProfilePhoto, removeMyProfilePhoto } from "@/lib/api/me.functions";
import { effectivePlan } from "@/lib/premium";
import { getMyConnectionCounts } from "@/lib/api/social.functions";
import { profileDisplayTags } from "@/lib/test-user";
import { displayBio } from "@/lib/profile-display";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({
    meta: [
      { title: "My Profile · SameThing." },
      {
        name: "description",
        content:
          "Your profile on SameThing. — see the things you've dropped, your rare finds, and how many people said Same.",
      },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/me") }],
  }),
  component: MePage,
});

function MePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const update = useServerFn(updateMyProfile);
  const uploadPhoto = useServerFn(uploadMyProfilePhoto);
  const removePhoto = useServerFn(removeMyProfilePhoto);
  const [photoBusy, setPhotoBusy] = useState(false);

  const [editing, setEditing] = useState(false);
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
  const { data: connectionCounts } = useQuery({
    queryKey: ["my-connections", user?.id],
    queryFn: () => getMyConnectionCounts(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const rareCount = things.filter((t) => t.is_rare_thing).length;
  const plan = effectivePlan(profile);

  const saveEdit = async () => {
    setSaving(true);
    const res = await update({
      data: { bio, username: username !== profile?.username ? username : undefined },
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Saved.");
    setEditing(false);
    await refreshProfile();
  };

  return (
    <OnboardingGate>
      <AppShell>
        <h1 className="sr-only">My Profile</h1>
        <div className="md:grid md:grid-cols-[minmax(19rem,0.82fr)_minmax(0,1.18fr)] md:items-start md:gap-8 lg:gap-10">
          <section className="mb-6 rounded-2xl border border-border bg-card p-5 md:mb-0">
            <div className="flex items-center gap-4">
              <div
                className={`grid h-14 w-14 place-items-center rounded-full bg-background text-2xl ${plan === "premium" ? "premium-ring" : ""}`}
              >
                <ProfileGlyph
                  value={profile?.emoji}
                  photoUrl={profile?.avatar_url as string | null}
                  className="h-full w-full"
                />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-serif text-xl text-foreground">@{profile?.username}</p>
                  {profileDisplayTags(profile).map((tag) => {
                    const highlighted = tag === "PremiumThing." || tag === "LabThing.";
                    return (
                      <span
                        key={tag}
                        className={
                          highlighted
                            ? "rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent"
                            : "rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground"
                        }
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
                {!editing && (
                  <p className="mt-1 text-xs text-foreground">{displayBio(profile?.bio)}</p>
                )}
              </div>
              <button
                onClick={() => navigate({ to: "/settings" })}
                aria-label="Settings"
                className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
              >
                <SettingsIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat label="MyThings" value={things.length} />
              <Stat label="Rare Things" value={rareCount} accent />
              <ConnectionStat
                to="followers"
                username={profile?.username ?? ""}
                label="Watchers"
                value={connectionCounts?.followers ?? 0}
              />
              <ConnectionStat
                to="following"
                username={profile?.username ?? ""}
                label="Watching"
                value={connectionCounts?.following ?? 0}
              />
            </div>

            {!editing ? (
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => setEditing(true)}
                  variant="secondary"
                  className={
                    plan === "premium" ? "mx-auto w-2/3 rounded-full" : "flex-1 rounded-full"
                  }
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
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Username
                  </Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className="mt-1 h-9 bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Profile photo
                  </Label>
                  <ProfilePhotoPicker
                    premium={plan === "premium"}
                    busy={photoBusy || saving}
                    onPrepared={(photo: PreparedProfilePhoto) => {
                      void (async () => {
                        setPhotoBusy(true);
                        try {
                          const res = await uploadPhoto({ data: photo });
                          if (!res.ok) {
                            toast.error(res.error);
                            return;
                          }
                          await refreshProfile();
                          toast.success("Profile photo saved.");
                        } catch {
                          toast.error("Photo upload failed. Please try again.");
                        } finally {
                          setPhotoBusy(false);
                        }
                      })();
                    }}
                  />
                  {profile?.avatar_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={photoBusy || saving}
                      onClick={() => {
                        void (async () => {
                          setPhotoBusy(true);
                          try {
                            const res = await removePhoto();
                            if (!res.ok) {
                              toast.error(res.error);
                              return;
                            }
                            await refreshProfile();
                            toast.success("Profile photo removed.");
                          } catch {
                            toast.error("Could not remove your profile photo. Please try again.");
                          } finally {
                            setPhotoBusy(false);
                          }
                        })();
                      }}
                    >
                      Remove photo
                    </Button>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Bio
                  </Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 160))}
                    placeholder="A line about you…"
                    className="mt-1 min-h-[60px] resize-none bg-card text-sm"
                  />
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{bio.length}/160</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    onClick={() => setEditing(false)}
                    variant="ghost"
                    className="flex-1 rounded-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="brand-mark text-3xl text-foreground">
              MyThings<span className="dot">.</span>
            </h2>

            <div className="mt-4 flex flex-col gap-4">
              {isLoading && (
                <div className="h-44 animate-pulse rounded-2xl border border-border bg-card" />
              )}
              {!isLoading && things.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Nothing yet.{" "}
                  <Link to="/drop" className="text-accent">
                    Drop your first.
                  </Link>
                </p>
              )}
              {things.map((t) => (
                <ThingCard key={t.id} thing={t} />
              ))}
            </div>
          </section>
        </div>
      </AppShell>
    </OnboardingGate>
  );
}

function ConnectionStat({
  username,
  to,
  label,
  value,
}: {
  username: string;
  to: "followers" | "following";
  label: string;
  value: number;
}) {
  return (
    <Link
      to="/connections/$username"
      params={{ username }}
      search={{ list: to, from: "me" }}
      className="rounded-xl border border-border bg-background p-3 transition-colors hover:border-accent/50 hover:bg-secondary/30"
    >
      <p className="font-serif text-2xl text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </Link>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p
        className={`font-serif text-2xl ${accent ? "text-[color:var(--rare)]" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
