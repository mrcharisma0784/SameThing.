import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type PreparedProfilePhoto = { image: string; mime: "image/webp" | "image/gif" };
export function ProfilePhotoPicker({
  premium,
  busy,
  onPrepared,
}: {
  premium: boolean;
  busy?: boolean;
  onPrepared: (photo: PreparedProfilePhoto) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const choose = async (file?: File) => {
    setError("");
    if (!file) return;
    if (file.type === "image/gif") {
      if (!premium) {
        setError("Animated GIF profile photos require Premium.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("GIFs must be 2 MiB or smaller.");
        return;
      }
      onPrepared({ image: await asDataUrl(file), mime: "image/gif" });
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      setError("Choose a JPEG, PNG, WebP, AVIF or GIF image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Photos must be 5 MiB or smaller before conversion.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const side = Math.min(bitmap.width, bitmap.height);
      const sx = (bitmap.width - side) / 2,
        sy = (bitmap.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Image conversion isn't available.");
      ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, 512, 512);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Could not convert this photo."))),
          "image/webp",
          0.84,
        ),
      );
      if (blob.size > 5 * 1024 * 1024) throw new Error("Converted photo exceeds the 5 MiB limit.");
      onPrepared({ image: await asDataUrl(blob), mime: "image/webp" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare this photo.");
    }
  };
  return (
    <div className="space-y-1">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="sr-only"
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.currentTarget.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="rounded-full"
      >
        Choose a photo
      </Button>
      <p className="text-[10px] text-muted-foreground">
        Choose an existing image from your device; no in-app camera capture. Still photos up to 5
        MiB; Premium GIFs up to 2 MiB, 5 seconds and 12 fps.
      </p>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
async function asDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Could not read this photo."));
    r.readAsDataURL(blob);
  });
}
