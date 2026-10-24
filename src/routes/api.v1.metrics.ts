import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { apiOptions, withApiKey } from "@/lib/api/v1/handler.server";
import { apiError, apiResponse } from "@/lib/api/v1/response";

export const Route = createFileRoute("/api/v1/metrics")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => apiOptions(request),
      GET: ({ request }) =>
        withApiKey(request, "/api/v1/metrics", "aggregates:read", async ({ requestId }) => {
          const [things, quotes, votes, likes, comments] = await Promise.all([
            supabaseAdmin
              .from("things")
              .select("id", { count: "exact", head: true })
              .eq("hidden", false)
              .eq("safety_flag", false)
              .is("deleted_at", null),
            supabaseAdmin
              .from("quotes")
              .select("id", { count: "exact", head: true })
              .eq("hidden", false)
              .is("deleted_at", null),
            supabaseAdmin.from("votes").select("id", { count: "exact", head: true }),
            supabaseAdmin.from("thing_likes").select("id", { count: "exact", head: true }),
            supabaseAdmin
              .from("comments")
              .select("id", { count: "exact", head: true })
              .eq("hidden", false),
          ]);
          const failure = [things, quotes, votes, likes, comments].find((result) => result.error);
          if (failure) {
            console.error("research api metrics", failure.error);
            return {
              response: apiError(
                500,
                "query_failed",
                "The aggregate metrics could not be read.",
                requestId,
              ),
              rowsReturned: 0,
            };
          }
          return {
            response: apiResponse(
              {
                public_things: things.count ?? 0,
                public_quotes: quotes.count ?? 0,
                votes: votes.count ?? 0,
                thing_likes: likes.count ?? 0,
                visible_comments: comments.count ?? 0,
              },
              requestId,
            ),
            rowsReturned: 1,
          };
        }),
    },
  },
});
