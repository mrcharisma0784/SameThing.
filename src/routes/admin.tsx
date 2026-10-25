import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AVATARS } from "@/lib/avatars";
import { ProfileGlyph } from "@/components/ProfileGlyph";
import { isLabThingActive } from "@/lib/test-user";
import {
  adminLogin,
  adminStatus,
  adminLogout,
  adminOverview,
  adminListUsers,
  adminUserDetail,
  adminBanUser,
  adminSetPremiumAccess,
  adminWarnUser,
  adminListThings,
  adminHideThing,
  adminDeleteThing,
  adminListReports,
  adminResolveReport,
  adminSendReportMessage,
  adminListSuspicious,
  adminResolveSuspicious,
  adminRetrySuspicious,
  adminListAccountDataRequests,
  adminListSupportRequests,
  adminUpdateSupportRequest,
  adminUpdateAccountDataRequest,
  adminListFeedback,
  adminReplyFeedback,
  adminListFeedbackPrompts,
  adminListFeedbackPromptResponses,
  adminUpsertFeedbackPrompt,
  adminListApiAccessRequests,
  adminUpdateApiAccessRequest,
  adminListApiKeys,
  adminRevokeApiKey,
  adminListAuditLogs,
  adminListAdminMembers,
  adminUpsertAdminMember,
  adminSendSystemMessage,
  adminListBannedWords,
  adminAddBannedWord,
  adminDeleteBannedWord,
} from "@/lib/api/admin.functions";
import {
  adminListTestUserApplications,
  adminReviewTestUserApplication,
} from "@/lib/api/test-users.functions";
import {
  adminGetMaintenanceStatus,
  adminSetMaintenanceMode,
  adminSetMaintenanceTargets,
} from "@/lib/api/maintenance.functions";
import {
  Check,
  ChevronRight,
  CircleAlert,
  FlaskConical,
  LockKeyhole,
  Settings2,
  Wrench,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin · SameThing." }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminPage,
});

type Tab =
  | "overview"
  | "users"
  | "test-users"
  | "things"
  | "reports"
  | "suspicious"
  | "support"
  | "feedback"
  | "api"
  | "messages"
  | "banned"
  | "maintenance"
  | "logs"
  | "access";

type AdminStatus = {
  unlocked: boolean;
  account: boolean;
  username: string | null;
  permissions: string[];
  mode: "account" | "breakglass" | null;
};

const ADMIN_PERMISSION_OPTIONS = [
  "admin:read",
  "users:read",
  "users:write",
  "users:delete",
  "content:read",
  "content:write",
  "content:delete",
  "reports:read",
  "reports:write",
  "support:read",
  "support:write",
  "ads:read",
  "ads:write",
  "api:read",
  "api:write",
  "maintenance:write",
  "messages:write",
  "logs:read",
  "admin:manage",
] as const;

const ADMIN_TAB_REQUIREMENTS: Record<Tab, string> = {
  overview: "admin:read",
  users: "users:read",
  "test-users": "users:read",
  things: "content:read",
  reports: "reports:read",
  suspicious: "reports:read",
  support: "support:read",
  feedback: "support:read",
  api: "api:read",
  messages: "messages:write",
  banned: "content:read",
  maintenance: "maintenance:write",
  logs: "logs:read",
  access: "admin:manage",
};

function canAccessAdminTab(state: AdminStatus, tab: Tab) {
  return (
    state.mode === "breakglass" ||
    state.permissions.includes("admin:manage") ||
    state.permissions.includes(ADMIN_TAB_REQUIREMENTS[tab])
  );
}

function AdminPage() {
  const [adminState, setAdminState] = useState<AdminStatus | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const statusFn = useServerFn(adminStatus);
  const logoutFn = useServerFn(adminLogout);

  const refreshStatus = () =>
    statusFn()
      .then((result) => setAdminState(result as AdminStatus))
      .catch(() =>
        setAdminState({
          unlocked: false,
          account: false,
          username: null,
          permissions: [],
          mode: null,
        }),
      );

  useEffect(() => {
    refreshStatus(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [statusFn]);

  if (adminState === null) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!adminState.unlocked) return <LoginScreen onOk={() => void refreshStatus()} />;

  const allTabs: Tab[] = [
    "overview",
    "users",
    "test-users",
    "things",
    "reports",
    "suspicious",
    "support",
    "feedback",
    "api",
    "messages",
    "banned",
    "maintenance",
    "logs",
  ];
  const visibleTabs = allTabs.filter((item) => canAccessAdminTab(adminState, item));
  const activeTab = canAccessAdminTab(adminState, tab) ? tab : (visibleTabs[0] ?? "overview");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="brand-mark text-xl text-foreground">
            SameThing · Admin<span className="dot">.</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
              {adminState.username ? `@${adminState.username}` : "founder access"}
            </span>
            <button
              className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary"
              onClick={async () => {
                await logoutFn();
                setAdminState({
                  unlocked: false,
                  account: false,
                  username: null,
                  permissions: [],
                  mode: null,
                });
              }}
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2 text-sm">
          {visibleTabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs uppercase tracking-widest transition-colors " +
                (activeTab === t
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground")
              }
            >
              {t === "test-users"
                ? "Lab"
                : t === "api"
                  ? "API Access"
                  : t === "logs"
                    ? "Admin Logs"
                    : t === "access"
                      ? "Admin Access"
                      : t}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {activeTab === "overview" && <Overview />}
        {activeTab === "users" && <UsersPanel />}
        {activeTab === "test-users" && <TestUsersAdminPanel />}
        {activeTab === "things" && <ThingsPanel />}
        {activeTab === "reports" && <ReportsPanel />}
        {activeTab === "suspicious" && <SuspiciousPanel />}
        {activeTab === "support" && <SupportPanel />}
        {activeTab === "feedback" && <FeedbackPanel />}
        {activeTab === "api" && <ApiAccessPanel />}
        {activeTab === "messages" && <MessagesPanel />}
        {activeTab === "banned" && <BannedPanel />}
        {activeTab === "maintenance" && <MaintenancePanel />}
        {activeTab === "logs" && <AdminLogsPanel />}
        {activeTab === "access" && <AdminAccessPanel />}
      </main>
    </div>
  );
}

function LoginScreen({ onOk }: { onOk: () => void }) {
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const login = useServerFn(adminLogin);
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-5 sm:p-8">
      <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10" />
        <div className="absolute left-1/2 top-1/2 h-[23rem] w-[23rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10" />
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try {
            const r = await login({ data: { username, password: pw } });
            if (r.ok) onOk();
            else setErr(r.error ?? "Login failed.");
          } catch {
            setErr("Admin session could not be created. Check ADMIN_SESSION_SECRET.");
          } finally {
            setBusy(false);
          }
        }}
        className="relative w-full max-w-md space-y-5 rounded-[2rem] border border-accent/20 bg-card/95 p-6 shadow-lg backdrop-blur sm:p-7"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-accent/35 bg-accent/10 text-accent">
            <LockKeyhole className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <div>
            <p className="font-serif text-xl italic text-foreground">SameThing.</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              private control room
            </p>
          </div>
        </div>
        <div>
          <h1 className="text-lg font-medium text-foreground">Admin access</h1>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Founder access requires the founder username and password on every session.
          </p>
        </div>
        <div className="border-t border-border pt-4">
          <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Founder credentials
          </p>
          <label
            htmlFor="admin-username"
            className="text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            Username
          </label>
          <input
            id="admin-username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Admin username"
            className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent/60"
          />
          <label
            htmlFor="admin-password"
            className="mt-3 block text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            Password
          </label>
          <input
            id="admin-password"
            autoComplete="current-password"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Admin password"
            className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent/60"
          />
        </div>
        {err && (
          <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {err}
          </p>
        )}
        <button
          disabled={busy || !username || !pw}
          type="submit"
          className="h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? "Verifying…" : "Sign in as founder"}
        </button>
        <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground/70">
          No public route · no indexing
        </p>
      </form>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function AdminAccessPanel() {
  const list = useServerFn(adminListAdminMembers);
  const upsert = useServerFn(adminUpsertAdminMember);
  const [members, setMembers] = useState<
    Array<{
      user_id: string;
      username: string;
      permissions: string[];
      active: boolean;
      created_at: string;
      updated_at: string;
    }>
  >([]);
  const [username, setUsername] = useState("");
  const [permissions, setPermissions] = useState<string[]>(["admin:read"]);
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const result = await list();
    if (result.error) toast.error(result.error);
    else setMembers(result.items as typeof members);
  };

  useEffect(() => {
    void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const save = async () => {
    if (!username.trim() || permissions.length === 0) return;
    setBusy(true);
    const result = await upsert({ data: { username: username.trim(), permissions, active } });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Admin access saved for @${result.item.username}.`);
    setUsername("");
    setPermissions(["admin:read"]);
    setActive(true);
    load();
  };

  return (
    <div className="space-y-4">
      <Card title="Account-based admin access">
        <p className="text-sm leading-6 text-muted-foreground">
          Enter an existing SameThing. username. No password is collected here; the person must
          first sign in through the normal account flow. The server verifies the account ID behind
          that username before granting access.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="@username"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />{" "}
            Active
          </label>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {ADMIN_PERMISSION_OPTIONS.map((permission) => {
            const checked = permissions.includes(permission);
            return (
              <label
                key={permission}
                className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setPermissions((current) =>
                      checked
                        ? current.filter((item) => item !== permission)
                        : [...current, permission],
                    )
                  }
                />
                {permission}
              </label>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || !username.trim() || permissions.length === 0}
          className="mt-4 rounded-full bg-accent px-4 py-2 text-xs text-accent-foreground disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save admin access"}
        </button>
      </Card>
      <Card title={`Admin members · ${members.length}`}>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="rounded-2xl border border-border bg-background/40 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-foreground">@{member.username}</span>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-widest ${member.active ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}
                >
                  {member.active ? "active" : "inactive"}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                {member.permissions.join(" · ")}
              </p>
            </div>
          ))}
          {!members.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No account-based admin members yet.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function AdminLogsPanel() {
  const list = useServerFn(adminListAuditLogs);
  const [items, setItems] = useState<
    Array<{
      id: string;
      actor_username: string;
      actor_mode: string;
      action: string;
      permission: string | null;
      target_type: string | null;
      target_id: string | null;
      metadata: Record<string, unknown>;
      created_at: string;
    }>
  >([]);
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    const result = await list({ data: { limit: 100, offset: 0, actor, action } });
    setBusy(false);
    if (result.error) toast.error(result.error);
    else setItems(result.items as typeof items);
  };

  useEffect(() => {
    void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  return (
    <Card title={`Admin Logs · ${items.length}`}>
      <p className="mb-4 text-sm leading-6 text-muted-foreground">
        Append-only record of admin actions. Secrets, tokens and authorization headers are excluded
        from metadata.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          value={actor}
          onChange={(event) => setActor(event.target.value)}
          placeholder="Filter by username"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
        <input
          value={action}
          onChange={(event) => setAction(event.target.value)}
          placeholder="Filter by action"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          className="rounded-full bg-accent px-4 py-2 text-xs text-accent-foreground disabled:opacity-50"
        >
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-border bg-background/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                <span>@{item.actor_username}</span>
                <span className="text-muted-foreground">·</span>
                <span>{item.action}</span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {new Date(item.created_at).toLocaleString("en-US")}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {item.actor_mode} · {item.permission ?? "no permission label"}
              {item.target_type
                ? ` · ${item.target_type}${item.target_id ? `:${item.target_id}` : ""}`
                : ""}
            </p>
            {Object.keys(item.metadata ?? {}).length > 0 && (
              <p className="mt-2 break-words font-mono text-[10px] text-muted-foreground/80">
                {JSON.stringify(item.metadata)}
              </p>
            )}
          </div>
        ))}
        {!items.length && (
          <p className="py-6 text-center text-sm text-muted-foreground">No audit entries yet.</p>
        )}
      </div>
    </Card>
  );
}

// ---------- Overview ----------
function Overview() {
  const fn = useServerFn(adminOverview);
  const [d, setD] = useState<Awaited<ReturnType<typeof adminOverview>> | null>(null);
  useEffect(() => {
    fn()
      .then(setD)
      .catch(() => {});
  }, [fn]);
  if (!d) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const items: Array<[string, number]> = [
    ["Users", d.users],
    ["Premium", d.premium],
    ["Banned", d.banned],
    ["Things", d.things],
    ["Comments", d.comments],
    ["Votes", d.votes],
    ["Feedback", d.feedback],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([label, val]) => (
        <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-bold">{val}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- Users ----------
type UserRow = {
  id: string;
  username: string;
  emoji: string;
  plan: string;
  language: string;
  created_at: string;
  warnings_count: number;
  banned_at: string | null;
  rare_thing_count: number;
  gender: string | null;
  age_range: string | null;
};

function UsersPanel() {
  const list = useServerFn(adminListUsers);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const reload = () => {
    list({ data: { q: q.trim() || undefined, limit: 50, offset: 0 } }).then((r) => {
      setRows(r.items as UserRow[]);
      setTotal(r.total);
    });
  };
  useEffect(() => {
    reload(); /* eslint-disable-next-line */
  }, []);
  return (
    <>
      <Card title={`Users (${total})`}>
        <div className="mb-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search username…"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") reload();
            }}
          />
          <button
            onClick={reload}
            className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground"
          >
            Search
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[520px] text-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_110px_76px_76px] items-center gap-4 border-b border-border px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>User</span>
              <span>Plan</span>
              <span className="text-right">Warn</span>
              <span className="text-right">Rare</span>
            </div>
            <div className="divide-y divide-border">
              {rows.map((u) => (
                <div
                  key={u.id}
                  className={`grid grid-cols-[minmax(0,1fr)_110px_76px_76px] items-center gap-4 px-3 py-3 ${u.banned_at ? "bg-destructive/10" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(u.id)}
                    className="flex min-w-0 items-center gap-2 text-left hover:text-accent hover:underline"
                  >
                    <ProfileGlyph value={u.emoji} className="h-4 w-4 shrink-0" />
                    <span className="truncate">@{u.username}</span>
                    {u.banned_at && (
                      <span className="shrink-0 rounded bg-destructive px-1.5 py-0.5 text-[10px] text-accent-foreground">
                        BANNED
                      </span>
                    )}
                  </button>
                  <span className="truncate text-muted-foreground">{u.plan}</span>
                  <span className="text-right tabular-nums">{u.warnings_count}</span>
                  <span className="text-right tabular-nums">{u.rare_thing_count}</span>
                </div>
              ))}
              {!rows.length && (
                <div className="py-6 text-center text-muted-foreground">No users.</div>
              )}
            </div>
          </div>
        </div>
      </Card>
      {selected && (
        <UserDetail
          id={selected}
          onClose={() => {
            setSelected(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function UserDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const fn = useServerFn(adminUserDetail);
  const banFn = useServerFn(adminBanUser);
  const premiumFn = useServerFn(adminSetPremiumAccess);

  const warnFn = useServerFn(adminWarnUser);
  const [d, setD] = useState<Awaited<ReturnType<typeof adminUserDetail>> | null>(null);
  const [warnNote, setWarnNote] = useState("");
  const [premiumPanelOpen, setPremiumPanelOpen] = useState(false);
  const [premiumSelection, setPremiumSelection] = useState<7 | 14 | 30 | 90 | "forever">(30);
  const [customPremiumDays, setCustomPremiumDays] = useState("");
  const [premiumBusy, setPremiumBusy] = useState(false);
  const load = () => fn({ data: { id } }).then(setD);
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [id]);
  if (!d) return <Card title="User detail">Loading…</Card>;
  const p = d.profile as Record<string, unknown> | null;
  const premiumUntil = typeof p?.premium_until === "string" ? p.premium_until : null;
  const isPremium =
    p?.plan === "premium" && (!premiumUntil || new Date(premiumUntil).getTime() > Date.now());
  const selectedPremiumDays = customPremiumDays
    ? Number.parseInt(customPremiumDays, 10)
    : premiumSelection;
  const isBanned = !!p?.banned_at;
  const updatePremium = async (grant: boolean) => {
    if (
      grant &&
      (selectedPremiumDays === "forever" || (selectedPremiumDays >= 1 && selectedPremiumDays <= 90))
    ) {
      setPremiumBusy(true);
      const result = await premiumFn({
        data: {
          id,
          grant: true,
          duration_days: selectedPremiumDays as "forever" | number,
        },
      });
      setPremiumBusy(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("PremiumThing. access updated.");
      setPremiumPanelOpen(false);
      load();
      return;
    }
    if (grant) {
      toast.error("Choose 1–90 days or Forever.");
      return;
    }
    setPremiumBusy(true);
    const result = await premiumFn({ data: { id, grant: false, duration_days: "forever" } });
    setPremiumBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("PremiumThing. removed.");
    setPremiumPanelOpen(false);
    load();
  };
  return (
    <Card title={`User · @${(p?.username as string) ?? "?"}`}>
      <div className="mb-3 flex justify-end">
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => setPremiumPanelOpen((value) => !value)}
            className="rounded-md border border-[color:var(--rare)]/50 px-2.5 py-1 text-xs text-[color:var(--rare)]"
          >
            {isPremium ? "Manage Premium" : "Grant Premium"}
          </button>
          <button
            onClick={async () => {
              const reason = isBanned ? "" : (prompt("Ban reason?") ?? "");
              await banFn({ data: { id, reason, ban: !isBanned } });
              toast.success(isBanned ? "Unbanned." : "Banned.");
              load();
            }}
            className={
              "rounded-md px-2.5 py-1 text-xs " +
              (isBanned ? "border" : "bg-destructive text-accent-foreground")
            }
          >
            {isBanned ? "Unban" : "Ban"}
          </button>
        </div>
      </div>

      {premiumPanelOpen && (
        <section className="mb-4 rounded-2xl border border-[color:var(--rare)]/60 bg-background/30 p-4 shadow-[0_0_20px_color-mix(in_srgb,var(--rare)_10%,transparent)]">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-serif text-lg text-foreground">PREMIUMTHING. ACCESS</h3>
            <span className="text-right text-xs text-muted-foreground">
              {isPremium
                ? premiumUntil
                  ? `Active · ends ${new Date(premiumUntil).toLocaleDateString()}`
                  : "Active · no end date"
                : "Inactive"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {([7, 14, 30, 90] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  setPremiumSelection(days);
                  setCustomPremiumDays("");
                }}
                className={`rounded-full border px-3 py-1.5 text-xs ${!customPremiumDays && premiumSelection === days ? "border-[color:var(--rare)] text-[color:var(--rare)]" : "border-border text-muted-foreground"}`}
              >
                {days} days
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPremiumSelection("forever");
                setCustomPremiumDays("");
              }}
              className={`rounded-full border px-3 py-1.5 text-xs ${!customPremiumDays && premiumSelection === "forever" ? "border-[color:var(--rare)] text-[color:var(--rare)]" : "border-border text-muted-foreground"}`}
            >
              Forever
            </button>
          </div>
          <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">
            Custom length (1–90 days)
            <input
              type="number"
              min={1}
              max={90}
              value={customPremiumDays}
              onChange={(event) => setCustomPremiumDays(event.target.value.slice(0, 2))}
              placeholder="e.g. 45"
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm normal-case tracking-normal text-foreground outline-none focus:border-[color:var(--rare)]"
            />
          </label>
          <p className="mt-3 text-sm text-muted-foreground">
            Granting:{" "}
            <strong className="text-foreground">
              {selectedPremiumDays === "forever"
                ? "Forever"
                : `${selectedPremiumDays || "—"} day(s)`}
            </strong>
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={premiumBusy}
              onClick={() => void updatePremium(true)}
              className="rounded-xl bg-[color:var(--rare)] px-3 py-2.5 text-sm text-background disabled:opacity-50"
            >
              Update gift
            </button>
            {isPremium && (
              <button
                type="button"
                disabled={premiumBusy}
                onClick={() => void updatePremium(false)}
                className="rounded-xl border border-border px-3 py-2.5 text-sm text-foreground disabled:opacity-50"
              >
                Remove premium
              </button>
            )}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Gifts are timed by default (max 90 days); Forever keeps PremiumThing. active until
            manually removed.
          </p>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background/30 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Profile
          </h3>
          <ul className="space-y-1 text-sm">
            <li>
              <b>Icon:</b>{" "}
              <ProfileGlyph
                value={p?.emoji as string}
                className="inline-block h-4 w-4 align-[-0.2em]"
              />
            </li>
            <li>
              <b>Bio:</b> {(p?.bio as string) ?? "—"}
            </li>
            <li>
              <b>Gender:</b> {(p?.gender as string) ?? "—"}
            </li>
            <li>
              <b>Age:</b> {(p?.age_range as string) ?? "—"}
            </li>
            <li>
              <b>Plan:</b> {p?.plan as string}
            </li>
            <li>
              <b>Language:</b> {p?.language as string}
            </li>
            <li>
              <b>Warnings:</b> {p?.warnings_count as number}
            </li>
            <li>
              <b>Rare things:</b> {p?.rare_thing_count as number}
            </li>
            {isBanned && (
              <li className="text-destructive">
                <b>Banned:</b> {new Date(p!.banned_at as string).toLocaleString()} —{" "}
                {(p?.ban_reason as string) ?? ""}
              </li>
            )}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-background/30 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Auth
          </h3>
          <ul className="space-y-1 text-sm">
            <li>
              <b>Email:</b> {d.auth?.email ?? "—"}
            </li>
            <li>
              <b>Phone:</b> {d.auth?.phone ?? "—"}
            </li>
            <li>
              <b>Provider:</b> {d.auth?.provider ?? "—"}
            </li>
            <li>
              <b>Signed up:</b> {d.auth ? new Date(d.auth.created_at).toLocaleString() : "—"}
            </li>
            <li>
              <b>Last sign-in:</b>{" "}
              {d.auth?.last_sign_in_at ? new Date(d.auth.last_sign_in_at).toLocaleString() : "—"}
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background/30 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Top tags used
          </h3>
          <div className="flex flex-wrap gap-1">
            {d.tags.length ? (
              d.tags.slice(0, 20).map((t) => (
                <span key={t.tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                  {t.tag} · {t.count}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">None.</span>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background/30 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Send warning
          </h3>
          <textarea
            value={warnNote}
            onChange={(e) => setWarnNote(e.target.value)}
            rows={2}
            placeholder="Reason / note (goes to their inbox)"
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
          <button
            disabled={!warnNote.trim()}
            onClick={async () => {
              await warnFn({ data: { id, note: warnNote.trim() } });
              toast.success("Warning sent.");
              setWarnNote("");
              load();
            }}
            className="mt-2 rounded-md bg-amber-500 px-3 py-1.5 text-xs text-accent-foreground disabled:opacity-50"
          >
            Send warning
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-background/30 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Things ({d.things.length})
        </h3>
        <ul className="space-y-1 text-sm">
          {d.things
            .slice(0, 20)
            .map(
              (t: {
                id: string;
                title: string;
                created_at: string;
                hidden: boolean;
                same_count: number;
                nah_count: number;
              }) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between border-b border-border py-1"
                >
                  <span className={t.hidden ? "text-muted-foreground line-through" : ""}>
                    {t.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.same_count}✓ / {t.nah_count}✗ · {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </li>
              ),
            )}
          {!d.things.length && <li className="text-xs text-muted-foreground">None.</li>}
        </ul>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-background/30 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Recent comments ({d.comments.length})
        </h3>
        <ul className="space-y-1 text-sm">
          {d.comments
            .slice(0, 20)
            .map((c: { id: string; text: string; created_at: string; hidden: boolean }) => (
              <li
                key={c.id}
                className={
                  "border-b border-border py-1 " +
                  (c.hidden ? "text-muted-foreground line-through" : "")
                }
              >
                {c.text}{" "}
                <span className="ml-2 text-[10px] text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          {!d.comments.length && <li className="text-xs text-muted-foreground">None.</li>}
        </ul>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background/30 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Vote history ({d.votes.length})
          </h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {d.votes
              .slice(0, 20)
              .map((v: { id: string; vote_type: string; thing_id: string; created_at: string }) => (
                <li key={v.id}>
                  {v.vote_type === "same" ? "Same" : "Nah"} on {v.thing_id.slice(0, 8)}… ·{" "}
                  {new Date(v.created_at).toLocaleDateString()}
                </li>
              ))}
            {!d.votes.length && <li>None.</li>}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-background/30 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Feedback sent ({d.feedback.length})
          </h3>
          <ul className="space-y-1 text-sm">
            {d.feedback
              .slice(0, 10)
              .map(
                (f: {
                  id: string;
                  message: string;
                  created_at: string;
                  replied_at: string | null;
                }) => (
                  <li key={f.id} className="border-b border-border py-1">
                    {f.message}
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {new Date(f.created_at).toLocaleDateString()}{" "}
                      {f.replied_at ? "· replied" : ""}
                    </span>
                  </li>
                ),
              )}
            {!d.feedback.length && <li className="text-xs text-muted-foreground">None.</li>}
          </ul>
        </div>
      </div>
    </Card>
  );
}

// ---------- Things ----------
function ThingsPanel() {
  const list = useServerFn(adminListThings);
  const hide = useServerFn(adminHideThing);
  const del = useServerFn(adminDeleteThing);
  const [q, setQ] = useState("");
  const [hiddenOnly, setHidden] = useState(false);
  const [rows, setRows] = useState<
    Array<{
      id: string;
      title: string;
      user_id: string;
      tags: string[];
      created_at: string;
      hidden: boolean;
      same_count: number;
      nah_count: number;
      report_count: number;
      comment_count: number;
      is_anonymous: boolean;
      raw_text: string;
    }>
  >([]);
  const [total, setTotal] = useState(0);
  const reload = () => {
    list({ data: { q: q.trim() || undefined, hiddenOnly, limit: 50, offset: 0 } }).then((r) => {
      setRows(r.items as never);
      setTotal(r.total);
    });
  };
  useEffect(() => {
    reload(); /* eslint-disable-next-line */
  }, [hiddenOnly]);
  return (
    <Card title={`Things (${total})`}>
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title…"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") reload();
          }}
        />
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={hiddenOnly}
            onChange={(e) => setHidden(e.target.checked)}
          />
          Hidden only
        </label>
        <button
          onClick={reload}
          className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground"
        >
          Search
        </button>
      </div>
      <ul className="divide-y">
        {rows.map((t) => (
          <li key={t.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div
                  className={
                    "font-medium " + (t.hidden ? "text-muted-foreground line-through" : "")
                  }
                >
                  {t.title}
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {t.raw_text}
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                  {t.tags?.map((tag) => (
                    <span key={tag} className="rounded-full bg-secondary px-1.5 py-0.5">
                      {tag}
                    </span>
                  ))}
                  <span>
                    · {t.same_count}✓/{t.nah_count}✗
                  </span>
                  <span>· {t.comment_count} comments</span>
                  <span>· reports: {t.report_count}</span>
                  <span>· {new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={async () => {
                    await hide({ data: { id: t.id, hidden: !t.hidden } });
                    reload();
                  }}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary"
                >
                  {t.hidden ? "Unhide" : "Hide"}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Delete this thing and its comments/votes? Cannot be undone."))
                      return;
                    await del({ data: { id: t.id } });
                    toast.success("Deleted.");
                    reload();
                  }}
                  className="rounded-md bg-destructive px-2 py-1 text-xs text-accent-foreground"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
        {!rows.length && (
          <li className="py-6 text-center text-sm text-muted-foreground">No things.</li>
        )}
      </ul>
    </Card>
  );
}

// ---------- Reports & privacy --------------------------------------
type ReportItem = {
  id: string;
  target_type: "thing" | "comment" | "quote" | "user";
  target_id: string;
  reporter?: { username?: string; emoji?: string } | null;
  owner?: {
    username?: string;
    emoji?: string;
    warnings_count?: number;
    banned_at?: string | null;
  } | null;
  target_user?: { username?: string; emoji?: string } | null;
  target?: {
    id?: string;
    title?: string;
    simplified_text?: string;
    text?: string;
    hidden?: boolean;
    thing_id?: string | null;
  } | null;
  reason: string;
  status: string;
  created_at: string;
};

type SuspiciousItem = {
  id: string;
  thing_id: string;
  status: "pending" | "reviewed" | "dismissed";
  outcome: "unsafe" | "unavailable" | "malformed";
  label: string;
  reason: string | null;
  attempts: number;
  created_at: string;
  thing: {
    id: string;
    simplified_text?: string | null;
    deleted_at?: string | null;
  } | null;
  profile: { username?: string; emoji?: string; plan?: string } | null;
};

function SuspiciousPanel() {
  const list = useServerFn(adminListSuspicious);
  const resolve = useServerFn(adminResolveSuspicious);
  const retry = useServerFn(adminRetrySuspicious);
  const [items, setItems] = useState<SuspiciousItem[]>([]);
  const [status, setStatus] = useState<"pending" | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const result = await list({ data: { status, limit: 100, offset: 0 } });
      setItems(result.items as SuspiciousItem[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load Suspicious reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // reload intentionally follows the selected queue filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const resolveOne = async (item: SuspiciousItem, nextStatus: "reviewed" | "dismissed") => {
    setBusy(item.id);
    const result = await resolve({
      data: { review_id: item.id, status: nextStatus, admin_note: "" },
    });
    setBusy(null);
    if (!result.ok) toast.error(result.error);
    else toast.success(nextStatus === "reviewed" ? "Marked reviewed." : "Review dismissed.");
    await reload();
  };

  const retryOne = async (item: SuspiciousItem) => {
    setBusy(item.id);
    const result = await retry({ data: { review_id: item.id } });
    setBusy(null);
    if (!result.ok) toast.error(result.error);
    else
      toast.success(
        result.status === "pending" ? "Still needs review." : "Follow-up AI review passed.",
      );
    await reload();
  };

  return (
    <Card title={`Suspicious · ${items.length}${status === "pending" ? " pending" : " total"}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          AI review is advisory at publish time. These Things were published but need a human check
          when the model was uncertain, unavailable, or suspicious.
        </p>
        <div className="flex gap-2">
          {(["pending", "all"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-full border px-3 py-1.5 text-xs ${status === value ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:bg-secondary"}`}
            >
              {value === "pending" ? "Pending" : "All"}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-background/40 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>{item.outcome}</span>
                    <span>·</span>
                    <span>{item.status}</span>
                    <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-700 dark:text-amber-300">
                      {item.label}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {item.thing?.simplified_text ?? "Content unavailable."}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    owner: @{item.profile?.username ?? "unknown"} · attempts: {item.attempts} ·{" "}
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                  {item.reason && (
                    <p className="mt-1 text-xs text-muted-foreground">AI note: {item.reason}</p>
                  )}
                </div>
                {item.thing?.id && !item.thing.deleted_at && (
                  <a
                    href={`/thing/${item.thing.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs text-accent hover:underline"
                  >
                    Open Thing ↗
                  </a>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => void retryOne(item)}
                  className="rounded-full border border-accent/50 px-3 py-1.5 text-xs text-accent disabled:opacity-50"
                >
                  Retry AI
                </button>
                <button
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => void resolveOne(item, "reviewed")}
                  className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-50"
                >
                  Mark reviewed
                </button>
                <button
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => void resolveOne(item, "dismissed")}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50"
                >
                  Dismiss
                </button>
              </div>
            </article>
          ))}
          {!items.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">No suspicious reviews.</p>
          )}
        </div>
      )}
    </Card>
  );
}

function ReportsPanel() {
  const list = useServerFn(adminListReports);
  const resolve = useServerFn(adminResolveReport);
  const sendReportMessage = useServerFn(adminSendReportMessage);
  const requestList = useServerFn(adminListAccountDataRequests);
  const requestUpdate = useServerFn(adminUpdateAccountDataRequest);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [requests, setRequests] = useState<
    Array<{
      id: string;
      request_type: string;
      status: string;
      requested_at: string;
      profile?: { username?: string } | null;
    }>
  >([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [messageReportId, setMessageReportId] = useState<string | null>(null);
  const [messageTitle, setMessageTitle] = useState("Message from SameThing moderators");
  const [messageBody, setMessageBody] = useState("");
  const reload = async () => {
    const [reportResult, requestResult] = await Promise.all([
      list({ data: { status: "open", limit: 100, offset: 0 } }),
      requestList(),
    ]);
    setReports(reportResult.items as ReportItem[]);
    setRequests(requestResult.items as typeof requests);
  };
  useEffect(() => {
    void reload();
    // reload is a stable local loader for this admin-only panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveOne = async (
    report: ReportItem,
    action: "none" | "hide" | "delete" | "warn" | "ban",
  ) => {
    setBusy(report.id);
    const result = await resolve({
      data: { report_id: report.id, status: "resolved", action, admin_note: "" },
    });
    setBusy(null);
    if (!result.ok) toast.error(result.error);
    else toast.success("Report resolved.");
    await reload();
  };
  const sendMessage = async (report: ReportItem) => {
    if (!messageBody.trim()) return;
    setBusy(report.id);
    const result = await sendReportMessage({
      data: { report_id: report.id, title: messageTitle.trim(), body: messageBody.trim() },
    });
    setBusy(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("System message sent.");
      setMessageBody("");
      setMessageReportId(null);
    }
  };
  const updateRequest = async (id: string, status: "in_progress" | "completed" | "rejected") => {
    setBusy(id);
    const result = await requestUpdate({ data: { request_id: id, status, admin_note: "" } });
    setBusy(null);
    if (!result.ok) toast.error(result.error);
    else toast.success("Request updated.");
    await reload();
  };

  return (
    <div className="space-y-6">
      <Card title={`Reports · ${reports.length} open`}>
        <div className="space-y-3">
          {reports.map((report) => {
            const content =
              report.target_type === "user"
                ? `@${report.target_user?.username ?? report.target_id}`
                : (report.target?.title ??
                  report.target?.text ??
                  report.target?.simplified_text ??
                  "Content unavailable");
            const targetHref =
              report.target_type === "thing"
                ? `/thing/${report.target_id}`
                : report.target_type === "quote"
                  ? `/quote/${report.target_id}`
                  : report.target_type === "comment" && report.target?.thing_id
                    ? `/thing/${report.target.thing_id}`
                    : null;
            return (
              <article
                key={report.id}
                className="rounded-xl border border-border bg-background/40 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {report.target_type} · {report.reason}
                    </p>
                    {targetHref ? (
                      <a
                        href={targetHref}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block line-clamp-2 text-sm text-foreground hover:text-accent hover:underline"
                      >
                        {content} <span className="text-xs text-accent">Open full content ↗</span>
                      </a>
                    ) : (
                      <p className="mt-1 line-clamp-2 text-sm text-foreground">{content}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      owner: @{report.owner?.username ?? report.target_user?.username ?? "unknown"}{" "}
                      · reported by @{report.reporter?.username ?? "unknown"} ·{" "}
                      {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-widest text-amber-700 dark:text-amber-300">
                    {report.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === report.id}
                    onClick={() => void resolveOne(report, "none")}
                    className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                  {report.target_type !== "user" && (
                    <button
                      type="button"
                      disabled={busy === report.id}
                      onClick={() => void resolveOne(report, "hide")}
                      className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-50"
                    >
                      Hide
                    </button>
                  )}
                  {report.target_type !== "user" && (
                    <button
                      type="button"
                      disabled={busy === report.id}
                      onClick={() => void resolveOne(report, "delete")}
                      className="rounded-full border border-destructive/50 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy === report.id}
                    onClick={() => void resolveOne(report, "warn")}
                    className="rounded-full border border-amber-500/50 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300 disabled:opacity-50"
                  >
                    Warn owner
                  </button>
                  <button
                    type="button"
                    disabled={busy === report.id}
                    onClick={() => void resolveOne(report, "ban")}
                    className="rounded-full bg-destructive px-3 py-1.5 text-xs text-destructive-foreground disabled:opacity-50"
                  >
                    Ban owner
                  </button>
                  <button
                    type="button"
                    disabled={busy === report.id || !report.owner}
                    onClick={() =>
                      setMessageReportId((current) => (current === report.id ? null : report.id))
                    }
                    className="rounded-full border border-accent/50 px-3 py-1.5 text-xs text-accent disabled:opacity-50"
                  >
                    Message owner
                  </button>
                </div>
                {messageReportId === report.id && (
                  <div className="mt-3 space-y-2 rounded-xl border border-accent/30 bg-card p-3">
                    <input
                      value={messageTitle}
                      onChange={(event) => setMessageTitle(event.target.value.slice(0, 120))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                      placeholder="Message title"
                    />
                    <textarea
                      value={messageBody}
                      onChange={(event) => setMessageBody(event.target.value.slice(0, 2000))}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                      placeholder="Write a system message to the content owner…"
                    />
                    <button
                      type="button"
                      disabled={busy === report.id || !messageBody.trim()}
                      onClick={() => void sendMessage(report)}
                      className="rounded-full bg-accent px-3 py-1.5 text-xs text-accent-foreground disabled:opacity-50"
                    >
                      Send system message
                    </button>
                  </div>
                )}
              </article>
            );
          })}
          {!reports.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">No open reports.</p>
          )}
        </div>
      </Card>

      <Card title="Account & privacy requests">
        <div className="space-y-2">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-3"
            >
              <div>
                <p className="text-sm text-foreground">
                  {request.request_type === "export" ? "Email data export" : "Account deletion"} · @
                  {request.profile?.username ?? "unknown"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {request.status.replace("_", " ")} ·{" "}
                  {new Date(request.requested_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                {request.status === "pending" && (
                  <button
                    type="button"
                    disabled={busy === request.id}
                    onClick={() => void updateRequest(request.id, "in_progress")}
                    className="rounded-full border border-border px-3 py-1.5 text-xs"
                  >
                    Start
                  </button>
                )}
                {(request.status === "pending" || request.status === "in_progress") && (
                  <button
                    type="button"
                    disabled={busy === request.id}
                    onClick={() => void updateRequest(request.id, "completed")}
                    className="rounded-full bg-accent px-3 py-1.5 text-xs text-accent-foreground"
                  >
                    Complete
                  </button>
                )}
                {(request.status === "pending" || request.status === "in_progress") && (
                  <button
                    type="button"
                    disabled={busy === request.id}
                    onClick={() => void updateRequest(request.id, "rejected")}
                    className="rounded-full border border-destructive/50 px-3 py-1.5 text-xs text-destructive"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))}
          {!requests.length && (
            <p className="py-4 text-sm text-muted-foreground">No pending privacy requests.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------- Support --------------------------------------------------
type SupportItem = {
  id: string;
  subject: string;
  message: string;
  reply_to_email?: string | null;
  screenshot_name?: string | null;
  status: string;
  created_at: string;
  profile?: {
    username?: string;
    emoji?: string;
    plan?: string | null;
    premium_until?: string | null;
    is_test_user?: boolean | null;
    test_user_until?: string | null;
  } | null;
};

function isSupportPremium(profile?: SupportItem["profile"] | null) {
  if (!profile) return false;
  const premiumUntil = profile.premium_until ? new Date(profile.premium_until).getTime() : 0;
  const premiumActive = profile.plan === "premium" && (!premiumUntil || premiumUntil > Date.now());
  return premiumActive || isLabThingActive(profile);
}

function SupportPanel() {
  const list = useServerFn(adminListSupportRequests);
  const update = useServerFn(adminUpdateSupportRequest);
  const [items, setItems] = useState<SupportItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const reload = async () => {
    const result = await list({ data: { status: "open" } });
    setItems(result.items as SupportItem[]);
  };
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateOne = async (item: SupportItem, status: "in_progress" | "resolved") => {
    if (status === "resolved" && item.reply_to_email && !emailSent) {
      toast.error("Send the reply to the contact email first, then confirm it below.");
      return;
    }
    setBusy(item.id);
    const result = await update({
      data: {
        request_id: item.id,
        status,
        title: "Reply from SameThing Support",
        body: status === "resolved" && reply.trim() ? reply.trim() : "",
        email_sent: status === "resolved" && emailSent,
      },
    });
    setBusy(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(
        status === "resolved" ? "Support request resolved." : "Support request started.",
      );
      setReply("");
      setEmailSent(false);
      setReplyId(null);
      await reload();
    }
  };

  return (
    <Card title={`Support · ${items.length} open`}>
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-border bg-background/40 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-accent">{item.subject}</p>
                <p className="mt-1 text-sm text-foreground">{item.message}</p>
                {item.reply_to_email && (
                  <a
                    href={`mailto:${encodeURIComponent(item.reply_to_email)}?subject=${encodeURIComponent(`SameThing support: ${item.subject}`)}`}
                    className="mt-2 inline-flex text-xs text-accent underline underline-offset-4"
                  >
                    Reply by email: {item.reply_to_email}
                  </a>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>
                    @{item.profile?.username ?? "unknown"} ·{" "}
                    {new Date(item.created_at).toLocaleString()}
                    {item.screenshot_name ? ` · screenshot: ${item.screenshot_name}` : ""}
                  </span>
                  {isSupportPremium(item.profile) && (
                    <span className="rounded-full bg-[color:var(--rare)]/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[color:var(--rare)]">
                      {item.profile?.is_test_user ? "LabThing." : "PremiumThing."}
                    </span>
                  )}
                </div>
              </div>
              <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-widest text-amber-700 dark:text-amber-300">
                {item.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.status === "open" && (
                <button
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => void updateOne(item, "in_progress")}
                  className="rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  Start
                </button>
              )}
              <button
                type="button"
                disabled={busy === item.id}
                onClick={() => {
                  setReplyId((current) => (current === item.id ? null : item.id));
                  setReply("");
                  setEmailSent(false);
                }}
                className="rounded-full border border-accent/50 px-3 py-1.5 text-xs text-accent disabled:opacity-50"
              >
                Reply & resolve
              </button>
            </div>
            {replyId === item.id && (
              <div className="mt-3 space-y-2 rounded-xl border border-accent/30 bg-card p-3">
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value.slice(0, 2000))}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                  placeholder={
                    item.reply_to_email
                      ? "Write the reply you will send by email…"
                      : "Write a reply for the user's inbox…"
                  }
                />
                {item.reply_to_email && (
                  <>
                    <a
                      href={`mailto:${encodeURIComponent(item.reply_to_email)}?subject=${encodeURIComponent(`SameThing support: ${item.subject}`)}&body=${encodeURIComponent(reply)}`}
                      className="inline-flex rounded-full border border-border px-3 py-1.5 text-xs text-foreground hover:border-accent"
                    >
                      Open email draft
                    </a>
                    <label className="flex items-start gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={emailSent}
                        onChange={(event) => setEmailSent(event.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[color:var(--accent)]"
                      />
                      I sent this reply to the contact email above.
                    </label>
                  </>
                )}
                <button
                  type="button"
                  disabled={
                    busy === item.id || !reply.trim() || Boolean(item.reply_to_email && !emailSent)
                  }
                  onClick={() => void updateOne(item, "resolved")}
                  className="rounded-full bg-accent px-3 py-1.5 text-xs text-accent-foreground disabled:opacity-50"
                >
                  {item.reply_to_email
                    ? "Confirm email & notify inbox"
                    : "Resolve and notify inbox"}
                </button>
              </div>
            )}
          </article>
        ))}
        {!items.length && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No open Support requests.
          </p>
        )}
      </div>
    </Card>
  );
}

// ---------- Feedback ----------
function FeedbackPanel() {
  const list = useServerFn(adminListFeedback);
  const reply = useServerFn(adminReplyFeedback);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [items, setItems] = useState<
    Array<{
      id: string;
      message: string;
      user_id: string | null;
      created_at: string;
      replied_at: string | null;
      user: { username: string; emoji: string } | null;
    }>
  >([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const reload = () =>
    list({ data: { onlyOpen, limit: 50, offset: 0 } }).then((r) => setItems(r.items as never));
  useEffect(() => {
    reload(); /* eslint-disable-next-line */
  }, [onlyOpen]);
  return (
    <div className="space-y-4">
      <Card title="User feedback">
        <label className="mb-3 flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
          />
          Only unanswered
        </label>
        <ul className="divide-y">
          {items.map((f) => (
            <li key={f.id} className="py-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {f.user ? `${f.user.emoji} @${f.user.username}` : "Anonymous"} ·{" "}
                  {new Date(f.created_at).toLocaleString()}
                </span>
                {f.replied_at && (
                  <span className="text-green-600">
                    Replied {new Date(f.replied_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{f.message}</p>
              {f.user_id && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={drafts[f.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                    placeholder="Reply as system message…"
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
                  />
                  <button
                    disabled={!drafts[f.id]?.trim()}
                    onClick={async () => {
                      const r = await reply({
                        data: { feedback_id: f.id, message: drafts[f.id].trim() },
                      });
                      if (r.ok) {
                        toast.success("Reply sent.");
                        setDrafts((d) => ({ ...d, [f.id]: "" }));
                        reload();
                      } else toast.error(r.error ?? "Failed.");
                    }}
                    className="rounded-md bg-accent px-3 py-1 text-xs text-accent-foreground disabled:opacity-50"
                  >
                    Send reply
                  </button>
                </div>
              )}
            </li>
          ))}
          {!items.length && (
            <li className="py-6 text-center text-sm text-muted-foreground">No feedback.</li>
          )}
        </ul>
      </Card>
      <AdsPanel />
    </div>
  );
}

// ---------- In-app feedback prompt ----------
type FeedbackPromptItem = {
  id: string;
  title: string;
  body: string;
  button_label: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  response_count: number;
  average_rating: number | null;
};

function AdsPanel() {
  const list = useServerFn(adminListFeedbackPrompts);
  const listResponses = useServerFn(adminListFeedbackPromptResponses);
  const save = useServerFn(adminUpsertFeedbackPrompt);
  const [items, setItems] = useState<FeedbackPromptItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Send feedback");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [responsesFor, setResponsesFor] = useState<string | null>(null);
  const [responses, setResponses] = useState<
    Array<{
      id: string;
      rating: number;
      comment: string | null;
      username: string | null;
      created_at: string;
    }>
  >([]);
  const [responsesBusy, setResponsesBusy] = useState(false);

  const load = () =>
    list()
      .then((result) => {
        if (result.error) toast.error(result.error);
        setItems(result.items as FeedbackPromptItem[]);
      })
      .catch(() => toast.error("Ads could not be loaded."));

  useEffect(() => {
    load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const clearForm = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setButtonLabel("Send feedback");
    setActive(true);
  };

  const edit = (item: FeedbackPromptItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setBody(item.body);
    setButtonLabel(item.button_label);
    setActive(item.active);
  };

  const showResponses = async (item: FeedbackPromptItem) => {
    setResponsesFor(item.id);
    setResponsesBusy(true);
    const result = await listResponses({ data: { prompt_id: item.id } });
    setResponsesBusy(false);
    if (result.error) {
      toast.error(result.error);
      setResponses([]);
      return;
    }
    setResponses(result.items as typeof responses);
  };

  const submit = async () => {
    setBusy(true);
    const result = await save({
      data: {
        id: editingId,
        title,
        body,
        button_label: buttonLabel,
        active,
      },
    });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(active ? "Feedback prompt is live." : "Feedback prompt saved as draft.");
    clearForm();
    load();
  };

  return (
    <div className="space-y-4">
      <Card title="In-app feedback prompts">
        <p className="mb-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          Manage the small feedback form shown at the bottom of the app. Users can choose one to
          five stars and leave an optional comment. Only one prompt can be live at a time.
        </p>
        <div className="grid gap-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, 120))}
            placeholder="Prompt title"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, 1000))}
            placeholder="What should users see?"
            rows={4}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <input
              value={buttonLabel}
              onChange={(event) => setButtonLabel(event.target.value.slice(0, 40))}
              placeholder="Button label"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              Publish now
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={busy || title.trim().length < 3 || body.trim().length < 3}
              onClick={() => void submit()}
              className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground disabled:opacity-50"
            >
              {busy
                ? "Saving…"
                : editingId
                  ? "Update prompt"
                  : active
                    ? "Publish prompt"
                    : "Save draft"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={clearForm}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel edit
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card title={`Prompt archive · ${items.length}`}>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-border bg-background/40 p-3 transition-colors hover:border-accent/50"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.active ? "bg-accent" : "bg-muted-foreground/30"}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-serif text-base text-foreground">{item.title}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {item.response_count} responses
                      {item.average_rating ? ` · ${item.average_rating.toFixed(1)}/5` : ""}
                    </span>
                  </div>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {item.body}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => edit(item)}
                  className="rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:border-accent/50 hover:text-foreground"
                >
                  Edit prompt
                </button>
                <button
                  type="button"
                  onClick={() => void showResponses(item)}
                  className="rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:border-accent/50 hover:text-foreground"
                >
                  View responses
                </button>
              </div>
            </div>
          ))}
          {!items.length && (
            <p className="py-5 text-center text-sm text-muted-foreground">No prompts yet.</p>
          )}
        </div>
      </Card>

      {responsesFor && (
        <Card title={`Responses · ${responses.length}`}>
          {responsesBusy ? (
            <p className="py-5 text-sm text-muted-foreground">Loading responses…</p>
          ) : responses.length ? (
            <div className="space-y-2">
              {responses.map((response) => (
                <div
                  key={response.id}
                  className="rounded-2xl border border-border bg-background/40 p-3"
                >
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{response.username ? `@${response.username}` : "Deleted account"}</span>
                    <span>
                      {"★".repeat(response.rating)}
                      {"☆".repeat(5 - response.rating)}
                    </span>
                  </div>
                  {response.comment && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {response.comment}
                    </p>
                  )}
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                    {new Date(response.created_at).toLocaleString("en-US")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-5 text-sm text-muted-foreground">No responses yet.</p>
          )}
        </Card>
      )}
    </div>
  );
}

// ---------- Research API access requests ----------
type ApiAccessRequestItem = {
  id: string;
  applicant_name: string;
  email: string;
  organization: string | null;
  use_case: string;
  requested_scopes: string[];
  expected_volume: "pilot" | "standard" | "bulk";
  status: "pending" | "reviewing" | "approved" | "waitlist" | "declined";
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type ApiKeyItem = {
  id: string;
  request_id: string;
  name: string;
  applicant_name: string;
  email: string;
  organization: string | null;
  key_prefix: string;
  scopes: string[];
  rate_plan: "pilot" | "standard" | "bulk";
  created_at: string;
  last_used_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
};

function ApiAccessPanel() {
  const list = useServerFn(adminListApiAccessRequests);
  const update = useServerFn(adminUpdateApiAccessRequest);
  const listKeys = useServerFn(adminListApiKeys);
  const revokeKey = useServerFn(adminRevokeApiKey);
  const [items, setItems] = useState<ApiAccessRequestItem[]>([]);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [drafts, setDrafts] = useState<
    Record<string, { status: ApiAccessRequestItem["status"]; admin_note: string }>
  >({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadKeys = () =>
    listKeys()
      .then((result) => {
        if (result.error) toast.error(result.error);
        setKeys(result.items as ApiKeyItem[]);
      })
      .catch(() => toast.error("API keys could not be loaded."));

  const load = () =>
    list()
      .then((result) => {
        if (result.error) toast.error(result.error);
        const next = result.items as ApiAccessRequestItem[];
        setItems(next);
        setDrafts(
          Object.fromEntries(
            next.map((item) => [
              item.id,
              { status: item.status, admin_note: item.admin_note ?? "" },
            ]),
          ),
        );
      })
      .catch(() => toast.error("API access requests could not be loaded."));

  useEffect(() => {
    load();
    loadKeys(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const save = async (item: ApiAccessRequestItem) => {
    const draft = drafts[item.id];
    if (!draft) return;
    setBusyId(item.id);
    const result = await update({
      data: { id: item.id, status: draft.status, admin_note: draft.admin_note },
    });
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("API access request updated.");
    load();
    loadKeys();
  };

  const revokeKeyFromPanel = async (item: ApiKeyItem) => {
    if (!window.confirm(`Revoke ${item.key_prefix}? Existing requests will stop working.`)) return;
    setBusyId(`revoke:${item.id}`);
    const result = await revokeKey({ data: { id: item.id } });
    setBusyId(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("API key revoked.");
      loadKeys();
    }
  };

  return (
    <div className="space-y-4">
      <Card title={`API access requests · ${items.length}`}>
        <p className="mb-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          Review researcher applications. Approving a signed-in workspace request automatically
          issues its scoped key to that workspace; the secret is never shown in Admin. Keep the
          first pilot read-only and limited to approved public projections.
        </p>
        <div className="space-y-3">
          {items.map((item) => {
            const draft = drafts[item.id] ?? {
              status: item.status,
              admin_note: item.admin_note ?? "",
            };
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-border bg-background/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-foreground">{item.applicant_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.email}
                      {item.organization ? ` · ${item.organization}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {item.expected_volume} · {new Date(item.created_at).toLocaleDateString("en-US")}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {item.use_case}
                </p>
                <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Scope: {item.requested_scopes.join(" · ")}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-start">
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [item.id]: {
                          ...draft,
                          status: event.target.value as ApiAccessRequestItem["status"],
                        },
                      }))
                    }
                    className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                  >
                    {(["pending", "reviewing", "approved", "waitlist", "declined"] as const).map(
                      (status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ),
                    )}
                  </select>
                  <textarea
                    value={draft.admin_note}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [item.id]: { ...draft, admin_note: event.target.value.slice(0, 2000) },
                      }))
                    }
                    rows={2}
                    placeholder="Internal note"
                    className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void save(item)}
                      className="rounded-full bg-accent px-3 py-2 text-xs font-medium text-accent-foreground disabled:opacity-50"
                    >
                      {busyId === item.id ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {!items.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No API access requests yet.
            </p>
          )}
        </div>
      </Card>
      <Card title={`Issued API keys · ${keys.length}`}>
        <p className="mb-4 text-sm leading-6 text-muted-foreground">
          Secrets are never stored in readable form. This table shows only safe metadata; revoke a
          key immediately if the company loses control of it.
        </p>
        <div className="space-y-2">
          {keys.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-background/40 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-foreground">{item.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {item.key_prefix}… · {item.applicant_name}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-widest ${item.revoked_at ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"}`}
                >
                  {item.revoked_at ? "revoked" : item.rate_plan}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{item.scopes.join(" · ")}</p>
              <div className="mt-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>
                  Created {new Date(item.created_at).toLocaleDateString("en-US")}
                  {item.last_used_at
                    ? ` · Last used ${new Date(item.last_used_at).toLocaleDateString("en-US")}`
                    : ""}
                </span>
                {!item.revoked_at && (
                  <button
                    type="button"
                    disabled={busyId === `revoke:${item.id}`}
                    onClick={() => void revokeKeyFromPanel(item)}
                    className="rounded-full border border-destructive/40 px-3 py-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    {busyId === `revoke:${item.id}` ? "Revoking…" : "Revoke"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {!keys.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">No issued keys yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------- system messages ----------
function MessagesPanel() {
  const send = useServerFn(adminSendSystemMessage);
  const [mode, setMode] = useState<"user" | "broadcast">("user");
  const [username, setUsername] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card title="Send system message">
      <div className="mb-3 flex gap-2 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === "user"} onChange={() => setMode("user")} /> To user
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={mode === "broadcast"}
            onChange={() => setMode("broadcast")}
          />{" "}
          Broadcast to all
        </label>
      </div>
      {mode === "user" && (
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@username (without @)"
          className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      )}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        placeholder="Body"
        className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Optional link (e.g. /faq)"
        className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <button
        disabled={busy || !title.trim() || !body.trim() || (mode === "user" && !username.trim())}
        onClick={async () => {
          setBusy(true);
          const r = await send({
            data: {
              broadcast: mode === "broadcast",
              recipient_username: mode === "user" ? username.trim() : undefined,
              title: title.trim(),
              body: body.trim(),
              link: link.trim() || undefined,
            },
          });
          setBusy(false);
          if (r.ok) {
            toast.success(`Sent to ${r.count ?? 1} user(s).`);
            setTitle("");
            setBody("");
            setLink("");
          } else toast.error(r.error ?? "Failed.");
        }}
        className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send [System] message"}
      </button>
    </Card>
  );
}

// ---------- Banned words ----------
function BannedPanel() {
  const list = useServerFn(adminListBannedWords);
  const add = useServerFn(adminAddBannedWord);
  const del = useServerFn(adminDeleteBannedWord);
  const [items, setItems] = useState<Array<{ id: string; word: string; severity: string }>>([]);
  const [word, setWord] = useState("");
  const [severity, setSeverity] = useState<"warn" | "block">("warn");
  const reload = () => list().then((r) => setItems(r.items));
  useEffect(() => {
    reload(); /* eslint-disable-next-line */
  }, []);
  return (
    <Card title="Forbidden words">
      <p className="mb-3 text-xs text-muted-foreground">
        "warn" sends a system message to the user but the post goes through. "block" additionally
        prevents the post/comment from being saved.
      </p>
      <div className="mb-4 flex gap-2">
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="word or phrase"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as "warn" | "block")}
          className="rounded-md border border-border bg-background px-2 py-2 text-sm"
        >
          <option value="warn">warn</option>
          <option value="block">block</option>
        </select>
        <button
          disabled={!word.trim()}
          onClick={async () => {
            const r = await add({ data: { word: word.trim(), severity } });
            if (r.ok) {
              setWord("");
              reload();
            } else toast.error(r.error ?? "Failed.");
          }}
          className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <ul className="divide-y">
        {items.map((b) => (
          <li key={b.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {b.word}{" "}
              <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase">
                {b.severity}
              </span>
            </span>
            <button
              onClick={async () => {
                await del({ data: { id: b.id } });
                reload();
              }}
              className="text-xs text-destructive hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
        {!items.length && (
          <li className="py-6 text-center text-muted-foreground">Nothing banned yet.</li>
        )}
      </ul>
    </Card>
  );
}

type MaintenanceTargetView = {
  key: string;
  target_type: "page" | "feature";
  path: string | null;
  label: string;
  description: string;
  enabled: boolean;
  note: string | null;
  updated_at: string | null;
};

function MaintenancePanel() {
  const getStatus = useServerFn(adminGetMaintenanceStatus);
  const setMode = useServerFn(adminSetMaintenanceMode);
  const setTargets = useServerFn(adminSetMaintenanceTargets);
  const [enabled, setEnabled] = useState(false);
  const [note, setNote] = useState("");
  const [targets, setTargetsState] = useState<MaintenanceTargetView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<MaintenanceTargetView | null>(null);
  const [targetNote, setTargetNote] = useState("");
  const [pendingGlobal, setPendingGlobal] = useState(false);

  const applyStatus = (status: {
    enabled: boolean;
    note: string | null;
    targets: MaintenanceTargetView[];
  }) => {
    setEnabled(status.enabled);
    setNote(status.note ?? "");
    setTargetsState(status.targets ?? []);
  };

  useEffect(() => {
    getStatus()
      .then(applyStatus)
      .catch(() => toast.error("Maintenance status could not be loaded."))
      .finally(() => setLoading(false));
  }, [getStatus]);

  const updateMode = async () => {
    const nextEnabled = !enabled;
    if (nextEnabled) {
      setPendingGlobal(true);
      return;
    }
    setBusy(true);
    try {
      applyStatus(await setMode({ data: { enabled: false, note: note.trim() || null } }));
      toast.success("Maintenance is off.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Maintenance could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  const confirmGlobalMode = async () => {
    setBusy(true);
    try {
      applyStatus(await setMode({ data: { enabled: true, note: note.trim() || null } }));
      setPendingGlobal(false);
      toast.success("Maintenance is on for all user-facing pages.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Maintenance could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  const askTargetChange = (target: MaintenanceTargetView) => {
    setPendingTarget(target);
    setTargetNote(target.note ?? "");
  };

  const confirmTargetChange = async () => {
    if (!pendingTarget) return;
    const nextEnabled = !pendingTarget.enabled;
    setBusy(true);
    try {
      const status = await setTargets({
        data: {
          targets: targets.map((target) => ({
            key: target.key,
            target_type: target.target_type,
            path: target.path,
            label: target.label,
            description: target.description,
            enabled: target.key === pendingTarget.key ? nextEnabled : target.enabled,
            note: target.key === pendingTarget.key ? targetNote.trim() || null : target.note,
          })),
        },
      });
      applyStatus(status);
      setPendingTarget(null);
      toast.success(
        `${pendingTarget.label} ${nextEnabled ? "is under maintenance." : "is live again."}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Page maintenance status could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="relative max-w-3xl rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-accent/30 bg-[#f4efe6] p-0">
          <img src="/pp-logo.png" alt="SameThing." className="h-full w-full object-contain" />
        </div>
        <div>
          <h2 className="text-lg font-medium">Maintenance</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Pause the whole room or only the pages that need a little quiet work. The admin area
            always stays available.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-background/60 p-3">
        <div className="min-w-0 pr-3">
          <p className="text-sm font-medium">All user-facing pages</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {loading
              ? "Checking…"
              : enabled
                ? "Every page is paused except Admin."
                : "Site is live."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void updateMode()}
          disabled={loading || busy}
          aria-pressed={enabled}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-1 transition-colors duration-150 disabled:opacity-50 ${enabled ? "border-accent bg-accent" : "border-border bg-secondary"}`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-foreground transition-transform duration-150 ${enabled ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
      </div>

      <label className="mt-4 block">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Visitor message (optional)
        </span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 500))}
          placeholder="We’re making a few careful improvements. Please check back soon."
          className="mt-2 min-h-20 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-accent"
        />
      </label>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Selected pages
          </p>
          <p className="mt-1 text-sm text-foreground">Settings areas you can pause one by one</p>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          {targets.filter((target) => target.enabled).length} active
        </span>
      </div>

      <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
        {targets.map((target) => (
          <button
            key={target.key}
            type="button"
            onClick={() => askTargetChange(target)}
            disabled={loading || busy}
            aria-pressed={target.enabled}
            className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-secondary/70 disabled:cursor-not-allowed ${target.enabled ? "opacity-50" : ""}`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${target.enabled ? "border-accent/30 bg-accent/10 text-accent" : "border-border bg-background text-muted-foreground"}`}
            >
              {target.enabled ? (
                <Check className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{target.label}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {target.description}
              </span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {target.enabled ? "paused" : "live"}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-border bg-background/40 p-3">
        <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Settings2 className="h-3.5 w-3.5 text-accent" /> Always open for now
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Support / Feedback, Account & privacy, Subscription & payment, and Appearance stay live in
          this first page-by-page release.
        </p>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Admin remains exempt. You can pause multiple selected pages at once; a paused page shows a
        maintenance notice while the rest of the site stays live.
      </p>

      {(pendingTarget || pendingGlobal) && (
        <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-background/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-accent/25 bg-card p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                <CircleAlert className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {pendingGlobal
                    ? "Pause the whole room?"
                    : `${pendingTarget?.label} · Maintenance`}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {pendingGlobal
                    ? "Every user-facing page will show a maintenance notice. Only authorised Admin access will remain available."
                    : `${pendingTarget?.label} will show a maintenance notice while the other selected pages stay live.`}
                </p>
              </div>
            </div>
            <label className="mt-4 block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Message for visitors
              </span>
              <textarea
                value={pendingGlobal ? note : targetNote}
                onChange={(event) =>
                  pendingGlobal
                    ? setNote(event.target.value.slice(0, 500))
                    : setTargetNote(event.target.value.slice(0, 500))
                }
                placeholder="We’re making a few careful improvements. Please check back soon."
                className="mt-2 min-h-20 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-accent"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingTarget(null);
                  setPendingGlobal(false);
                }}
                disabled={busy}
                className="rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                Keep live
              </button>
              <button
                type="button"
                onClick={() => void (pendingGlobal ? confirmGlobalMode() : confirmTargetChange())}
                disabled={busy}
                className="rounded-xl bg-accent px-3 py-2 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy
                  ? "Saving…"
                  : pendingGlobal
                    ? "Pause all pages"
                    : pendingTarget?.enabled
                      ? "Return page"
                      : "Pause page"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

type AdminTestUserApplication = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  reason: string | null;
  test_areas: string | null;
  status: "submitted" | "reviewing" | "approved" | "declined" | "revoked";
  approved_duration_days: number | null;
  decision_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  profile: {
    username: string;
    emoji: string;
    gender: string | null;
    age_range: string | null;
    plan: string;
    premium_until: string | null;
    is_test_user: boolean;
    test_user_until: string | null;
    test_user_label: string | null;
    same_credits: number;
    same_credits_unlimited: boolean;
  } | null;
};

function TestUsersAdminPanel() {
  const listFn = useServerFn(adminListTestUserApplications);
  const reviewFn = useServerFn(adminReviewTestUserApplication);
  const [status, setStatus] = useState<"all" | AdminTestUserApplication["status"]>("submitted");
  const [items, setItems] = useState<AdminTestUserApplication[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [duration, setDuration] = useState<"7" | "14" | "30" | "custom">("30");
  const [customDays, setCustomDays] = useState("21");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const result = await listFn({ data: { status } });
      setItems(result.items as AdminTestUserApplication[]);
    } catch {
      toast.error("Could not load Test User applications.");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const durationDays = duration === "custom" ? Number.parseInt(customDays, 10) : Number(duration);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  const review = async (nextStatus: "reviewing" | "approved" | "declined" | "revoked") => {
    if (!selected) return;
    if (
      nextStatus === "approved" &&
      (!Number.isInteger(durationDays) || durationDays < 7 || durationDays > 30)
    ) {
      toast.error("Choose a duration between 7 and 30 days.");
      return;
    }
    setBusy(true);
    const result = await reviewFn({
      data: {
        application_id: selected.id,
        status: nextStatus,
        duration_days: nextStatus === "approved" ? durationDays : null,
        decision_note: note.trim(),
      },
    });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      nextStatus === "approved"
        ? "LabThing. access approved."
        : nextStatus === "declined"
          ? "Test User application declined."
          : nextStatus === "revoked"
            ? "LabThing. access revoked."
            : "Application marked as reviewing.",
    );
    setNote("");
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
            <FlaskConical className="h-4 w-4" /> pilot access
          </p>
          <h2 className="mt-1 text-2xl font-medium text-foreground">Lab</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review Lab applications, select a time window and manage LabThing. access. Approved
            users receive PremiumThing. and unlimited Same Credits for the selected pilot period.
          </p>
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="submitted">Submitted</option>
          <option value="reviewing">Reviewing</option>
          <option value="approved">Approved</option>
          <option value="declined">Declined</option>
          <option value="revoked">Revoked</option>
          <option value="all">All applications</option>
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card title={`Applications · ${items.length}`}>
          <div className="space-y-2">
            {items.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${active ? "border-accent/60 bg-accent/10" : "border-border bg-background/35 hover:border-accent/35"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background text-lg">
                        <ProfileGlyph value={item.profile?.emoji ?? "✦"} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-foreground">
                          {item.first_name} {item.last_name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          @{item.profile?.username ?? "account unavailable"}
                        </span>
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <span>Age · {item.profile?.age_range || "not provided"}</span>
                    <span>Gender · {item.profile?.gender || "not provided"}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {item.test_areas || item.reason || "No optional details provided."}
                  </p>
                </button>
              );
            })}
            {!items.length && (
              <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No applications in this view.
              </p>
            )}
          </div>
        </Card>

        <Card
          title={
            selected
              ? `Review · @${selected.profile?.username ?? "unknown"}`
              : "Select an application"
          }
        >
          {!selected ? (
            <div className="flex min-h-56 flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <FlaskConical className="mb-3 h-7 w-7 text-accent/70" />
              Choose an application to view the full request and manage access.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-background/45 p-4">
                <p className="text-sm text-foreground">
                  {selected.first_name} {selected.last_name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Applied {new Date(selected.created_at).toLocaleString("en-US")}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="uppercase tracking-widest text-muted-foreground">Age</p>
                    <p className="mt-1 text-foreground">
                      {selected.profile?.age_range || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-widest text-muted-foreground">Gender</p>
                    <p className="mt-1 text-foreground">
                      {selected.profile?.gender || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-widest text-muted-foreground">Plan</p>
                    <p className="mt-1 text-foreground">{selected.profile?.plan || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-widest text-muted-foreground">Credits</p>
                    <p className="mt-1 text-foreground">
                      {selected.profile?.same_credits_unlimited
                        ? "∞ unlimited"
                        : (selected.profile?.same_credits ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Why</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {selected.reason || "Not provided."}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Test interests
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {selected.test_areas || "Not provided."}
                </p>
              </div>
              {selected.status === "approved" && (
                <div className="rounded-2xl border border-accent/30 bg-accent/5 p-3 text-xs leading-5 text-muted-foreground">
                  <p className="text-foreground">LabThing. access is active.</p>
                  <p className="mt-1">
                    {selected.approved_duration_days
                      ? `${selected.approved_duration_days} days from approval.`
                      : "No end date; revoke manually when the pilot ends."}
                  </p>
                </div>
              )}
              <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                Decision note
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 1200))}
                  placeholder="Optional note sent to the applicant"
                  className="mt-1.5 min-h-20 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal text-foreground outline-none focus:border-accent/60"
                />
              </label>
              {(selected.status === "submitted" || selected.status === "reviewing") && (
                <>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Approved access window
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(["7", "14", "30", "custom"] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setDuration(option)}
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${duration === option ? "border-accent bg-accent/15 text-accent" : "border-border text-muted-foreground hover:border-accent/40"}`}
                        >
                          {option === "custom" ? "Custom (7–30)" : `${option} days`}
                          {option === "30" ? " · Max" : ""}
                        </button>
                      ))}
                    </div>
                    {duration === "custom" && (
                      <input
                        type="number"
                        min={7}
                        max={30}
                        value={customDays}
                        onChange={(event) => setCustomDays(event.target.value)}
                        className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent/60"
                        placeholder="7–30 days"
                      />
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void review("reviewing")}
                      className="rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:border-accent/40 hover:text-foreground disabled:opacity-50"
                    >
                      Mark reviewing
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void review("declined")}
                      className="rounded-xl border border-destructive/35 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void review("approved")}
                      className="rounded-xl bg-accent px-3 py-2 text-xs text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                    >
                      Approve LabThing.
                    </button>
                  </div>
                </>
              )}
              {selected.status === "approved" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review("revoked")}
                  className="w-full rounded-xl border border-destructive/35 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  Revoke LabThing. access
                </button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
