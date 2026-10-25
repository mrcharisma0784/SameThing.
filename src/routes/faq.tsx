import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useState } from "react";
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
    a: "Yes. Visible Quote comments can be read without signing in; writing requires sign-in. Quote pages do not currently have a close-comments setting.",
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
    q: "How long are notifications visible in my Inbox?",
    a: "Choose 24h, 7d, 15d or 30d in Settings → Notifications. Older items leave your Inbox at that cutoff and are removed from storage in the next daily cleanup, which can take up to about one extra day. Comments and votes are separate and are not affected by this setting.",
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
    a: "On your own comment, use the edit icon to change the text or the trash icon to remove it. Edited comments show an Edited marker beside the relative time. A deleted comment is removed from ordinary views; records needed for safety, moderation or legal reasons may be kept separately.",
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
    q: "Are Boost and card payments active?",
    a: "No. Boost/Highlight billing, subscription activation and card entry are disabled in this release. No card details are collected and no payment is taken. If payments launch, checkout will show the price and applicable billing, cancellation, tax and refund terms before you confirm.",
  },
  {
    q: "How does PremiumThing. work?",
    a: "PremiumThing. includes the full Premium profile-icon and share-card palette catalogue, AI tag suggestions, more custom-tag room, supported Credit-free Boost and Time Capsule paths, free saved theme changes, Premium styling and 25 Same Credits once per active month. The Research API is under development and temporarily unavailable. Payment activation is not currently live.",
  },
  {
    q: "What are the profile icons?",
    a: "The profile editor shows the SameThing. icon catalogue in a fixed order. Gold icons are PremiumThing.-only; free icons remain selectable on the basic plan. Your selected icon is displayed on your profile, public cards and comments according to each item's visibility rules.",
  },
  {
    q: "How does AI help?",
    a: "Server-side AI may suggest tags or help review safety signals. A Thing is not published until required safety checks finish; if a check cannot be completed, publication is held. AI can be wrong, suggestions are optional, and you remain responsible for what you publish.",
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
    a: "On a public Thing, open comments are readable by guests and signed-in visitors. To close them, open the Thing's three-dot menu, choose Edit, and select Close comments. The entire section—including older comments—is then hidden from everyone, signed in or not, until you reopen it. Quotes do not currently have this setting.",
  },
  {
    q: "How do I delete my account?",
    a: "Use Settings → Account & Privacy to submit a deletion request or ask for a copy of your data. Deletion requests are reviewed manually; submitting one does not immediately delete the account. You can follow its status on that page. Some records may be retained where required or permitted by law; see the Privacy Policy.",
  },
  {
    q: "What happens during maintenance?",
    a: "A service or feature may be temporarily unavailable during maintenance or incident recovery. The affected page may show a notice while authorised operators work on the issue. Maintenance does not delete content or change account ownership.",
  },
  {
    q: "Is there a researcher API?",
    a: "The Research API is under development. Its page, workspace, related information and endpoints are temporarily unavailable.",
  },
  {
    q: "How are Research API keys handled?",
    a: "The Research API is under development. Its page, workspace, related information and endpoints are temporarily unavailable.",
  },
  {
    q: "What are API Credits?",
    a: "The Research API is under development. API Credits and related workspace information are temporarily unavailable.",
  },
  {
    q: "Can I buy API Credits or Same Credits?",
    a: "The Research API is under development, so API Credits and related features are temporarily unavailable. Same Credits are a separate in-app feature.",
  },
  {
    q: "Who reviews reports?",
    a: "Our authorised moderation team reviews reports and may take action under the community rules. If an action affects your content or account, we may notify you in your inbox.",
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
    a: "Reports include a reason and are reviewed by our moderation team. Report and moderation records, legal records and support correspondence are retained indefinitely as service records and are not removed when an account is deleted. A reported Thing or Quote is hidden from your own feed, search and detail views. For support requests, we reply to the email address you provide and notify you in your Inbox when the reply has been sent.",
  },
  {
    q: "How do I contact the team?",
    a: "Use Settings → Send feedback for product feedback and in-app support. Privacy and data-rights requests can be sent to privacy@samething.app. Never send a password, full card number or security code by email.",
  },
];

const FAQ_CATEGORY_ORDER = [
  "Getting started",
  "Things, votes & comments",
  "People & privacy",
  "Inbox & notifications",
  "Sharing & profiles",
  "Plans, Credits & payments",
  "Research API",
  "Safety & support",
  "Features & availability",
] as const;

type FaqCategory = (typeof FAQ_CATEGORY_ORDER)[number];

const FAQ_CATEGORY_BY_QUESTION: Record<string, FaqCategory> = {
  "What is SameThing?": "Getting started",
  "Do I have to sign up?": "Getting started",
  "What is Quote of the Day?": "Getting started",
  "How does Streak work?": "Getting started",
  "Can I comment on a quote?": "Things, votes & comments",
  "How do Same and Nah work?": "Things, votes & comments",
  "What is RareThing?": "Things, votes & comments",
  "Can I edit or delete my comment?": "Things, votes & comments",
  "What can the Thing three-dot menu do?": "Things, votes & comments",
  "How do I close comments?": "Things, votes & comments",
  "Why do some posts show anonymous?": "People & privacy",
  "How do mentions work?": "People & privacy",
  "How do I follow someone?": "People & privacy",
  "What notification do followers receive?": "People & privacy",
  "How do I block someone?": "People & privacy",
  "Can I change my username?": "People & privacy",
  "How do I delete my account?": "People & privacy",
  "Is my data sold?": "People & privacy",
  "How do notifications work?": "Inbox & notifications",
  "How long are notifications visible in my Inbox?": "Inbox & notifications",
  "Do Inbox items also become browser notifications?": "Inbox & notifications",
  "Will notifications arrive when my browser is closed?": "Inbox & notifications",
  "How does the Inbox swipe work?": "Inbox & notifications",
  "What are system messages?": "Inbox & notifications",
  "How does sharing work?": "Sharing & profiles",
  "What attribution appears on a MyQuote. card?": "Sharing & profiles",
  "Is the share card uploaded to SameThing?": "Sharing & profiles",
  "What are the profile icons?": "Sharing & profiles",
  "Do Thing and Quote themes cost Credits?": "Plans, Credits & payments",
  "What is Boost MyThing. or Highlight MyThing.?": "Plans, Credits & payments",
  "Are Boost and card payments active?": "Plans, Credits & payments",
  "How does PremiumThing. work?": "Plans, Credits & payments",
  "Can I buy API Credits or Same Credits?": "Plans, Credits & payments",
  "Is there a researcher API?": "Research API",
  "How are Research API keys handled?": "Research API",
  "What are API Credits?": "Research API",
  "How do I report a Thing or comment?": "Safety & support",
  "What triggers a warning or suspension?": "Safety & support",
  "Who reviews reports?": "Safety & support",
  "What happens to reports and support requests?": "Safety & support",
  "How do I contact the team?": "Safety & support",
  "How does AI help?": "Features & availability",
  "What happens during maintenance?": "Features & availability",
  "Can I use SameThing. offline?": "Features & availability",
};

const CATEGORIZED_FAQS = FAQS.map((faq) => {
  const category = FAQ_CATEGORY_BY_QUESTION[faq.q];
  if (!category) throw new Error(`FAQ category missing for: ${faq.q}`);
  return { ...faq, category };
});

function FaqPage() {
  const { minimal } = Route.useSearch();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<"All" | FaqCategory>("All");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredFaqs = CATEGORIZED_FAQS.filter((faq) => {
    const matchesCategory = activeCategory === "All" || faq.category === activeCategory;
    const matchesSearch =
      !normalizedSearch || `${faq.q} ${faq.a}`.toLocaleLowerCase().includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });
  const visibleCategories = FAQ_CATEGORY_ORDER.filter((category) =>
    filteredFaqs.some((faq) => faq.category === category),
  );
  const content = (
    <>
      <h1 className="brand-mark text-4xl text-foreground">
        FAQ<span className="dot">.</span>
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Answers to the things people ask most.</p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <label htmlFor="faq-search" className="sr-only">
          Search questions and answers
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            id="faq-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value.slice(0, 120))}
            placeholder="Search questions and answers"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="rounded-full p-1 text-muted-foreground hover:bg-card hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {["All", ...FAQ_CATEGORY_ORDER].map((category) => {
            const selected = activeCategory === category;
            const count =
              category === "All"
                ? CATEGORIZED_FAQS.length
                : CATEGORIZED_FAQS.filter((faq) => faq.category === category).length;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveCategory(category as "All" | FaqCategory)}
                className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                  selected
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {category} <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          {filteredFaqs.length} {filteredFaqs.length === 1 ? "answer" : "answers"}
        </p>
      </div>

      <div className="mt-6 space-y-7">
        {visibleCategories.map((category) => (
          <section key={category} aria-labelledby={`faq-${category.replace(/[^a-z0-9]+/gi, "-")}`}>
            <h2
              id={`faq-${category.replace(/[^a-z0-9]+/gi, "-")}`}
              className="mb-3 border-b border-border/70 pb-2 text-[10px] uppercase tracking-[0.2em] text-accent"
            >
              {category}
            </h2>
            <div className="space-y-3">
              {filteredFaqs
                .filter((faq) => faq.category === category)
                .map((faq) => (
                  <details
                    key={faq.q}
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
          </section>
        ))}
        {filteredFaqs.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No answers match that search. Try another word or clear the search.
          </p>
        )}
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
