const CURRENT_PRODUCTION_URL = "https://samething-production.vercel.app";

function readEnvironmentUrl() {
  const publicUrl = import.meta.env.VITE_SITE_URL?.trim();
  const projectProductionUrl =
    typeof process !== "undefined" ? process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() : undefined;
  return publicUrl || projectProductionUrl || CURRENT_PRODUCTION_URL;
}

export function getSiteUrl(path = "") {
  const configuredUrl = readEnvironmentUrl();
  const browserUrl = typeof window !== "undefined" ? window.location.origin : undefined;
  const rawUrl = configuredUrl || browserUrl || "http://localhost:3000";
  const origin = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const normalizedOrigin = origin.replace(/\/+$/, "");
  if (!path) return normalizedOrigin;
  return `${normalizedOrigin}/${path.replace(/^\/+/, "")}`;
}
