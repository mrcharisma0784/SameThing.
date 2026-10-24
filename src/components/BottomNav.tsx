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

export function BottomNav() {
  const { location } = useRouterState();
  const path = location.pathname;
  const { user } = useAuth();

  const { data: unread = 0 } = useQuery({
    queryKey: ["inbox-unread", user?.id],
    queryFn: async () => (await getInboxUnread()).unread,
    enabled: !!user,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl">
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
                  "flex flex-col items-center justify-start gap-1 rounded-lg px-1 py-1 text-[10px] uppercase tracking-wider transition-colors",
                  active ? "text-accent" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "relative grid h-9 w-9 place-items-center rounded-full",
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
