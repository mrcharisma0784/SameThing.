import { cn } from "@/lib/utils";

export function Brand({
  className,
  size = "md",
  showMark = true,
  wordmarkClassName,
  markClassName,
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showMark?: boolean;
  wordmarkClassName?: string;
  markClassName?: string;
}) {
  const sizes = {
    sm: "text-[1.12rem]",
    md: "text-[1.48rem]",
    lg: "text-[2rem]",
    xl: "text-[3rem]",
  } as const;
  const markSizes = {
    sm: "h-9 w-9 rounded-lg p-0",
    md: "h-10 w-10 rounded-xl p-0",
    lg: "h-11 w-11 rounded-2xl p-0",
    xl: "h-14 w-14 rounded-2xl p-0",
  } as const;
  return (
    <span className={cn("brand-mark inline-flex items-center gap-2", sizes[size], className)}>
      {showMark && (
        <span
          className={cn(
            "inline-grid shrink-0 place-items-center overflow-hidden border border-border/70 bg-[#f4efe6]",
            markSizes[size],
            markClassName,
          )}
        >
          <img
            src="/pp-logo.png"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain"
          />
        </span>
      )}
      <span className={cn("inline-flex items-baseline", wordmarkClassName)}>
        <span>SameThing</span>
        <span className="dot">.</span>
      </span>
    </span>
  );
}
