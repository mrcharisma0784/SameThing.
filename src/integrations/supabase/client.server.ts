import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const missing = [
      ...(!supabaseUrl ? ["SUPABASE_URL"] : []),
      ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    const message = `Missing server environment variable(s): ${missing.join(", ")}. Add them to Vercel server environment variables.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let supabaseAdminClient: ReturnType<typeof createSupabaseAdminClient> | undefined;

// SECURITY: Only use this for trusted server-side operations, never expose to client code.
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!supabaseAdminClient) supabaseAdminClient = createSupabaseAdminClient();
    return Reflect.get(supabaseAdminClient, prop, receiver);
  },
});
