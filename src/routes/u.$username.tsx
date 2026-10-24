import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Ban, Eye, EyeOff, Flag, MoreHorizontal } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ThingCard, type ThingCardData } from "@/components/ThingCard";
import { getPublicProfile } from "@/lib/api/me.functions";
import { blockUser, followUser, unblockUser, unfollowUser } from "@/lib/api/social.functions";
import { reportTarget } from "@/lib/api/things.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ProfileGlyph } from "@/components/ProfileGlyph";
import { profileDisplayTags } from "@/lib/test-user";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} · SameThing.` },
      { name: "description", content: `Public things from @${params.username} on SameThing.` },
    ],
  }),
  component: PublicProfilePage,
});

type PublicProfile = {
  id: string;
  username: string;
  emoji: string;
  bio: string | null;
  plan: string;
  rare_thing_count: number;
  follower_count: number;
  following_count: number;
  watching: boolean;
  blocked: boolean;
  is_test_user?: boolean | null;
  test_user_until?: string | null;
  test_user_label?: string | null;
};

function PublicProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getPublicProfile);
  const follow = useServerFn(followUser);
  const unfollow = useServerFn(unfollowUser);
  const block = useServerFn(blockUser);
  const unblock = useServerFn(unblockUser);
  const report = useServerFn(reportTarget);
  const [menuOpen, setMenuOpen] = useState(false);
  const [watchingOverride, setWatchingOverride] = useState<boolean | null>(null);
  const [watchingBusy, setWatchingBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => fetchProfile({ data: { username } }),
  });

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const profile = data?.profile as PublicProfile | null | undefined;
  const things = (data?.things ?? []) as unknown as ThingCardData[];
  const isSelf = Boolean(user && profile && user.id === profile.id);
  const isWatching = watchingOverride ?? Boolean(profile?.watching);

  useEffect(() => {
    setWatchingOverride(null);
  }, [profile?.id, profile?.watching]);

  const toggleWatching = async () => {
    if (!profile || watchingBusy) return;
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    const nextWatching = !isWatching;
    setWatchingOverride(nextWatching);
    setWatchingBusy(true);
    const result = nextWatching
      ? await follow({ data: { user_id: profile.id } })
      : await unfollow({ data: { user_id: profile.id } });
    setWatchingBusy(false);
    if (result.error) {
      setWatchingOverride(null);
      toast.error(result.error);
      return;
    }
    queryClient.setQueryData(["public-profile", username], (current: typeof data) => {
      if (!current?.profile) return current;
      return {
        ...current,
        profile: {
          ...current.profile,
          watching: nextWatching,
          follower_count: Math.max(
            0,
            Number(current.profile.follower_count ?? 0) + (nextWatching ? 1 : -1),
          ),
        },
      };
    });
  };

  const reportProfile = async () => {
    if (!profile) return;
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    const reason = window.prompt("Why are you reporting this profile?")?.trim();
    if (!reason) return;
    const result = await report({ data: { target_type: "user", target_id: profile.id, reason } });
    setMenuOpen(false);
    if (result.error) toast.error(result.error);
    else toast.success("Profile reported. Thanks for keeping SameThing safe.");
  };

  const toggleBlock = async () => {
    if (!profile) return;
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    const result = profile.blocked
      ? await unblock({ data: { user_id: profile.id } })
      : await block({ data: { user_id: profile.id } });
    setMenuOpen(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["public-profile", username] });
  };

  return (
    <AppShell>
      <h1 className="sr-only">@{username}</h1>
      {isLoading && <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />}
      {!isLoading && !profile && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No one with that name.{" "}
          <Link to="/" className="text-accent">
            Back home
          </Link>
        </p>
      )}
      {profile && (
        <>
          <section className="relative mb-8 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-4">
              <div
                className={`grid h-16 w-16 shrink-0 place-items-center rounded-full border border-accent/50 bg-background text-3xl ${profile.plan === "premium" ? "premium-ring" : ""}`}
              >
                <ProfileGlyph value={profile.emoji} className="h-8 w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-serif text-xl text-foreground">@{profile.username}</p>
                  {profileDisplayTags(profile).map((tag) => {
                    const isLabTag = tag === "LabThing.";
                    const isPremiumTag = tag === "PremiumThing.";
                    return (
                      <span
                        key={tag}
                        className={
                          isLabTag || isPremiumTag
                            ? "rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent"
                            : "rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground"
                        }
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
                {profile.bio && <p className="mt-1 text-sm text-muted-foreground">{profile.bio}</p>}
              </div>
              {!isSelf && (
                <div ref={menuRef} className="relative shrink-0">
                  <button
                    type="button"
                    aria-label="Profile actions"
                    onClick={() => setMenuOpen((current) => !current)}
                    className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-2xl border border-destructive/50 bg-popover p-1 shadow-2xl">
                      <button
                        type="button"
                        onClick={() => void toggleBlock()}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm text-destructive hover:bg-destructive/10"
                      >
                        <Ban className="h-4 w-4" /> {profile.blocked ? "Unblock" : "Block"}
                      </button>
                      {!profile.blocked && (
                        <>
                          <div className="my-1 h-px bg-border" />
                          <button
                            type="button"
                            onClick={() => void reportProfile()}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm text-muted-foreground hover:bg-secondary"
                          >
                            <Flag className="h-4 w-4" /> Report profile
                          </button>
                        </>
                      )}
                      <p className="px-3 pb-2 text-[10px] leading-relaxed text-muted-foreground">
                        Blocking hides their Things and removes the watch relationship.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
              <ProfileStat
                value={profile.follower_count}
                label="watchers"
                to="followers"
                username={profile.username}
              />
              <ProfileStat
                value={profile.following_count}
                label="watching"
                to="following"
                username={profile.username}
              />
              <ProfileStat value={profile.rare_thing_count} label="rare things" />
            </div>

            {!isSelf && !profile.blocked && (
              <>
                <button
                  type="button"
                  disabled={watchingBusy}
                  aria-pressed={isWatching}
                  onClick={() => void toggleWatching()}
                  className={cn(
                    "mt-5 flex w-full items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm transition-colors disabled:cursor-wait disabled:opacity-60",
                    isWatching
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-border bg-background text-foreground hover:border-accent/60",
                  )}
                >
                  <span className="relative grid h-4 w-4 place-items-center" aria-hidden="true">
                    <Eye
                      className={cn(
                        "absolute h-4 w-4 transition-opacity",
                        isWatching ? "opacity-0" : "opacity-100",
                      )}
                    />
                    <EyeOff
                      className={cn(
                        "absolute h-4 w-4 transition-opacity",
                        isWatching ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </span>
                  <span className={cn(isWatching ? "hidden" : "inline")}>Keep an eye on</span>
                  <span className={cn(isWatching ? "inline" : "hidden")}>Watching</span>
                </button>
                <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                  you&apos;ll hear when they drop something new
                </p>
              </>
            )}
            {profile.blocked && !isSelf && (
              <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-muted-foreground">
                This profile is blocked.
              </p>
            )}
          </section>

          <h2 className="brand-mark text-3xl text-foreground">
            Public Things<span className="dot">.</span>
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            {things.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                {profile.blocked
                  ? "Things are hidden while this profile is blocked."
                  : "Nothing public yet."}
              </p>
            )}
            {things.map((thing) => (
              <ThingCard key={thing.id} thing={thing} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}

function ProfileStat({
  value,
  label,
  to,
  username,
}: {
  value: number;
  label: string;
  to?: "followers" | "following";
  username?: string;
}) {
  const content = (
    <>
      <p className="font-serif text-2xl text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </>
  );
  if (!to || !username) {
    return <div className="rounded-xl border border-border bg-background p-3">{content}</div>;
  }
  return (
    <Link
      to="/connections/$username"
      params={{ username }}
      search={{ list: to }}
      className="rounded-xl border border-border bg-background p-3 transition-colors hover:border-accent/50 hover:bg-secondary/30"
    >
      {content}
    </Link>
  );
}
