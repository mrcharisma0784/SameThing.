import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  FileCode2,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
import { useAuth } from "@/hooks/use-auth";
import { getSiteUrl } from "@/lib/site-url";
import {
  RESEARCH_API_AVAILABLE,
  RESEARCH_API_PAUSE_MESSAGE,
} from "@/lib/api/research-availability";
import {
  API_CREDIT_PACKS,
  API_RATE_PLANS,
  API_SCOPE_DETAILS,
  API_SCOPES,
  formatUsdCents,
  type ApiScope,
} from "@/lib/api/api-catalog";
import {
  createApiCreditPurchaseIntent,
  getMyApiDashboard,
  submitApiAccessRequest,
} from "@/lib/api/api-access.functions";

export const Route = createFileRoute("/_authenticated/api-dashboard")({
  head: () => ({
    meta: [
      { title: "API Dashboard · SameThing." },
      {
        name: "description",
        content: "The Research API workspace is under development and temporarily unavailable.",
      },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/api-dashboard") }],
  }),
  component: ApiDashboardPage,
});

type RequestStatus = "pending" | "reviewing" | "approved" | "waitlist" | "declined";

type DashboardRequest = {
  id: string;
  applicant_name: string;
  organization: string | null;
  use_case: string;
  requested_scopes: string[];
  expected_volume: "pilot" | "standard" | "bulk";
  status: RequestStatus;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  application_notice_seen_at?: string | null;
  retry_after?: string | null;
};

type DashboardKey = {
  id: string;
  request_id: string;
  name: string;
  key_prefix: string;
  api_key: string | null;
  scopes: string[];
  rate_plan: keyof typeof API_RATE_PLANS;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

type DashboardLedger = {
  id: string;
  amount: number;
  reason: string;
  request_id: string;
  created_at: string;
};

function dateLabel(value: string | null | undefined) {
  if (!value) return "Not yet";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

function statusCopy(status: RequestStatus) {
  return {
    pending: {
      label: "In review queue",
      body: "Your workspace request is waiting for a careful scope review.",
      icon: Clock3,
    },
    reviewing: {
      label: "Being reviewed",
      body: "We are checking the use case and the smallest useful read-only scope.",
      icon: RefreshCw,
    },
    approved: {
      label: "Access approved",
      body: "Your workspace key and read-only limits are ready below.",
      icon: CheckCircle2,
    },
    waitlist: {
      label: "On the waitlist",
      body: "We have your request and will keep the workspace record for a later review.",
      icon: Clock3,
    },
    declined: {
      label: "Not approved yet",
      body: "This request is closed for now. You can return to the form with a clearer use case later.",
      icon: ShieldCheck,
    },
  }[status];
}

function ApiDashboardPage() {
  const { profile, user } = useAuth();
  const getDashboard = useServerFn(getMyApiDashboard);
  const submitRequest = useServerFn(submitApiAccessRequest);
  const createPurchase = useServerFn(createApiCreditPurchaseIntent);
  const dashboardQuery = useQuery({
    queryKey: ["api-dashboard", user?.id],
    queryFn: () => getDashboard(),
    enabled: Boolean(user) && RESEARCH_API_AVAILABLE,
    staleTime: 15_000,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [applicantName, setApplicantName] = useState(profile?.username ?? "");
  const [organization, setOrganization] = useState("");
  const [useCase, setUseCase] = useState("");
  const [volume, setVolume] = useState<"pilot" | "standard" | "bulk">("pilot");
  const [scopes, setScopes] = useState<ScopeDraft>(
    new Set<ApiScope>(["things:read", "quotes:read", "metadata:read"]),
  );
  const [busy, setBusy] = useState(false);
  const [copying, setCopying] = useState(false);

  const data = dashboardQuery.data as
    | {
        requests?: DashboardRequest[];
        active_request?: DashboardRequest | null;
        application_notice?: DashboardRequest | null;
        keys?: DashboardKey[];
        api_credits?: number;
        ledger?: DashboardLedger[];
        welcome_credits?: number;
      }
    | undefined;
  const activeRequest = data?.active_request ?? null;
  const applicationNotice = data?.application_notice ?? null;
  const isProcessedApplication = Boolean(
    activeRequest && ["approved", "waitlist", "declined"].includes(activeRequest.status),
  );
  const canShowApplication = Boolean(
    activeRequest && (!isProcessedApplication || applicationNotice),
  );
  const canReapply = Boolean(
    !activeRequest ||
    ((activeRequest.status === "declined" || activeRequest.status === "waitlist") &&
      (!activeRequest.retry_after || new Date(activeRequest.retry_after).getTime() <= Date.now())),
  );
  const keys = useMemo(() => (data?.keys ?? []) as DashboardKey[], [data?.keys]);
  const activeKey = useMemo(
    () => keys.find((key) => key.request_id === activeRequest?.id && !key.revoked_at) ?? null,
    [activeRequest?.id, keys],
  );
  const activeScopes = activeRequest?.requested_scopes ?? activeKey?.scopes ?? [];
  const status = activeRequest ? statusCopy(activeRequest.status) : null;
  const StatusIcon = status?.icon ?? FileCode2;

  const toggleScope = (scope: ApiScope) => {
    setScopes((current) => {
      const next = new Set(current);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (scopes.size === 0) {
      toast.error("Choose at least one data scope.");
      return;
    }
    setBusy(true);
    const result = await submitRequest({
      data: {
        applicant_name: applicantName,
        organization,
        use_case: useCase,
        requested_scopes: Array.from(scopes),
        expected_volume: volume,
      },
    });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setFormOpen(false);
    toast.success(result.message);
    await dashboardQuery.refetch();
  };

  const copyKey = async () => {
    if (!activeKey?.api_key) {
      toast.error("The full key is not available for this workspace.");
      return;
    }
    setCopying(true);
    try {
      await navigator.clipboard.writeText(activeKey.api_key);
      toast.success("API key copied.");
    } catch {
      toast.error("Clipboard access was blocked by the browser.");
    } finally {
      setCopying(false);
    }
  };

  const requestPurchase = async (packKey: "starter" | "builder" | "studio") => {
    const result = await createPurchase({ data: { pack_key: packKey } });
    if (!result.ok) toast.error(result.error);
    else toast.info(result.message);
  };

  if (!RESEARCH_API_AVAILABLE) {
    return (
      <AppShell>
        <section className="mx-auto mt-8 max-w-xl rounded-3xl border border-border bg-card/70 p-7 text-center sm:p-10">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-accent/35 bg-accent/10 text-accent">
            <FileCode2 className="h-5 w-5" />
          </span>
          <p className="mt-6 text-[10px] uppercase tracking-[0.25em] text-accent">
            Under development
          </p>
          <h1 className="mt-3 font-serif text-3xl text-foreground">API Dashboard</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {RESEARCH_API_PAUSE_MESSAGE}
          </p>
          <Link
            to="/"
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs text-foreground transition-colors hover:border-accent/50"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to the room
          </Link>
        </section>
      </AppShell>
    );
  }

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
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-accent">
              <FileCode2 className="h-3.5 w-3.5" /> API workspace
            </p>
            <h1 className="mt-2 brand-mark text-3xl text-foreground">
              API Dashboard<span className="dot">.</span>
            </h1>
            <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
              One quiet place for your approved, read-only research access, limits and API Credits.
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-accent/35 bg-accent/10 text-accent">
            <KeyRound className="h-5 w-5" />
          </div>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-accent/30 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <Wallet className="h-3.5 w-3.5 text-accent" /> API Credits
              </p>
              <span className="text-[10px] uppercase tracking-widest text-accent">
                1 request = 1
              </span>
            </div>
            <p className="mt-3 font-serif text-4xl italic text-foreground">
              {dashboardQuery.isLoading ? "—" : (data?.api_credits ?? 0)}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Approved workspaces start with a one-time {data?.welcome_credits ?? 500}-credit
              allowance. API Credits are separate from Same Credits.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Privacy boundary
            </p>
            <p className="mt-3 text-sm leading-6 text-foreground">
              Public projections only. No profiles, emails, comments, private messages, moderation,
              ledger or Admin data are exposed.
            </p>
            <Link
              to="/documentation"
              className="mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-accent hover:text-foreground"
            >
              Read the API docs <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>

        {dashboardQuery.isError ? (
          <section className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <p className="text-sm text-destructive">
              The API workspace is temporarily unavailable.
            </p>
            <button
              type="button"
              onClick={() => void dashboardQuery.refetch()}
              className="mt-3 rounded-full border border-border px-3 py-2 text-xs text-foreground"
            >
              Try again
            </button>
          </section>
        ) : canShowApplication && activeRequest ? (
          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Application
                </p>
                <h2 className="mt-2 font-serif text-2xl italic text-foreground">{status?.label}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  {status?.body}
                </p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-accent/30 bg-accent/10 text-accent">
                <StatusIcon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Meta label="Requested" value={dateLabel(activeRequest.created_at)} />
              <Meta label="Volume" value={activeRequest.expected_volume} />
              <Meta label="Scopes" value={`${activeScopes.length} selected`} />
            </div>
            {activeRequest.admin_note && (
              <div className="mt-4 rounded-xl border border-accent/20 bg-accent/5 p-3 text-sm leading-6 text-foreground">
                {activeRequest.admin_note}
              </div>
            )}
            {(activeRequest.status === "declined" || activeRequest.status === "waitlist") &&
              canReapply && (
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-foreground hover:border-accent/50"
                >
                  Submit a new request <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
          </section>
        ) : canReapply ? (
          <section className="mt-5 rounded-2xl border border-accent/25 bg-card p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-accent/30 bg-accent/10 text-accent">
                <LockKeyhole className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
                  Start a workspace
                </p>
                <h2 className="mt-2 font-serif text-2xl italic text-foreground">
                  Tell us what you are researching.
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Your request stays tied to this signed-in account. If it is approved, a scoped key
                  is generated automatically and appears here—never in Admin.
                </p>
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-xs font-medium text-accent-foreground"
                >
                  Apply for API access <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>
        ) : activeRequest?.retry_after ? (
          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Application pause
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              You can submit another request after {dateLabel(activeRequest.retry_after)}. The
              previous decision is kept private to this workspace and no duplicate review is created
              during the pause.
            </p>
          </section>
        ) : null}

        {formOpen && (
          <section className="mt-5 rounded-2xl border border-accent/30 bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-accent">New request</p>
                <h2 className="mt-2 font-serif text-2xl italic text-foreground">
                  Keep it specific.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                close
              </button>
            </div>
            <form onSubmit={(event) => void onSubmit(event)} className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-muted-foreground">
                  Name
                  <input
                    required
                    maxLength={120}
                    value={applicantName}
                    onChange={(event) => setApplicantName(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/60"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Organization <span className="text-muted-foreground/60">(optional)</span>
                  <input
                    maxLength={160}
                    value={organization}
                    onChange={(event) => setOrganization(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/60"
                  />
                </label>
              </div>
              <label className="block text-xs text-muted-foreground">
                What will you study?
                <textarea
                  required
                  minLength={20}
                  maxLength={3000}
                  rows={5}
                  value={useCase}
                  onChange={(event) => setUseCase(event.target.value)}
                  placeholder="Describe the research question, public-interest project or population-level pattern."
                  className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none focus:border-accent/60"
                />
                <span className="mt-1 block text-right text-[10px] text-muted-foreground/70">
                  {useCase.length}/3000
                </span>
              </label>
              <div>
                <p className="text-xs text-muted-foreground">Data scope</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {API_SCOPES.map((scope) => {
                    const checked = scopes.has(scope);
                    const detail = API_SCOPE_DETAILS[scope];
                    return (
                      <button
                        key={scope}
                        type="button"
                        onClick={() => toggleScope(scope)}
                        className={`rounded-2xl border p-3 text-left transition-colors ${checked ? "border-accent/50 bg-accent/10" : "border-border bg-background/40 hover:border-accent/30"}`}
                      >
                        <span className="flex items-center gap-2 text-sm text-foreground">
                          <span
                            className={`grid h-4 w-4 place-items-center rounded-full border ${checked ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}
                          >
                            {checked && <Check className="h-2.5 w-2.5" />}
                          </span>
                          {detail.label}
                        </span>
                        <span className="mt-1 block pl-6 text-[11px] leading-5 text-muted-foreground">
                          {detail.detail}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="block text-xs text-muted-foreground">
                Expected volume
                <select
                  value={volume}
                  onChange={(event) => setVolume(event.target.value as typeof volume)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/60"
                >
                  <option value="pilot">Pilot · occasional, small queries</option>
                  <option value="standard">Standard · regular research queries</option>
                  <option value="bulk">Bulk · larger approved program</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={busy}
                className="pressable inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-xs font-medium text-accent-foreground disabled:opacity-50"
              >
                {busy ? "Sending request…" : "Send API request"}
                {!busy && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </form>
          </section>
        )}

        {activeKey && (
          <section className="mt-5 rounded-2xl border border-accent/35 bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-accent">
                  <KeyRound className="h-3.5 w-3.5" /> Live key
                </p>
                <h2 className="mt-2 font-serif text-2xl italic text-foreground">
                  {activeKey.name}
                </h2>
              </div>
              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-accent">
                {API_RATE_PLANS[activeKey.rate_plan]?.label ?? activeKey.rate_plan}
              </span>
            </div>
            <div className="mt-4 rounded-xl border border-accent/20 bg-background/70 p-3">
              <p className="break-all font-mono text-xs leading-6 text-foreground">
                {activeKey.api_key ?? `${activeKey.key_prefix}…`}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!activeKey.api_key || copying}
                onClick={() => void copyKey()}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-2 text-xs text-accent-foreground disabled:opacity-50"
              >
                <Clipboard className="h-3.5 w-3.5" /> {copying ? "Copying…" : "Copy API key"}
              </button>
              <span className="text-[10px] leading-4 text-muted-foreground">
                Keep this secret. It authenticates read-only requests for this workspace.
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Meta label="Created" value={dateLabel(activeKey.created_at)} />
              <Meta label="Last used" value={dateLabel(activeKey.last_used_at)} />
              <Meta
                label="Limit"
                value={`${API_RATE_PLANS[activeKey.rate_plan]?.requestsPerMinute ?? 0} req/min`}
              />
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Scopes: {activeKey.scopes.join(" · ") || "No scopes"}. A key is only active while its
              application is approved and it has not been revoked or expired.
            </p>
          </section>
        )}

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <Wallet className="h-3.5 w-3.5 text-accent" /> Add API Credits
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Payments are prepared here, but no card is charged until the payment provider is
                connected.
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">USD</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {API_CREDIT_PACKS.map((pack) => (
              <div key={pack.key} className="rounded-2xl border border-border bg-background/40 p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {pack.label}
                </p>
                <p className="mt-2 font-serif text-2xl italic text-foreground">
                  {pack.credits.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">API Credits</p>
                <p className="mt-3 text-sm text-foreground">{formatUsdCents(pack.amountCents)}</p>
                <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">
                  {pack.description}
                </p>
                <button
                  type="button"
                  onClick={() => void requestPurchase(pack.key)}
                  className="mt-3 w-full rounded-full border border-accent/40 px-3 py-2 text-[10px] uppercase tracking-widest text-accent hover:bg-accent/10"
                >
                  Continue to checkout
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5 text-accent" /> API Credit activity
            </p>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              latest 40
            </span>
          </div>
          <div className="mt-3 divide-y divide-border/70">
            {(data?.ledger ?? []).length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No API usage yet.</p>
            ) : (
              (data?.ledger as DashboardLedger[]).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm text-foreground">
                      {entry.reason === "api_request" ? "API request" : "API Credit adjustment"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {dateLabel(entry.created_at)}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-sm ${entry.amount > 0 ? "text-emerald-400" : "text-muted-foreground"}`}
                  >
                    {entry.amount > 0 ? "+" : "−"}
                    {Math.abs(entry.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>{" "}
          ·{" "}
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </p>
      </AppShell>
    </OnboardingGate>
  );
}

type ScopeDraft = Set<ApiScope>;

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xs text-foreground">{value}</p>
    </div>
  );
}
