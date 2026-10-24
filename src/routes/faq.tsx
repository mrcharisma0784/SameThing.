import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { z } from "zod";
import { getSiteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/faq")({
  validateSearch: z.object({ minimal: z.coerce.string().optional() }),
  head: () => ({
    meta: [
      { title: "FAQ · SameThing." },
      { name: "description", content: "Frequently asked questions about SameThing." },
      { property: "og:title", content: "FAQ · SameThing." },
      { property: "og:description", content: "Frequently asked questions about SameThing." },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/faq") }],
  }),
  component: FaqPage,
});

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "What is SameThing?",
    a: "SameThing. is a quiet place to drop an observation, feeling or idea and see who relates. People can vote Same or Nah, add comments where comments are open, and discover how a Thing resonates with the community.",
  },
  {
    q: "Do I have to sign up?",
    a: "Public browsing is available without an account, but posting, voting, liking, commenting, following and reporting require sign-in. Anonymous visitors are sent directly to the sign-in screen when they try a protected interaction.",
  },
  {
    q: "What is Quote of the Day?",
    a: "Quote of the Day is a daily space for one short quote. If you have not posted today, the first snapped card is an empty composer; other public quotes sit to its right. Guests can browse public quotes, while writing and editing require sign-in. You can edit or remove only your own quote while the daily entry is available.",
  },
  {
    q: "How does Streak work?",
    a: "Streak is optional and starts at 0. Choose Start my Streak whenever you are ready; after that, open the Streak page once each UTC day to continue the flame. Missing a day resets the current run, while your best run and milestone rewards remain recorded.",
  },
  {
    q: "Can I comment on a quote?",
    a: "Yes, when quote comments are open. The quote detail page uses the same threaded comment experience as a Thing: replies, edit and delete controls for your own comments, reporting, and creator pinning. Public comments can be read without signing in; writing requires sign-in.",
  },
  {
    q: "Why do some posts show anonymous?",
    a: "You can publish a Thing, quote or comment anonymously where the control is available. Your username is hidden from ordinary readers, but SameThing. keeps the account relationship for safety, moderation and legal compliance.",
  },
  {
    q: "How do Same and Nah work?",
    a: "Vote Same or Nah on a Thing once. The similarity indicator is a community signal, not a statement that a Thing is true or universally popular. You cannot vote on your own Thing, and suspicious or coordinated activity may be limited or removed.",
  },
  {
    q: "What is RareThing?",
    a: "A Thing can become Rare when it reaches the configured vote and similarity thresholds. A permanent “You're the only one” status is a separate higher threshold. The exact state is recalculated from votes and can be affected by moderation or invalid activity.",
  },
  {
    q: "How do mentions work?",
    a: "Type @ followed by a username in a Thing or comment and choose a valid suggestion. The mentioned person can receive a notification and open the related content. You can turn mentions off in Account & Privacy.",
  },
  {
    q: "How do notifications work?",
    a: "Settings → Notifications lets you control comments and replies, mentions, rare-Thing alerts, People you watch, and system messages. Turning a category off hides those items from the Inbox and stops related in-app notifications. System messages remain available for important safety or service information.",
  },
  {
    q: "How long are notifications kept?",
    a: "Choose 24h, 7d, 15d or 30d in Settings → Notifications. Older persisted Inbox notifications are cleared automatically. Comments and votes remain content/activity records and are not deleted merely because an Inbox retention period expires.",
  },
  {
    q: "Do Inbox items also become browser notifications?",
    a: "After you explicitly enable Web App notifications in Settings → Notifications, newly fetched Inbox items can appear as browser or installed-PWA notifications. The same category preferences apply and the first fetch is used as a baseline, so old Inbox history is not replayed. Browser permission is optional and can be revoked from browser settings.",
  },
  {
    q: "Will notifications arrive when my browser is closed?",
    a: "The current release reliably surfaces alerts while the authenticated app or installed web app is active and polling. Full closed-browser delivery is not promised yet because it needs a separate Push API subscription and server notification service; no permission or subscription is created silently.",
  },
  {
    q: "How does the Inbox swipe work?",
    a: "Swipe right to dismiss a notification from your Inbox. Swipe left to pin it at the top. Up to three notifications can be pinned locally on your device.",
  },
  {
    q: "What are system messages?",
    a: "System messages are notices from SameThing. or its moderation systems. They can include warnings, support replies, announcements and links to relevant settings or policy information.",
  },
  {
    q: "How do I follow someone?",
    a: "Open a public profile and tap Keep an eye on. The profile shows compact Watchers and Watching cards, and each card opens a profile list where you can visit the listed users. You can stop watching from the same control.",
  },
  {
    q: "What notification do followers receive?",
    a: "When People you watch notifications are enabled, you can receive a message such as “@alex dropped something new.” for a new non-anonymous Thing or quote. The person who published it does not receive a notification that you watched them.",
  },
  {
    q: "How do I block someone?",
    a: "Open the three-dot menu on the public profile and choose the red Block action. Blocking hides relevant activity and removes the follow relationship between both accounts. It does not remove copies that another person has already shared outside SameThing.",
  },
  {
    q: "Can I edit or delete my comment?",
    a: "On your own comment, use the edit icon to change the text or the trash icon to remove it. Edited comments show an Edited marker beside the relative time. Deleting a comment removes it from ordinary views subject to safety, legal and backup retention.",
  },
  {
    q: "What can the Thing three-dot menu do?",
    a: "The menu is ownership-aware. Other people see Share and Report. The owner does not see Report and can open Edit. The owner edit panel can change anonymity, close or reopen comments, launch a time-limited Boost/Highlight, or delete the Thing.",
  },
  {
    q: "How do I report a Thing or comment?",
    a: "Open the relevant menu or flag action, choose the closest report category, and submit it while signed in. Reports are reviewed using automated signals and human moderation where appropriate. Do not file knowingly false or retaliatory reports.",
  },
  {
    q: "How does sharing work?",
    a: "Share creates a MyThing. or MyQuote. card for the selected public content. Story and Post keep the same visual geometry and alignment system while using their own aspect ratio. You can copy a public link, save an image, or use your device share sheet. Platform choices such as Instagram, Snapchat, Pinterest, WhatsApp, X and Telegram use those platforms' own sharing flows and policies.",
  },
  {
    q: "What attribution appears on a MyQuote. card?",
    a: "Your own visible Quote is labelled as your MyQuote. card. Another person’s public Quote keeps a shared-from attribution, and an anonymous Quote remains anonymous. Edit, delete and saved theme ownership stay with the original Quote owner.",
  },
  {
    q: "Do Thing and Quote themes cost Credits?",
    a: "Premium accounts can save supported Thing and Quote theme changes without a Credit debit. For non-Premium accounts, the first palette remains free; the other three palettes use 5 Same Credits when saved, and changing the font adds 2 Credits. The displayed total is calculated before saving. Selecting the current theme or cancelling does not charge Credits.",
  },
  {
    q: "Is the share card uploaded to SameThing?",
    a: "The Story card is generated in your browser from the selected Thing and can be downloaded locally. The copied link points to the public Thing page. Review the card before sharing because external copies are controlled by the platform and recipient who receives them.",
  },
  {
    q: "What is Boost MyThing. or Highlight MyThing.?",
    a: "An owner can choose an available duration such as 6 hours, 24 hours or 3 days. During that period the Thing can receive a time-limited Trending highlight. Boost does not change votes, similarity calculations or moderation rules, and the highlight expires automatically.",
  },
  {
    q: "Is Boost paid?",
    a: "The Boost/Highlight UI and backend state are prepared for future billing, but payment collection is currently disabled. No card is charged and no subscription is activated by using a disabled payment control.",
  },
  {
    q: "Can I add a payment card?",
    a: "The payment-method area is being prepared for a secure payment processor. The current release does not collect card details or charge cards. When enabled, card entry will use a tokenised processor flow; SameThing. will not store your full card number or security code.",
  },
  {
    q: "How does PremiumThing. work?",
    a: "PremiumThing. includes the full Premium profile-icon and share-card palette catalogue, AI tag suggestions, more custom-tag room, supported Credit-free Boost and Time Capsule paths, free saved theme changes, Premium styling and 25 Same Credits once per active month. API requests still use API Credits and their approved rate limits. Pricing, renewal, cancellation, taxes and refunds will be shown before any future payment is confirmed; payment activation remains inactive in this release.",
  },
  {
    q: "What are the profile icons?",
    a: "The profile editor shows the SameThing. icon catalogue in a fixed order. Gold icons are PremiumThing.-only; free icons remain selectable on the basic plan. Your selected icon is displayed on your profile, public cards and comments according to each item's visibility rules.",
  },
  {
    q: "How does AI help?",
    a: "Server-side AI may suggest tags or classify safety signals. Drop submission stays disabled while the current safety scan is pending, and the server performs a final fail-closed check before publishing. AI can be wrong; suggestions are optional, and you remain responsible for what you publish.",
  },
  {
    q: "What triggers a warning or suspension?",
    a: "Banned-word matches, reports, spam, threats, harassment, evasion and other safety signals can lead to a warning, temporary mute, content removal or suspension. Record Status changes with the account's current state and is not a permanent label unless the underlying state remains active.",
  },
  {
    q: "Can I change my username?",
    a: "Yes, subject to availability and the username-change cooldown shown by the service. Usernames must follow the format rules and may not impersonate another person, organisation or SameThing. staff member.",
  },
  {
    q: "How do I close comments?",
    a: "On your own Thing or Quote, open the three-dot menu, choose Edit, and use Close comments. Existing comments remain visible to signed-in viewers, but new comments and replies are disabled while the setting is closed.",
  },
  {
    q: "How do I delete my account?",
    a: "Use Settings → Account & Privacy and submit a deletion request. The same area can also request an export of your data by email. Requests may take several business days and some safety, fraud-prevention, legal-claim or backup records may be retained where the law permits or requires it. See the Privacy Policy for details.",
  },
  {
    q: "What happens during Maintenance Mode?",
    a: "For releases, database work or incident recovery, user-facing pages and actions may temporarily show a clean maintenance message. Only the authorised Admin area remains active for operations. Maintenance Mode does not delete content or change account ownership.",
  },
  {
    q: "Is there a researcher API?",
    a: "Yes. Open Research API and choose Sign in to open Dashboard; after sign-in or registration, SameThing. takes you directly to API Dashboard. Submit a workspace application with your research purpose, requested scopes and expected volume. Approved applications receive a scoped key automatically in that workspace. The read-only API exposes only public-content projections and anonymous aggregates, with fixed limits. It does not expose profiles, emails, private messages, comments, moderation records, Credits or Admin data.",
  },
  {
    q: "How are Research API keys handled?",
    a: "An approved application receives only the public scopes and rate plan approved for its workspace. The key is generated automatically after approval and appears only to the signed-in workspace owner in API Dashboard, where it can be copied. Admin can review safe metadata or revoke access but cannot manually create or reveal the key. The service stores a one-way hash, a short prefix and encrypted owner-display material; requests are rate-limited and logged, and the API is read-only.",
  },
  {
    q: "What are API Credits?",
    a: "API Credits are separate from Same Credits. An approved workspace receives a one-time 500 API Credit welcome allowance, and each successful API request consumes one. Your Dashboard shows the balance, key limit, scopes and recent usage. When the balance is empty, the API returns an API Credit exhaustion response instead of serving another data request.",
  },
  {
    q: "Can I buy API Credits or Same Credits?",
    a: "API Dashboard can prepare a pending API Credit purchase intent, and Settings → Credit can prepare a Same Credit purchase intent. Payment processing is not connected in this release, so no card is charged and no Credits are granted by pressing a checkout control. A future provider will confirm payment before any purchased balance is added.",
  },
  {
    q: "Who can enter Admin?",
    a: "Admin is a separate restricted control room. Every session requires authorised credentials and server-side verification; being signed in to a normal SameThing. account does not unlock Admin. Credentials are not written into content, browser UI or audit metadata.",
  },
  {
    q: "Is my data sold?",
    a: "SameThing. does not sell personal data for advertising. Data may be shared with service providers needed to host, secure, moderate or operate the service, and where disclosure is required by law. See Privacy for the current categories, retention and rights process.",
  },
  {
    q: "Can I use SameThing. offline?",
    a: "SameThing. can be installed from Chrome as a web app. The installed shell may open with limited cached resources, but sign-in, feed content, posting, votes, comments and notifications require a network connection.",
  },
  {
    q: "What happens to reports and support requests?",
    a: "Reports include a reason and are routed to the restricted Admin moderation queue. After you report a Thing or Quote, it is hidden from your own feed, search and detail views; blocked users’ Things are likewise excluded from your feed and search. Authorised reviewers can inspect the target, send a system message, warn, hide, delete or apply an account restriction according to the case. Support requests stay in the Support queue rather than being mixed into ordinary feedback.",
  },
  {
    q: "How do I contact the team?",
    a: "Use Settings → Send feedback for product feedback and in-app support. Privacy and data-rights requests can be sent to privacy@samething.app. Never send a password, full card number or security code by email.",
  },
];

function FaqPage() {
  const { minimal } = Route.useSearch();
  const content = (
    <>
      <h1 className="brand-mark text-4xl text-foreground">
        FAQ<span className="dot">.</span>
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Answers to the things people ask most.</p>

      <div className="mt-6 space-y-3">
        {FAQS.map((faq, index) => (
          <details
            key={index}
            className="rounded-2xl border border-border bg-card p-4 open:border-accent/40"
          >
            <summary className="cursor-pointer list-none text-sm text-foreground marker:hidden">
              <span className="mr-2 text-accent">›</span>
              {faq.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
          </details>
        ))}
      </div>

      {!minimal && (
        <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <span className="mx-2">·</span>
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
