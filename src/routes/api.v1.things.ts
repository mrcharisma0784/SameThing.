import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { apiOptions, withApiKey } from "@/lib/api/v1/handler.server";
import { decodeCursor, encodeCursor, parseLimit } from "@/lib/api/v1/pagination";
import { apiError, apiResponse } from "@/lib/api/v1/response";

export const Route = createFileRoute("/api/v1/things")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => apiOptions(request),
      GET: ({ request }) =>
        withApiKey(request, "/api/v1/things", "things:read", async ({ requestId }) => {
          const url = new URL(request.url);
          const cursorValue = url.searchParams.get("cursor");
          const cursor = decodeCursor(cursorValue);
          if (cursorValue && !cursor) {
            return {
              response: apiError(
                400,
                "invalid_cursor",
                "The cursor is invalid or expired.",
                requestId,
              ),
              rowsReturned: 0,
            };
          }

          const limit = parseLimit(request);
          const language = url.searchParams.get("language")?.trim();
          const tag = url.searchParams.get("tag")?.trim();
          let query = supabaseAdmin
            .from("things")
            .select(
              "id, title, simplified_text, language, tags, is_anonymous, same_count, nah_count, total_votes, similarity_score, comment_count, like_count, is_rare_thing, created_at",
            )
            .eq("hidden", false)
            .eq("safety_flag", false)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(limit + 1);

          if (cursor) query = query.lt("created_at", cursor.created_at);
          if (language && language !== "all") query = query.eq("language", language.slice(0, 12));
          if (tag) query = query.contains("tags", [tag.slice(0, 40)]);

          const { data, error } = await query;
          if (error) {
            console.error("research api things", error);
            return {
              response: apiError(
                500,
                "query_failed",
                "The Things dataset could not be read.",
                requestId,
              ),
              rowsReturned: 0,
            };
          }
          const rows = (data ?? []) as Array<
            Record<string, unknown> & { id: string; created_at: string }
          >;
          const visible = rows.slice(0, limit).map((row) => ({
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
          }));
          const last = rows.length > limit ? rows[limit - 1] : null;
          return {
            response: apiResponse(
              visible,
              requestId,
              {},
              {
                limit,
                has_more: Boolean(last),
                next_cursor: last
                  ? encodeCursor({ id: last.id, created_at: last.created_at })
                  : null,
              },
            ),
            rowsReturned: visible.length,
          };
        }),
    },
  },
});
