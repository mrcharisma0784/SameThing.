import { Asterisk } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared avatar mark: uploaded photo when present, otherwise the neutral SameThing star. */
export function ProfileGlyph({
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
  return <Asterisk aria-hidden="true" className={cn("shrink-0", className)} />;
}
