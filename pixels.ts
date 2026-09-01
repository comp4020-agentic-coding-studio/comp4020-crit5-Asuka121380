// Crisp, integer-snapped drawing primitives for pixel art.
//
// Canvas2D always anti-aliases filled/stroked vector paths (ctx.arc,
// ctx.ellipse, a non-axis-aligned ctx.rotate) regardless of
// ctx.imageSmoothingEnabled --- that flag only affects drawImage scaling.
// Every sprite in this game is built from the primitives below instead, so
// nothing ever renders a blended, anti-aliased edge: circles are plotted
// with a midpoint-circle algorithm, polygons are filled with an integer
// scanline rasterizer, and everything else snaps to whole pixels before it
// ever reaches fillRect.

export type Bitmap = string[];
export type Palette = Record<string, string>;
export type Point = [number, number];

export function pixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function pixelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.max(1, Math.round(x + w) - rx);
  const rh = Math.max(1, Math.round(y + h) - ry);
  ctx.fillStyle = color;
  ctx.fillRect(rx, ry, rw, rh);
}

/** A tiny hand-authored ASCII-art grid: one character per pixel, mapped
 * through a palette. "." and " " are transparent. */
export function drawBitmap(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rows: Bitmap,
  palette: Palette,
  scale = 1,
): void {
  const ox = Math.round(x);
  const oy = Math.round(y);
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === "." || ch === " ") continue;
      const color = palette[ch];
      if (!color) continue;
      pixelRect(ctx, ox + i * scale, oy + j * scale, scale, scale, color);
    }
  }
}

export function bitmapSize(rows: Bitmap, scale = 1): { width: number; height: number } {
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0) * scale;
  return { width, height: rows.length * scale };
}

/** Even-odd scanline polygon fill. Crisp because every span drawn is an
 * axis-aligned integer fillRect --- no path-fill coverage math ever runs,
 * so a rotated polygon is exactly as sharp as an axis-aligned one. */
export function pixelPoly(ctx: CanvasRenderingContext2D, points: Point[], color: string): void {
  if (points.length < 3) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, py] of points) {
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
  const top = Math.floor(minY);
  const bottom = Math.ceil(maxY);
  ctx.fillStyle = color;
  for (let y = top; y <= bottom; y++) {
    const scanY = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= scanY && y2 > scanY) || (y2 <= scanY && y1 > scanY)) {
        const t = (scanY - y1) / (y2 - y1);
        xs.push(x1 + t * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xStart = Math.round(xs[i]);
      const xEnd = Math.round(xs[i + 1]);
      if (xEnd > xStart) ctx.fillRect(xStart, y, xEnd - xStart, 1);
    }
  }
}

export function rotatePoints(points: Point[], angle: number): Point[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]);
}

/** Midpoint circle: a filled disc via horizontal spans, or a 1px ring. */
export function pixelCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  filled = true,
): void {
  const rr = Math.round(r);
  const ccx = Math.round(cx);
  const ccy = Math.round(cy);
  ctx.fillStyle = color;
  if (rr <= 0) {
    ctx.fillRect(ccx, ccy, 1, 1);
    return;
  }
  let x = rr;
  let y = 0;
  let err = 1 - x;
  const span = (yy: number, x1: number, x2: number): void => {
    if (filled) {
      ctx.fillRect(ccx + x1, ccy + yy, x2 - x1 + 1, 1);
    } else {
      ctx.fillRect(ccx + x1, ccy + yy, 1, 1);
      ctx.fillRect(ccx + x2, ccy + yy, 1, 1);
    }
  };
  while (x >= y) {
    span(y, -x, x);
    span(-y, -x, x);
    span(x, -y, y);
    span(-x, -y, y);
    y++;
    if (err < 0) {
      err += 2 * y + 1;
    } else {
      x--;
      err += 2 * (y - x) + 1;
    }
  }
}

/** A partial ring built from discrete plotted pixels, for a continuously
 * sweeping progress ring (charge, countdown) --- no ctx.arc involved. */
export function pixelArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  color: string,
): void {
  const rr = Math.max(1, Math.round(r));
  const steps = Math.max(8, Math.round(rr * 6));
  const span = endAngle - startAngle;
  ctx.fillStyle = color;
  const seen = new Set<string>();
  for (let i = 0; i <= steps; i++) {
    const t = startAngle + (span * i) / steps;
    const x = Math.round(cx + Math.cos(t) * rr);
    const y = Math.round(cy + Math.sin(t) * rr);
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ctx.fillRect(x, y, 1, 1);
  }
}

/** A dithered rim: every other rim pixel is knocked back to a second color,
 * faking anti-aliased edge falloff with a deliberate dot pattern instead. */
export function ditherRim(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  edgeColor: string,
): void {
  const steps = Math.max(12, Math.round(r * 4));
  ctx.fillStyle = edgeColor;
  for (let i = 0; i < steps; i += 2) {
    const angle = (i / steps) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(angle) * r);
    const y = Math.round(cy + Math.sin(angle) * r);
    ctx.fillRect(x, y, 1, 1);
  }
}

/** A ringed ellipse (Saturn's rings), plotted point-by-point --- the pixel
 * equivalent of a stroked, rotated ctx.ellipse. */
export function pixelEllipseRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number,
  color: string,
): void {
  const steps = Math.max(16, Math.round((rx + ry) * 3));
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  ctx.fillStyle = color;
  const seen = new Set<string>();
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const lx = Math.cos(t) * rx;
    const ly = Math.sin(t) * ry;
    const x = Math.round(cx + lx * cos - ly * sin);
    const y = Math.round(cy + lx * sin + ly * cos);
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ctx.fillRect(x, y, 1, 1);
  }
}

// A tiny 3x5 bitmap digit font, used for the HUD timer and the countdown
// numeral so the only text drawn anywhere in the game is genuine pixel art
// rather than an anti-aliased browser font.
const DIGIT_BITMAPS: Record<string, Bitmap> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", "###", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", "..#", "..#", "..#"],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
};
const DIGIT_GLYPH_WIDTH = 3;
const DIGIT_GLYPH_SPACING = 1;

export function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  align: "left" | "right" = "left",
  scale = 1,
): void {
  const glyphs = [...text].map((ch) => DIGIT_BITMAPS[ch] ?? DIGIT_BITMAPS["0"]);
  const step = (DIGIT_GLYPH_WIDTH + DIGIT_GLYPH_SPACING) * scale;
  const totalWidth = glyphs.length * step - DIGIT_GLYPH_SPACING * scale;
  let cursor = align === "right" ? x - totalWidth : x;
  const palette: Palette = { "#": color };
  for (const glyph of glyphs) {
    drawBitmap(ctx, cursor, y, glyph, palette, scale);
    cursor += step;
  }
}

export function pixelTextWidth(text: string, scale = 1): number {
  const step = (DIGIT_GLYPH_WIDTH + DIGIT_GLYPH_SPACING) * scale;
  return text.length * step - DIGIT_GLYPH_SPACING * scale;
}
