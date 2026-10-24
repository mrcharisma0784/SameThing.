import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { validateUsernames } from "@/lib/api/mentions.functions";
import { extractMentions } from "@/components/MentionTextarea";

/** Given one or more texts, return a Set of usernames that actually exist. */
export function useValidMentions(texts: string[]): Set<string> {
  const fn = useServerFn(validateUsernames);
  const names = useMemo(() => {
    const s = new Set<string>();
    for (const t of texts) if (t) for (const n of extractMentions(t)) s.add(n);
    return Array.from(s).sort();
  }, [texts]);

  const key = names.join(",");
  const { data } = useQuery({
    queryKey: ["valid-mentions", key],
    queryFn: async () => (await fn({ data: { names } })).valid,
    enabled: names.length > 0,
    staleTime: 60_000,
  });

  return useMemo(() => new Set(data ?? []), [data]);
}
