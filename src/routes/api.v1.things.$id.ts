import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { apiOptions, withApiKey } from "@/lib/api/v1/handler.server";
import { apiError, apiResponse } from "@/lib/api/v1/response";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function projectThing(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    text: row.simplified_text,
    language: row.language,
    tags: row.tags,
    anonymous: Boolean(row.is_anonymous),
    signals: {
      same: Number(row.same_count ?? 0),
      nah: Number(row.nah_count ?? 0),
      votes: Number(row.total_votes ?? 0),
      similarity_percent: Number(row.similarity_score ?? 0),
      comments: Number(row.comment_count ?? 0),
      likes: Number(row.like_count ?? 0),
      rare: Boolean(row.is_rare_thing),
    },
    created_at: row.created_at,
  };
}

export const Route = createFileRoute("/api/v1/things/$id")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => apiOptions(request),
      GET: ({ request, params }) =>
        withApiKey(request, `/api/v1/things/${params.id}`, "things:read", async ({ requestId }) => {
          if (!UUID_RE.test(params.id)) {
            return {
              response: apiError(
                400,
                "invalid_id",
                "The Thing id must be a valid UUID.",
                requestId,
              ),
              rowsReturned: 0,
            };
          }
          // The generated schema omits the read-only research projection fields.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (supabaseAdmin as any)
            .from("things")
            .select(
              "id, title, simplified_text, language, tags, is_anonymous, same_count, nah_count, total_votes, similarity_score, comment_count, like_count, is_rare_thing, created_at",
            )
            .eq("id", params.id)
            .eq("hidden", false)
            .eq("safety_flag", false)
            .maybeSingle();
          if (error) {
            console.error("research api thing", error);
            return {
              response: apiError(500, "query_failed", "The Thing could not be read.", requestId),
              rowsReturned: 0,
            };
          }
          if (!data) {
            return {
              response: apiError(404, "not_found", "The Thing was not found.", requestId),
              rowsReturned: 0,
            };
          }
          return { response: apiResponse(projectThing(data), requestId), rowsReturned: 1 };
        }),
    },
  },
});
