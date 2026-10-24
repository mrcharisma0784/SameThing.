import { Copy, Download, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { recordAchievementShare } from "@/lib/api/achievements.functions";
import { setShareCardTheme } from "@/lib/api/share-card.functions";
import { useAuth } from "@/hooks/use-auth";
import { effectivePlan } from "@/lib/premium";
import { isLabThingActive } from "@/lib/test-user";
import { getSiteUrl } from "@/lib/site-url";
import {
  SHARE_FONTS,
  SHARE_FORMATS,
  SHARE_PALETTES,
  type ShareFontKey,
  type ShareFormat,
  type SharePaletteKey,
  shareThemeCost,
} from "@/lib/share-card-themes";
import { drawShareCardFooter, layoutShareCardFooter } from "@/lib/share-card-layout";

type ShareTarget = "WhatsApp" | "X" | "Pinterest" | "Telegram" | "Instagram" | "Snapchat";
type QuoteShare = {
  id: string;
  text: string;
  author: string | null;
  is_anonymous: boolean;
  profile?: { username?: string } | null;
  user_id?: string | null;
  is_mine?: boolean;
  share_palette?: SharePaletteKey | null;
  share_font?: ShareFontKey | null;
};

export function MyQuoteShareModal({ quote, onClose }: { quote: QuoteShare; onClose: () => void }) {
  const { user, profile: viewerProfile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<ShareFormat>("story");
  const [paletteKey, setPaletteKey] = useState<SharePaletteKey>(quote.share_palette ?? "ember");
  const [fontKey, setFontKey] = useState<ShareFontKey>(quote.share_font ?? "editorial");
  const [savedPalette, setSavedPalette] = useState<SharePaletteKey>(quote.share_palette ?? "ember");
  const [savedFont, setSavedFont] = useState<ShareFontKey>(quote.share_font ?? "editorial");
  const [rendered, setRendered] = useState(false);
  const [styleSaving, setStyleSaving] = useState(false);
  const recordShare = useServerFn(recordAchievementShare);
  const saveStyle = useServerFn(setShareCardTheme);
  const palette = SHARE_PALETTES[paletteKey];
  const font = SHARE_FONTS[fontKey];
  const isOwner = Boolean(quote.is_mine || (user && quote.user_id === user.id));
  const authorName = getQuoteAttribution(quote, isOwner ? viewerProfile?.username : undefined);
  const isLab = isLabThingActive(viewerProfile);
  const isPremium = effectivePlan(viewerProfile) === "premium" || isLab;
  const styleDirty = paletteKey !== savedPalette || fontKey !== savedFont;
  const styleCost = shareThemeCost(savedPalette, savedFont, paletteKey, fontKey, isPremium);

  const persistStyle = async () => {
    if (!isOwner || !styleDirty || styleSaving) return;
    if (!user) {
      toast.error("Sign in to save a card style.");
      return;
    }
    if (!isPremium && !isLab && Number(viewerProfile?.same_credits ?? 0) < styleCost) {
      toast.error(`You need ${styleCost} Same Credits for this card style change.`);
      return;
    }
    setStyleSaving(true);
    const result = await saveStyle({
      data: {
        target_type: "quote",
        target_id: quote.id,
        palette: paletteKey,
        font: fontKey,
      },
    });
    setStyleSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSavedPalette(paletteKey);
    setSavedFont(fontKey);
    await Promise.all([
      refreshProfile(),
      queryClient.invalidateQueries({ queryKey: ["quotes", "today"] }),
      queryClient.invalidateQueries({ queryKey: ["quotes", "mine"] }),
    ]);
    toast.success(
      result.cost ? `Card style saved · −${result.cost} credits.` : "Card style saved.",
    );
  };

  const recordShareIntent = async () => {
    try {
      await recordShare({ data: { kind: "quote", id: quote.id } });
    } catch {
      // Sharing remains available even if optional achievement evidence is unavailable.
    }
  };
  const publicUrl =
    typeof window === "undefined"
      ? `/quote/${quote.id}`
      : `${window.location.origin}/quote/${quote.id}`;

  useEffect(() => {
    const nextPalette = quote.share_palette ?? "ember";
    const nextFont = quote.share_font ?? "editorial";
    setPaletteKey(nextPalette);
    setFontKey(nextFont);
    setSavedPalette(nextPalette);
    setSavedFont(nextFont);
  }, [quote.id, quote.share_font, quote.share_palette]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const width = 1080;
    const height = format === "story" ? 1920 : 1350;
    const isStory = format === "story";
    const headerY = isStory ? 230 : 185;
    canvas.width = width;
    canvas.height = height;
    setRendered(false);
    ctx.clearRect(0, 0, width, height);

    const background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, palette.start);
    background.addColorStop(0.52, palette.middle);
    background.addColorStop(1, palette.end);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const halo = ctx.createRadialGradient(
      width * 0.76,
      height * 0.36,
      10,
      width * 0.76,
      height * 0.36,
      520,
    );
    halo.addColorStop(0, `${palette.accent}28`);
    halo.addColorStop(1, `${palette.accent}00`);
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 2;
    strokeRoundedRect(ctx, 112, 112, width - 224, height - 224, 34);
    strokeRoundedRect(ctx, 146, 146, width - 292, height - 292, 20);
    drawOrbitalMark(ctx, width - 218, 260, palette.accent, 1.05);

    ctx.fillStyle = palette.accent;
    ctx.font = `600 24px ${font.family}`;
    ctx.fillText(isOwner ? "MYQUOTE." : "FROM A QUOTE", 160, headerY);

    const footerLayout = layoutShareCardFooter(
      ctx,
      [
        {
          text: isOwner ? authorName : `shared from ${authorName}`,
          font: `600 25px ${font.family}`,
          color: palette.ink,
        },
        {
          text: "Quote of the day · SameThing.",
          font: `22px ${font.family}`,
          color: palette.muted,
        },
        {
          text: "SameThing.  ·  same or nah? tap in.",
          font: `22px ${font.family}`,
          color: palette.muted,
        },
        {
          text: getSiteUrl().replace(/^https?:\/\//i, ""),
          font: `18px ${font.family}`,
          color: `${palette.accent}cc`,
        },
      ],
      {
        left: 160,
        maxWidth: 760,
        bottom: height - (isStory ? 170 : 112),
        rowGap: isStory ? 18 : 14,
        minDividerY: headerY + 250,
      },
    );
    const dividerY = footerLayout.dividerY - 44;
    const quoteMaxWidth = 760;
    const textAreaTop = headerY + 120;
    const textAreaBottom = dividerY - 100;
    const textAreaHeight = Math.max(180, textAreaBottom - textAreaTop);
    const maxFontSize = isStory ? 62 : 54;
    const minFontSize = isStory ? 34 : 30;
    let quoteFontSize = maxFontSize;
    let lines: string[] = [];
    let quoteLineGap = quoteFontSize * 1.25;
    let blockHeight = Number.POSITIVE_INFINITY;
    while (quoteFontSize >= minFontSize) {
      ctx.font = `italic ${quoteFontSize}px ${font.family}`;
      lines = wrapText(ctx, `“${quote.text}”`, quoteMaxWidth);
      quoteLineGap = quoteFontSize * 1.25;
      blockHeight = Math.max(quoteFontSize, (lines.length - 1) * quoteLineGap + quoteFontSize);
      if (blockHeight <= textAreaHeight) break;
      quoteFontSize -= 2;
    }
    if (blockHeight > textAreaHeight) {
      const maxLines = Math.max(1, Math.floor((textAreaHeight - quoteFontSize) / quoteLineGap) + 1);
      lines = lines.slice(0, maxLines);
      const lastIndex = lines.length - 1;
      let lastLine = lines[lastIndex] ?? "";
      while (lastLine.length > 1 && ctx.measureText(`${lastLine}…`).width > quoteMaxWidth) {
        lastLine = lastLine.slice(0, -1);
      }
      lines[lastIndex] = `${lastLine}…`;
    }
    ctx.fillStyle = palette.ink;
    ctx.font = `italic ${quoteFontSize}px ${font.family}`;
    blockHeight = Math.max(quoteFontSize, (lines.length - 1) * quoteLineGap + quoteFontSize);
    const startY = textAreaTop + (textAreaHeight - blockHeight) / 2 + quoteFontSize * 0.82;
    lines.forEach((line, index) => ctx.fillText(line, 160, startY + index * quoteLineGap));

    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(160, dividerY);
    ctx.lineTo(920, dividerY);
    ctx.stroke();

    drawShareCardFooter(ctx, footerLayout, 160);
    setRendered(true);
  }, [authorName, font.family, format, isOwner, palette, quote]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  };
  const saveImage = () => {
    void recordShareIntent();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `myquote-${quote.id}-${format}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  const shareNative = async () => {
    void recordShareIntent();
    const canvas = canvasRef.current;
    if (!canvas || !navigator.share) return copyLink();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    const file = blob
      ? new File([blob], `myquote-${quote.id}-${format}.png`, { type: "image/png" })
      : null;
    try {
      if (file && navigator.canShare?.({ files: [file] }))
        await navigator.share({
          title: isOwner ? "MyQuote. · SameThing." : "A Quote on SameThing.",
          text: quote.text,
          url: publicUrl,
          files: [file],
        });
      else
        await navigator.share({
          title: isOwner ? "MyQuote. · SameThing." : "A Quote on SameThing.",
          text: quote.text,
          url: publicUrl,
        });
    } catch {
      // Share cancellation is intentionally silent.
    }
  };
  const shareTo = (target: ShareTarget) => {
    void recordShareIntent();
    const encodedUrl = encodeURIComponent(publicUrl);
    const encodedText = encodeURIComponent(`“${quote.text}” — ${publicUrl}`);
    const urls: Record<ShareTarget, string> = {
      WhatsApp: `https://wa.me/?text=${encodedText}`,
      X: `https://twitter.com/intent/tweet?text=${encodedText}`,
      Pinterest: `https://www.pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodeURIComponent(quote.text)}`,
      Telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(quote.text)}`,
      Instagram: "https://www.instagram.com/",
      Snapchat: "https://www.snapchat.com/",
    };
    window.open(urls[target], "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-2 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Share this quote"
    >
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl italic text-foreground">Share this.</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isOwner
                ? "Your Quote becomes a MyQuote. card."
                : `Attribution stays with ${authorName}.`}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close share dialog"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {SHARE_FORMATS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFormat(option.key)}
              aria-pressed={format === option.key}
              className={`rounded-full border px-3 py-2 text-center text-xs transition-colors ${format === option.key ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
            >
              {option.label} · {option.width}×{option.height}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-background/50 p-3 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Colour
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SHARE_PALETTES) as SharePaletteKey[]).map((key) => {
                const option = SHARE_PALETTES[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPaletteKey(key)}
                    aria-label={`Use ${option.label} colour`}
                    aria-pressed={paletteKey === key}
                    className={`grid h-7 w-7 place-items-center rounded-full border transition-transform ${paletteKey === key ? "scale-110 border-foreground" : "border-border"}`}
                  >
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: option.swatch }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Type
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SHARE_FONTS) as ShareFontKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFontKey(key)}
                  aria-pressed={fontKey === key}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${fontKey === key ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
                  style={{ fontFamily: SHARE_FONTS[key].family }}
                >
                  {SHARE_FONTS[key].label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {isOwner && styleDirty && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent/5 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              {isPremium ? "Premium · free" : `Save style · −${styleCost} Credits`}
            </p>
            <button
              type="button"
              onClick={() => void persistStyle()}
              disabled={
                styleSaving ||
                (!isPremium && !isLab && Number(viewerProfile?.same_credits ?? 0) < styleCost)
              }
              className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {styleSaving ? "Saving…" : "Save style"}
            </button>
          </div>
        )}
        <div className="mx-auto mt-4 max-w-[300px] overflow-hidden rounded-2xl bg-background shadow-lg">
          <canvas
            ref={canvasRef}
            width={1080}
            height={format === "story" ? 1920 : 1350}
            className={`block h-auto w-full ${rendered ? "opacity-100" : "opacity-0"}`}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-3 text-sm text-foreground hover:border-accent"
          >
            <Copy className="h-4 w-4" /> Copy link
          </button>
          <button
            type="button"
            onClick={saveImage}
            className="flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-3 text-sm text-foreground hover:border-accent"
          >
            <Download className="h-4 w-4" /> Save image
          </button>
        </div>
        <button
          type="button"
          onClick={() => void shareNative()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm text-accent-foreground hover:bg-accent/90"
        >
          <Share2 className="h-4 w-4" /> Share via…
        </button>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            ["WhatsApp", "X", "Pinterest", "Telegram", "Instagram", "Snapchat"] as ShareTarget[]
          ).map((target) => (
            <button
              key={target}
              type="button"
              onClick={() => shareTo(target)}
              className="rounded-full border border-border bg-background px-3 py-2 text-xs text-muted-foreground hover:border-accent hover:text-foreground"
            >
              {target}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function getQuoteAttribution(quote: QuoteShare, viewerUsername?: string) {
  if (quote.is_anonymous) return "anonymous";
  const username = quote.profile?.username ?? viewerUsername;
  if (username) return username.startsWith("@") ? username : `@${username}`;
  return quote.author?.trim() || "anonymous";
}

function drawOrbitalMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  scale: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = `${color}88`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 72 * scale, 25 * scale, -0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 25 * scale, 72 * scale, 0.7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 9 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.stroke();
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const pieces =
      ctx.measureText(word).width > maxWidth ? splitLongWord(ctx, word, maxWidth) : [word];
    for (const piece of pieces) {
      const next = current ? `${current} ${piece}` : piece;
      if (ctx.measureText(next).width > maxWidth && current) {
        lines.push(current);
        current = piece;
      } else {
        current = next;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function splitLongWord(ctx: CanvasRenderingContext2D, word: string, maxWidth: number): string[] {
  const pieces: string[] = [];
  let current = "";
  for (const character of word) {
    const next = current + character;
    if (ctx.measureText(next).width > maxWidth && current) {
      pieces.push(current);
      current = character;
    } else {
      current = next;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}
