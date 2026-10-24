import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { Brand } from "@/components/Brand";
import { ThemeSync } from "@/components/ThemeSync";
import { MaintenanceGuard } from "@/components/MaintenanceGuard";
import { getSiteUrl } from "@/lib/site-url";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <Brand size="xl" />
        <p className="mt-6 font-serif text-3xl italic text-foreground">404.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This thing doesn't exist — or no one's dropped it yet.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground"
          >
            Back to feed
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl italic text-foreground">Something cracked.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "An unexpected error happened."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-border bg-background px-5 py-2 text-sm font-medium text-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0f0e0c" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "SameThing." },
      { name: "google-site-verification", content: "aA39HrFq7EJdT5iX-AVd-kYFiAl51YcUD24iu_Nze1g" },
      { title: "SameThing. — a quieter social space" },
      {
        name: "description",
        content: "A quieter social space for the thoughts that make us feel less alone.",
      },
      { property: "og:title", content: "SameThing. — a quieter social space" },
      {
        property: "og:description",
        content: "A quieter social space for the thoughts that make us feel less alone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SameThing. — a quieter social space" },
      {
        name: "twitter:description",
        content: "A quieter social space for the thoughts that make us feel less alone.",
      },
      {
        property: "og:image",
        content: getSiteUrl("/pwa-icon-512.png"),
      },
      {
        name: "twitter:image",
        content: getSiteUrl("/pwa-icon-512.png"),
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const disabled = new URL(window.location.href).searchParams.get("sw") === "off";
    if (disabled) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js")).forEach((r) => r.unregister());
      });
      return;
    }
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {});
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeSync />
        <MaintenanceGuard>
          <Outlet />
        </MaintenanceGuard>
        <Toaster position="top-center" theme="dark" />
        <Analytics />
        <SpeedInsights />
      </AuthProvider>
    </QueryClientProvider>
  );
}
