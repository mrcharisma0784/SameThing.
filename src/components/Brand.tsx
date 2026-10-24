import { cn } from "@/lib/utils";

export function Brand({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-6xl",
  } as const;
  return (
    <span className={cn("brand-mark inline-flex items-baseline", sizes[size], className)}>
      <span>SameThing</span>
      <span className="dot">.</span>
    </span>
  );
}
