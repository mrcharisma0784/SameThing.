import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type VisibilityTargetType = "thing" | "quote" | "comment" | "user";

export type VisibilityTarget = {
  type: VisibilityTargetType;
  id: string;
  authorId?: string | null;
};

type VisibilityContext = {
  hiddenKeys: Set<string>;
  blockedUserIds: Set<string>;
};

function key(type: VisibilityTargetType, id: string) {
  return `${type}:${id}`;
}

/**
 * Reports and blocks are viewer-owned privacy decisions. The service-role reads
 * used by server functions must apply them before enrichment or serialization.
 */
export async function getVisibilityContext(
  viewerId: string | null,
  targets: VisibilityTarget[],
): Promise<VisibilityContext> {
  if (!viewerId || targets.length === 0) {
    return { hiddenKeys: new Set(), blockedUserIds: new Set() };
  }

  const idsByType = new Map<VisibilityTargetType, string[]>();
  for (const target of targets) {
    const ids = idsByType.get(target.type) ?? [];
    ids.push(target.id);
    idsByType.set(target.type, ids);
  }

  const reportReads = Array.from(idsByType.entries()).map(async ([type, ids]) => {
    const { data } = await supabaseAdmin
      .from("reports")
      .select("target_type, target_id")
      .eq("reporter_id", viewerId)
      .eq("target_type", type)
      .in("target_id", Array.from(new Set(ids)));
    return (data ?? []) as Array<{ target_type: VisibilityTargetType; target_id: string }>;
  });

  const [reportRows, { data: blockRows }] = await Promise.all([
    Promise.all(reportReads).then((groups) => groups.flat()),
    supabaseAdmin
      .from("blocks" as never)
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`),
  ]);

  const hiddenKeys = new Set(reportRows.map((report) => key(report.target_type, report.target_id)));
  const blockedUserIds = new Set<string>();
  for (const block of (blockRows ?? []) as unknown as Array<{
    blocker_id: string;
    blocked_id: string;
  }>) {
    if (block.blocker_id === viewerId) blockedUserIds.add(block.blocked_id);
    if (block.blocked_id === viewerId) blockedUserIds.add(block.blocker_id);
  }

  return { hiddenKeys, blockedUserIds };
}

export function isVisibleTarget(context: VisibilityContext, target: VisibilityTarget) {
  if (context.hiddenKeys.has(key(target.type, target.id))) return false;
  if (target.authorId && context.blockedUserIds.has(target.authorId)) return false;
  return true;
}

export function filterVisibleTargets<T extends VisibilityTarget>(
  context: VisibilityContext,
  rows: T[],
): T[] {
  return rows.filter((row) => isVisibleTarget(context, row));
}

export function getBlockedUserIds(context: VisibilityContext) {
  return context.blockedUserIds;
}
