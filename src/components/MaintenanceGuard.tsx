import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useLocation } from "@tanstack/react-router";
import { getMaintenanceStatus } from "@/lib/api/maintenance.functions";
import { findActiveMaintenanceTarget } from "@/lib/maintenance-targets";

function MaintenanceView({
  note,
  targetLabel,
}: {
  note: string | null;
  targetLabel?: string | null;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-6 text-foreground">
      <main className="w-full max-w-sm text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-[1.35rem] border border-accent/30 bg-[#f4efe6] shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
          <img
            src="/pp-logo.png"
            alt="SameThing."
            className="h-full w-full rounded-[1.2rem] object-cover"
          />
        </div>
        <h1 className="mt-7 font-serif text-4xl italic text-foreground">
          Maintenance<span className="dot">.</span>
        </h1>
        {targetLabel && (
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-accent">{targetLabel}</p>
        )}
        <p className="mx-auto mt-4 max-w-xs text-sm leading-7 text-muted-foreground">
          {note || "We’re making a few careful improvements. Please check back soon."}
        </p>
      </main>
    </div>
  );
}

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const getStatus = useServerFn(getMaintenanceStatus);
  const { data } = useQuery({
    queryKey: ["site", "maintenance"],
    queryFn: () => getStatus(),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return children;
  if (data?.enabled) return <MaintenanceView note={data.note} />;
  const target = findActiveMaintenanceTarget(data, pathname);
  if (target) {
    return (
      <MaintenanceView
        note={
          target.note ||
          `${target.label} is taking a short maintenance pause. Please check back soon.`
        }
        targetLabel={target.label}
      />
    );
  }
  return children;
}
