export type ShareCardFooterRow = {
  text: string;
  font: string;
  color: string;
  lineHeight?: number;
};

export type ShareCardFooterLayout = {
  dividerY: number;
  rows: Array<
    ShareCardFooterRow & {
      lines: string[];
      baseline: number;
      lineHeightPx: number;
    }
  >;
};

const splitLongWord = (ctx: CanvasRenderingContext2D, word: string, maxWidth: number) => {
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
};

export function wrapShareCardText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
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

/**
 * Places all footer copy from the bottom up, so long attribution or metadata
 * never drifts into the divider or out of the card safe area.
 */
export function layoutShareCardFooter(
  ctx: CanvasRenderingContext2D,
  rows: ShareCardFooterRow[],
  options: {
    left: number;
    maxWidth: number;
    bottom: number;
    rowGap: number;
    minDividerY: number;
  },
): ShareCardFooterLayout {
  const measuredRows = rows.map((row) => {
    ctx.font = row.font;
    const lines = wrapShareCardText(ctx, row.text, options.maxWidth);
    const lineHeight = row.lineHeight ?? 1.35;
    const fontSize = Number.parseFloat(row.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? "20");
    return { ...row, lines, lineHeightPx: fontSize * lineHeight, fontSize };
  });

  let cursor = options.bottom;
  const laidOut = [...measuredRows].reverse().map((row) => {
    const height = Math.max(row.fontSize, (row.lines.length - 1) * row.lineHeightPx + row.fontSize);
    const firstBaseline = cursor - height + row.fontSize * 0.82;
    cursor = firstBaseline - row.fontSize * 0.72 - options.rowGap;
    return {
      ...row,
      baseline: firstBaseline,
    };
  });

  const rowsTopDown = laidOut.reverse();
  const dividerY = Math.max(options.minDividerY, cursor);
  return {
    dividerY,
    rows: rowsTopDown,
  };
}

export function drawShareCardFooter(
  ctx: CanvasRenderingContext2D,
  layout: ShareCardFooterLayout,
  left: number,
) {
  for (const row of layout.rows) {
    ctx.fillStyle = row.color;
    ctx.font = row.font;
    row.lines.forEach((line, index) =>
      ctx.fillText(line, left, row.baseline + index * row.lineHeightPx),
    );
  }
}
