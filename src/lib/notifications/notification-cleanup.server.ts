export async function purgeExpiredNotifications(): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("purge_expired_notifications");
  if (error) {
    throw new Error(`Notification cleanup failed: ${error.message}`);
  }
  return Number(data ?? 0);
}
