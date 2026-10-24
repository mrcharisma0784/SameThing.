import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · SameThing." },
      { name: "description", content: "How SameThing. collects, uses, and protects your data." },
      { property: "og:title", content: "Privacy Policy · SameThing." },
      { property: "og:description", content: "How SameThing. handles your data." },
    ],
    links: [{ rel: "canonical", href: "https://samething.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <AppShell>
      <Link to="/" className="mb-3 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> back
      </Link>
      <h1 className="brand-mark text-4xl text-foreground">Privacy<span className="dot">.</span></h1>
      <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">Last updated: June 2026</p>

      <article className="mt-6 space-y-6 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-serif text-xl text-foreground">What we collect</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li><b>Account:</b> email, password hash (or OAuth provider id), the username, emoji and language you pick.</li>
            <li><b>Profile:</b> bio, custom tags, notification preferences, mention/messages toggles, warnings counter.</li>
            <li><b>Demographics:</b> gender and age you provide once at sign-up. <b>Never shown on your profile.</b> Used only as anonymised aggregate stats.</li>
            <li><b>Content:</b> the things and comments you post, votes you cast, mentions you send, reports you file, feedback you send.</li>
            <li><b>Moderation state:</b> banned-word triggers, system messages sent to your inbox, mute/ban status.</li>
            <li><b>Tech:</b> basic logs (IP, user-agent, timestamps) to keep the service healthy and prevent abuse.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-xl text-foreground">What we don't collect</h2>
          <p className="text-muted-foreground">
            We don't sell your data. We don't run third-party advertising
            trackers. We don't ask for your contacts, location, or device
            microphone/camera.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-xl text-foreground">How we use it</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>To run the service: sign you in, build your feed, count Same/Nah, deliver notifications you enabled.</li>
            <li>To moderate: banned-word scanning, spam detection, report handling, mute/ban decisions.</li>
            <li>To personalise: AI-suggested tags on the drop screen (your text is sent to our AI provider to classify only).</li>
            <li>To improve: anonymous aggregate stats about feature usage and cohort demographics.</li>
            <li>To contact you: critical service emails. Marketing only if you opt in.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-xl text-foreground">AI processing</h2>
          <p className="text-muted-foreground">
            Your draft text is sent to our AI provider to (a) suggest 1–3 tags and (b) screen for
            unsafe content before you post. We don't allow that provider to train on your data.
            Suggested tags are just suggestions — you always decide what to post.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-xl text-foreground">Anonymity & mentions</h2>
          <p className="text-muted-foreground">
            "Post anonymously" hides your username from other readers, but the
            post is still linked to your account on our side so moderation
            works. If you break the rules in an anonymous post, it still
            counts against your account.
          </p>
          <p className="text-muted-foreground">
            @mentions notify the mentioned person and let them jump to the thing/comment.
            Anyone can disable @mentions in Account &amp; Privacy — after that they can't be
            tagged and mention attempts get blocked at the drop/comment screen.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-xl text-foreground">Notifications</h2>
          <p className="text-muted-foreground">
            You can toggle every notification kind (Same, Nah, comments, mentions,
            "the only one" rare-thing alerts, system messages) in Settings → Notifications.
            Turning a kind off hides those items from your Inbox and stops the in-app toast.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-xl text-foreground">Local device storage</h2>
          <p className="text-muted-foreground">
            We use your browser's localStorage for your session, dismissed / pinned inbox items,
            and PWA install state. Clearing site data removes these — your account is unaffected.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-xl text-foreground">Your rights</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Access — see your data from the Me screen.</li>
            <li>Edit — change your profile, bio, language, notification prefs, mention toggle.</li>
            <li>Delete — delete individual posts and comments, or your whole account (Account &amp; Privacy → Delete account).</li>
            <li>Export — request a copy of your data by email.</li>
            <li>Object — opt out of demographic aggregation by deleting your account (we don't currently keep an "opt-out but stay" mode).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-xl text-foreground">Payments (upcoming)</h2>
          <p className="text-muted-foreground">
            When PremiumThing launches, billing information (card details, address) will be handled
            by our payment processor — we never see or store your card number. Subscription state
            (active/lapsed) and invoices are stored on our side.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-xl text-foreground">Minors</h2>
          <p className="text-muted-foreground">
            SameThing. is not for under-13s. If your age at sign-up is under 13, your account is
            deleted immediately. In the EU/UK the minimum age is 16.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-xl text-foreground">Where data lives</h2>
          <p className="text-muted-foreground">
            We store data on managed cloud infrastructure with industry-standard
            encryption in transit and at rest. Backups are retained for a
            limited period after deletion.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-xl text-foreground">Contact</h2>
          <p className="text-muted-foreground">
            Privacy questions or requests: <span className="text-foreground">privacy@samething.app</span>.
          </p>
        </section>
      </article>

      <p className="mt-10 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        <Link to="/terms" className="hover:text-foreground">Terms</Link>
      </p>
    </AppShell>
  );
}
