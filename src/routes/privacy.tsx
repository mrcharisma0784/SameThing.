import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import { z } from "zod";

export const Route = createFileRoute("/privacy")({
  validateSearch: z.object({ minimal: z.coerce.string().optional() }),
  head: () => ({
    meta: [
      { title: "Privacy Policy · SameThing." },
      {
        name: "description",
        content: "How SameThing. collects, uses, shares and protects personal data.",
      },
      { property: "og:title", content: "Privacy Policy · SameThing." },
      { property: "og:description", content: "How SameThing. handles your data." },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/privacy") }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
        Privacy<span className="dot">.</span>
      </h1>
      <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
        Privacy Policy · Last updated: August 2026
      </p>

      <article className="mt-6 space-y-6 text-sm leading-relaxed text-foreground">
        <Notice>
          This Privacy Policy describes the current SameThing. data flows. The service
          operator&apos;s legal name, registered address, representative and data-protection contact
          should be confirmed and published before a commercial launch. This page is not a
          substitute for legal advice about the operator&apos;s jurisdiction.
        </Notice>

        <Section title="1. Who is responsible for your data?">
          <p className="text-muted-foreground">
            The data controller is the operator of the SameThing. service. For privacy questions and
            rights requests, contact <span className="text-foreground">privacy@samething.app</span>.
            General service support is available at{" "}
            <span className="text-foreground">hello@samething.app</span>. If a local representative
            or data protection officer is legally required, their details will be shown here before
            that obligation applies.
          </p>
        </Section>

        <Section title="2. Data we collect">
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              <strong>Account data:</strong> email address, authentication provider identifier,
              account timestamps, username and sign-in state.
            </li>
            <li>
              <strong>Profile data:</strong> selected icon, bio, language, theme, feed tags,
              notification preferences, mention and message settings, age range and gender where
              voluntarily provided.
            </li>
            <li>
              <strong>Content and activity:</strong> Things, daily quotes, comments, replies, votes,
              likes, mentions, reports, follow and block relationships, share-card actions, and
              moderation results.
            </li>
            <li>
              <strong>Safety and service data:</strong> warning, mute, suspension and ban state;
              system messages; rate-limit and fraud-prevention records; error and audit logs.
            </li>
            <li>
              <strong>Technical data:</strong> device/browser information, timestamps, approximate
              operational metadata, and security information needed to protect the service. We do
              not request contacts, microphone, camera or precise location for the core service.
            </li>
            <li>
              <strong>Local app state:</strong> browser notification permission state is controlled
              by your browser. The installed web app may keep a local list of Inbox item IDs that
              have already been surfaced on that device, plus local dismissed and pinned Inbox rows,
              to avoid repeating an alert. This local state is not an account activity record.
            </li>
          </ul>
        </Section>

        <Section title="3. Why we use data and our legal bases">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card p-3">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="p-2">Purpose</th>
                  <th className="p-2">Examples</th>
                  <th className="p-2">Typical basis</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/70">
                  <td className="p-2 text-foreground">Provide the service</td>
                  <td className="p-2">
                    Account, feed, profiles, votes, comments and notifications
                  </td>
                  <td className="p-2">Contract / legitimate interests</td>
                </tr>
                <tr className="border-b border-border/70">
                  <td className="p-2 text-foreground">Safety and moderation</td>
                  <td className="p-2">
                    Reports, banned-word filters, abuse prevention and enforcement
                  </td>
                  <td className="p-2">Legitimate interests / legal obligation</td>
                </tr>
                <tr className="border-b border-border/70">
                  <td className="p-2 text-foreground">Personalisation</td>
                  <td className="p-2">Language, feed preferences, notification controls</td>
                  <td className="p-2">Contract / consent where required</td>
                </tr>
                <tr>
                  <td className="p-2 text-foreground">Optional future features</td>
                  <td className="p-2">PremiumThing., boosts and payment processing</td>
                  <td className="p-2">Contract / consent where required</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground">
            Where we rely on consent, you can withdraw it through the relevant setting or by
            contacting us. Withdrawal does not affect processing that took place before withdrawal
            or processing based on another lawful ground.
          </p>
        </Section>

        <Section title="4. Public, anonymous and private display">
          <p className="text-muted-foreground">
            Public Things, non-anonymous quotes and public profile information can be viewed by
            other people and may be copied or shared outside SameThing. Choosing anonymous display
            hides your username from ordinary readers, but the account relationship remains
            available to SameThing. for moderation, abuse prevention and legal compliance. Anonymous
            does not mean that the service cannot associate content with the account that created
            it.
          </p>
        </Section>

        <Section title="5. Following, notifications and blocking">
          <p className="text-muted-foreground">
            When you keep an eye on a profile, we store the follower relationship and may create an
            in-app notification when that profile publishes a new non-anonymous Thing or quote. You
            can turn “People you watch” notifications off. Blocking stores a block relationship,
            hides that account’s Things from your feed and search, removes the related follow
            relationship and can be reversed from Account & Privacy. We do not use a blocked
            relationship to send that person a follow notification. When you report a Thing or
            Quote, the target is hidden from your own feed, search and detail views while the report
            remains available to authorised reviewers.
          </p>
        </Section>

        <Section title="6. Notification retention">
          <p className="text-muted-foreground">
            You can choose to keep inbox notifications for 24 hours, 7 days, 15 days or 30 days.
            Older persisted system notifications are automatically removed by a scheduled cleanup,
            and the Inbox applies the same retention filter when reading. Comments and votes remain
            content/activity records rather than separate notification copies and are not deleted
            merely because an inbox retention period expires.
          </p>
        </Section>

        <Section title="7. Web App notifications and PWA">
          <p className="text-muted-foreground">
            Web App notifications are optional. After you press the enable control, the browser may
            display newly fetched Inbox items as a browser or installed-PWA notification. Category
            preferences still apply, and the service does not request notification permission during
            an unrelated page load. You can revoke permission from browser or device settings. The
            current implementation uses an authenticated app session and does not promise delivery
            when the browser has been fully closed; a future Push API service would require a
            separate subscription, key and retention design.
          </p>
        </Section>

        <Section title="8. AI processing">
          <p className="text-muted-foreground">
            Certain server-side features may send limited text to a configured AI or
            safety-processing provider for tag suggestions and safety classification. The service
            does not expose provider credentials to browsers. We do not authorise providers to train
            a general model on your content under the current configuration, but providers may
            retain technical logs under their own terms. We do not use AI to make solely automated
            decisions with legal or similarly significant effects without appropriate review and
            notice.
          </p>
        </Section>

        <Section title="9. Who may receive data?">
          <p className="text-muted-foreground">
            Data may be processed by service providers that host or secure the product, including
            managed database/authentication, application hosting, security, AI and—when
            activated—payment providers. Providers receive only what is needed for their function
            and are expected to process data under contractual or other applicable safeguards. We
            may disclose information to authorities, advisers or other parties where necessary to
            comply with law, protect people, investigate abuse, enforce Terms or establish legal
            claims.
          </p>
        </Section>

        <Section title="10. International transfers">
          <p className="text-muted-foreground">
            Our providers may process data in countries outside your country of residence. Where
            required, we use an applicable adequacy decision, standard contractual clauses,
            equivalent safeguards or another lawful transfer mechanism. Contact us if you need
            information about the current provider list and applicable safeguards.
          </p>
        </Section>

        <Section title="11. Retention schedule">
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Account and profile data: while the account is active, then deleted or anonymised
              according to the account-deletion process.
            </li>
            <li>
              Public content: until you delete it or it is removed, except for limited backups,
              safety records, legal claims or copies shared by others.
            </li>
            <li>Inbox system notifications: according to your 24h/7d/15d/30d setting.</li>
            <li>
              Reports, moderation decisions and security records: only as long as reasonably
              necessary for safety, legal obligations, dispute resolution and abuse prevention.
            </li>
            <li>
              Backups: retained for the service&apos;s backup cycle and placed beyond ordinary use
              after a valid deletion process where immediate overwrite is not technically possible.
            </li>
          </ul>
        </Section>

        <Section title="12. Cookies and local storage">
          <p className="text-muted-foreground">
            SameThing. uses essential session storage and local browser storage for sign-in state,
            installable web-app behavior, and limited Inbox presentation state such as dismissed or
            pinned rows. We do not use third-party advertising trackers for the core service. If
            optional analytics or non-essential cookies are enabled later, the applicable choice and
            notice will be provided.
          </p>
        </Section>

        <Section title="13. Your rights">
          <p className="text-muted-foreground">
            Depending on where you live, you may have rights to access, correct, delete, restrict or
            object to processing, receive a portable copy, withdraw consent, and complain to a
            supervisory authority. You can manage many profile and notification choices in Settings.
            Send a request to privacy@samething.app; we may request proportionate information to
            verify identity and will respond within the period required by applicable law. The right
            to delete is not absolute where retention is necessary for legal obligations, freedom of
            expression, safety, fraud prevention, public interest or legal claims.
          </p>
        </Section>

        <Section title="14. Children">
          <p className="text-muted-foreground">
            SameThing. is not directed to children under 13. Where local law sets a higher age or
            parental-consent requirement, that requirement applies. If we learn that we collected
            data from a child contrary to applicable law, we will take appropriate steps to delete
            it or obtain the required authorisation.
          </p>
        </Section>

        <Section title="15. Payments and card data">
          <p className="text-muted-foreground">
            Payment collection is currently disabled. If PremiumThing. or Boost/Highlight billing is
            activated, card details will be entered through a PCI-aware payment processor&apos;s
            tokenised interface. SameThing. will store only provider references and limited display
            metadata such as card brand and last four digits; we will not ask for or store the full
            card number or security code. Payment processors may process billing data under their
            own notices.
          </p>
        </Section>

        <Section title="16. API Dashboard, API Credits and research access">
          <p className="text-muted-foreground">
            If you apply for Research API access, we process the application details you submit,
            including your name, organisation, research purpose, requested public scopes and
            expected volume. The request is tied to your signed-in account so that an approved
            workspace can see its own status, key state, rate plan and usage without exposing those
            details to other users or Admin views.
          </p>
          <p className="text-muted-foreground">
            Approved access keys are generated server-side. The service stores a one-way hash and
            short prefix for request authentication and operational identification, and keeps the
            encrypted key material needed to show the key to its owner in the authenticated API
            Dashboard. Admin sees safe metadata only; credentials are not placed in audit logs. API
            requests are rate-limited and usage logs may include key reference, endpoint, response
            status, request ID and timing, but not private profile or content fields outside the
            approved public projection. Pending and reviewing applications remain visible until
            processed. Approved, waitlisted and declined results are shown once in the Application
            area and then hidden after an atomic notice acknowledgement. New requests are blocked
            during pending, reviewing or approved access; after a decline or waitlist, the account
            has a currently configured 72-hour re-application cooldown.
          </p>
          <p className="text-muted-foreground">
            API Credits are a separate account-level balance. We store balance adjustments and usage
            ledger entries so the workspace can see consumption and so we can prevent duplicate or
            unauthorised charges. An approved workspace may receive a one-time 500-credit welcome
            allowance; each successful API request consumes one API Credit. The API Dashboard may
            also store a pending purchase intent containing pack, amount, currency and provider
            status. Until a payment provider is connected and payment is confirmed, no card is
            charged and no purchased Credits are granted.
          </p>
        </Section>

        <Section title="17. Achievements, Same Credits, Feed filters and referrals">
          <p className="text-muted-foreground">
            We store achievement progress, claim state and eligible referral records so the app can
            show completed tasks and issue non-cash Same Credits. Credits are account-level records;
            they are not cash, are not sold or transferred, and may be corrected or removed when an
            event is duplicated, reversed or abusive. Active Premium accounts may receive the
            published monthly Same Credit allowance once per active month; the grant is recorded in
            the Same Credit ledger. Non-Premium accounts spend 5 Same Credits for an actual saved
            Feed filter pill configuration change; Premium accounts can edit those filters without a
            debit. Referral and achievement data is retained with the related account and moderation
            records for the period reasonably needed to operate, audit and protect the programme.
          </p>
        </Section>

        <Section title="18. Maintenance and operations">
          <p className="text-muted-foreground">
            An authorised operator may enable Maintenance Mode for releases, data work, safety
            response or incident recovery. The setting and its update time are stored as an
            operational service record. During the mode, user-facing pages and actions are blocked
            or replaced with a maintenance view, while the administrative area remains available to
            authorised operators. The selectable first target set can include Leaderboard, Time
            Capsule, Find my twin, Achievements, Reference, Credit, Research API, API Dashboard and
            Documentation; Account & Privacy, Subscription & payment, Appearance and
            Support/Feedback remain intentionally outside that first set. This operational control
            does not change the retention of content or account data.
          </p>
        </Section>

        <Section title="19. Admin and operational security">
          <p className="text-muted-foreground">
            Administrative access is a separate restricted operational session and is not granted
            merely because a person is signed in to a SameThing. account. Access requires authorised
            credentials and server-side verification; credentials are not stored in the browser,
            content database or audit metadata. Admin actions may create an operational audit record
            containing the action, time, actor label and limited target reference. We do not place
            credentials, bearer secrets or full payment data in those logs.
          </p>
        </Section>

        <Section title="20. Researcher data access status">
          <p className="text-muted-foreground">
            SameThing. operates a controlled, read-only Research API. A company or research team
            must start from the Research API page, sign in or register, and continue directly to API
            Dashboard to submit a workspace application. An approved application may receive a
            scoped bearer key; the key is shown only to its owner, while the service stores a
            one-way hash, encrypted owner-display material and operational metadata. Available
            projections are limited to public Things, public Quotes, metadata and anonymous
            aggregate metrics, subject to expiry, revocation, rate limits,
            one-credit-per-successful-request usage and request logging. The API does not expose
            profiles, email addresses, auth IDs, private messages, comments, moderation records,
            safety flags, credits, payment data, admin data or other private fields.
          </p>
        </Section>

        <Section title="21. Changes and contact">
          <p className="text-muted-foreground">
            We review this Policy when our data flows, features or legal obligations change. We will
            update the effective date and provide a reasonable notice for material changes.
            Questions, access requests, correction requests, deletion requests or objections can be
            sent to <span className="text-foreground">privacy@samething.app</span>. Please never
            email a password, full card number or security code.
          </p>
        </Section>
      </article>

      {!minimal && (
        <p className="mt-10 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">
            Terms
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
    <section className="space-y-2">
      <h2 className="font-serif text-xl text-foreground">{title}</h2>
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
