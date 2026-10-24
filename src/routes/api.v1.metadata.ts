import { createFileRoute } from "@tanstack/react-router";
import { apiOptions, withApiKey } from "@/lib/api/v1/handler.server";
import { apiResponse } from "@/lib/api/v1/response";

export const Route = createFileRoute("/api/v1/metadata")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => apiOptions(request),
      GET: ({ request }) =>
        withApiKey(request, "/api/v1/metadata", "metadata:read", async ({ requestId }) => ({
          response: apiResponse(
            {
              api: "SameThing. Research API",
              version: "1",
              access: "approved applications only",
              read_only: true,
              limits: { max_page_size: 100, cursor: "signed", rate_limit: "per key / minute" },
              resources: ["things", "quotes", "metrics"],
              excluded: [
                "profiles",
                "emails",
                "raw user ids",
                "comments",
                "moderation",
                "credits",
                "admin data",
              ],
              supported_scopes: ["things:read", "quotes:read", "metadata:read", "aggregates:read"],
            },
            requestId,
          ),
          rowsReturned: 1,
        })),
    },
  },
});
