import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileCode2,
  Flame,
  Heart,
  LockKeyhole,
  Menu,
  Orbit,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { cn } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/documentation")({
  validateSearch: z.object({ q: z.string().max(80).optional() }),
  head: () => ({
    meta: [
      { title: "Documentation · SameThing." },
      {
        name: "description",
        content: "A living guide to the quieter social space behind SameThing.",
      },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/documentation") }],
  }),
  component: DocumentationPage,
});

type DocPage = {
  id: string;
  title: string;
  eyebrow: string;
  icon: typeof BookOpen;
  intro: string;
  sections: Array<{
    heading: string;
    paragraphs?: string[];
    bullets?: string[];
  }>;
};

type DocGroup = {
  id: string;
  label: string;
  pages: DocPage[];
};

const DOC_GROUPS: DocGroup[] = [
  {
    id: "start",
    label: "Start here",
    pages: [
      {
        id: "welcome",
        title: "Welcome to SameThing.",
        eyebrow: "Start here / 01",
        icon: Sparkles,
        intro:
          "SameThing. is a quieter social space for the thoughts that usually stay in your head. It is built around noticing, sharing and recognising — without turning every feeling into a performance.",
        sections: [
          {
            heading: "The short version",
            paragraphs: [
              "Drop a Thing when you notice something. Write a Quote when one sentence is enough. Other people can respond with Same, Nah, a like or a thoughtful comment. The room is designed to feel human before it feels busy.",
              "You can browse the public side without an account. Signing in opens the social parts of the room: your Feed, your profile, your interactions and the tools that help you return to a thought later.",
            ],
          },
          {
            heading: "A small vocabulary",
            bullets: [
              "Thing — a short observation, feeling, idea or unfinished thought.",
              "Quote of the Day — a daily place to leave one sentence in your own words.",
              "Same / Nah — a lightweight response that shows where a thought lands with you.",
              "MyThing. / MyQuote. — shareable visual cards made from your own words.",
              "Same Credits — a reward balance for selected features and future product paths.",
            ],
          },
        ],
      },
      {
        id: "principles",
        title: "Principles & language",
        eyebrow: "Start here / 02",
        icon: Orbit,
        intro:
          "The product language is intentionally small. Every label should make the room easier to understand, not louder.",
        sections: [
          {
            heading: "Before a post",
            paragraphs: [
              "SameThing. starts at the moment before an idea becomes a polished post. The interface gives unfinished thoughts enough structure to be shared, while leaving them close to the way they were found.",
            ],
          },
          {
            heading: "No performance required",
            paragraphs: [
              "There are no follower counts on the public landing, no pressure to publish perfectly and no requirement to reveal your name when an anonymous option is available. The system still uses clear controls for safety, ownership and moderation.",
            ],
          },
          {
            heading: "The visual language",
            bullets: [
              "Warm ivory and noir surfaces establish calm contrast.",
              "Rounded frames signal an object that can be opened or returned to.",
              "Serif display type is reserved for the thought itself and important moments.",
              "Motion is brief and physical: a response should feel acknowledged, never theatrical.",
            ],
          },
        ],
      },
      {
        id: "quick-start",
        title: "Quick start",
        eyebrow: "Start here / 03",
        icon: ArrowRight,
        intro:
          "You can understand the core loop in under a minute. The rest of the documentation explains the edges and the choices behind it.",
        sections: [
          {
            heading: "Three steps",
            bullets: [
              "Notice something you would normally keep to yourself.",
              "Drop it as a Thing or keep it to one sentence as a Quote of the Day.",
              "Return to the Feed and see what resonates with people you may never meet.",
            ],
          },
          {
            heading: "Your first session",
            paragraphs: [
              "After registration, the optional Guide introduces the Feed, the drop flow, Same/Nah and your profile. You can skip it and revisit the key areas from the navigation at any time.",
              "The first-time Achievement tasks are designed to teach the room gently. Completing a task does not publish anything on your behalf; it only makes a Same Credit reward available for you to claim.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "core",
    label: "How it works",
    pages: [
      {
        id: "things",
        title: "Things",
        eyebrow: "How it works / 01",
        icon: FileCode2,
        intro:
          "A Thing is the main unit of SameThing.: a small, honest piece of noticing that does not need to become a full story.",
        sections: [
          {
            heading: "Writing a Thing",
            paragraphs: [
              "The Drop a Thing flow gives you a text area, tags and controls for anonymity and comments. A short display label is derived from the submitted text; there is no separate Title field. The safety review runs before publication. If the check cannot complete, the Thing is not silently published without review.",
              "You remain the owner of your Thing. Your owner menu can include edit, share, report and delete actions according to ownership and the state of the content.",
            ],
          },
          {
            heading: "What people can do",
            bullets: [
              "Same or Nah to show a lightweight reaction.",
              "Like a Thing without adding a comment.",
              "Open the comment view when comments are enabled.",
              "Share a MyThing. card or copy a direct link.",
            ],
          },
          {
            heading: "Ownership and visibility",
            paragraphs: [
              "An anonymous Thing still has an owner in the system for editing, deletion, moderation and account controls. The public presentation hides the author identity when the anonymous option is active.",
            ],
          },
        ],
      },
      {
        id: "quotes",
        title: "Quote of the Day",
        eyebrow: "How it works / 02",
        icon: Quote,
        intro:
          "Quote of the Day is a slower, one-sentence surface. Each day begins with a writing card when you have not shared a Quote yet, then lets you move through the Quotes already shared.",
        sections: [
          {
            heading: "One card at a time",
            paragraphs: [
              "Swipe horizontally to move between the empty writing card and the day’s published Quotes. The carousel uses full-width snap points so one gesture settles on one Quote instead of skipping ahead.",
              "Tap the writing card to open the composer. The card is the writing action; no separate Write yours button is required.",
            ],
          },
          {
            heading: "Quote controls",
            bullets: [
              "The three-dot menu holds edit, report, share and delete actions where applicable.",
              "Like and comment controls sit in the Quote footer.",
              "The author icon and username appear above the Quote when the author chooses to be visible.",
              "Your own Quote can be edited; another person’s Quote cannot be edited by you.",
            ],
          },
        ],
      },
      {
        id: "feed",
        title: "Feed & discovery",
        eyebrow: "How it works / 03",
        icon: Search,
        intro:
          "The Feed is the signed-in home for Things, Quotes and the small signals around them. Guest visitors see the public landing instead of the Feed.",
        sections: [
          {
            heading: "A feed with less pressure",
            paragraphs: [
              "The Feed combines recent thoughts with selected discovery surfaces such as Trending. It is not designed around infinite urgency; filters, language choices and notification controls help you decide how much room the feed takes in your day.",
            ],
          },
          {
            heading: "Trending and Boost",
            paragraphs: [
              "Boost MyThing. temporarily moves a Thing just below the newest head in the New feed. It does not rank a Thing above the newest arrivals and it never gives a Thing priority in Trending. Trending is driven by organic interest — votes, likes and comments — with a light recency balance. Free accounts spend Same Credits according to duration; active PremiumThing. accounts are exempt from the credit debit.",
            ],
          },
        ],
      },
      {
        id: "same-nah",
        title: "Same, Nah & similarity",
        eyebrow: "How it works / 04",
        icon: Target,
        intro:
          "Same/Nah is a deliberately small response. It does not claim to measure a person; it shows one moment of resonance around one thought.",
        sections: [
          {
            heading: "The interaction",
            paragraphs: [
              "You can cast one current vote per Thing. Your own Thing can still be liked, but your own vote rules remain separate from likes. Repeated taps do not create duplicate vote rows.",
            ],
          },
          {
            heading: "Similarity is a guide",
            paragraphs: [
              "Similarity and Find my twin use available interaction and content signals to offer a discovery surface. Results are not a diagnosis, identity claim or statement of compatibility. They are an invitation to explore a nearby perspective.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "account",
    label: "Your account",
    pages: [
      {
        id: "profile",
        title: "Profile & identity",
        eyebrow: "Your account / 01",
        icon: Users,
        intro:
          "Your profile is a compact record of how you show up in the room: username, selected icon, bio, plan and your own Things and Quotes.",
        sections: [
          {
            heading: "Public and private choices",
            paragraphs: [
              "A profile can be viewed through a username route when that profile is public. The profile view shows content and follower signals according to the visibility rules in the product. Account and privacy settings control sensitive choices such as notification preferences and deletion requests.",
            ],
          },
          {
            heading: "Profile icons",
            paragraphs: [
              "The icon list is a curated set of small glyphs. Some are marked as PremiumThing. options. Locked icons remain visible as part of the selection system but cannot be applied to a free account.",
            ],
          },
        ],
      },
      {
        id: "streak",
        title: "Streak & returning",
        eyebrow: "Your account / 02",
        icon: Flame,
        intro:
          "Streak is an optional daily return ritual. It begins at zero and only starts when you choose to begin it.",
        sections: [
          {
            heading: "Start when you are ready",
            paragraphs: [
              "Opening the Streak page does not start or increase anything by itself. Choose Start my Streak when you want your first check-in to count as day one.",
            ],
          },
          {
            heading: "Keep the flame",
            bullets: [
              "After starting, open the Streak page once during each UTC day to continue the current run.",
              "Missing a UTC day resets the current run, but your best run and milestone history remain recorded.",
              "Streak milestone rewards appear in Achievements and can be claimed once when unlocked.",
            ],
          },
        ],
      },
      {
        id: "premium",
        title: "PremiumThing.",
        eyebrow: "Your account / 03",
        icon: Sparkles,
        intro:
          "PremiumThing. is a feature layer for people who want additional themes, icons and selected product capabilities. Payment activation is not currently live.",
        sections: [
          {
            heading: "What Premium can change",
            bullets: [
              "Premium themes and selected profile icons.",
              "Premium treatment for selected product tools such as Boost and Time Capsule credit exemption.",
              "A small visual marker on Premium-owned Things, using the current theme rather than a fixed color.",
            ],
          },
          {
            heading: "Payment status",
            paragraphs: [
              "The subscription area can hold plan and payment-method information for future use. Actual payment processing is disabled in this release; no card is charged through the current product flow.",
            ],
          },
        ],
      },
      {
        id: "credits",
        title: "Same Credits",
        eyebrow: "Your account / 03",
        icon: Heart,
        intro:
          "Same Credits are the product’s internal reward balance. They are not cash, do not represent a withdrawal right and currently unlock only selected feature paths.",
        sections: [
          {
            heading: "How credits arrive",
            bullets: [
              "Referral rewards are granted once per eligible new account.",
              "Achievement rewards become claimable when the task is completed.",
              "The Credit page shows the current balance, earned/spent totals, latest activity and prepared purchase options in one place.",
              "Active Premium accounts receive the published monthly Same Credit allowance once per active month.",
            ],
          },
          {
            heading: "How credits are spent",
            paragraphs: [
              "Free accounts can use credits for repeat Time Capsules, Boost MyThing. durations, Feed filter pill edits and non-Premium share-card styles. Current duration levels are intentionally visible before confirmation, so a user can understand the cost before spending. PremiumThing. accounts are exempt on the supported paths.",
              "The live Credit screen links directly to supported paths. A real saved Thing or Quote theme change by a non-Premium account uses 5 Credits for one of the last three palettes and adds 2 Credits when the font changes; editing Feed filter pills costs 5 Credits per actual saved change. Premium accounts save supported theme and filter changes without a Credit debit. Selecting the current theme, previewing a style or cancelling does not charge.",
              "A free account’s first Time Capsule is free; later durations use 10, 15, 20, 30 or 60 Same Credits, with five years priced at 60. Ideas such as capsule replays or a one-time profile aura are labelled as shaping only; they are not active or chargeable features until the product says otherwise.",
            ],
          },
        ],
      },
      {
        id: "notifications",
        title: "Notifications & inbox",
        eyebrow: "Your account / 04",
        icon: CircleHelp,
        intro:
          "Inbox signals are meant to help you return to a conversation, not to create constant pressure.",
        sections: [
          {
            heading: "Controls",
            bullets: [
              "Notification preferences can be adjusted by category.",
              "Follow and watcher updates can be turned off without removing the underlying relationship.",
              "Older notifications are automatically removed according to the retention setting in Notification preferences.",
              "Unread indicators disappear when the relevant surface has been read or claimed.",
            ],
          },
          {
            heading: "Web App delivery",
            paragraphs: [
              "The Web App notification control requests permission only after an explicit tap. Once enabled, newly fetched Inbox items are deduplicated locally on that device and handed to the browser or installed PWA service worker with their safe deep link.",
              "The current release is designed for an authenticated app session and does not claim closed-browser delivery. Full background Push API delivery would require a separately configured subscription, server key and event-delivery service.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "create",
    label: "Create & return",
    pages: [
      {
        id: "comments",
        title: "Comments & conversation",
        eyebrow: "Create & return / 01",
        icon: Heart,
        intro:
          "Comments add a little more context to a Thing or Quote. The comment surface is intentionally similar across both content types.",
        sections: [
          {
            heading: "Comment controls",
            bullets: [
              "Comment visibility follows the owner’s open/closed setting.",
              "Your own comments can be edited or deleted from the edit control.",
              "Edited comments show a compact Edited marker next to the time.",
              "Report and moderation paths remain available when a comment breaks the room’s rules.",
            ],
          },
          {
            heading: "A good comment",
            paragraphs: [
              "A good comment responds to what was actually written. It does not need to be long. Curiosity, specificity and restraint are more useful here than trying to win a thread.",
            ],
          },
        ],
      },
      {
        id: "sharing",
        title: "MyThing. & MyQuote. cards",
        eyebrow: "Create & return / 02",
        icon: ArrowRight,
        intro:
          "Every shareable Thing or Quote can become a visual card designed for direct sharing or saving.",
        sections: [
          {
            heading: "Share flow",
            paragraphs: [
              "Open the three-dot menu on your Thing or Quote and choose Share. The share surface can copy a link, create a card and expose supported platform actions. The exported Story card uses a 1080×1920 composition; Post cards remain available where the share surface supports them.",
            ],
          },
          {
            heading: "Ownership rules",
            bullets: [
              "You can share your own content and public content according to the current surface.",
              "Edit and delete remain owner-only actions.",
              "Report is hidden for the owner of the reported Thing and remains available for other viewers.",
            ],
          },
          {
            heading: "MyQuote. alignment and attribution",
            paragraphs: [
              "MyQuote. Story and Post cards use the same outer frame, header axis, text block, attribution divider, footer and orbital mark system as MyThing. The quote text uses dynamic line wrapping and font fitting so a longer Quote can stay inside the same safe area without clipping.",
              "Your own visible Quote is labelled as MyQuote.; another person’s public Quote uses a shared-from attribution, and an anonymous Quote remains anonymous. Theme controls are shared with MyThing. and follow the Premium-versus-Credit rule described in Your account / Same Credits.",
            ],
          },
        ],
      },
      {
        id: "time-capsule",
        title: "Time Capsule",
        eyebrow: "Create & return / 03",
        icon: LockKeyhole,
        intro:
          "Time Capsule lets you seal a Thing for a future version of yourself. It is a return mechanic, not a public post type.",
        sections: [
          {
            heading: "Credit rules",
            paragraphs: [
              "The first capsule is free for a free account. Later capsules use the duration price shown before confirmation, with current levels of 10, 15, 20, 30 or 60 Same Credits; five years uses 60. Active PremiumThing. accounts do not spend credits on the supported capsule path.",
            ],
          },
          {
            heading: "Privacy",
            paragraphs: [
              "A capsule is associated with the account that created it. Opening is controlled by the capsule’s configured time and the account’s access. Deleting an account follows the data-request and retention rules in Account & privacy.",
            ],
          },
        ],
      },
      {
        id: "guide",
        title: "The Guide",
        eyebrow: "Create & return / 04",
        icon: BookOpen,
        intro:
          "The optional Guide is a small onboarding service that introduces the room without taking over the screen.",
        sections: [
          {
            heading: "Controls",
            bullets: [
              "Next moves through the current introduction.",
              "Back returns to the previous card.",
              "Skip closes the Guide without changing your account.",
              "The Guide does not open from incidental text selection or long-press gestures.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "trust",
    label: "Trust & safety",
    pages: [
      {
        id: "community",
        title: "Community standards",
        eyebrow: "Trust & safety / 01",
        icon: ShieldCheck,
        intro:
          "SameThing. is built for honest observations, not for harassment, threats, impersonation or targeted abuse.",
        sections: [
          {
            heading: "Do",
            bullets: [
              "Write from your own experience.",
              "Disagree with the thought rather than attacking the person.",
              "Use anonymity as a privacy tool, not as permission to harm.",
              "Report content that needs moderator attention.",
            ],
          },
          {
            heading: "Do not",
            bullets: [
              "Threaten, stalk, dox or expose private information.",
              "Manipulate reactions or overwhelm the room through coordinated activity.",
              "Publish content that is illegal, exploitative or designed to cause direct harm.",
              "Evade moderation or account restrictions through another account.",
            ],
          },
        ],
      },
      {
        id: "privacy",
        title: "Privacy & account data",
        eyebrow: "Trust & safety / 02",
        icon: LockKeyhole,
        intro:
          "Privacy is not a single switch. SameThing. separates public presentation, account ownership, notifications and formal data requests.",
        sections: [
          {
            heading: "Your controls",
            bullets: [
              "Choose whether a Thing or Quote presents your name when the feature allows it.",
              "Manage follows, watchers, notifications and account access from Settings.",
              "Submit an account deletion or data-export request from Account & privacy.",
              "Review Terms, Privacy and FAQ from the public or authenticated surfaces.",
            ],
          },
          {
            heading: "Requests",
            paragraphs: [
              "Data requests may require several business days. Safety, fraud-prevention, legal-claim and backup records may be retained where required or permitted by applicable law. The Privacy Policy is the authoritative product notice for the current release.",
            ],
          },
        ],
      },
      {
        id: "reporting",
        title: "Report, block & moderation",
        eyebrow: "Trust & safety / 03",
        icon: ShieldCheck,
        intro:
          "Reporting routes a concern to the Admin moderation queue. Blocking changes your own view and interaction surface; it is not a public verdict.",
        sections: [
          {
            heading: "What happens after a report",
            paragraphs: [
              "A report can identify a Thing, Quote, comment or user and include a reason. Authorised admins can review the reported target, send a system message, warn, hide or delete content, and apply account restrictions where appropriate.",
              "Moderation actions are recorded as operational events. A user may see a system message when an action affects their content or account.",
            ],
          },
        ],
      },
      {
        id: "maintenance",
        title: "Maintain & availability",
        eyebrow: "Trust & safety / 04",
        icon: Orbit,
        intro:
          "Maintain is an operational control for careful releases, incidents and focused work. It does not delete content or change account ownership.",
        sections: [
          {
            heading: "Two levels",
            bullets: [
              "Global Maintain can replace all user-facing pages while Admin remains available.",
              "Page-level Maintain can pause selected Settings pages while the rest of the site stays live.",
              "Multiple page targets can be paused at once.",
              "Support/Feedback, Account & privacy, Subscription & payment and Appearance remain open in the current first target set.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Admin & operations",
    pages: [
      {
        id: "admin-overview",
        title: "Admin overview",
        eyebrow: "Admin & operations / 01",
        icon: ShieldCheck,
        intro:
          "The Admin panel is a restricted operational surface. It is separate from the public product navigation and remains exempt from Maintain.",
        sections: [
          {
            heading: "Operational areas",
            bullets: [
              "Overview and account-level health signals.",
              "Users, Things, reports, support, feedback queues and in-app Ads prompts.",
              "System messages, banned words and moderation actions.",
              "Maintain controls for global and page-level pauses.",
            ],
          },
          {
            heading: "Founder-only access",
            paragraphs: [
              "The Admin control room is a separate restricted operational area. Every session requires authorised credentials and server-side verification; a normal signed-in user session does not unlock Admin.",
              "Administrative actions are audit-logged with an actor label, timestamp and limited target reference; credentials and secrets are excluded from those records.",
            ],
          },
        ],
      },
      {
        id: "admin-reports",
        title: "Reports & support",
        eyebrow: "Admin & operations / 02",
        icon: CircleHelp,
        intro:
          "Reports and Support requests are reviewed in the Admin panel rather than handled by an opaque public action.",
        sections: [
          {
            heading: "Review discipline",
            paragraphs: [
              "A reviewer should inspect the full target, author context and report reason before acting. Hide, delete, warn, system message and ban have different consequences and should not be treated as interchangeable buttons.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "api",
    label: "API & research",
    pages: [
      {
        id: "api-status",
        title: "Research API status",
        eyebrow: "API & research / 01",
        icon: FileCode2,
        intro:
          "The Research API accepts carefully scoped access requests and serves an approved, read-only public data service.",
        sections: [
          {
            heading: "Current status",
            paragraphs: [
              "Open Research API and choose Sign in to open Dashboard. After sign-in or registration, SameThing. routes directly to API Dashboard, where a workspace application records the research question, requested public scope and expected volume. After approval, a scoped bearer key is generated automatically for that workspace and appears only to its owner; Admin can review safe metadata or revoke access but cannot manually create or reveal the key.",
            ],
          },
          {
            heading: "How access works",
            bullets: [
              "Access requires an explicit key, scope, expiry/revoke state and fixed per-key rate limits.",
              "Available resources are public Things, public Quotes, metadata and anonymous aggregate metrics.",
              "The API is read-only and never exposes profiles, emails, auth IDs, comments, moderation, credits, payment or admin data.",
              "User-generated content is not research data by default; only public, moderation-safe projections are eligible.",
            ],
          },
          {
            heading: "Key lifecycle and responsible use",
            paragraphs: [
              "A signed-in workspace submits a research purpose, organisation context, requested scopes and expected volume. An authorised review can approve, narrow, waitlist or decline the request. Approval triggers key generation; the owner can copy the key from API Dashboard while Admin sees only safe metadata. Pending and reviewing applications remain visible. Approved, waitlisted and declined results are displayed once in the Application area and then hidden after an atomic notice acknowledgement. Re-application is blocked while an application is pending, reviewing or approved and opens after the current 72-hour decline/waitlist cooldown.",
              "Each successful API request consumes one API Credit and remains subject to the approved rate plan. The workspace shows balance, scopes, limits, key state and recent usage. API Credits are separate from Same Credits; approved workspaces start with a one-time 500-credit welcome allowance, while future purchases require a connected payment provider. Requests are authenticated, rate-limited and logged without returning private account data. Keys can be revoked at any time for misuse, unexpected volume or safety concerns. The service is not a replacement for a direct database export and does not grant write access.",
            ],
          },
        ],
      },
      {
        id: "data-model",
        title: "Data model in plain language",
        eyebrow: "API & research / 02",
        icon: FileCode2,
        intro:
          "SameThing. separates identity, content, interactions, rewards and operational records so each surface can apply the right access boundary.",
        sections: [
          {
            heading: "Core records",
            bullets: [
              "Profiles describe account-level presentation and plan state.",
              "Things and Quotes hold user-generated content and ownership.",
              "Comments, likes, votes and follows hold interaction edges.",
              "Same Credit ledger entries explain balance changes.",
              "API Credit ledger entries explain workspace request consumption and approved welcome allowance.",
              "API purchase intents record checkout preparation without granting balance before payment confirmation.",
              "Achievement claims and events explain task rewards.",
              "Reports, support requests and admin events hold operational workflows.",
            ],
          },
        ],
      },
    ],
  },
];

const ALL_DOC_PAGES = DOC_GROUPS.flatMap((group) => group.pages);

function DocumentationPage() {
  const { q: initialQuery } = Route.useSearch();
  const [activeId, setActiveId] = useState("welcome");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DOC_GROUPS.map((group) => [group.id, true])),
  );
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setQuery(initialQuery ?? "");
  }, [initialQuery]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [sidebarOpen]);
  const activePage = useMemo(
    () => ALL_DOC_PAGES.find((page) => page.id === activeId) ?? ALL_DOC_PAGES[0],
    [activeId],
  );
  const activeIndex = ALL_DOC_PAGES.findIndex((page) => page.id === activePage.id);
  const previousPage = ALL_DOC_PAGES[activeIndex - 1];
  const nextPage = ALL_DOC_PAGES[activeIndex + 1];
  const filteredGroups = DOC_GROUPS.map((group) => ({
    ...group,
    pages: group.pages.filter((page) =>
      `${page.title} ${page.eyebrow} ${page.intro}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
    ),
  })).filter((group) => group.pages.length > 0);

  const selectPage = (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className="min-h-dvh bg-background text-foreground"
      onTouchStart={(event) => {
        const start = event.touches[0]?.clientX ?? 999;
        touchStartX.current = !sidebarOpen && start <= 28 ? start : null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const end = event.changedTouches[0]?.clientX ?? touchStartX.current;
        if (end - touchStartX.current > 64) setSidebarOpen(true);
        touchStartX.current = null;
      }}
    >
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" aria-label="SameThing home" className="inline-flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-border/90 bg-[#f4efe6] p-0">
              <img
                src="/pp-logo.png"
                alt="SameThing. mark"
                className="h-full w-full object-contain"
              />
            </span>
            <Brand size="sm" showMark={false} />
          </Link>
          <div className="hidden items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:flex">
            <span>Documentation</span>
            <span className="text-accent">/</span>
            <span>{ALL_DOC_PAGES.length} pages</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2.5 text-xs text-foreground transition-colors hover:border-accent/50 hover:text-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to the room
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="pressable grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-foreground lg:hidden"
              aria-label={sidebarOpen ? "Close documentation menu" : "Open documentation menu"}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close documentation menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-background/45 backdrop-blur-[2px] lg:hidden"
        />
      )}
      <div className="mx-auto grid max-w-[90rem] lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[min(18rem,88vw)] overflow-y-auto border-r border-border/70 bg-card/95 pt-[4.1rem] shadow-2xl transition-transform duration-200 lg:sticky lg:top-[4.1rem] lg:block lg:h-[calc(100dvh-4.1rem)] lg:w-auto lg:translate-x-0 lg:overflow-y-auto lg:bg-card/20 lg:pt-0 lg:shadow-none",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="p-4 sm:p-5">
            <label className="landing-search-shell flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search docs"
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <nav className="mt-5 space-y-4" aria-label="Documentation sections">
              {filteredGroups.map((group) => {
                const expanded = expandedGroups[group.id] ?? true;
                return (
                  <div key={group.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGroups((current) => ({ ...current, [group.id]: !expanded }))
                      }
                      className="flex w-full items-center justify-between px-2 text-left text-[10px] uppercase tracking-[0.2em] text-accent"
                      aria-expanded={expanded}
                    >
                      {group.label}
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform",
                          !expanded && "-rotate-90",
                        )}
                      />
                    </button>
                    {expanded && (
                      <div className="mt-1.5 space-y-0.5">
                        {group.pages.map((page) => {
                          const Icon = page.icon;
                          const active = page.id === activePage.id;
                          return (
                            <button
                              key={page.id}
                              type="button"
                              onClick={() => selectPage(page.id)}
                              className={cn(
                                "group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors",
                                active
                                  ? "bg-accent/10 text-foreground"
                                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                              )}
                              aria-current={active ? "page" : undefined}
                            >
                              <Icon
                                className={cn("h-3.5 w-3.5 shrink-0", active && "text-accent")}
                              />
                              <span className="min-w-0 flex-1 truncate">{page.title}</span>
                              {active && <ChevronRight className="h-3 w-3 text-accent" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
            {filteredGroups.length === 0 && (
              <p className="mt-5 px-2 text-xs leading-5 text-muted-foreground">
                No page matches that search yet.
              </p>
            )}
          </div>
          <div className="border-t border-border/60 p-4 sm:p-5">
            <Link
              to="/"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2.5 text-xs text-foreground transition-colors hover:border-accent/50 hover:text-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to the room
            </Link>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14 lg:px-14 lg:py-16">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-accent">
              <BookOpen className="h-3.5 w-3.5" /> {activePage.eyebrow}
            </div>
            <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[0.98] tracking-[-0.035em] text-foreground sm:text-6xl">
              {activePage.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              {activePage.intro}
            </p>

            <div className="mt-10 space-y-10">
              {activePage.sections.map((section) => (
                <section key={section.heading} className="border-t border-border/70 pt-5">
                  <h2 className="font-serif text-2xl italic text-foreground sm:text-3xl">
                    {section.heading}
                  </h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-[15px]"
                    >
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="mt-4 grid gap-2.5">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-3 text-sm leading-6 text-muted-foreground sm:text-[15px]"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            <div className="mt-14 grid gap-3 border-t border-border/70 pt-5 sm:grid-cols-2">
              {previousPage ? (
                <button
                  type="button"
                  onClick={() => selectPage(previousPage.id)}
                  className="group rounded-2xl border border-border bg-card/40 p-4 text-left hover:border-accent/40"
                >
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    previous
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-sm text-foreground">
                    <ArrowLeft className="h-3.5 w-3.5 text-accent transition-transform group-hover:-translate-x-0.5" />
                    {previousPage.title}
                  </span>
                </button>
              ) : (
                <div />
              )}
              {nextPage && (
                <button
                  type="button"
                  onClick={() => selectPage(nextPage.id)}
                  className="group rounded-2xl border border-border bg-card/40 p-4 text-left hover:border-accent/40 sm:text-right"
                >
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    next
                  </span>
                  <span className="mt-2 flex items-center justify-start gap-2 text-sm text-foreground sm:justify-end">
                    {nextPage.title}
                    <ArrowRight className="h-3.5 w-3.5 text-accent transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      <footer className="border-t border-border/70 bg-card/20">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-3 px-5 py-6 text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-14">
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
        </div>
      </footer>
    </div>
  );
}
