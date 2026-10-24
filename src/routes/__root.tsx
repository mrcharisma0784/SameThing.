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
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { Brand } from "@/components/Brand";
import { ThemeSync } from "@/components/ThemeSync";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <Brand size="xl" />
        <p className="mt-6 font-serif text-3xl italic text-foreground">404.</p>
        <p className="mt-2 text-sm text-muted-foreground">This thing doesn't exist — or no one's dropped it yet.</p>
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
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl italic text-foreground">Something cracked.</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message || "An unexpected error happened."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
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
      { name: "google-site-verification", content: "aA39HrFq7EJdT5iX-AVd-kYFiAl51YcUD24iu_Nze1g" },
      { title: "SameThing. — you're not the only one." },
      { name: "description", content: "Drop a thing. Vote Same or Nah. Discover you're not alone." },
      { property: "og:title", content: "SameThing. — you're not the only one." },
      { property: "og:description", content: "Drop a thing. Vote Same or Nah. Discover you're not alone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SameThing. — you're not the only one." },
      { name: "twitter:description", content: "Drop a thing. Vote Same or Nah. Discover you're not alone." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/4e423268-4ab1-44aa-a8d2-8de6d321c70d" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/4e423268-4ab1-44aa-a8d2-8de6d321c70d" },
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
    const host = window.location.hostname;
    const inIframe = window.self !== window.top;
    const isPreview =
      host.startsWith("id-preview--") ||
      host.startsWith("preview--") ||
      host === "lovableproject.com" ||
      host.endsWith(".lovableproject.com") ||
      host === "lovableproject-dev.com" ||
      host.endsWith(".lovableproject-dev.com") ||
      host === "beta.lovable.dev" ||
      host.endsWith(".beta.lovable.dev");
    const disabled = new URL(window.location.href).searchParams.get("sw") === "off";
    if (inIframe || isPreview || disabled) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js")).forEach((r) => r.unregister());
      });
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeSync />
        <Outlet />
        <Toaster position="top-center" theme="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

