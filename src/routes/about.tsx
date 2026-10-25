import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  Heart,
  Orbit,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { getSiteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About SameThing. · SameThing." },
      {
        name: "description",
        content: "The idea, rhythm and values behind SameThing.",
      },
      { property: "og:title", content: "About SameThing. · SameThing." },
      {
        property: "og:description",
        content: "A small place for noticing, sharing and finding the same.",
      },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/about") }],
  }),
  component: AboutSameThingPage,
});

const values = [
  {
    title: "Human before busy",
    text: "SameThing. is designed around attention rather than volume. The room should feel useful when you visit for one minute or return tomorrow.",
    icon: Users,
  },
  {
    title: "Soft by default",
    text: "Anonymity, careful controls and a slower rhythm give people room to be honest without asking them to become louder first.",
    icon: ShieldCheck,
  },
  {
    title: "Connection without performance",
    text: "Resonance does not need a profile essay. Sometimes recognising one sentence is enough to make the day feel a little less singular.",
    icon: Compass,
  },
];

function AboutSameThingPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_80%_8%,hsl(var(--accent)/0.12),transparent_30%),radial-gradient(circle_at_12%_48%,hsl(var(--same)/0.08),transparent_28%)]" />

      <header className="relative z-10 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to the room
          </Link>
          <Link to="/" aria-label="SameThing home" className="shrink-0">
            <Brand size="sm" showMark={false} wordmarkClassName="text-[1.12rem]" />
          </Link>
          <Link
            to="/documentation"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Documentation</span>
            <span className="sm:hidden">Docs</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pb-24 lg:pt-16">
        <section className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end lg:gap-16">
          <div className="max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent">About the room</p>
            <h1 className="mt-4 max-w-3xl font-serif text-[clamp(3rem,8vw,7rem)] leading-[0.87] tracking-[-0.055em] text-foreground">
              A place for the
              <span className="block italic text-accent">unfinished thought.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              SameThing. is a social space for short observations, feelings and ideas. Browse public
              Things and Quotes without an account; sign in when you want to publish, vote or join a
              conversation.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:ml-auto">
            <div className="relative aspect-[0.92] overflow-hidden rounded-[2rem] border border-accent/25 bg-card/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.16)] sm:p-7">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,hsl(var(--accent)/0.08)_45%,transparent_100%)]" />
              <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20" />
              <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-same/25 [transform:translate(-50%,-50%)_rotate(24deg)]" />
              <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rare/30 [transform:translate(-50%,-50%)_rotate(-38deg)]" />
              <div className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[1.2rem] border border-accent/35 bg-background/90 shadow-lg">
                <Orbit className="h-7 w-7 text-accent" strokeWidth={1.2} />
              </div>
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between sm:bottom-7 sm:left-7 sm:right-7">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.22em] text-accent">The premise</p>
                  <p className="mt-2 max-w-[12rem] font-serif text-xl leading-tight text-foreground">
                    You are not the only one.
                  </p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background/70 text-muted-foreground">
                  <Heart className="h-4 w-4" strokeWidth={1.5} />
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 border-t border-border/70 pt-8 sm:mt-24 sm:pt-10">
          <div className="max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent">
              What makes it different
            </p>
            <h2 className="mt-2 font-serif text-3xl tracking-[-0.03em] sm:text-4xl">
              Less performance. More recognition.
            </h2>
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {[
              {
                title: "Browse before joining",
                text: "Public Things and Quotes can be read without an account. Sign-in is needed to publish or take part.",
                icon: Compass,
              },
              {
                title: "Resonance, not a verdict",
                text: "Same and Nah show how a thought lands with people; they are not claims that it is true or universally popular.",
                icon: Heart,
              },
              {
                title: "Control over comments",
                text: "Open comments on public Things are visible to guests and signed-in readers. If the owner closes comments, the entire section—including older comments—is hidden from everyone until reopened.",
                icon: ShieldCheck,
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-[1.35rem] border border-border bg-card/55 p-5 sm:p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      0{index + 1}
                    </span>
                    <Icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-7 font-serif text-xl tracking-[-0.025em]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-16 grid gap-4 lg:mt-24 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
          <div className="rounded-[1.7rem] border border-accent/25 bg-accent/10 p-6 sm:p-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent">Why it exists</p>
            <h2 className="mt-4 max-w-md font-serif text-3xl leading-tight tracking-[-0.035em] sm:text-4xl">
              Not every thought needs an audience. Some need a place.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
              Social spaces often reward certainty, speed and polish. SameThing. makes room for the
              opposite: a half-formed idea, a passing feeling and the small relief of being met
              there.
            </p>
            <Link
              to="/documentation"
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-background/60 px-4 py-2.5 text-xs text-foreground transition-colors hover:bg-background"
            >
              Read how it works <ArrowRight className="h-4 w-4 text-accent" />
            </Link>
          </div>

          <div className="rounded-[1.7rem] border border-border bg-card/45 p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent">
                  What we keep close
                </p>
                <h2 className="mt-3 font-serif text-3xl tracking-[-0.035em]">A few principles.</h2>
              </div>
              <Orbit
                className="hidden h-8 w-8 text-muted-foreground/70 sm:block"
                strokeWidth={1.2}
              />
            </div>
            <div className="mt-7 divide-y divide-border/70">
              {values.map((value) => {
                const Icon = value.icon;
                return (
                  <div key={value.title} className="flex gap-4 py-5 first:pt-0 last:pb-0">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-background/65 text-accent">
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{value.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{value.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-16 border-y border-border/70 py-10 sm:mt-24 sm:py-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent">Product status</p>
          <h2 className="mt-2 font-serif text-3xl tracking-[-0.03em] sm:text-4xl">
            What is available today.
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card/50 p-4">
              <h3 className="text-sm font-medium">Core space</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Public browsing, Things, Same/Nah responses and comments are live.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card/50 p-4">
              <h3 className="text-sm font-medium">Research API</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Under development. The page, workspace, related information and endpoints are
                temporarily unavailable.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card/50 p-4">
              <h3 className="text-sm font-medium">Paid plans</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Payment collection and subscription activation are not enabled in this release.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-16 border-y border-border/70 py-12 text-center sm:mt-24 sm:py-16">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent">A room to return to</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-serif text-4xl leading-[0.95] tracking-[-0.045em] sm:text-5xl">
            Leave something honest. See what comes back.
          </h2>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-xs font-medium text-accent-foreground transition-transform active:scale-[0.98]"
            >
              Step inside <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/faq"
              search={{ minimal: "true" }}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-xs text-foreground transition-colors hover:border-accent/50"
            >
              Read the FAQ
            </Link>
          </div>
        </section>

        <footer className="flex flex-col gap-4 pt-7 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>SameThing. · a quieter way to connect</span>
          <div className="flex items-center gap-4">
            <Link to="/terms" search={{ minimal: "true" }} className="hover:text-foreground">
              Terms
            </Link>
            <Link to="/privacy" search={{ minimal: "true" }} className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/faq" search={{ minimal: "true" }} className="hover:text-foreground">
              FAQ
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
