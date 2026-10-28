import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/api/me.functions";

type Profile = {
  id: string;
  username: string;
  emoji: string;
  avatar_url?: string | null;
  bio: string | null;
  language: string;
  is_anon_default: boolean;
  rare_thing_count: number;
  onboarded_at: string | null;
  custom_tags?: string[];
  warnings_count?: number;
  banned_at?: string | null;
  muted_until?: string | null;
  plan?: "free" | "premium";
  premium_until?: string | null;
  referral_code?: string | null;
  same_credits?: number;
  tour_completed_at?: string | null;
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
  is_test_user?: boolean;
  test_user_until?: string | null;
  test_user_label?: string | null;
  same_credits_unlimited?: boolean;
  deletion_scheduled_for?: string | null;
  deletion_cancelled_until?: string | null;
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
      const nextProfile = profile as Profile | null;
      if (nextProfile?.banned_at) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("samething:ban-notice", nextProfile.banned_at);
        }
        setProfile(null);
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
          window.location.assign("/auth?banned=1");
        }
        return;
      }
      setProfile(nextProfile);
    } catch (e) {
      console.error("loadProfile", e);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Set up listener first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => {
          void loadProfile();
        }, 0);
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
        refreshProfile: async () => {
          if (user) await loadProfile();
        },
        signOut: async () => {
          await supabase.auth.signOut();
        },
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
