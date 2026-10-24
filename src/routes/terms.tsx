import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · SameThing." },
      { name: "description", content: "The rules of using SameThing. — what's allowed, what's not, and how the service works." },
      { property: "og:title", content: "Terms of Service · SameThing." },
      { property: "og:description", content: "The rules of using SameThing." },
    ],
    links: [{ rel: "canonical", href: "https://samething.lovable.app/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <AppShell>
      <Link to="/" className="mb-3 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> back
      </Link>
      <h1 className="brand-mark text-4xl text-foreground">Terms<span className="dot">.</span></h1>
      <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">Last updated: June 2026</p>

      <article className="prose prose-invert mt-6 max-w-none text-sm leading-relaxed text-foreground">
        <section className="space-y-2">
          <h2 className="font-serif text-xl">1. The deal</h2>
          <p className="text-muted-foreground">
            SameThing. (“we”, “the service”) is a space where people share short
            “things” — feelings, observations, confessions — and other people
            vote Same or Nah. By creating an account you agree to these terms.
            If you don't agree, please don't use the service.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-serif text-xl">2. Who can join</h2>
          <p className="text-muted-foreground">
            You must be at least 13 years old (16 in the EU/UK). You're
            responsible for keeping your account secure and for everything posted
            from it.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-serif text-xl">3. What's not allowed</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Hate speech, harassment, slurs, threats, or doxxing.</li>
            <li>Sexual content, explicit nudity, or content involving minors.</li>
            <li>Spam, scams, paid promotion without disclosure, or scraping.</li>
            <li>Impersonating others or claiming to represent SameThing.</li>
            <li>Encouraging self-harm or violence toward others.</li>
          </ul>
          <p className="text-muted-foreground">
            Posts that trip our safety filters are hidden automatically and may
            trigger warnings or a temporary mute. Three strikes mute your
            account for 24 hours. Severe violations can lead to permanent
            removal.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-serif text-xl">4. Your content</h2>
          <p className="text-muted-foreground">
            You keep ownership of what you post. By posting, you give SameThing.
            a non-exclusive, worldwide licence to host, display, and surface
            your content inside the service (feed, search, share previews). You
            can delete your content or your account at any time.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-serif text-xl">5. AI features</h2>
          <p className="text-muted-foreground">
            We use AI to (a) suggest 1–3 tags for a thing you're drafting and (b) screen your
            drafts for banned words before you send. Suggestions are highlighted but never
            auto-selected — you always decide what to post. AI output is not perfect; if you
            disagree with a suggested tag, ignore it.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-serif text-xl">6. Mentions & messages</h2>
          <p className="text-muted-foreground">
            Typing @username in a thing or comment notifies that person and links to the post.
            Anyone can disable mentions in Account &amp; Privacy — after that, mention attempts
            get blocked with a message. Direct messages ("open to chat") are a planned feature
            and currently disabled.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-serif text-xl">7. RareThing badges</h2>
          <p className="text-muted-foreground">
            A thing becomes <em>Rare</em> once it has 100+ votes and Same-ratio ≤ 2%.
            At 1,000+ votes with Same-ratio ≤ 1% it earns a permanent
            <em> "The only one."</em> badge that never drops. If Same-ratio later exceeds 5%,
            the rare badge drops (permanent status is never removed).
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-serif text-xl">8. Moderation, warnings & bans</h2>
          <p className="text-muted-foreground">
            Content with banned words at severity "warn" gets a system message in your inbox and
            adds a warning to your account. Words at severity "block" are refused at post time.
            Repeated violations, reports, or serious content can lead to a mute or a ban.
            System messages appear as <span className="text-foreground">[System]</span> in your
            inbox with a link to the relevant rule.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-serif text-xl">9. Notifications you control</h2>
          <p className="text-muted-foreground">
            You can toggle each notification kind independently (Same, Nah, comments &amp; replies,
            mentions, "the only one" alerts, system messages) in Settings → Notifications.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-serif text-xl">10. Your content</h2>
          <p className="text-muted-foreground">
            You keep ownership of what you post. By posting, you give SameThing. a non-exclusive,
            worldwide licence to host, display, and surface your content inside the service
            (feed, search, share previews). You can delete your content or your account at any
            time from Account &amp; Privacy.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-serif text-xl">11. PremiumThing (upcoming)</h2>
          <p className="text-muted-foreground">
            Some features may be offered as a paid subscription. Billing, renewal, and refund
            terms will be shown at purchase. Cancel anytime from Settings → Subscription &amp;
            payment.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-serif text-xl">12. No warranty</h2>
          <p className="text-muted-foreground">
            The service is provided "as is". We do our best to keep it running
            and safe, but we can't guarantee zero downtime, perfect moderation,
            or that you'll love every thing you read.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-serif text-xl">13. Changes</h2>
          <p className="text-muted-foreground">
            We may update these terms. If we change something material, we'll
            notify you in the app. Continued use after a change means you
            accept it.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-serif text-xl">14. Contact</h2>
          <p className="text-muted-foreground">
            Questions, takedowns, or appeals: reach out from the in-app report
            flow or by email at <span className="text-foreground">hello@samething.app</span>.
          </p>
        </section>
      </article>

      <p className="mt-10 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
      </p>
    </AppShell>
  );
}
