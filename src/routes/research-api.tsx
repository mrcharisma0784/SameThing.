import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  DatabaseZap,
  FileCode2,
  Gauge,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useEffect } from "react";
import { Brand } from "@/components/Brand";
import { useAuth } from "@/hooks/use-auth";
import {
  RESEARCH_API_AVAILABLE,
  RESEARCH_API_PAUSE_MESSAGE,
} from "@/lib/api/research-availability";

export const Route = createFileRoute("/research-api")({
  head: () => ({
    meta: [
      { title: "Research API · Under development · SameThing." },
      {
        name: "description",
        content: "The Research API is under development and temporarily unavailable.",
      },
    ],
  }),
  component: ResearchApiPage,
});

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/health",
    scope: "Public",
    description:
      "Checks API availability and returns the current contract version. No key or credit is consumed.",
    params: "None",
  },
  {
    method: "GET",
    path: "/api/v1/openapi.json",
    scope: "Public",
    description:
      "Returns the machine-readable OpenAPI description for the current read-only contract.",
    params: "None",
  },
  {
    method: "GET",
    path: "/api/v1/metadata",
    scope: "metadata:read",
    description:
      "Returns supported languages, limits, scopes and safe dataset descriptors. It does not expose people or raw identifiers.",
    params: "None",
  },
  {
    method: "GET",
    path: "/api/v1/things",
    scope: "things:read",
    description: "Reads approved public Thing projections with anonymous aggregate signals.",
    params: "limit, cursor, language, tag",
  },
  {
    method: "GET",
    path: "/api/v1/things/{id}",
    scope: "things:read",
    description: "Reads one public Thing projection by its public resource identifier.",
    params: "id",
  },
  {
    method: "GET",
    path: "/api/v1/quotes",
    scope: "quotes:read",
    description: "Reads public Quote projections. Anonymous Quotes return a null author value.",
    params: "limit, cursor, day",
  },
  {
    method: "GET",
    path: "/api/v1/quotes/{id}",
    scope: "quotes:read",
    description: "Reads one public Quote projection by its public resource identifier.",
    params: "id",
  },
  {
    method: "GET",
    path: "/api/v1/metrics",
    scope: "metrics:read",
    description: "Reads coarse, privacy-safe aggregate metrics for approved research use cases.",
    params: "window, language",
  },
] as const;

const errors = [
  ["400", "invalid_request / invalid_cursor", "The request shape or pagination cursor is invalid."],
  ["401", "missing_or_invalid_api_key", "A valid workspace key is required for this route."],
  ["403", "scope_not_granted", "The workspace key does not include the requested read scope."],
  [
    "402",
    "api_credits_exhausted",
    "The workspace has no remaining API Credits for billable reads.",
  ],
  [
    "429",
    "rate_limited",
    "The plan limit was reached. Respect Retry-After and use cursor pagination.",
  ],
] as const;

function ResearchApiPage() {
  if (RESEARCH_API_AVAILABLE) return <ResearchApiDetailsPage />;

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-12 text-foreground">
      <section className="w-full max-w-lg rounded-3xl border border-border bg-card/70 p-7 text-center shadow-[0_20px_80px_rgba(0,0,0,0.16)] sm:p-10">
        <Brand size="lg" />
        <span className="mx-auto mt-8 grid h-12 w-12 place-items-center rounded-full border border-accent/35 bg-accent/10 text-accent">
          <FileCode2 className="h-5 w-5" />
        </span>
        <p className="mt-6 text-[10px] uppercase tracking-[0.25em] text-accent">
          Under development
        </p>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
          Research API is under development.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{RESEARCH_API_PAUSE_MESSAGE}</p>
        <Link
          to="/"
          className="mt-7 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs text-foreground transition-colors hover:border-accent/50"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to SameThing.
        </Link>
      </section>
    </main>
  );
}

function ResearchApiDetailsPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/api-dashboard", replace: true });
  }, [loading, navigate, user]);

  if (loading || user) {
    return <main className="min-h-dvh bg-background" aria-label="Opening API workspace" />;
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            aria-label="Back to SameThing home"
            className="inline-flex items-center gap-2.5"
          >
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-border/90 bg-[#f4efe6] p-0">
              <img
                src="/pp-logo.png"
                alt="SameThing. mark"
                className="h-full w-full object-contain"
              />
            </span>
            <Brand size="sm" showMark={false} />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/documentation"
              className="hidden items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Documentation <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signin", next: "/api-dashboard" }}
              className="rounded-full border border-border px-3.5 py-2 text-xs text-foreground transition-colors hover:border-accent/60"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <section className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <div className="min-w-0 max-w-xl">
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-accent">
              <FileCode2 className="h-3.5 w-3.5" /> Research API
            </p>
            <h1 className="mt-4 max-w-lg font-serif text-5xl leading-[0.92] text-foreground sm:text-6xl">
              A careful way into the data.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
              SameThing. offers a small, read-only API for researchers and teams who need a
              respectful view of public patterns—not a shortcut into people&apos;s private lives.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                {
                  icon: LockKeyhole,
                  title: "Privacy first",
                  body: "No email, auth ID, raw IP, private message or personal interaction rows.",
                },
                {
                  icon: ShieldCheck,
                  title: "Allow-listed",
                  body: "Only reviewed public projections and anonymous aggregates can be requested.",
                },
                {
                  icon: KeyRound,
                  title: "Workspace access",
                  body: "Apply, track approval, copy an owner-only key and watch API Credit usage in one dashboard.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-border/70 bg-card/50 p-4"
                  >
                    <Icon className="h-4 w-4 text-accent" strokeWidth={1.6} />
                    <p className="mt-3 text-sm text-foreground">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <section className="min-w-0 flex flex-col justify-center rounded-[2rem] border border-accent/20 bg-card/70 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.16)] sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-accent/40 bg-accent/10 text-accent">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <p className="mt-6 text-[10px] uppercase tracking-[0.25em] text-accent">
              Signed-in workspace
            </p>
            <h2 className="mt-3 font-serif text-3xl italic text-foreground">
              Start with a quiet request.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              Pilot applications are open, but new requests join the waitlist. We review each
              requested scope manually. If approved, a scoped API key is created automatically and
              appears in the workspace owner&apos;s Dashboard; no key is issued before approval.
              Sign in or register here to submit your request and open the Dashboard.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/auth"
                search={{ mode: "signin", next: "/api-dashboard" }}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-xs font-medium text-accent-foreground"
              >
                Sign in to open Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup", next: "/api-dashboard" }}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs text-foreground hover:border-accent/50"
              >
                Create account
              </Link>
            </div>
          </section>
        </section>

        <section className="mt-20 border-t border-border/70 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-accent">Public contract</p>
              <h2 className="mt-2 font-serif text-3xl text-foreground">Endpoints and parameters</h2>
            </div>
            <p className="max-w-sm text-xs leading-5 text-muted-foreground">
              Base URL:{" "}
              <code className="break-all text-foreground">
                https://samething-production.vercel.app
              </code>
              . Use the public health and OpenAPI routes without a key; all dataset routes require
              review.
            </p>
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-card/40">
            <div className="hidden grid-cols-[auto_1.1fr_0.8fr_1.8fr_1fr] gap-4 border-b border-border/70 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:grid">
              <span>Method</span>
              <span>Path</span>
              <span>Scope</span>
              <span>Purpose</span>
              <span>Parameters</span>
            </div>
            {endpoints.map((endpoint) => (
              <div
                key={endpoint.path}
                className="grid gap-2 border-b border-border/60 px-4 py-4 last:border-b-0 md:grid-cols-[auto_1.1fr_0.8fr_1.8fr_1fr] md:items-start md:gap-4"
              >
                <span className="w-fit rounded-full border border-accent/30 bg-accent/5 px-2 py-1 font-mono text-[10px] text-accent">
                  {endpoint.method}
                </span>
                <code className="break-all text-xs text-foreground">{endpoint.path}</code>
                <span className="text-xs text-muted-foreground">{endpoint.scope}</span>
                <p className="text-xs leading-5 text-muted-foreground">{endpoint.description}</p>
                <code className="text-[11px] text-foreground/80">{endpoint.params}</code>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-border/70 bg-card/40 p-6">
            <div className="flex items-center gap-3">
              <DatabaseZap className="h-4 w-4 text-accent" />
              <h2 className="font-serif text-2xl text-foreground">How to call it</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              <span className="block break-words">
                Send the owner-only key in the standard Bearer header. Collection routes accept a
                small limit, return a cursor when more data exists, and keep results bounded by your
                approved plan.
              </span>
            </p>
            <pre className="mt-5 max-w-full overflow-hidden whitespace-pre-wrap break-words rounded-xl border border-border/70 bg-background/80 p-4 text-[11px] leading-5 text-foreground">
              <code>{`curl \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://samething-production.vercel.app/api/v1/things?limit=25&language=en&tag=quiet"`}</code>
            </pre>
            <div className="mt-5 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              {[
                "limit: bounded by plan",
                "cursor: opaque next page token",
                "language: e.g. en",
                "tag: one public tag filter",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-accent" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-0 rounded-2xl border border-border/70 bg-card/40 p-6">
            <div className="flex items-center gap-3">
              <Gauge className="h-4 w-4 text-accent" />
              <h2 className="font-serif text-2xl text-foreground">Plans, credits and limits</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              <span className="block break-words">
                Each successful authenticated API request consumes one API Credit. The initial
                welcome allowance is free for an approved workspace. When the balance reaches zero,
                the API returns{" "}
                <code className="mx-1 break-all text-foreground">402 api_credits_exhausted</code>;
                purchase intents can be started from the Dashboard, but checkout is not connected
                yet.
              </span>
            </p>
            <div className="mt-5 grid gap-2 text-xs text-muted-foreground">
              {[
                "Pilot · 60 requests/minute · small bounded reads",
                "Standard · 120 requests/minute · regular research use",
                "Bulk · 30 requests/minute · larger approved windows",
              ].map((item) => (
                <div key={item} className="rounded-xl border border-border/60 px-3 py-2.5">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-accent">Response guide</p>
              <h2 className="mt-2 font-serif text-3xl text-foreground">Errors are explicit</h2>
            </div>
            <Link
              to="/documentation"
              className="hidden items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              Full documentation <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {errors.map(([code, name, body]) => (
              <div key={code} className="rounded-2xl border border-border/70 bg-card/40 p-4">
                <p className="font-mono text-lg text-accent">{code}</p>
                <p className="mt-2 text-xs text-foreground">{name}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 rounded-[2rem] border border-accent/20 bg-accent/5 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent">A firm boundary</p>
            <h2 className="mt-3 max-w-md font-serif text-3xl text-foreground">
              Public patterns, not private lives.
            </h2>
          </div>
          <div className="grid gap-3 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
            {[
              "No profile names, email addresses or account identifiers",
              "No private messages, comments or moderation records",
              "No raw IPs, payment data, API keys or credit ledger data",
              "No write endpoints: the API is read-only by design",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-accent" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to the room
          </Link>
        </div>
      </div>
    </main>
  );
}
