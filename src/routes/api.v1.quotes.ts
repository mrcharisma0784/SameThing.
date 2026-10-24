import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { apiOptions, withApiKey } from "@/lib/api/v1/handler.server";
import { decodeCursor, encodeCursor, parseLimit } from "@/lib/api/v1/pagination";
import { apiError, apiResponse } from "@/lib/api/v1/response";

export const Route = createFileRoute("/api/v1/quotes")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => apiOptions(request),
      GET: ({ request }) =>
        withApiKey(request, "/api/v1/quotes", "quotes:read", async ({ requestId }) => {
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
          const day = url.searchParams.get("day")?.trim();
          let query = supabaseAdmin
            .from("quotes")
            .select("id, text, author, is_anonymous, day, like_count, comment_count, created_at")
            .eq("hidden", false)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(limit + 1);
          if (cursor) query = query.lt("created_at", cursor.created_at);
          if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) query = query.eq("day", day);

          const { data, error } = await query;
          if (error) {
            console.error("research api quotes", error);
            return {
              response: apiError(
                500,
                "query_failed",
                "The Quotes dataset could not be read.",
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
            text: row.text,
            author: row.is_anonymous ? null : row.author,
            anonymous: Boolean(row.is_anonymous),
            day: row.day,
            likes: Number(row.like_count ?? 0),
            comments: Number(row.comment_count ?? 0),
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
