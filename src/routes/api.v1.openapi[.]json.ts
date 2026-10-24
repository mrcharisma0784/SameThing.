import { createFileRoute } from "@tanstack/react-router";
import { apiCorsHeaders } from "@/lib/api/v1/auth.server";
import { apiResponse, createRequestId } from "@/lib/api/v1/response";
import { getSiteUrl } from "@/lib/site-url";

const apiCreditsExhausted = {
  description: "The workspace has no API Credits remaining.",
  headers: { "X-API-Credits-Remaining": { schema: { type: "integer" } } },
};

const document = {
  openapi: "3.1.0",
  info: {
    title: "SameThing. Research API",
    version: "1.0.0",
    description:
      "Approved, read-only research access to privacy-safe SameThing. aggregates and public content projections. Access starts in the authenticated API Dashboard: approved workspaces receive an automatically generated scoped key, a one-time 500 API Credit welcome allowance, and use one API Credit per successful request. API Credits and key limits are separate from Same Credits and Premium.",
  },
  externalDocs: {
    description: "API Dashboard and full documentation",
    url: getSiteUrl("/documentation"),
  },
  servers: [{ url: getSiteUrl("/api/v1") }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "SameThing API key" },
    },
    responses: { apiCreditsExhausted },
  },
  paths: {
    "/health": { get: { security: [], responses: { "200": { description: "Service health" } } } },
    "/metadata": {
      get: {
        responses: {
          "200": { description: "Dataset policy and limits" },
          "402": { $ref: "#/components/responses/apiCreditsExhausted" },
        },
      },
    },
    "/things": {
      get: {
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 25 },
          },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "language", in: "query", schema: { type: "string" } },
          { name: "tag", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Public Things" },
          "401": { description: "Invalid key" },
          "402": { $ref: "#/components/responses/apiCreditsExhausted" },
        },
      },
    },
    "/things/{id}": {
      get: {
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": { description: "One public Thing" },
          "402": { $ref: "#/components/responses/apiCreditsExhausted" },
        },
      },
    },
    "/quotes": {
      get: {
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 25 },
          },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "day", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: {
          "200": { description: "Public Quotes" },
          "401": { description: "Invalid key" },
          "402": { $ref: "#/components/responses/apiCreditsExhausted" },
        },
      },
    },
    "/quotes/{id}": {
      get: {
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": { description: "One public Quote" },
          "402": { $ref: "#/components/responses/apiCreditsExhausted" },
        },
      },
    },
    "/metrics": {
      get: {
        responses: {
          "200": { description: "Anonymous aggregate metrics" },
          "402": { $ref: "#/components/responses/apiCreditsExhausted" },
        },
      },
    },
  },
} as const;

export const Route = createFileRoute("/api/v1/openapi.json")({
  server: {
    handlers: {
      OPTIONS: ({ request }) =>
        new Response(null, { status: 204, headers: apiCorsHeaders(request) }),
      GET: ({ request }) =>
        apiResponse(document, createRequestId(), {
          headers: {
            ...apiCorsHeaders(request),
            "Content-Type": "application/json; charset=utf-8",
          },
        }),
    },
  },
});
