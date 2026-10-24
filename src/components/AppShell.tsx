import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Brand } from "./Brand";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link to="/" aria-label="SameThing home">
            <Brand size="md" />
          </Link>
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
                className={`grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-base ${profile.plan === "premium" ? "premium-ring" : ""}`}
                aria-label="My profile"
              >
                <span>{profile.emoji}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-4">{children}</main>

      <BottomNav />
    </div>
  );
}
