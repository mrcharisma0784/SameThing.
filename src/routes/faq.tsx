import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ · SameThing." },
      { name: "description", content: "Frequently asked questions about SameThing." },
      { property: "og:title", content: "FAQ · SameThing." },
      { property: "og:description", content: "Frequently asked questions about SameThing." },
    ],
    links: [{ rel: "canonical", href: "https://samething.lovable.app/faq" }],
  }),
  component: FaqPage,
});

const FAQS: Array<{ q: string; a: string }> = [
  { q: "What is SameThing?", a: "A quiet place to drop a thought and see who quietly agrees. Vote Same or Nah, watch the similarity score reveal you're not the only one." },
  { q: "Do I have to sign up?", a: "Yes — voting and posting need an account. Browsing shared thing links is public. On sign-up you accept the Terms & Privacy and provide a gender/age (kept private, never shown on your profile)." },
  { q: "What's the difference between Rare and \u201cThe only one.\u201d?", a: "A thing becomes Rare at 100+ votes with Same-ratio ≤ 2%. It graduates to a permanent \u201cThe only one.\u201d badge at 1,000+ votes with Same-ratio ≤ 1%. If Same-ratio ever exceeds 5%, the Rare badge drops — permanent status is never removed." },
  { q: "Why do some posts show anonymous?", a: "You can post anonymously — your username is hidden from voters. You can still see and manage your own anonymous things from your profile. Moderation still applies to your account." },
  { q: "How does @mention work?", a: "Type @ and start writing a username inside a thing or comment. Pick from the suggestions. Only real usernames become links; typos stay plain text. The tagged person gets a notification and can jump straight to the thing/comment." },
  { q: "How do I stop being tagged?", a: "Settings → Account & privacy → Allow @mentions. When off, nobody can tag you and the drop/comment screen blocks the attempt before they can send." },
  { q: "How do notifications work?", a: "Settings → Notifications toggles each kind independently: Same, Nah, comments & replies, mentions, \u201cyou're the only one\u201d rare-thing alerts, and system messages. Turning one off hides those items from your Inbox." },
  { q: "How does the Inbox swipe work?", a: "Swipe a card to the right to dismiss it. Swipe to the left to pin it (up to 3 pinned at the top). No long-press, no multi-select — one swipe per card." },
  { q: "What are system messages?", a: "Messages from the SameThing. team or automated moderator. They appear tagged [System] with a megaphone icon and can include a link (for example, to the Forbidden Words section)." },
  { q: "What triggers a warning?", a: "Posting content that contains a banned word at severity \u201cwarn\u201d sends a system message to your inbox and adds a warning to your account. Words at severity \u201cblock\u201d are refused before the thing/comment goes out." },
  { q: "Can I change my username?", a: "Yes — once every 15 days. Choose carefully; it's how people find you." },
  { q: "Who can DM me?", a: "DMs (\u201copen to chat\u201d) are coming soon. When they launch, only people who voted Same on one of your things will be able to DM you, and only if you've turned the toggle on in Account & privacy." },
  { q: "How do I close comments on a thing?", a: "There's a toggle on the drop screen. Once closed, no one can add a comment or reply." },
  { q: "How does AI help me post?", a: "As you type your thing, AI suggests 1–3 tags (highlighted with a sparkle) and scans your draft for banned words. Suggestions are never auto-applied and the button is blocked until you fix any hard violations." },
  { q: "How do I report something?", a: "Tap the flag icon on any thing or comment. Moderators review and can hide or delete content and warn/ban the author." },
  { q: "How do I send feedback?", a: "Settings → Send feedback. Bugs, ideas, and love come straight to the team." },
  { q: "Is there a paid plan?", a: "PremiumThing is on the way. Settings → Subscription & payment will show the details once billing is live." },
  { q: "Can I use SameThing offline?", a: "SameThing. installs as a PWA (\u201cAdd to Home Screen\u201d) with a small service worker that caches the shell. Feed content still needs a network connection." },
  { q: "How do I delete my account?", a: "Settings → Account & privacy → Delete account. Your things, comments, votes, and demographics are removed." },
  { q: "Is my data sold?", a: "No. Aggregated, non-identifying stats may be shared with partners — see the Privacy page for details." },
];

function FaqPage() {
  return (
    <AppShell>
      <h1 className="brand-mark text-4xl text-foreground">FAQ<span className="dot">.</span></h1>
      <p className="mt-1 text-sm text-muted-foreground">Answers to the things people ask most.</p>

      <div className="mt-6 space-y-3">
        {FAQS.map((f, i) => (
          <details key={i} className="rounded-2xl border border-border bg-card p-4 open:border-accent/40">
            <summary className="cursor-pointer list-none text-sm text-foreground marker:hidden">
              <span className="mr-2 text-accent">›</span>{f.q}
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>

      <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        <Link to="/terms" className="hover:text-foreground">Terms</Link> ·{" "}
        <Link to="/privacy" className="hover:text-foreground">Privacy</Link> ·{" "}
        <Link to="/faq" className="hover:text-foreground">FAQ</Link>
      </p>
    </AppShell>
  );
}
