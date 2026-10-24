import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/Brand";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

const WELCOME_PENDING_KEY = "samething:welcome-message-pending";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · SameThing." },
      { name: "description", content: "Sign in to drop your own thing and discover who shares it." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!acceptedTerms) { toast.error("Please accept the Terms & Privacy to continue."); setLoading(false); return; }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/`, data: { terms_accepted_at: new Date().toISOString() } },
        });
        if (error) throw error;
        localStorage.setItem(WELCOME_PENDING_KEY, "1");
        toast.success("Welcome. You're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't authenticate.");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    if (mode === "signup" && !acceptedTerms) return;
    setLoading(true);
    if (mode === "signup") localStorage.setItem(WELCOME_PENDING_KEY, "1");
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) {
      toast.error("Couldn't sign in with Google.");
      setLoading(false);
      return;
    }
    if (res.redirected) return;
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-dvh bg-background px-4 py-10">
      <div className="mx-auto flex max-w-sm flex-col">
        <div className="text-center">
          <Brand size="xl" />
          <p className="mt-4 font-serif text-2xl italic text-foreground">
            {mode === "signup" ? "Start sharing." : "Welcome back."}
          </p>
          <Typewriter
            key={mode}
            text="You're never the only one — sign in to find out."
            className="mt-1 min-h-[1.25rem] text-sm text-muted-foreground"
          />
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
            <button
              type="button"
              onClick={google}
              disabled={loading || (mode === "signup" && !acceptedTerms)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-45"
          >
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or email <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
            </div>
            {mode === "signup" && (
              <label className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[color:var(--accent)]"
                />
                <span>
                  I agree to the{" "}
                  <Link to="/terms" className="text-foreground underline">Terms</Link>
                  {" "}and{" "}
                  <Link to="/privacy" className="text-foreground underline">Privacy</Link>.
                </span>
              </label>
            )}
            <Button type="submit" disabled={loading || (mode === "signup" && !acceptedTerms)} className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "New here? Create an account." : "Have an account? Sign in."}
          </button>
        </div>
      </div>
    </div>
  );
}

function Typewriter({ text, className }: { text: string; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    const id = setInterval(() => {
      setI((prev) => {
        if (prev >= text.length) { clearInterval(id); return prev; }
        return prev + 1;
      });
    }, 35);
    return () => clearInterval(id);
  }, [text]);
  return (
    <p className={className}>
      {text.slice(0, i)}
      <span className="ml-0.5 inline-block w-[1px] animate-pulse bg-current" aria-hidden>&nbsp;</span>
    </p>
  );
}
