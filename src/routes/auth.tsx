import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/Brand";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Phone } from "lucide-react";
import { pulseHaptic } from "@/lib/haptics";
export const Route = createFileRoute("/auth")({
  validateSearch: z.object({
    mode: z.enum(["signin", "signup"]).optional(),
    next: z.enum(["/", "/search", "/api-dashboard"]).optional(),
    recovery: z.enum(["1"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Sign in · SameThing." },
      {
        name: "description",
        content: "Sign in to drop your own thing and discover who shares it.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { mode: requestedMode, next, recovery } = Route.useSearch();
  const nextPath = next === "/api-dashboard" || next === "/search" ? next : "/";
  const [mode, setMode] = useState<"signin" | "signup">(
    requestedMode === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsWarningCount, setTermsWarningCount] = useState(0);
  const [referralCode, setReferralCode] = useState("");
  const [banNotice, setBanNotice] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(recovery === "1");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBanNotice(
      params.get("banned") === "1" || Boolean(localStorage.getItem("samething:ban-notice")),
    );
    if (params.get("banned") === "1") localStorage.removeItem("samething:ban-notice");
    const queryCode = params.get("ref")?.trim() ?? "";
    const savedCode = localStorage.getItem("samething:pending-referral") ?? "";
    const code = queryCode || savedCode;
    if (code) {
      setReferralCode(code.slice(0, 80));
      localStorage.setItem("samething:pending-referral", code.slice(0, 80));
    }
  }, []);

  useEffect(() => {
    if (recovery === "1") setResetPasswordMode(true);
  }, [recovery]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("signin");
        setShowForgotPassword(false);
        setResetPasswordMode(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && profile && !profile.banned_at && !resetPasswordMode) {
      navigate({ to: nextPath, replace: true });
    }
  }, [user, profile, navigate, nextPath, resetPasswordMode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (resetPasswordMode) {
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        if (password !== confirmPassword) throw new Error("The passwords do not match.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Your password has been updated.");
        setResetPasswordMode(false);
        setPassword("");
        setConfirmPassword("");
        navigate({ to: nextPath, replace: true });
        return;
      }

      if (showForgotPassword) {
        const cleanEmail = email.trim();
        if (!cleanEmail) throw new Error("Enter your email address first.");
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: new URL("/auth?recovery=1", window.location.origin).toString(),
        });
        if (error) throw error;
        toast.success("If an account exists for this email, a reset link is on its way.");
        setShowForgotPassword(false);
        return;
      }

      if (mode === "signup") {
        if (!acceptedTerms) {
          toast.error("Please accept the Terms & Privacy to continue.");
          setLoading(false);
          return;
        }
        const cleanReferral = referralCode.trim();
        if (cleanReferral) localStorage.setItem("samething:pending-referral", cleanReferral);
        const emailRedirect = new URL(nextPath, window.location.origin);
        if (cleanReferral) emailRedirect.searchParams.set("ref", cleanReferral);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: emailRedirect.toString(),
            data: {
              terms_accepted_at: new Date().toISOString(),
              ...(cleanReferral ? { referral_code: cleanReferral } : {}),
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account.");
          return;
        }
        toast.success("Welcome. You're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: nextPath, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't authenticate.");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    if (mode === "signup" && !acceptedTerms) {
      toast.error("Please accept the Terms & Privacy before continuing with Google.");
      setTermsWarningCount((count) => count + 1);
      return;
    }
    setLoading(true);
    try {
      const cleanReferral = referralCode.trim();
      if (cleanReferral) localStorage.setItem("samething:pending-referral", cleanReferral);
      const googleRedirect = new URL(nextPath, window.location.origin);
      if (cleanReferral) googleRedirect.searchParams.set("ref", cleanReferral);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: googleRedirect.toString(),
          queryParams: cleanReferral ? { ref: cleanReferral } : undefined,
        },
      });
      if (error) throw error;
      if (data.url) window.location.assign(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't sign in with Google.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background px-4 py-10 md:flex md:items-center md:px-8 md:py-12">
      <div className="mx-auto flex max-w-sm flex-col md:grid md:max-w-5xl md:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] md:items-center md:gap-16">
        <div className="text-center md:text-left">
          <Brand
            size="xl"
            wordmarkClassName="text-[2.8rem]"
            markClassName="h-[4.5rem] w-[4.5rem]"
          />
          <p className="mt-4 font-serif text-2xl italic text-foreground">
            {mode === "signup" ? "Start sharing." : "Welcome back."}
          </p>
          <Typewriter
            key={mode}
            text="You're never the only one — sign in to find out."
            className="mt-1 min-h-[1.25rem] text-sm text-muted-foreground"
          />
          <div className="mt-8 hidden max-w-md border-l border-accent/30 pl-5 text-left md:block">
            <p className="text-[10px] uppercase tracking-[0.24em] text-accent">
              SameThing. in brief
            </p>
            <p className="mt-3 font-serif text-3xl italic leading-tight text-foreground">
              A quieter place for the thoughts that usually stay in your head.
            </p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              Drop what you notice, find what resonates, and leave a little less alone than you
              arrived.
            </p>
          </div>
        </div>

        <div className="md:min-w-0">
          {banNotice && (
            <div className="mt-5 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive">
              This account has been banned from SameThing. You can’t continue with this account.
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-border bg-card p-5 md:mt-0">
            {!showForgotPassword && !resetPasswordMode && (
              <>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={google}
                    disabled={loading}
                    aria-label="Continue with Google"
                    title="Continue with Google"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/80 text-foreground transition-colors hover:border-accent/50 hover:bg-secondary disabled:opacity-50"
                  >
                    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 text-current">
                      <path
                        fill="currentColor"
                        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"
                      />
                      <path
                        fill="currentColor"
                        d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"
                      />
                      <path
                        fill="currentColor"
                        d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"
                      />
                      <path
                        fill="currentColor"
                        d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z"
                      />
                    </svg>
                  </button>
                  <span className="self-center text-xs text-muted-foreground">or</span>
                  <button
                    type="button"
                    onClick={() => toast.info("Phone sign-in is coming soon.")}
                    aria-label="Phone sign-in coming soon"
                    title="Phone sign-in coming soon"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/80 text-foreground transition-colors hover:border-accent/50 hover:bg-secondary"
                  >
                    <Phone aria-hidden="true" className="h-5 w-5" />
                  </button>
                </div>

                <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> or email{" "}
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

            <form onSubmit={submit} className="space-y-3">
              {!resetPasswordMode && (
                <div>
                  <Label
                    htmlFor="email"
                    className="text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}

              {resetPasswordMode ? (
                <>
                  <div>
                    <Label
                      htmlFor="new-password"
                      className="text-xs uppercase tracking-widest text-muted-foreground"
                    >
                      New password
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="confirm-password"
                      className="text-xs uppercase tracking-widest text-muted-foreground"
                    >
                      Confirm new password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </>
              ) : showForgotPassword ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  We’ll send a secure password reset link to this email address.
                </p>
              ) : (
                <>
                  <div>
                    <Label
                      htmlFor="password"
                      className="text-xs uppercase tracking-widest text-muted-foreground"
                    >
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="block w-full text-left text-xs text-muted-foreground underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-current"
                    >
                      Forgot your password?
                    </button>
                  )}
                  {mode === "signup" && (
                    <div>
                      <Label
                        htmlFor="referral"
                        className="text-xs uppercase tracking-widest text-muted-foreground"
                      >
                        Reference code{" "}
                        <span className="normal-case tracking-normal opacity-70">(optional)</span>
                      </Label>
                      <Input
                        id="referral"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.slice(0, 80))}
                        placeholder="Paste a friend’s code"
                        className="mt-1"
                      />
                    </div>
                  )}
                  {mode === "signup" && (
                    <label className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[color:var(--accent)]"
                      />
                      <span
                        key={`terms-copy-${termsWarningCount}`}
                        className={termsWarningCount ? "terms-label-shimmer" : undefined}
                      >
                        I agree to the{" "}
                        <a href="/terms?minimal=1" className="underline">
                          Terms
                        </a>{" "}
                        and{" "}
                        <a href="/privacy?minimal=1" className="underline">
                          Privacy
                        </a>
                        .
                      </span>
                    </label>
                  )}
                </>
              )}

              <Button
                type="submit"
                disabled={
                  loading ||
                  (!showForgotPassword && !resetPasswordMode && mode === "signup" && !acceptedTerms)
                }
                className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {resetPasswordMode
                  ? "Update password"
                  : showForgotPassword
                    ? "Send reset link"
                    : mode === "signup"
                      ? "Create account"
                      : "Sign in"}
              </Button>
            </form>

            {showForgotPassword || resetPasswordMode ? (
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetPasswordMode(false);
                  setPassword("");
                  setConfirmPassword("");
                  setMode("signin");
                }}
                className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
                className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                {mode === "signin" ? (
                  <>
                    New here?{" "}
                    <span className="font-semibold text-foreground">Create an account.</span>
                  </>
                ) : (
                  <>
                    Have an account? <span className="font-semibold text-foreground">Sign in.</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Typewriter({ text, className }: { text: string; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    let typed = 0;
    const id = setInterval(() => {
      if (typed >= text.length) {
        clearInterval(id);
        return;
      }
      typed += 1;
      setI(typed);
      pulseHaptic(6);
    }, 35);
    return () => clearInterval(id);
  }, [text]);
  return (
    <p className={className}>
      {text.slice(0, i)}
      <span className="ml-0.5 inline-block w-[1px] animate-pulse bg-current" aria-hidden>
        &nbsp;
      </span>
    </p>
  );
}
