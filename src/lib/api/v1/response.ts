export function createRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}

export function apiResponse<T>(
  data: T,
  requestId: string,
  init: ResponseInit = {},
  extraMeta: Record<string, unknown> = {},
) {
  return Response.json(
    {
      data,
      meta: {
        api_version: "1",
        request_id: requestId,
        generated_at: new Date().toISOString(),
        ...extraMeta,
      },
    },
    {
      ...init,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        ...(init.headers ?? {}),
      },
    },
  );
}

export function apiError(
  status: number,
  code: string,
  message: string,
  requestId: string,
  headers: HeadersInit = {},
) {
  return Response.json(
    {
      error: {
        code,
        message,
        request_id: requestId,
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        ...headers,
      },
    },
  );
}
