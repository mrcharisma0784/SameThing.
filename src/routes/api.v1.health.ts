import { createFileRoute } from "@tanstack/react-router";
import { apiCorsHeaders } from "@/lib/api/v1/auth.server";
import { apiOptions, apiUnavailable } from "@/lib/api/v1/handler.server";
import { apiResponse, createRequestId } from "@/lib/api/v1/response";
import { RESEARCH_API_AVAILABLE } from "@/lib/api/research-availability";

export const Route = createFileRoute("/api/v1/health")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => apiOptions(request),
      GET: ({ request }) =>
        RESEARCH_API_AVAILABLE
          ? apiResponse({ status: "ok", service: "samething-research-api" }, createRequestId(), {
              headers: apiCorsHeaders(request),
            })
          : apiUnavailable(request),
    },
  },
});
