import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OnboardingGate } from "@/components/OnboardingGate";
import { AtSign, KeyRound, LogOut, Trash2, ChevronLeft, MessageCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount } from "@/lib/api/me.functions";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Account & privacy · SameThing." }] }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const del = useServerFn(deleteMyAccount);
  const provider = (user?.app_metadata?.provider ?? "email") as string;
  const isEmailAuth = provider === "email";

  const [newEmail, setNewEmail] = useState(user?.email ?? "");
  const [newPass, setNewPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [allowMentions, setAllowMentions] = useState<boolean>(
    (profile as { allow_mentions?: boolean } | null)?.allow_mentions ?? true,
  );

  const saveEmail = async () => {
    if (!newEmail.trim() || newEmail === user?.email) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Check your inbox to confirm the new email.");
  };

  const savePassword = async () => {
    if (newPass.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setBusy(false);
    if (error) toast.error(error.message);
    else { setNewPass(""); toast.success("Password updated."); }
  };

  const saveMentionPref = async (next: boolean) => {
    setAllowMentions(next);
    const { error } = await supabase.from("profiles").update({ allow_mentions: next } as never).eq("id", profile!.id);
    if (error) { toast.error("Couldn't save."); setAllowMentions(!next); }
    else { await refreshProfile(); }
  };

  const deleteAccount = async () => {
    if (!confirm("Delete your account? This cannot be undone.")) return;
    setBusy(true);
    const res = await del();
    setBusy(false);
    if (res.error) { toast.error(res.error); return; }
    await supabase.auth.signOut();
    toast.success("Account deleted.");
    navigate({ to: "/" });
  };

  return (
    <OnboardingGate>
      <AppShell>
        <Link to="/settings" className="mb-3 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" /> settings
        </Link>
        <h1 className="brand-mark text-3xl text-foreground">Account<span className="dot">.</span></h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          signed in via <span className="text-foreground">{provider}</span>
        </p>

        {/* Mentions toggle */}
        <section className="mt-5 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-background text-muted-foreground">
                <AtSign className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-foreground">Allow @mentions</p>
                <p className="text-xs text-muted-foreground">Let others tag you in comments and notify you.</p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={allowMentions}
              onClick={() => saveMentionPref(!allowMentions)}
              className={`h-6 w-11 shrink-0 rounded-full border transition-colors ${allowMentions ? "border-accent bg-accent" : "border-border bg-background"}`}
            >
              <span className={`block h-4 w-4 rounded-full bg-card shadow transition-transform ${allowMentions ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Messages toggle — coming soon (disabled) */}
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 opacity-60">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-background text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-foreground">Messages — open to chat <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">soon</span></p>
                <p className="text-xs text-muted-foreground">Let people who said Same DM you on your things.</p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={false}
              disabled
              className="h-6 w-11 shrink-0 rounded-full border border-border bg-background"
            >
              <span className="block h-4 w-4 translate-x-1 rounded-full bg-card shadow" />
            </button>
          </div>
        </section>

        {/* Email + password only for email/password accounts */}
        {isEmailAuth ? (
          <>
            <section className="mt-4 rounded-2xl border border-border bg-card p-5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Email</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" className="mt-1 bg-background" />
              <Button onClick={saveEmail} disabled={busy} className="mt-3 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                Update email
              </Button>
            </section>

            <section className="mt-3 rounded-2xl border border-border bg-card p-5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">New password</Label>
              <Input value={newPass} onChange={(e) => setNewPass(e.target.value)} type="password" placeholder="min 8 characters" className="mt-1 bg-background" />
              <Button onClick={savePassword} disabled={busy || newPass.length < 8} className="mt-3 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                <KeyRound className="mr-2 h-4 w-4" />Update password
              </Button>
            </section>
          </>
        ) : (
          <section className="mt-4 rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            You signed in with {provider}. Manage your email and password through your {provider} account.
          </section>
        )}

        {/* Sign out */}
        <button
          onClick={async () => { await signOut(); navigate({ to: "/" }); }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>

        {/* Danger zone */}
        <section className="mt-6 rounded-2xl border border-destructive/40 bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-destructive">Danger zone</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Delete your account and all your things, comments and votes. This is permanent.
          </p>
          <button
            onClick={deleteAccount}
            disabled={busy}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-destructive/60 py-3 text-sm text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" /> Delete account
          </button>
        </section>
      </AppShell>
    </OnboardingGate>
  );
}
