import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  FileCode2,
  FileText,
  LockKeyhole,
  Menu,
  MessageCircle,
  Orbit,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "@/components/Brand";
import { cn } from "@/lib/utils";

function LandingBrand({ size = "sm" }: { size?: "sm" | "md" }) {
  const markClassName =
    size === "md" ? "h-[3rem] w-[3rem] rounded-xl" : "h-[2.7rem] w-[2.7rem] rounded-xl";
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden border border-border/90 bg-[#f4efe6] p-0",
          markClassName,
        )}
      >
        <img src="/pp-logo.png" alt="SameThing. mark" className="h-full w-full object-contain" />
      </span>
      <Brand
        size={size}
        showMark={false}
        className={size === "sm" ? "text-[1.12rem]" : "text-[1.3rem]"}
      />
    </span>
  );
}

const menuItems: Array<{
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { label: "Documentation", description: "The thinking behind the product", icon: BookOpen },
  { label: "Research API", description: "Under development", icon: FileCode2 },
  { label: "About SameThing.", description: "A little more about the space", icon: Orbit },
  { label: "Contact", description: "samething@bot.cue.im", icon: MessageCircle },
];

function MenuItem({ item, onClose }: { item: (typeof menuItems)[number]; onClose: () => void }) {
  const Icon = item.icon;
  const content = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border/70 bg-card text-accent">
        <Icon className="h-4 w-4" strokeWidth={1.6} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-foreground">{item.label}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {item.description}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </>
  );

  if (item.label === "Documentation" || item.label === "About SameThing.") {
    return (
      <Link
        to={item.label === "Documentation" ? "/documentation" : "/about"}
        onClick={onClose}
        className="group flex w-full items-center gap-4 rounded-2xl border border-transparent p-3 text-left transition-colors hover:border-border hover:bg-background/50"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled
      className="group flex w-full cursor-not-allowed items-center gap-4 rounded-2xl border border-transparent p-3 text-left opacity-60 transition-colors"
    >
      {content}
    </button>
  );
}

function LandingMenu({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, []);

  return (
    <div className="landing-menu-backdrop fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background/75 px-3 pt-3 backdrop-blur-md">
      <div className="landing-menu-panel mx-auto max-h-[calc(100dvh-1.5rem)] max-w-6xl overflow-y-auto overscroll-contain rounded-[2rem] border border-accent/25 bg-card shadow-[0_30px_100px_rgba(0,0,0,0.42)]">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] uppercase tracking-[0.26em] text-accent">Explore</p>
            <p className="mt-1 font-serif text-2xl italic text-foreground">The public side.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pressable grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-foreground"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          {menuItems.map((item) => (
            <MenuItem key={item.label} item={item} onClose={onClose} />
          ))}
          <Link
            to="/terms"
            search={{ minimal: "true" }}
            onClick={onClose}
            className="group flex items-center gap-4 rounded-2xl border border-transparent p-3 text-left transition-colors hover:border-border hover:bg-background/50"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/70 bg-background text-accent">
              <FileText className="h-4 w-4" strokeWidth={1.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-foreground">Terms</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                The agreement for sharing this space
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/privacy"
            search={{ minimal: "true" }}
            onClick={onClose}
            className="group flex items-center gap-4 rounded-2xl border border-transparent p-3 text-left transition-colors hover:border-border hover:bg-background/50"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/70 bg-background text-accent">
              <LockKeyhole className="h-4 w-4" strokeWidth={1.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-foreground">Privacy</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                What stays yours, and what does not
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/faq"
            search={{ minimal: "true" }}
            onClick={onClose}
            className="group flex items-center gap-4 rounded-2xl border border-transparent p-3 text-left transition-colors hover:border-border hover:bg-background/50"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/70 bg-background text-accent">
              <CircleHelp className="h-4 w-4" strokeWidth={1.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-foreground">FAQ</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Answers to the things people ask
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="flex items-center justify-center gap-2 border-t border-border/70 px-5 py-4 sm:px-7">
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            onClick={onClose}
            className="pressable rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground"
          >
            Join
          </Link>
        </div>
      </div>
    </div>
  );
}

export function PublicLanding() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

  const openQuickSearch = () => {
    const query = quickSearch.trim();
    navigate({ to: "/documentation", search: query ? { q: query } : {} });
  };

  return (
    <div className="landing-page min-h-dvh overflow-x-hidden bg-background text-foreground">
      <div className="landing-noise pointer-events-none fixed inset-0 z-0" aria-hidden="true" />
      {menuOpen && <LandingMenu onClose={() => setMenuOpen(false)} />}

      <header className="relative z-20 border-b border-border/60 bg-background/72 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" aria-label="SameThing home">
            <LandingBrand size="sm" />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="pressable grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Menu className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </div>
      </header>
      <div className="landing-search-row relative z-10 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="landing-search-shell mx-auto flex w-full max-w-[22rem] items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-3 shadow-sm transition-colors focus-within:border-accent/50 focus-within:bg-card">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
          <input
            aria-label="Quick search"
            value={quickSearch}
            onChange={(event) => setQuickSearch(event.target.value.slice(0, 80))}
            onKeyDown={(event) => {
              if (event.key === "Enter") openQuickSearch();
            }}
            placeholder="Quick search"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={openQuickSearch}
            className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Open search"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-12 lg:px-8 lg:pb-12 lg:pt-16">
          <div className="max-w-4xl">
            <h1 className="landing-reveal landing-reveal-delay-1 mt-5 max-w-3xl font-serif text-[clamp(3rem,8vw,6.6rem)] leading-[0.86] tracking-[-0.045em] text-foreground">
              You&apos;re not the
              <span className="block italic text-accent">only one.</span>
            </h1>
            <p className="landing-reveal landing-reveal-delay-2 mt-5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              A small place for the thoughts that usually stay in your head. Drop what you notice,
              find what resonates, and leave a little less alone than you arrived.
            </p>
            <div className="landing-reveal landing-reveal-delay-3 mt-6 flex flex-wrap items-center gap-2.5">
              <Link
                to="/auth"
                className="pressable inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-xs font-medium text-accent-foreground"
              >
                Step inside <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs text-foreground transition-colors hover:border-accent/50"
              >
                See how it works <ArrowDownRight className="h-4 w-4 text-accent" />
              </a>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/20">
          <div className="mx-auto grid max-w-6xl gap-7 px-4 py-12 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-8 lg:py-16">
            <div>
              <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-accent">
                <FileCode2 className="h-3.5 w-3.5" /> API & research
              </p>
              <h2 className="mt-3 max-w-md font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                Research API is under development.
              </h2>
            </div>
            <div className="max-w-xl">
              <p className="text-[13px] leading-6 text-muted-foreground">
                Access to the Research API page, workspace and related information is temporarily
                unavailable while development continues.
              </p>
              <Link
                to="/research-api"
                onClick={(event) => event.preventDefault()}
                aria-disabled="true"
                tabIndex={-1}
                className="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-accent/35 px-4 py-2.5 text-xs text-muted-foreground opacity-60"
              >
                Under development <ArrowRight className="h-3.5 w-3.5 text-accent" />
              </Link>
            </div>
          </div>
        </section>

        {[
          {
            label: "Credit",
            title: "A little balance for the things worth keeping.",
            description:
              "Same Credits reward selected ways of taking part and open a few quieter paths inside the room.",
          },
          {
            label: "Test User",
            title: "Help shape what comes next.",
            description:
              "Test User access is currently being prepared for small, thoughtful product trials and feedback.",
          },
        ].map((item) => (
          <section key={item.label} className="border-y border-border/60 bg-card/20">
            <div className="mx-auto grid max-w-6xl gap-7 px-4 py-12 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-8 lg:py-16">
              <div>
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-accent">
                  <FileCode2 className="h-3.5 w-3.5" /> {item.label}
                </p>
                <h2 className="mt-3 max-w-md font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                  {item.title}
                </h2>
              </div>
              <div className="max-w-xl">
                <p className="text-[13px] leading-6 text-muted-foreground">{item.description}</p>
                <span className="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-accent/35 px-4 py-2.5 text-xs text-muted-foreground opacity-60">
                  Under development <ArrowRight className="h-3.5 w-3.5 text-accent" />
                </span>
              </div>
            </div>
          </section>
        ))}

        <section id="how-it-works" className="border-y border-border/60 bg-card/20">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-20">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-accent">The quiet loop</p>
              <h2 className="mt-3 max-w-md font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                Notice. Drop. Recognise.
              </h2>
              <p className="mt-4 max-w-sm text-[13px] leading-5 text-muted-foreground">
                Write a short Thing, see Same or Nah responses, and join the conversation when you
                choose.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                ["01", "Notice something", "A feeling, a pattern, a sentence you cannot shake."],
                ["02", "Drop a Thing", "Give it a few honest words."],
                [
                  "03",
                  "See what resonates",
                  "Same, Nah, a comment or a quiet nod from someone you will never meet.",
                ],
              ].map(([number, title, description]) => (
                <div
                  key={number}
                  className="landing-scroll-reveal group flex gap-3 rounded-xl border border-border/80 bg-background/45 p-3 sm:gap-4 sm:p-4"
                >
                  <span className="font-serif text-xl italic text-accent/75">{number}</span>
                  <div className="min-w-0">
                    <h3 className="text-base text-foreground sm:text-[17px]">{title}</h3>
                    <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-accent">Thoughts</p>
              <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                Some thoughts arrive quietly.
              </h2>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {[
                "I am learning that rest can be a plan.",
                "Some rooms feel loud even when nobody speaks.",
                "I miss versions of people that never existed.",
              ].map((quote) => (
                <div
                  key={quote}
                  className="landing-scroll-reveal flex items-center gap-3 rounded-xl border border-border bg-card/50 p-3.5 sm:p-4"
                >
                  <p className="min-w-0 flex-1 font-serif text-lg leading-tight text-foreground">
                    “{quote}”
                  </p>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground/45"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-18 sm:px-6 lg:px-8 lg:pb-24">
          <div className="landing-cta relative overflow-hidden rounded-[2rem] border border-accent/30 bg-accent/8 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
            <div
              className="landing-cta-glow absolute -right-16 -top-20 h-72 w-72 rounded-full border border-accent/15"
              aria-hidden="true"
            />
            <div className="relative max-w-2xl">
              <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
                There is room for one more.
              </p>
              <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground sm:text-5xl">
                Bring one small truth.
              </h2>
              <p className="mt-3 max-w-lg text-[13px] leading-5 text-muted-foreground sm:text-sm">
                Join the space, write at your own pace and find out who else has been carrying the
                same thought.
              </p>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="pressable mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-xs font-medium text-accent-foreground"
              >
                Create your space <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/70 bg-card/25">
        <div className="mx-auto grid max-w-6xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_1fr_1fr] lg:px-8 lg:py-10">
          <div>
            <Link to="/" aria-label="SameThing home" className="inline-flex items-center">
              <LandingBrand size="md" />
            </Link>
            <p className="mt-3 max-w-xs text-[13px] leading-5 text-muted-foreground">
              “A quieter social space for the things that make us feel less alone.”
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-accent">Explore</p>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              <Link to="/documentation" className="w-fit hover:text-foreground">
                Documentation
              </Link>
              <Link
                to="/research-api"
                onClick={(event) => event.preventDefault()}
                aria-disabled="true"
                tabIndex={-1}
                className="w-fit cursor-not-allowed opacity-60"
              >
                Research API
              </Link>
              <Link to="/faq" search={{ minimal: "true" }} className="w-fit hover:text-foreground">
                FAQ
              </Link>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-accent">Elsewhere</p>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              <a href="mailto:samething@bot.cue.im" className="w-fit hover:text-foreground">
                Contact
              </a>
              <Link
                to="/privacy"
                search={{ minimal: "true" }}
                className="w-fit hover:text-foreground"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                search={{ minimal: "true" }}
                className="w-fit hover:text-foreground"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-row items-center justify-between gap-2 border-t border-border/60 px-4 py-4 text-[9px] uppercase tracking-[0.15em] text-muted-foreground sm:px-6 lg:px-8">
          <span className="whitespace-nowrap">© {new Date().getFullYear()} SameThing.</span>
          <span className="whitespace-nowrap">for the in-between</span>
        </div>
      </footer>
    </div>
  );
}
