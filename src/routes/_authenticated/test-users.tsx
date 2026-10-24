import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  FlaskConical,
  MessageSquareText,
  Sparkles,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  getMyTestUserApplications,
  submitTestUserApplication,
} from "@/lib/api/test-users.functions";
import { getSiteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/_authenticated/test-users")({
  head: () => ({
    meta: [
      { title: "Test Users · SameThing." },
      {
        name: "description",
        content: "Apply for time-limited SameThing. early access and share product feedback.",
      },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/test-users") }],
  }),
  component: TestUsersPage,
});

type TestUserApplication = {
  id: string;
  first_name: string;
  last_name: string;
  reason: string | null;
  test_areas: string | null;
  status: "submitted" | "reviewing" | "approved" | "declined" | "revoked";
  approved_duration_days: number | null;
  decision_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const PROGRAM_STEPS = [
  {
    number: "01",
    title: "Apply",
    detail: "Tell us who you are and which surfaces or workflows you want to try.",
  },
  {
    number: "02",
    title: "Review",
    detail: "We select a small group around the current test focus.",
  },
  {
    number: "03",
    title: "Test pass",
    detail: "Selected features open for a defined window, not forever.",
  },
  {
    number: "04",
    title: "Feed back",
    detail: "Send notes, errors and ideas through the ongoing Support channel.",
  },
];

const TESTER_BENEFITS = [
  "Try named features before wider release.",
  "Receive automatic PremiumThing. access for the approved pilot window.",
  "Use pilot paths with unlimited Same Credits while your LabThing. pass is active.",
  "Share direct feedback, reproduction steps and product ideas.",
  "Keep normal account privacy and moderation controls throughout the pilot.",
];

function TestUsersPage() {
  const { user } = useAuth();
  const submitFn = useServerFn(submitTestUserApplication);
  const listFn = useServerFn(getMyTestUserApplications);
  const [applications, setApplications] = useState<TestUserApplication[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [reason, setReason] = useState("");
  const [testAreas, setTestAreas] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadApplications = async () => {
    try {
      const result = await listFn();
      setApplications(result.items as TestUserApplication[]);
    } catch {
      toast.error("Could not load your Test User requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeApplication = applications.find((item) =>
    ["submitted", "reviewing", "approved"].includes(item.status),
  );
  const canApply = !activeApplication;

  const submitApplication = async () => {
    if (!user) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Add your first and last name to continue.");
      return;
    }
    setSending(true);
    const result = await submitFn({
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        reason: reason.trim(),
        test_areas: testAreas.trim(),
      },
    });
    setSending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setFirstName("");
    setLastName("");
    setReason("");
    setTestAreas("");
    toast.success("Your Lab request is in the review queue.");
    await loadApplications();
  };

  return (
    <OnboardingGate>
      <AppShell>
        <Link
          to="/settings"
          className="mb-3 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> settings
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="brand-mark text-3xl text-foreground">
              Test Users<span className="dot">.</span>
            </h1>
            <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              early access, with a careful loop back to us
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-accent/35 bg-accent/10 text-accent">
            <FlaskConical className="h-5 w-5" />
          </div>
        </div>

        <section className="relative mt-5 overflow-hidden rounded-3xl border border-accent/30 bg-card p-5 shadow-sm">
          <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full border border-accent/15" />
          <div className="pointer-events-none absolute -right-2 top-6 h-24 w-24 rounded-full border border-accent/10" />
          <div className="relative max-w-lg">
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-accent">
              <Sparkles className="h-3.5 w-3.5" /> SameThing. pilot
            </p>
            <h2 className="mt-3 max-w-md font-serif text-3xl leading-tight text-foreground">
              Try the next room before everyone.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              We are building a small, thoughtful group that can test selected features early and
              tell us what feels clear, useful or broken before a wider release.
            </p>
          </div>
          <div className="relative mt-6 grid gap-2 sm:grid-cols-3">
            <ProgramMetric
              icon={<CalendarClock className="h-4 w-4" />}
              label="Window"
              value="7–30 days"
            />
            <ProgramMetric
              icon={<FlaskConical className="h-4 w-4" />}
              label="Access"
              value="LabThing. pass"
            />
            <ProgramMetric
              icon={<MessageSquareText className="h-4 w-4" />}
              label="Loop"
              value="Direct feedback"
            />
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Users className="h-4 w-4 text-accent" /> How the program works
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PROGRAM_STEPS.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-border/80 bg-background/45 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="font-serif text-xl italic text-accent/80">{step.number}</span>
                  <p className="text-sm text-foreground">{step.title}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            What testers get
          </p>
          <div className="mt-4 space-y-3">
            {TESTER_BENEFITS.map((benefit) => (
              <div
                key={benefit}
                className="flex items-start gap-3 text-sm leading-5 text-muted-foreground"
              >
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-accent/30 bg-accent/10 text-accent">
                  <Check className="h-3 w-3" />
                </span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-dashed border-accent/30 bg-accent/5 p-4">
            <p className="text-sm text-foreground">A LabThing. pass is time-limited.</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Approved testers receive PremiumThing. access and unlimited Same Credits for a
              selected 7, 14, 30 or custom 7–30-day window. Access ends automatically when the pass
              expires.
            </p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-accent/25 bg-card p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <MessageSquareText className="h-4 w-4 text-accent" /> Request a place
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Add your name. The reason and areas you want to test are optional, but they help us
            place the right people in the right pilot. Age and gender remain part of your existing
            account profile and are available to authorised reviewers only when already provided.
          </p>
          {activeApplication && (
            <div className="mt-4 rounded-2xl border border-accent/25 bg-accent/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-foreground">
                  {activeApplication.status === "approved"
                    ? "Your LabThing. pass is active."
                    : "Your Test User request is being reviewed."}
                </p>
                <span className="rounded-full border border-accent/35 px-2.5 py-1 text-[10px] uppercase tracking-widest text-accent">
                  {activeApplication.status}
                </span>
              </div>
              {activeApplication.status === "approved" && (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  PremiumThing. and unlimited Same Credits are active for this pilot window.
                </p>
              )}
            </div>
          )}
          {!activeApplication && applications.some((item) => item.status === "declined") && (
            <p className="mt-4 rounded-2xl border border-border bg-background/45 p-4 text-xs leading-5 text-muted-foreground">
              Your previous request was not selected. You can submit a new request with updated test
              interests.
            </p>
          )}
          {canApply && (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  First name
                  <Input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value.slice(0, 80))}
                    placeholder="Your first name"
                    className="mt-1.5 h-11 rounded-xl bg-background text-sm normal-case tracking-normal"
                    autoComplete="given-name"
                  />
                </label>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Last name
                  <Input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value.slice(0, 80))}
                    placeholder="Your last name"
                    className="mt-1.5 h-11 rounded-xl bg-background text-sm normal-case tracking-normal"
                    autoComplete="family-name"
                  />
                </label>
              </div>
              <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">
                Why do you want to be a Test User?{" "}
                <span className="normal-case tracking-normal">(optional)</span>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value.slice(0, 1200))}
                  placeholder="What makes this pilot interesting to you?"
                  className="mt-1.5 min-h-[96px] resize-none rounded-2xl bg-background text-base normal-case tracking-normal"
                />
              </label>
              <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">
                What would you like to test?{" "}
                <span className="normal-case tracking-normal">(optional)</span>
                <Textarea
                  value={testAreas}
                  onChange={(event) => setTestAreas(event.target.value.slice(0, 1200))}
                  placeholder="For example: Drop, Quote of the Day, mobile web app, sharing…"
                  className="mt-1.5 min-h-[96px] resize-none rounded-2xl bg-background text-base normal-case tracking-normal"
                />
              </label>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  onClick={() => void submitApplication()}
                  disabled={sending || loading || !user}
                  className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {sending ? "Sending…" : "Request a place"}
                </Button>
                <Link
                  to="/support"
                  className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Open Support
                </Link>
              </div>
            </>
          )}
          {!canApply && (
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              You can apply again after a declined or revoked request. Do not include passwords,
              payment details or other sensitive information.
            </p>
          )}
        </section>
      </AppShell>
    </OnboardingGate>
  );
}

function ProgramMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/50 px-3 py-3">
      <div className="flex items-center gap-2 text-accent">
        {icon}
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-sm text-foreground">{value}</p>
    </div>
  );
}
