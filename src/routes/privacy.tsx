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
        Last updated: October 2026
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
              system messages, security and service-operation records.
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

        <Section title="6. Inbox visibility and deletion">
          <p className="text-muted-foreground">
            You can choose to show Inbox notifications from the last 24 hours, 7 days, 15 days or 30
            days. Older items leave your Inbox at that cutoff. Expired notification records are
            removed in the next daily cleanup, which can take up to about one extra day. Comments
            and votes are separate records and are not removed by this setting.
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
            separate setup and a clear notice before it is introduced.
          </p>
        </Section>

        <Section title="8. AI processing">
          <p className="text-muted-foreground">
            SameThing. uses Cloudflare Workers AI with the Cloudflare-hosted
            <code>@cf/zai-org/glm-4.7-flash</code> model from Zhipu AI. Cloudflare runs the model on
            its global network. The app does not select a processing country or promise that
            inference stays within your country or the EEA.
          </p>
          <p className="text-muted-foreground">
            We use this service for Premium tag suggestions and for safety classification of Thing
            text after it is posted. For Premium members, a draft with at least eight characters is
            sent automatically for tag suggestions along with the available tag choices; applying a
            suggestion is optional. The post-publication safety review also sends the Thing text. We
            do not intentionally include your account email or user ID in the model prompt.
            Free-form Things can contain personal or sensitive details, so please consider that
            before typing or posting them.
          </p>
          <p className="text-muted-foreground">
            A flagged or inconclusive safety result may be placed in an authorised Admin review
            queue. The AI result alone does not hide or remove content or restrict an account. A
            human moderator may review it and take a separate action under the moderation rules. AI
            results can be wrong. We do not use this classification alone to make a legal or
            similarly significant decision about you.
          </p>
          <p className="text-muted-foreground">
            Cloudflare says it processes standard Workers AI prompts and outputs only as long as
            needed to return the response, does not retain them afterward, and does not use them to
            train its models. Cloudflare may keep non-content operational metadata needed to run,
            secure, support or bill for the service; its published notice gives no fixed retention
            period for that metadata. The app calls Workers AI directly rather than routing prompts
            through AI Gateway logging. Our application error logs do not include the Thing text or
            model output. On the current Vercel Hobby plan, runtime logs are retained for one hour.
            See{" "}
            <a
              href="https://developers.cloudflare.com/workers-ai/platform/data-usage/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Cloudflare's Workers AI data-usage notice
            </a>
            .
          </p>
        </Section>

        <Section title="9. Who may receive data?">
          <p className="text-muted-foreground">
            Cloudflare processes the text described above to provide Workers AI. The model is
            Cloudflare-hosted; the app does not send these requests directly to Zhipu AI. Supabase
            provides the app database and authentication, and Vercel hosts the web app. These
            providers may process service and security information needed to provide their
            respective services. We may disclose information to authorities, advisers or other
            parties where necessary to comply with law, protect people, investigate abuse, enforce
            Terms or establish legal claims.
          </p>
        </Section>

        <Section title="10. International transfers">
          <p className="text-muted-foreground">
            Cloudflare, Inc. is based in the United States, and Workers AI runs across Cloudflare's
            global network. The app does not pin AI inference to a single country or the EEA, so the
            precise processing location can vary. Other providers may also process data outside your
            country. Where applicable, transfers rely on the provider's relevant adequacy decision,
            standard contractual clauses or another lawful safeguard. Contact us for current
            provider and transfer information.
          </p>
        </Section>

        <Section title="11. Retention schedule">
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Account and profile data: while the account is active. A deletion request starts a
              30-day period in which it can be cancelled; if it is not cancelled, account-linked
              personal data and user-created content are deleted with the account.
            </li>
            <li>
              Individual content: removed from ordinary views when you delete it. Copies already
              shared outside SameThing. cannot be recalled.
            </li>
            <li>
              Inbox notifications: deleted during the daily cleanup after your selected 24-hour,
              7-day, 15-day or 30-day window. They may remain stored for up to about one extra day.
            </li>
            <li>
              AI prompts and responses: not stored by SameThing. as AI transcripts or content logs.
              Cloudflare says standard inference content is not retained after processing.
              Cloudflare operational metadata has no fixed retention period stated in its public
              Workers AI notice. Safety-review status and related moderation records are retained
              indefinitely as moderation records.
            </li>
            <li>
              Application runtime logs: the current Vercel Hobby plan retains them for one hour.
              SameThing. error messages for AI calls do not contain the submitted text or model
              output. Cloudflare may retain non-content operational metadata under its own service
              policies, without a fixed period stated in its Workers AI notice.
            </li>
            <li>
              Previously created Research API request logs: kept for 7 days, then removed in the
              next daily cleanup (so they may remain for up to about 8 days from the request). No
              new Research API requests are served while the service is under development.
            </li>
            <li>
              Reports, moderation and legal records, support correspondence, and reward or credit
              ledgers: retained indefinitely as service records and are not deleted with an account.
            </li>
            <li>
              Backups: SameThing. does not currently maintain a separate product backup archive.
              Hosting or database providers may operate their own backups under their terms.
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
            The general minimum age is 15. A person under 15 may use SameThing. only after verified
            authorisation from a parent or guardian. That verification flow is not available yet, so
            under-15 registration is currently paused; we do not currently collect a parent's email
            address or phone number for this purpose. Any higher local minimum age or parental
            authorisation rule also applies.
          </p>
          <p className="text-muted-foreground">
            In the EU, GDPR Article 8 applies specifically when personal-data processing is based on
            consent and an information-society service is offered directly to a child. The age below
            which parent or guardian authorisation is needed varies by Member State from 13 to 16;
            it is not a general digital-age rule. See the
            <a
              href="https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data/are-there-any-specific-safeguards-data-about-children_en"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              {" "}
              European Commission guidance
            </a>{" "}
            and
            <a
              href="https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679&from=EN"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              {" "}
              GDPR Article 8
            </a>
            .
          </p>
          <p className="text-muted-foreground">
            If we learn that we collected data from a child contrary to applicable law, we will take
            appropriate steps to delete it or obtain the required authorisation.
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

        <Section title="16. Research API availability">
          <p className="text-muted-foreground">
            The Research API and API Dashboard are under development and temporarily unavailable.
            The public information page, new application flow, workspace tools and API endpoints are
            paused. We are not accepting new Research API applications or serving API requests while
            this pause is in effect.
          </p>
          <p className="text-muted-foreground">
            If your workspace previously submitted an application or used the service, associated
            account, access, usage and credit records may still be retained to operate, secure or
            account for that earlier activity. Previously created request logs follow the 7-day
            retention period above. This Privacy Policy continues to apply to those existing
            records.
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
            debit. Reward, referral and credit records are retained indefinitely as service records
            and are not deleted with an account.
          </p>
        </Section>

        <Section title="18. Service availability">
          <p className="text-muted-foreground">
            We may temporarily make the service or a feature unavailable for maintenance, safety
            work or incident recovery. The affected page may show a notice while authorised
            operators address the issue. A maintenance pause does not by itself delete content or
            change account ownership.
          </p>
        </Section>

        <Section title="19. Changes and contact">
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
