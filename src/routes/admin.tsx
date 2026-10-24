import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  adminLogin, adminStatus, adminLogout, adminOverview,
  adminListUsers, adminUserDetail, adminBanUser, adminSetPlan,
  adminWarnUser,
  adminListThings, adminHideThing, adminDeleteThing,
  adminListFeedback, adminReplyFeedback,
  adminSendSystemMessage,
  adminListBannedWords, adminAddBannedWord, adminDeleteBannedWord,
} from "@/lib/api/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin · SameThing." }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

type Tab = "overview" | "users" | "things" | "feedback" | "messages" | "banned";

function AdminPage() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const statusFn = useServerFn(adminStatus);
  const logoutFn = useServerFn(adminLogout);

  useEffect(() => { statusFn().then((r) => setUnlocked(r.unlocked)).catch(() => setUnlocked(false)); }, [statusFn]);

  if (unlocked === null) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!unlocked) return <LoginScreen onOk={() => setUnlocked(true)} />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="brand-mark text-xl text-foreground">SameThing · Admin<span className="dot">.</span></h1>
          <button
            className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary"
            onClick={async () => { await logoutFn(); setUnlocked(false); }}
          >Sign out</button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2 text-sm">
          {(["overview","users","things","feedback","messages","banned"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={"whitespace-nowrap rounded-full px-3 py-1.5 text-xs uppercase tracking-widest transition-colors " + (tab === t ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}
            >{t}</button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "overview" && <Overview />}
        {tab === "users" && <UsersPanel />}
        {tab === "things" && <ThingsPanel />}
        {tab === "feedback" && <FeedbackPanel />}
        {tab === "messages" && <MessagesPanel />}
        {tab === "banned" && <BannedPanel />}
      </main>
    </div>
  );
}

function LoginScreen({ onOk }: { onOk: () => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const login = useServerFn(adminLogin);
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-6">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true); setErr(null);
          const r = await login({ data: { password: pw } });
          setBusy(false);
          if (r.ok) onOk(); else setErr(r.error ?? "Login failed.");
        }}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow"
      >
        <h1 className="text-center text-xl font-bold">Admin access</h1>
        <p className="text-center text-xs text-muted-foreground">This area is restricted.</p>
        <input
          autoFocus type="password" value={pw} onChange={(e) => setPw(e.target.value)}
          placeholder="Admin password"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <button disabled={busy || !pw} type="submit"
          className="w-full rounded-md bg-accent py-2 text-sm font-medium text-accent-foreground disabled:opacity-50">
          {busy ? "Verifying…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

// ---------- Overview ----------
function Overview() {
  const fn = useServerFn(adminOverview);
  const [d, setD] = useState<Awaited<ReturnType<typeof adminOverview>> | null>(null);
  useEffect(() => { fn().then(setD).catch(() => {}); }, [fn]);
  if (!d) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const items: Array<[string, number]> = [
    ["Users", d.users], ["Premium", d.premium], ["Banned", d.banned],
    ["Things", d.things], ["Comments", d.comments], ["Votes", d.votes], ["Feedback", d.feedback],
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
type UserRow = { id: string; username: string; emoji: string; plan: string; language: string; created_at: string; warnings_count: number; banned_at: string | null; rare_thing_count: number; gender: string | null; age_range: string | null };

function UsersPanel() {
  const list = useServerFn(adminListUsers);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const reload = () => { list({ data: { q: q.trim() || undefined, limit: 50, offset: 0 } }).then((r) => { setRows(r.items as UserRow[]); setTotal(r.total); }); };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);
  return (
    <>
      <Card title={`Users (${total})`}>
        <div className="mb-3 flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username…"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") reload(); }} />
          <button onClick={reload} className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">Search</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">User</th><th>Plan</th><th>Warn</th><th>Rare</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className={"border-t border-border " + (u.banned_at ? "bg-destructive/10" : "")}>
                  <td className="py-2">
                    <span className="mr-1">{u.emoji}</span>@{u.username}
                    {u.banned_at && <span className="ml-2 rounded bg-destructive px-1.5 py-0.5 text-[10px] text-accent-foreground">BANNED</span>}
                  </td>
                  <td>{u.plan}</td>
                  <td>{u.warnings_count}</td>
                  <td>{u.rare_thing_count}</td>
                  <td className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td><button onClick={() => setSelected(u.id)} className="text-xs text-accent hover:underline">View</button></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No users.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {selected && <UserDetail id={selected} onClose={() => { setSelected(null); reload(); }} />}
    </>
  );
}

function UserDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const fn = useServerFn(adminUserDetail);
  const banFn = useServerFn(adminBanUser);
  const planFn = useServerFn(adminSetPlan);

  const warnFn = useServerFn(adminWarnUser);
  const [d, setD] = useState<Awaited<ReturnType<typeof adminUserDetail>> | null>(null);
  const [warnNote, setWarnNote] = useState("");
  const load = () => fn({ data: { id } }).then(setD);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  if (!d) return <Card title="User detail">Loading…</Card>;
  const p = d.profile as (Record<string, unknown> | null);
  const isBanned = !!(p?.banned_at);
  return (
    <Card title={`User · @${(p?.username as string) ?? "?"}`}>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onClose} className="text-xs text-muted-foreground hover:underline">← Back to list</button>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const next = (p?.plan as string) === "premium" ? "free" : "premium";
              await planFn({ data: { id, plan: next as "free" | "premium" } });
              toast.success(next === "premium" ? "PremiumThing. granted." : "PremiumThing. removed.");
              load();
            }}
            className="rounded-md border border-[color:var(--rare)]/50 px-3 py-1.5 text-xs text-[color:var(--rare)]"
          >{(p?.plan as string) === "premium" ? "Remove Premium" : "Grant Premium"}</button>
          <button
            onClick={async () => {
              const reason = isBanned ? "" : (prompt("Ban reason?") ?? "");
              await banFn({ data: { id, reason, ban: !isBanned } });
              toast.success(isBanned ? "Unbanned." : "Banned.");
              load();
            }}
            className={"rounded-md px-3 py-1.5 text-xs " + (isBanned ? "border" : "bg-destructive text-accent-foreground")}
          >{isBanned ? "Unban" : "Ban"}</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Profile</h3>
          <ul className="space-y-1 text-sm">
            <li><b>Icon:</b> {p?.emoji as string}</li>
            <li><b>Bio:</b> {(p?.bio as string) ?? "—"}</li>
            <li><b>Gender:</b> {(p?.gender as string) ?? "—"}</li>
            <li><b>Age:</b> {(p?.age_range as string) ?? "—"}</li>
            <li><b>Plan:</b> {p?.plan as string}</li>
            <li><b>Language:</b> {p?.language as string}</li>
            <li><b>Warnings:</b> {p?.warnings_count as number}</li>
            <li><b>Rare things:</b> {p?.rare_thing_count as number}</li>
            {isBanned && <li className="text-destructive"><b>Banned:</b> {new Date(p!.banned_at as string).toLocaleString()} — {(p?.ban_reason as string) ?? ""}</li>}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Auth</h3>
          <ul className="space-y-1 text-sm">
            <li><b>Email:</b> {d.auth?.email ?? "—"}</li>
            <li><b>Phone:</b> {d.auth?.phone ?? "—"}</li>
            <li><b>Provider:</b> {d.auth?.provider ?? "—"}</li>
            <li><b>Signed up:</b> {d.auth ? new Date(d.auth.created_at).toLocaleString() : "—"}</li>
            <li><b>Last sign-in:</b> {d.auth?.last_sign_in_at ? new Date(d.auth.last_sign_in_at).toLocaleString() : "—"}</li>
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Top tags used</h3>
          <div className="flex flex-wrap gap-1">
            {d.tags.length ? d.tags.slice(0, 20).map((t) => (
              <span key={t.tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{t.tag} · {t.count}</span>
            )) : <span className="text-xs text-muted-foreground">None.</span>}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Send warning</h3>
          <textarea value={warnNote} onChange={(e) => setWarnNote(e.target.value)} rows={2}
            placeholder="Reason / note (goes to their inbox)"
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" />
          <button
            disabled={!warnNote.trim()}
            onClick={async () => { await warnFn({ data: { id, note: warnNote.trim() } }); toast.success("Warning sent."); setWarnNote(""); load(); }}
            className="mt-2 rounded-md bg-amber-500 px-3 py-1.5 text-xs text-accent-foreground disabled:opacity-50"
          >Send warning</button>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Things ({d.things.length})</h3>
        <ul className="space-y-1 text-sm">
          {d.things.slice(0, 20).map((t: { id: string; title: string; created_at: string; hidden: boolean; same_count: number; nah_count: number }) => (
            <li key={t.id} className="flex items-center justify-between border-b border-border py-1">
              <span className={t.hidden ? "text-muted-foreground line-through" : ""}>{t.title}</span>
              <span className="text-xs text-muted-foreground">{t.same_count}✓ / {t.nah_count}✗ · {new Date(t.created_at).toLocaleDateString()}</span>
            </li>
          ))}
          {!d.things.length && <li className="text-xs text-muted-foreground">None.</li>}
        </ul>
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recent comments ({d.comments.length})</h3>
        <ul className="space-y-1 text-sm">
          {d.comments.slice(0, 20).map((c: { id: string; text: string; created_at: string; hidden: boolean }) => (
            <li key={c.id} className={"border-b border-border py-1 " + (c.hidden ? "text-muted-foreground line-through" : "")}>
              {c.text} <span className="ml-2 text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
            </li>
          ))}
          {!d.comments.length && <li className="text-xs text-muted-foreground">None.</li>}
        </ul>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Vote history ({d.votes.length})</h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {d.votes.slice(0, 20).map((v: { id: string; vote_type: string; thing_id: string; created_at: string }) => (
              <li key={v.id}>{v.vote_type === "same" ? "Same" : "Nah"} on {v.thing_id.slice(0, 8)}… · {new Date(v.created_at).toLocaleDateString()}</li>
            ))}
            {!d.votes.length && <li>None.</li>}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Feedback sent ({d.feedback.length})</h3>
          <ul className="space-y-1 text-sm">
            {d.feedback.slice(0, 10).map((f: { id: string; message: string; created_at: string; replied_at: string | null }) => (
              <li key={f.id} className="border-b border-border py-1">
                {f.message}
                <span className="ml-2 text-[10px] text-muted-foreground">{new Date(f.created_at).toLocaleDateString()} {f.replied_at ? "· replied" : ""}</span>
              </li>
            ))}
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
  const [rows, setRows] = useState<Array<{ id: string; title: string; user_id: string; tags: string[]; created_at: string; hidden: boolean; same_count: number; nah_count: number; report_count: number; comment_count: number; is_anonymous: boolean; raw_text: string }>>([]);
  const [total, setTotal] = useState(0);
  const reload = () => { list({ data: { q: q.trim() || undefined, hiddenOnly, limit: 50, offset: 0 } }).then((r) => { setRows(r.items as never); setTotal(r.total); }); };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [hiddenOnly]);
  return (
    <Card title={`Things (${total})`}>
      <div className="mb-3 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title…"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          onKeyDown={(e) => { if (e.key === "Enter") reload(); }} />
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={hiddenOnly} onChange={(e) => setHidden(e.target.checked)} />Hidden only</label>
        <button onClick={reload} className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">Search</button>
      </div>
      <ul className="divide-y">
        {rows.map((t) => (
          <li key={t.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className={"font-medium " + (t.hidden ? "text-muted-foreground line-through" : "")}>{t.title}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.raw_text}</div>
                <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                  {t.tags?.map((tag) => <span key={tag} className="rounded-full bg-secondary px-1.5 py-0.5">{tag}</span>)}
                  <span>· {t.same_count}✓/{t.nah_count}✗</span>
                  <span>· {t.comment_count} comments</span>
                  <span>· reports: {t.report_count}</span>
                  <span>· {new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={async () => { await hide({ data: { id: t.id, hidden: !t.hidden } }); reload(); }}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary">{t.hidden ? "Unhide" : "Hide"}</button>
                <button onClick={async () => {
                  if (!confirm("Delete this thing and its comments/votes? Cannot be undone.")) return;
                  await del({ data: { id: t.id } }); toast.success("Deleted."); reload();
                }} className="rounded-md bg-destructive px-2 py-1 text-xs text-accent-foreground">Delete</button>
              </div>
            </div>
          </li>
        ))}
        {!rows.length && <li className="py-6 text-center text-sm text-muted-foreground">No things.</li>}
      </ul>
    </Card>
  );
}

// ---------- Feedback ----------
function FeedbackPanel() {
  const list = useServerFn(adminListFeedback);
  const reply = useServerFn(adminReplyFeedback);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [items, setItems] = useState<Array<{ id: string; message: string; user_id: string | null; created_at: string; replied_at: string | null; user: { username: string; emoji: string } | null }>>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const reload = () => list({ data: { onlyOpen, limit: 50, offset: 0 } }).then((r) => setItems(r.items as never));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [onlyOpen]);
  return (
    <Card title="User feedback">
      <label className="mb-3 flex items-center gap-1 text-xs"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />Only unanswered</label>
      <ul className="divide-y">
        {items.map((f) => (
          <li key={f.id} className="py-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{f.user ? `${f.user.emoji} @${f.user.username}` : "Anonymous"} · {new Date(f.created_at).toLocaleString()}</span>
              {f.replied_at && <span className="text-green-600">Replied {new Date(f.replied_at).toLocaleDateString()}</span>}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{f.message}</p>
            {f.user_id && (
              <div className="mt-2 flex gap-2">
                <input value={drafts[f.id] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                  placeholder="Reply as system message…"
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm" />
                <button
                  disabled={!drafts[f.id]?.trim()}
                  onClick={async () => {
                    const r = await reply({ data: { feedback_id: f.id, message: drafts[f.id].trim() } });
                    if (r.ok) { toast.success("Reply sent."); setDrafts((d) => ({ ...d, [f.id]: "" })); reload(); }
                    else toast.error(r.error ?? "Failed.");
                  }}
                  className="rounded-md bg-accent px-3 py-1 text-xs text-accent-foreground disabled:opacity-50">Send reply</button>
              </div>
            )}
          </li>
        ))}
        {!items.length && <li className="py-6 text-center text-sm text-muted-foreground">No feedback.</li>}
      </ul>
    </Card>
  );
}

// ---------- Messages ----------
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
        <label className="flex items-center gap-1"><input type="radio" checked={mode === "user"} onChange={() => setMode("user")} /> To user</label>
        <label className="flex items-center gap-1"><input type="radio" checked={mode === "broadcast"} onChange={() => setMode("broadcast")} /> Broadcast to all</label>
      </div>
      {mode === "user" && (
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username (without @)"
          className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      )}
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
        className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Body"
        className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Optional link (e.g. /faq)"
        className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <button
        disabled={busy || !title.trim() || !body.trim() || (mode === "user" && !username.trim())}
        onClick={async () => {
          setBusy(true);
          const r = await send({ data: {
            broadcast: mode === "broadcast",
            recipient_username: mode === "user" ? username.trim() : undefined,
            title: title.trim(), body: body.trim(), link: link.trim() || undefined,
          } });
          setBusy(false);
          if (r.ok) { toast.success(`Sent to ${r.count ?? 1} user(s).`); setTitle(""); setBody(""); setLink(""); }
          else toast.error(r.error ?? "Failed.");
        }}
        className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground disabled:opacity-50"
      >{busy ? "Sending…" : "Send [System] message"}</button>
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
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);
  return (
    <Card title="Forbidden words">
      <p className="mb-3 text-xs text-muted-foreground">
        "warn" sends a system message to the user but the post goes through. "block" additionally prevents the post/comment from being saved.
      </p>
      <div className="mb-4 flex gap-2">
        <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="word or phrase"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <select value={severity} onChange={(e) => setSeverity(e.target.value as "warn" | "block")}
          className="rounded-md border border-border bg-background px-2 py-2 text-sm">
          <option value="warn">warn</option>
          <option value="block">block</option>
        </select>
        <button
          disabled={!word.trim()}
          onClick={async () => {
            const r = await add({ data: { word: word.trim(), severity } });
            if (r.ok) { setWord(""); reload(); } else toast.error(r.error ?? "Failed.");
          }}
          className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground disabled:opacity-50">Add</button>
      </div>
      <ul className="divide-y">
        {items.map((b) => (
          <li key={b.id} className="flex items-center justify-between py-2 text-sm">
            <span>{b.word} <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase">{b.severity}</span></span>
            <button onClick={async () => { await del({ data: { id: b.id } }); reload(); }}
              className="text-xs text-destructive hover:underline">Remove</button>
          </li>
        ))}
        {!items.length && <li className="py-6 text-center text-muted-foreground">Nothing banned yet.</li>}
      </ul>
    </Card>
  );
}
