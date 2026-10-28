import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
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
  const [preparing, setPreparing] = useState(false);

  const choose = async (file?: File) => {
    setError("");
    if (!file) return;
    setPreparing(true);
    try {
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

      const bitmap = await createImageBitmap(file);
      try {
        const side = Math.min(bitmap.width, bitmap.height);
        const sx = (bitmap.width - side) / 2;
        const sy = (bitmap.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Image conversion isn't available.");
        ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, 512, 512);
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (result) =>
              result ? resolve(result) : reject(new Error("Could not convert this photo.")),
            "image/webp",
            0.84,
          ),
        );
        if (blob.size > 5 * 1024 * 1024) {
          throw new Error("Converted photo exceeds the 5 MiB limit.");
        }
        onPrepared({ image: await asDataUrl(blob), mime: "image/webp" });
      } finally {
        bitmap.close();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare this photo.");
    } finally {
      setPreparing(false);
    }
  };

  const disabled = Boolean(busy || preparing);
  return (
    <div className="space-y-2">
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
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="h-auto w-full justify-start gap-3 rounded-xl border-dashed bg-background p-3 text-left hover:border-accent/50 hover:bg-secondary/30"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <ImagePlus className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">
            {preparing ? "Preparing photo…" : busy ? "Saving photo…" : "Choose from gallery"}
          </span>
          <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
            Select an existing image from your device
          </span>
        </span>
      </Button>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Still photos: up to 5 MiB. Premium GIFs: up to 2 MiB, 5 seconds and 12 fps. Camera capture
        is not enabled in the app.
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
