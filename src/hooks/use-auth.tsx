import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/api/me.functions";
import { ensureWelcomeSystemMessage } from "@/lib/api/system-messages.functions";

const WELCOME_PENDING_KEY = "samething:welcome-message-pending";

type Profile = {
  id: string;
  username: string;
  emoji: string;
  bio: string | null;
  language: string;
  is_anon_default: boolean;
  rare_thing_count: number;
  onboarded_at: string | null;
  custom_tags?: string[];
  warnings_count?: number;
  muted_until?: string | null;
  plan?: "free" | "premium";
  messages_open?: boolean;
  username_changed_at?: string | null;
  inbox_seen_at?: string | null;
  allow_mentions?: boolean;
  gender?: string | null;
  age_range?: string | null;
  demographics_completed_at?: string | null;
  theme?: string | null;
  feed_tags?: string[] | null;
  notification_prefs?: Record<string, boolean> | null;
};


type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const { profile } = await getMyProfile();
      setProfile(profile as Profile | null);
      if (profile && typeof window !== "undefined" && localStorage.getItem(WELCOME_PENDING_KEY) === "1") {
        const result = await ensureWelcomeSystemMessage();
        if (!result.error) localStorage.removeItem(WELCOME_PENDING_KEY);
      }
    } catch (e) {
      console.error("loadProfile", e);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Set up listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => { void loadProfile(); }, 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) void loadProfile();
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        refreshProfile: async () => { if (user) await loadProfile(); },
        signOut: async () => { await supabase.auth.signOut(); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
