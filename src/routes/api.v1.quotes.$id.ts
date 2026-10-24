import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { apiOptions, withApiKey } from "@/lib/api/v1/handler.server";
import { apiError, apiResponse } from "@/lib/api/v1/response";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/v1/quotes/$id")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => apiOptions(request),
      GET: ({ request, params }) =>
        withApiKey(request, `/api/v1/quotes/${params.id}`, "quotes:read", async ({ requestId }) => {
          if (!UUID_RE.test(params.id)) {
            return {
              response: apiError(
                400,
                "invalid_id",
                "The Quote id must be a valid UUID.",
                requestId,
              ),
              rowsReturned: 0,
            };
          }
          // The generated schema omits the read-only research projection fields.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (supabaseAdmin as any)
            .from("quotes")
            .select("id, text, author, is_anonymous, day, like_count, comment_count, created_at")
            .eq("id", params.id)
            .eq("hidden", false)
            .maybeSingle();
          if (error) {
            console.error("research api quote", error);
            return {
              response: apiError(500, "query_failed", "The Quote could not be read.", requestId),
              rowsReturned: 0,
            };
          }
          if (!data) {
            return {
              response: apiError(404, "not_found", "The Quote was not found.", requestId),
              rowsReturned: 0,
            };
          }
          return {
            response: apiResponse(
              {
                id: data.id,
                text: data.text,
                author: data.is_anonymous ? null : data.author,
                anonymous: Boolean(data.is_anonymous),
                day: data.day,
                likes: Number(data.like_count ?? 0),
                comments: Number(data.comment_count ?? 0),
                created_at: data.created_at,
              },
              requestId,
            ),
            rowsReturned: 1,
          };
        }),
    },
  },
});
