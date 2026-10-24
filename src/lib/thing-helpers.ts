export const TAGS = [
  "daily life",
  "relationships",
  "work",
  "family",
  "social",
  "mental",
  "habits",
  "fears",
] as const;

export type Tag = (typeof TAGS)[number];

export function similarityLabel(score: number, totalVotes: number): string {
  if (totalVotes === 0) return "No one has voted yet.";
  if (score === 0) return "Just you, in this universe.";
  if (score <= 30) return "A small, quiet club.";
  if (score <= 60) return "More common than you thought.";
  if (score <= 85) return "You're far from alone.";
  return "A near-universal feeling.";
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.round(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

export function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const s = Math.floor(diff / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"}`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"}`;
  const w = Math.floor(days / 7);
  return `${w} ${w === 1 ? "week" : "weeks"}`;
}

export function isBadgeActive(sameCount: number, totalVotes: number): boolean {
  return totalVotes >= 1 && sameCount === 0;
}
