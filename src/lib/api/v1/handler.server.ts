import {
  apiCorsHeaders,
  authenticateApiRequest,
  recordApiRequest,
  type ApiKeyContext,
} from "@/lib/api/v1/auth.server";
import { apiError, createRequestId } from "@/lib/api/v1/response";
import {
  RESEARCH_API_AVAILABLE,
  RESEARCH_API_PAUSE_MESSAGE,
} from "@/lib/api/research-availability";

export type ApiHandlerContext = {
  request: Request;
  requestId: string;
  key: ApiKeyContext;
};

type ApiHandlerResult = Response | { response: Response; rowsReturned?: number };

export function apiOptions(request: Request): Response {
  return new Response(null, { status: 204, headers: apiCorsHeaders(request) });
}

export function apiUnavailable(request: Request): Response {
  return apiError(
    503,
    "service_unavailable",
    RESEARCH_API_PAUSE_MESSAGE,
    createRequestId(),
    apiCorsHeaders(request),
  );
}

export async function withApiKey(
  request: Request,
  endpoint: string,
  requiredScope: string,
  handler: (context: ApiHandlerContext) => Promise<ApiHandlerResult>,
): Promise<Response> {
  if (!RESEARCH_API_AVAILABLE) return apiUnavailable(request);

  const requestId = createRequestId();
  const startedAt = performance.now();
  const auth = await authenticateApiRequest(request, requestId, requiredScope);
  if (!auth.ok) {
    await recordApiRequest({
      keyId: auth.keyId ?? null,
      requestId,
      endpoint,
      method: request.method,
      statusCode: auth.response.status,
      startedAt,
    });
    for (const [name, value] of Object.entries(apiCorsHeaders(request)))
      auth.response.headers.set(name, value);
    return auth.response;
  }

  let result: ApiHandlerResult;
  try {
    result = await handler({ request, requestId, key: auth.key });
  } catch (error) {
    console.error(`Research API ${endpoint} failed`, error);
    result = apiError(500, "internal_error", "The API could not complete the request.", requestId);
  }

  const response = result instanceof Response ? result : result.response;
  response.headers.set("X-Request-Id", requestId);
  for (const [name, value] of Object.entries(apiCorsHeaders(request)))
    response.headers.set(name, value);
  await recordApiRequest({
    keyId: auth.key.id,
    requestId,
    endpoint,
    method: request.method,
    statusCode: response.status,
    rowsReturned: result instanceof Response ? 0 : result.rowsReturned,
    startedAt,
  });
  return response;
}
