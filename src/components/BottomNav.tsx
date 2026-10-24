import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Plus, User, Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { getInboxUnread } from "@/lib/api/notifications.functions";

type NavItem = { to: string; label: string; icon: typeof Home; primary?: boolean };
const items: NavItem[] = [
  { to: "/", label: "Feed", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/drop", label: "Drop", icon: Plus, primary: true },
  { to: "/notifications", label: "Inbox", icon: Bell },
  { to: "/me", label: "Me", icon: User },
];

function useUnreadInbox(userId: string | undefined) {
  return useQuery({
    queryKey: ["inbox-unread", userId],
    queryFn: async () => (await getInboxUnread()).unread,
    enabled: !!userId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function DesktopNav() {
  const { location } = useRouterState();
  const path = location.pathname;
  const { user } = useAuth();
  const { data: unread = 0 } = useUnreadInbox(user?.id);

  return (
    <nav className="hidden min-w-0 flex-1 items-center justify-center md:flex" aria-label="Primary">
      <ul className="flex items-center gap-1 rounded-full border border-border/70 bg-card/55 p-1">
        {items.map((it) => {
          const Icon = it.icon;
          const active = path === it.to || (it.to !== "/" && path.startsWith(it.to));
          const showDot = it.to === "/notifications" && unread > 0 && !active;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "pressable relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors",
                  it.primary && !active && "bg-background text-foreground",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="h-3.5 w-3.5" strokeWidth={it.primary ? 1.8 : 1.6} />
                  {showDot && (
                    <span
                      aria-label={`${unread} unread`}
                      className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-card"
                    />
                  )}
                </span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function BottomNav() {
  const { location } = useRouterState();
  const path = location.pathname;
  const { user } = useAuth();

  const { data: unread = 0 } = useUnreadInbox(user?.id);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active = path === it.to || (it.to !== "/" && path.startsWith(it.to));
          const showDot = it.to === "/notifications" && unread > 0 && !active;
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to}
                className={cn(
                  "pressable flex flex-col items-center justify-start gap-1 rounded-lg px-1 py-1 text-[10px] uppercase tracking-wider transition-colors",
                  active ? "text-accent" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "relative grid h-9 w-9 place-items-center rounded-full transition-transform",
                    it.primary
                      ? active
                        ? "bg-accent text-accent-foreground"
                        : "bg-card text-foreground"
                      : "",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={it.primary ? 1.8 : 1.6} />
                  {showDot && (
                    <span
                      aria-label={`${unread} unread`}
                      className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-background"
                    />
                  )}
                </span>
                <span className="font-sans leading-none">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
