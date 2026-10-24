import { createFileRoute } from "@tanstack/react-router";
import { apiCorsHeaders } from "@/lib/api/v1/auth.server";
import { apiResponse, createRequestId } from "@/lib/api/v1/response";

export const Route = createFileRoute("/api/v1/health")({
  server: {
    handlers: {
      OPTIONS: ({ request }) =>
        new Response(null, { status: 204, headers: apiCorsHeaders(request) }),
      GET: ({ request }) =>
        apiResponse({ status: "ok", service: "samething-research-api" }, createRequestId(), {
          headers: apiCorsHeaders(request),
        }),
    },
  },
});
