import { cn } from "@/lib/utils";

/** Shared avatar mark: uploaded photo when present, otherwise the neutral SameThing star. */
export function ProfileGlyph({
  value,
  photoUrl,
  photoClassName,
  className,
}: {
  value?: string | null;
  photoUrl?: string | null;
  photoClassName?: string;
  className?: string;
  strokeWidth?: number;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={cn("shrink-0 rounded-full object-cover", photoClassName ?? className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center leading-none", className)}
    >
      {value || "✹"}
    </span>
  );
}
