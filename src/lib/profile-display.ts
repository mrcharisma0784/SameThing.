export const DEFAULT_BIO = "A little mystery leaves room for connection.";

export function displayBio(bio: string | null | undefined): string {
  if (bio === null || bio === undefined) return DEFAULT_BIO;
  const trimmed = bio.trim();
  return trimmed || "—";
}
