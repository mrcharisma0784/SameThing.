import { Asterisk } from "lucide-react";
import { cn } from "@/lib/utils";
import { AVATARS } from "@/lib/avatars";

const avatarAssetByChar = new Map(
  AVATARS.map((avatar, index) => [
    avatar.char,
    `/avatar-icons/avatar-${String(index + 1).padStart(2, "0")}.svg`,
  ]),
);

export function ProfileGlyph({
  value,
  className,
  strokeWidth: _strokeWidth = 1.7,
}: {
  value?: string | null;
  className?: string;
  strokeWidth?: number;
}) {
  const asset = value ? avatarAssetByChar.get(value) : undefined;
  if (!asset) {
    return <Asterisk aria-hidden="true" className={cn("shrink-0", className)} />;
  }

  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        maskImage: `url(${asset})`,
        WebkitMaskImage: `url(${asset})`,
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}
