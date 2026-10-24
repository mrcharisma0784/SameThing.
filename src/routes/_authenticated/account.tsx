import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OnboardingGate } from "@/components/OnboardingGate";
import {
  AtSign,
  KeyRound,
  LogOut,
  ChevronLeft,
  Download,
  Database,
  Clock3,
  EyeOff,
  UserRoundX,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyDataRequests,
  getMyHiddenContent,
  requestAccountData,
  withdrawReport,
} from "@/lib/api/me.functions";
import { listMyBlockedUsers, unblockUser } from "@/lib/api/social.functions";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Account & privacy · SameThing." }] }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const requestDataFn = useServerFn(requestAccountData);
  const getRequestsFn = useServerFn(getMyDataRequests);
  const listBlockedFn = useServerFn(listMyBlockedUsers);
  const unblockFn = useServerFn(unblockUser);
  const listHiddenFn = useServerFn(getMyHiddenContent);
  const withdrawReportFn = useServerFn(withdrawReport);
  const queryClient = useQueryClient();
  const provider = (user?.app_metadata?.provider ?? "email") as string;
  const isEmailAuth = provider === "email";

  const [newEmail, setNewEmail] = useState(user?.email ?? "");
  const [newPass, setNewPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [allowMentions, setAllowMentions] = useState<boolean>(
    (profile as { allow_mentions?: boolean } | null)?.allow_mentions ?? true,
  );
  const { data: requestData } = useQuery({
    queryKey: ["account-data-requests"],
    queryFn: () => getRequestsFn(),
    enabled: Boolean(profile),
    staleTime: 15_000,
  });
  const { data: blockedData } = useQuery({
    queryKey: ["blocked-users"],
    queryFn: () => listBlockedFn(),
    enabled: Boolean(profile),
    staleTime: 15_000,
  });
  const { data: hiddenData } = useQuery({
    queryKey: ["hidden-content"],
    queryFn: () => listHiddenFn(),
    enabled: Boolean(profile),
    staleTime: 15_000,
  });

  const saveEmail = async () => {
    if (!newEmail.trim() || newEmail === user?.email) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Check your inbox to confirm the new email.");
  };

  const savePassword = async () => {
    if (newPass.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setNewPass("");
      toast.success("Password updated.");
    }
  };

  const saveMentionPref = async (next: boolean) => {
    setAllowMentions(next);
    const { error } = await supabase
      .from("profiles")
      .update({ allow_mentions: next } as never)
      .eq("id", profile!.id);
    if (error) {
      toast.error("Couldn't save.");
      setAllowMentions(!next);
    } else {
      await refreshProfile();
    }
  };

  const unblock = async (userId: string) => {
    setBusy(true);
    const result = await unblockFn({ data: { user_id: userId } });
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Profile unblocked.");
    await queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
  };

  const restoreHidden = async (target_type: "thing" | "quote", target_id: string) => {
    setBusy(true);
    const result = await withdrawReportFn({ data: { target_type, target_id } });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Report withdrawn. Personal hiding removed.");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["hidden-content"] }),
      queryClient.invalidateQueries({ queryKey: ["feed"] }),
      queryClient.invalidateQueries({ queryKey: ["search"] }),
      queryClient.invalidateQueries({ queryKey: ["quotes", "today"] }),
      queryClient.invalidateQueries({ queryKey: ["quotes", "mine"] }),
    ]);
  };

  const requestPrivacyAction = async (request_type: "export" | "deletion") => {
    if (
      request_type === "deletion" &&
      !confirm("Request account deletion? Your account stays active until the request is reviewed.")
    )
      return;
    setBusy(true);
    const result = await requestDataFn({ data: { request_type } });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      request_type === "export" ? "Data export requested." : "Deletion request received.",
    );
    await queryClient.invalidateQueries({ queryKey: ["account-data-requests"] });
  };

  return (
    <OnboardingGate>
      <AppShell>
        <Link
          to="/settings"
          className="mb-3 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> settings
        </Link>
        <h1 className="brand-mark text-3xl text-foreground">
          Account<span className="dot">.</span>
        </h1>
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
                <p className="text-xs text-muted-foreground">
                  Let others tag you in comments and notify you.
                </p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={allowMentions}
              onClick={() => saveMentionPref(!allowMentions)}
              className={`h-6 w-11 shrink-0 rounded-full border transition-colors ${allowMentions ? "border-accent bg-accent" : "border-border bg-background"}`}
            >
              <span
                className={`block h-4 w-4 rounded-full bg-card shadow transition-transform ${allowMentions ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>
        </section>

        {/* Blocked profiles */}
        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-background text-muted-foreground">
              <UserRoundX className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm text-foreground">Blocked profiles</p>
              <p className="text-xs text-muted-foreground">
                Manage the people you have chosen not to see.
              </p>
            </div>
          </div>
          {blockedData?.items?.length ? (
            <div className="mt-4 space-y-2 border-t border-border pt-3">
              {blockedData.items.map((blocked) => (
                <div
                  key={blocked.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-sm">
                      {blocked.emoji}
                    </span>
                    <span className="truncate text-sm text-foreground">@{blocked.username}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (blocked.id) void unblock(blocked.id);
                    }}
                    disabled={busy}
                    className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground disabled:opacity-50"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
              You are not blocking anyone.
            </p>
          )}
        </section>

        {/* Report-based personal hiding */}
        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background text-muted-foreground">
              <EyeOff className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm text-foreground">Hidden content</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Things and Quotes you reported are hidden only for you. Restore view to withdraw
                that report.
              </p>
            </div>
          </div>
          {hiddenData?.items?.length ? (
            <div className="mt-4 space-y-3 border-t border-border pt-3">
              {(
                hiddenData.items as Array<{
                  target_type: "thing" | "quote";
                  target_id: string;
                  reason: string;
                  reported_at: string;
                  available: boolean;
                  deleted: boolean;
                  admin_hidden: boolean;
                  text: string | null;
                  author: { username: string; emoji: string; plan?: string } | null;
                }>
              ).map((item) => (
                <div
                  key={`${item.target_type}:${item.target_id}`}
                  className="rounded-xl bg-background p-3"
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>{item.target_type === "thing" ? "Thing" : "Quote"}</span>
                    <span>{item.reason}</span>
                  </div>
                  {item.available && item.text ? (
                    <p className="mt-2 whitespace-pre-wrap font-serif text-base leading-6 italic text-foreground">
                      “{item.text}”
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      This content is no longer available.
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {item.author
                        ? `@${item.author.username}`
                        : item.available
                          ? "Anonymous"
                          : "Unavailable"}
                      {item.deleted ? " · removed" : item.admin_hidden ? " · moderated" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => void restoreHidden(item.target_type, item.target_id)}
                      disabled={busy}
                      className="shrink-0 rounded-full border border-accent/50 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
                    >
                      Restore view
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
              You have not hidden any Things or Quotes by reporting them.
            </p>
          )}
        </section>

        {/* Email + password only for email/password accounts */}
        {isEmailAuth ? (
          <>
            <section className="mt-4 rounded-2xl border border-border bg-card p-5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Email
              </Label>
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                type="email"
                className="mt-1 bg-background"
              />
              <Button
                onClick={saveEmail}
                disabled={busy}
                className="mt-3 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Update email
              </Button>
            </section>

            <section className="mt-3 rounded-2xl border border-border bg-card p-5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                New password
              </Label>
              <Input
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                type="password"
                placeholder="min 8 characters"
                className="mt-1 bg-background"
              />
              <Button
                onClick={savePassword}
                disabled={busy || newPass.length < 8}
                className="mt-3 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Update password
              </Button>
            </section>
          </>
        ) : (
          <section className="mt-4 rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            You signed in with {provider}. Manage your email and password through your {provider}{" "}
            account.
          </section>
        )}

        {/* Sign out */}
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>

        <section className="mt-6 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Your data</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Request a copy of your account data by email, or ask us to delete it. We review requests
            and complete them within several business days; deletion is permanent after approval.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void requestPrivacyAction("export")}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-full border border-border bg-background px-3 py-2.5 text-sm text-foreground hover:border-accent disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Email my data
            </button>
            <button
              type="button"
              onClick={() => void requestPrivacyAction("deletion")}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-full border border-destructive/50 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              <Database className="h-4 w-4" /> Request deletion
            </button>
          </div>
          {requestData?.items?.length ? (
            <div className="mt-4 space-y-2 border-t border-border pt-3">
              {requestData.items
                .slice(0, 4)
                .map((item: { id: string; request_type: string; status: string }) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" />{" "}
                      {item.request_type === "export" ? "Data export" : "Deletion"}
                    </span>
                    <span className="capitalize">{item.status.replace("_", " ")}</span>
                  </div>
                ))}
            </div>
          ) : null}
        </section>
      </AppShell>
    </OnboardingGate>
  );
}
