import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Brand } from "./Brand";
import { BottomNav, DesktopNav } from "./BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ProfileGlyph } from "@/components/ProfileGlyph";
import { OptionalWelcomeTour } from "@/components/OptionalWelcomeTour";
import { FeedbackPrompt } from "@/components/FeedbackPrompt";
import { WebInboxNotifications } from "@/components/WebInboxNotifications";
import { effectivePlan } from "@/lib/premium";
import { claimReferralCode } from "@/lib/api/me.functions";
import { ensureWelcomeSystemMessage } from "@/lib/api/system-messages.functions";
import { useServerFn } from "@tanstack/react-start";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, loading, refreshProfile } = useAuth();
  const claimReferral = useServerFn(claimReferralCode);
  const ensureWelcomeMessage = useServerFn(ensureWelcomeSystemMessage);
  const attemptedReferral = useRef<string | null>(null);
  const welcomeRequestedFor = useRef<string | null>(null);

  useEffect(() => {
    const queryCode = new URLSearchParams(window.location.search).get("ref")?.trim() ?? "";
    if (queryCode) localStorage.setItem("samething:pending-referral", queryCode.slice(0, 80));
  }, []);

  useEffect(() => {
    if (!user || !profile || attemptedReferral.current) return;
    const code = localStorage.getItem("samething:pending-referral")?.trim();
    if (!code) return;
    attemptedReferral.current = code;
    void claimReferral({ data: { code } })
      .then(async (result) => {
        if (result.ok || result.error.includes("already been used")) {
          localStorage.removeItem("samething:pending-referral");
        }
        if (result.ok) await refreshProfile();
      })
      .catch(() => {
        attemptedReferral.current = null;
      });
  }, [claimReferral, profile, refreshProfile, user]);

  useEffect(() => {
    if (!user || !profile || profile.onboarded_at || welcomeRequestedFor.current === user.id)
      return;
    welcomeRequestedFor.current = user.id;
    void ensureWelcomeMessage().catch(() => {
      if (welcomeRequestedFor.current === user.id) welcomeRequestedFor.current = null;
    });
  }, [ensureWelcomeMessage, profile, user]);

  return (
    <div className="min-h-dvh bg-background pb-24 md:pb-8">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4 px-4 py-3 md:max-w-6xl md:px-8 md:py-4">
          <Link to="/" aria-label="SameThing home" className="shrink-0">
            <Brand size="md" wordmarkClassName="text-[1.3rem]" markClassName="h-10 w-10" />
          </Link>
          <DesktopNav />
          <div className="flex items-center gap-2">
            {!loading && !user && (
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="text-xs">
                  Sign in
                </Button>
              </Link>
            )}
            {profile && (
              <Link
                to="/me"
                className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-base ${effectivePlan(profile) === "premium" ? "premium-ring" : ""}`}
                aria-label="My profile"
              >
                <ProfileGlyph
                  value={profile.emoji}
                  photoUrl={profile.avatar_url}
                  photoClassName="h-full w-full"
                  className="h-5 w-5"
                />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pt-4 md:max-w-6xl md:px-8 md:pt-8">
        {children}
      </main>

      <BottomNav />
      <FeedbackPrompt />
      <WebInboxNotifications />
      <OptionalWelcomeTour />
    </div>
  );
}
