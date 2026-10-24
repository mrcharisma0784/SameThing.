import { createHmac, timingSafeEqual } from "node:crypto";

const CURSOR_SECRET = () =>
  process.env.RESEARCH_API_CURSOR_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "same-thing-cursor";

type CursorPayload = { created_at: string; id: string };

function sign(value: string): string {
  return createHmac("sha256", CURSOR_SECRET()).update(value, "utf8").digest("base64url");
}

export function encodeCursor(payload: CursorPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeCursor(value: string | null): CursorPayload | null {
  if (!value || value.length > 400) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Partial<CursorPayload>;
    if (typeof payload.created_at !== "string" || typeof payload.id !== "string") return null;
    return { created_at: payload.created_at, id: payload.id };
  } catch {
    return null;
  }
}

export function parseLimit(request: Request): number {
  const raw = Number(new URL(request.url).searchParams.get("limit") ?? "25");
  if (!Number.isFinite(raw)) return 25;
  return Math.min(100, Math.max(1, Math.floor(raw)));
}
