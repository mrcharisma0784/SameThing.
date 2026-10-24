export type MaintenanceTarget = {
  key: string;
  target_type: "page" | "feature";
  path: string | null;
  label: string;
  description: string;
  enabled: boolean;
  note: string | null;
  updated_at: string | null;
};

export type MaintenanceStatusLike =
  | {
      targets?: MaintenanceTarget[] | null;
    }
  | null
  | undefined;

export function findActiveMaintenanceTarget(
  status: MaintenanceStatusLike,
  pathname: string,
): MaintenanceTarget | null {
  return (
    status?.targets?.find(
      (target) =>
        target.enabled &&
        target.target_type === "page" &&
        Boolean(target.path) &&
        (pathname === target.path || pathname.startsWith(`${target.path}/`)),
    ) ?? null
  );
}
