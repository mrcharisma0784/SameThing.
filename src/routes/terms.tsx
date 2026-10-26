import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import { z } from "zod";

export const Route = createFileRoute("/terms")({
  validateSearch: z.object({ minimal: z.coerce.string().optional() }),
  head: () => ({
    meta: [
      { title: "Terms of Service · SameThing." },
      {
        name: "description",
        content:
          "The rules for using SameThing., including content, safety, accounts and payments.",
      },
      { property: "og:title", content: "Terms of Service · SameThing." },
      {
        property: "og:description",
        content: "The rules for using SameThing.",
      },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/terms") }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { minimal } = Route.useSearch();
  const content = (
    <>
      {!minimal && (
        <Link
          to="/"
          className="mb-3 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> back
        </Link>
      )}
      <h1 className="brand-mark text-4xl text-foreground">
        Terms<span className="dot">.</span>
      </h1>
      <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
        Last updated: October 2026
      </p>

      <article className="prose prose-invert mt-6 max-w-none text-sm leading-relaxed text-foreground">
        <Notice>
          These Terms of Service explain how SameThing. works and what is expected from everyone who
          uses it. The service operator&apos;s legal name, registered address and governing-law
          details should be confirmed and published before a commercial launch.
        </Notice>

        <Section title="1. About SameThing.">
          <p>
            SameThing. is a social service for sharing short observations, feelings and ideas called
            “Things”, publishing a daily quote, and responding with Same or Nah. These Terms govern
            access to the website, installable web app, profiles, feed, notifications, comments,
            sharing tools and any future PremiumThing. features.
          </p>
        </Section>

        <Section title="2. Acceptance and eligibility">
          <p>
            By creating an account, signing in, or using a public part of the service, you agree to
            these Terms and the Privacy Policy. The general minimum age is 15. A person under 15 may
            use SameThing. only after verified authorisation from a parent or guardian. That
            verification flow is not available yet, so people under 15 cannot currently complete
            registration. Any higher minimum age or additional parental-authorisation requirement
            under local law also applies. In the EU, GDPR Article 8 concerns consent-based
            processing when an information-society service is offered directly to a child; the
            applicable Member State threshold varies from 13 to 16. It is not a general EU “digital
            age” rule.
          </p>
          <p>
            If you use SameThing. for an organisation, you confirm that you are authorised to accept
            these Terms on its behalf. You may not use the service where doing so would violate
            applicable law or a binding restriction that applies to you.
          </p>
        </Section>

        <Section title="3. Accounts and security">
          <p>
            You are responsible for the accuracy of the information you provide, the security of
            your sign-in method, and activity carried out through your account. Keep your
            credentials private and contact us promptly if you believe an account has been accessed
            without permission. Usernames must not impersonate another person, organisation or
            SameThing. staff member.
          </p>
          <p>
            We may limit, suspend or close accounts that breach these Terms, create a safety risk,
            evade a prior restriction, or are used for fraud, spam or abuse. We may retain limited
            records where necessary for safety, legal claims, fraud prevention or compliance.
          </p>
        </Section>

        <Section title="4. Things, quotes and comments">
          <p>
            You keep ownership of content you create. By posting, you grant SameThing. a
            non-exclusive, worldwide, royalty-free licence to host, reproduce, format, display and
            distribute that content within the service, including feed cards, search results,
            notifications, profile pages and share previews. This licence ends when the content is
            deleted, except where retention is necessary for backups, safety, legal obligations or
            an already-created lawful share by another person.
          </p>
          <p>
            You may publish anonymously where the feature is offered. Anonymous display hides your
            profile from ordinary readers, but the account relationship remains available to
            SameThing. for moderation, abuse prevention, legal compliance and account safety.
            Anonymity is not a promise of legal immunity or absolute technical secrecy.
          </p>
        </Section>

        <Section title="5. Acceptable use">
          <p>You must not use SameThing. to:</p>
          <ul>
            <li>threaten, harass, stalk, shame, dox or target a person or protected group;</li>
            <li>
              publish hate speech, credible threats, sexual exploitation, non-consensual intimate
              material or content involving minors;
            </li>
            <li>encourage self-harm, suicide, violence or dangerous wrongdoing;</li>
            <li>
              share malware, phishing, scams, impersonation, deceptive promotions or unlawful
              commercial solicitations;
            </li>
            <li>
              spam, manipulate votes, create coordinated artificial engagement or scrape the service
              without permission;
            </li>
            <li>
              circumvent rate limits, access controls, moderation decisions or account restrictions;
            </li>
            <li>
              use another person&apos;s personal data without a lawful reason or publish private
              information without consent.
            </li>
          </ul>
        </Section>

        <Section title="6. Moderation, reports and record status">
          <p>
            SameThing. may use automated filters, human review and user reports to identify harmful
            or unlawful content. Content may be hidden, limited, removed or preserved for review.
            Warnings, temporary mutes and suspension status are risk-based actions; they are not a
            statement that every report is proven. The Record Status area may show Clear, Warning,
            Watch or Suspended according to the account&apos;s current moderation state.
          </p>
          <p>
            You can report a Thing or comment through the in-app report flow. False, abusive or
            retaliatory reporting is not permitted. If you believe an action was mistaken, use the
            support contact shown in the app and include enough information for us to review it.
          </p>
        </Section>

        <Section title="7. AI features and content review">
          <p>
            SameThing. currently uses Cloudflare Workers AI for two Thing-related tasks. For Premium
            users, tag suggestions are generated automatically while they type, but applying a
            suggestion is optional. After a Thing is published, its text is sent for a safety
            classification. A flagged or inconclusive result may be placed in an authorised Admin
            review queue. The AI result does not by itself hide or remove a Thing or restrict an
            account; a human moderator may separately review the content and take action under these
            Terms. AI can be wrong, and its output is not professional, legal, medical or crisis
            advice. We do not currently offer an AI writing or rewriting feature through the
            product.
          </p>
          <p>
            These AI features process the text you enter, which may contain personal or sensitive
            details. The tag suggestion request also includes the permitted tag choices. We do not
            intentionally include your account email or user ID in the model prompt. See the Privacy
            Policy for provider, location and retention details.
          </p>
        </Section>

        <Section title="8. Achievements, Same Credits and future features">
          <p>
            SameThing. may offer non-cash Same Credits for eligible achievements, referrals or other
            in-app events. Credits have no cash value, cannot be sold or transferred, and may be
            corrected, withheld or removed when an event is duplicated, reversed, fraudulent or
            caused by abuse. An achievement can be completed without being claimed; rewards are
            issued only through the in-app claim flow and are subject to the displayed rules.
          </p>
          <p>
            The Research API and API Dashboard are under development and temporarily unavailable.
            New applications cannot be submitted, existing workspace tools cannot be accessed, and
            API requests are not served while this pause is in effect. If the service becomes
            available again, the applicable terms and access conditions will be shown before use.
          </p>
        </Section>

        <Section title="9. Same, Nah, likes and similarity">
          <p>
            Votes, likes and similarity indicators are community signals, not guarantees of truth,
            popularity or identity. You may submit one current vote per Thing where voting is
            available. We may rate-limit, remove or invalidate activity that is abusive or
            coordinated. Owners cannot vote on their own Thing.
          </p>
        </Section>

        <Section title="10. Following, notifications and blocking">
          <p>
            You may keep an eye on another public profile, receive notifications when that person
            publishes a new non-anonymous Thing or quote, and turn those notifications off in
            Settings. You may block an account through its profile menu. Blocking hides that
            account’s Things from your feed and search, removes the follow relationship and can be
            reversed from Account & Privacy. Reporting a Thing or Quote hides that target from your
            own feed, search and detail views while the report is retained for review; it is not a
            guarantee that a copy already shared outside the service can be removed.
          </p>
          <p>
            If you explicitly enable Web App notifications, a newly fetched Inbox item may also
            appear as a browser notification or an installed PWA notification. Browser permission is
            optional, controlled by the browser and revocable from browser settings. The current
            release does not promise delivery while every browser is closed; continuous background
            Push API delivery would require a separately configured subscription and notification
            service.
          </p>
        </Section>

        <Section title="11. Share cards and external platforms">
          <p>
            SameThing. may generate a MyThing. or MyQuote. share card containing a Thing or Quote,
            author display where permitted, attribution and a link. For your own public content the
            card identifies your content as yours; another person’s public content keeps that
            person’s attribution, while anonymous content remains anonymous. You choose whether to
            copy the link, save a 1080×1920 Story image, or invoke your device&apos;s sharing sheet.
            External platforms such as Instagram, Snapchat, Pinterest, WhatsApp, X or Telegram are
            independent services with their own terms and privacy policies. You are responsible for
            reviewing a card before sharing it and for having the right to share the content.
          </p>
        </Section>

        <Section title="12. PremiumThing., boosts and payments">
          <p>
            PremiumThing. and Boost/Highlight features may be offered as paid features in the
            future. At the current stage, payment collection and subscription activation are
            disabled. No card is charged by using a disabled payment control. When billing launches,
            the purchase screen will show the applicable price, billing period, renewal,
            cancellation, taxes, refund rules and payment processor before confirmation.
          </p>
          <p>
            PremiumThing. currently includes the Premium icon and share-card catalogue, AI tag
            suggestions, larger custom-tag room, Credit-free supported Boost and Time Capsule paths,
            free saved share-card theme changes and a monthly Same Credit allowance. The Research
            API is under development and temporarily unavailable. The exact active features and
            price shown in the product control the applicable plan at the time.
          </p>
          <p>
            Same Credits are an internal, non-cash feature balance. Free accounts may spend them on
            eligible product paths, non-Premium share-card changes and Feed filter pill edits. The
            five-year Time Capsule option uses 60 Same Credits. The Credit screen may show purchase
            packages and create a pending checkout intent, but it does not charge a card or grant
            purchased Credits until a supported payment provider is explicitly connected and the
            payment is confirmed. Research API and API Credit features are currently unavailable
            while that service is under development.
          </p>
          <p>
            Card details must be entered through the payment processor&apos;s secure, tokenised
            interface. SameThing. does not need and must not store your full card number, security
            code or magnetic-stripe data.
          </p>
        </Section>

        <Section title="13. Intellectual property and feedback">
          <p>
            The SameThing. name, interface, visual system, software and service marks belong to
            their respective owners. Except for content you own or are licensed to use, you may not
            copy, reverse engineer, sell, frame or commercially exploit the service without
            permission. If you send feedback, you allow us to use it without payment or obligation
            to you, while keeping ownership of any separately identifiable content you submit.
          </p>
        </Section>

        <Section title="14. Privacy and data requests">
          <p>
            Our Privacy Policy explains what data is collected, why it is used, where it may be
            processed, how long it is retained and how to exercise applicable rights. You can
            control several notification and visibility settings in the app. Requests about access,
            correction, deletion or objection can be sent to the privacy contact listed there.
          </p>
        </Section>

        <Section title="15. Availability and third-party services">
          <p>
            We aim to keep SameThing. useful and available, but the service may change, be
            interrupted, or be affected by maintenance, security incidents, internet failures and
            third-party providers. Sign-in, hosting, analytics, AI and payment services may have
            separate terms. We do not control third-party services and are not responsible for their
            independent availability or content.
          </p>
        </Section>

        <Section title="16. Disclaimers and limitation">
          <p>
            To the extent permitted by law, SameThing. is provided on an “as is” and “as available”
            basis. We do not promise that every post is accurate, safe, lawful or suitable for you,
            or that automated moderation will detect every violation. Nothing in these Terms limits
            a right or remedy that cannot lawfully be limited.
          </p>
        </Section>

        <Section title="17. Maintenance">
          <p>
            We may temporarily make the service or a feature unavailable for maintenance, safety
            work or incident recovery. The affected page may show a notice while authorised
            operators address the issue. A maintenance pause does not delete content or change
            account ownership; it only limits availability while active.
          </p>
        </Section>

        <Section title="18. Changes and termination">
          <p>
            We may update these Terms when the service, law or safety practices change. Material
            changes will be made available in the app or through a reasonable notice. If you
            continue using SameThing. after the effective date, the updated Terms apply. You may
            stop using the service and request account deletion at any time; we may retain
            information where required for safety, legal obligations or dispute resolution.
          </p>
        </Section>

        <Section title="19. Contact">
          <p>
            For safety reports and account support, use the in-app support flow. For privacy
            requests, contact privacy@samething.app. For general service questions, contact
            hello@samething.app. Please do not send card numbers, passwords or security codes by
            email.
          </p>
        </Section>
      </article>

      {!minimal && (
        <p className="mt-10 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <span className="mx-2">·</span>
          <Link to="/faq" className="hover:text-foreground">
            FAQ
          </Link>
        </p>
      )}
    </>
  );
  return minimal ? <LegalLayout>{content}</LegalLayout> : <AppShell>{content}</AppShell>;
}

function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background px-4 py-8 text-foreground">
      <main className="mx-auto max-w-2xl">{children}</main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 space-y-2">
      <h2 className="font-serif text-xl">{title}</h2>
      {children}
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-accent/30 bg-accent/5 p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}
