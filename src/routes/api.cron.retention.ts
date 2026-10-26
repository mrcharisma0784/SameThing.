import { createFileRoute } from "@tanstack/react-router";
import { purgeExpiredNotifications } from "@/lib/notifications/notification-cleanup.server";
import { processDueDeletions, processPendingExports } from "@/lib/account-lifecycle.server";

/* eslint-disable @typescript-eslint/no-explicit-any -- production API log table is absent from checked-in generated Supabase types. */
async function purgeExpiredApiRequestLogs(): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // The production table is not included in the checked-in generated Supabase types.
  const { count, error } = await (supabaseAdmin as any)
    .from("api_request_logs")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);
  if (error) throw new Error(`API request-log cleanup failed: ${error.message}`);
  return Number(count ?? 0);
}

export const Route = createFileRoute("/api/cron/retention")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const authorization = request.headers.get("authorization");

        if (!secret || authorization !== `Bearer ${secret}`) {
          return new Response("Unauthorized", {
            status: 401,
            headers: { "Cache-Control": "no-store" },
          });
        }

        try {
          const results = await Promise.allSettled([
            purgeExpiredNotifications(),
            purgeExpiredApiRequestLogs(),
            processPendingExports(),
            processDueDeletions(),
          ]);
          const failures = results.filter((result) => result.status === "rejected");
          if (failures.length) {
            console.error("Daily retention cleanup had failures.", failures);
            return new Response(JSON.stringify({ ok: false }), {
              status: 500,
              headers: {
                "Cache-Control": "no-store",
                "Content-Type": "application/json; charset=utf-8",
              },
            });
          }
          const notificationsDeleted = results[0].status === "fulfilled" ? results[0].value : 0;
          const apiRequestLogsDeleted = results[1].status === "fulfilled" ? results[1].value : 0;
          const exportsSent = results[2].status === "fulfilled" ? results[2].value : 0;
          const accountsDeleted = results[3].status === "fulfilled" ? results[3].value : 0;
          return new Response(
            JSON.stringify({
              ok: true,
              notificationsDeleted,
              apiRequestLogsDeleted,
              exportsSent,
              accountsDeleted,
            }),
            {
              status: 200,
              headers: {
                "Cache-Control": "no-store",
                "Content-Type": "application/json; charset=utf-8",
              },
            },
          );
        } catch (error) {
          console.error("Daily notification cleanup failed.", error);
          return new Response(JSON.stringify({ ok: false }), {
            status: 500,
            headers: {
              "Cache-Control": "no-store",
              "Content-Type": "application/json; charset=utf-8",
            },
          });
        }
      },
    },
  },
});
