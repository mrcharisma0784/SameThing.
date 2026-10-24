import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function createSupabaseClient() {
  const env = typeof process !== "undefined" ? process.env : undefined;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || env?.SUPABASE_URL;
  const supabasePublishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || env?.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    const missing = [
      ...(!supabaseUrl ? ["VITE_SUPABASE_URL"] : []),
      ...(!supabasePublishableKey ? ["VITE_SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Add them to the local .env.local or Vercel project settings.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

let supabaseClient: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!supabaseClient) supabaseClient = createSupabaseClient();
    return Reflect.get(supabaseClient, prop, receiver);
  },
});
