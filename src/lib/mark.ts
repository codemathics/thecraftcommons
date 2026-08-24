/** Shared brand-mark drawing utilities: the () glyph as canvas geometry. */

/** The brand mark, raw path (viewBox 822x900) */
export const ICON_D =
  "M821.387 0V255.682V357.954H584.772C584.772 193.531 612.5 108.356 495 108.356C396.713 108.356 388.117 153.209 390.231 244.98C391.845 315.066 356.294 380.081 296.254 416.274L210.137 468.186C136.863 512.357 94.4554 604.721 152.169 667.882C261.336 787.352 465.711 795.542 548.931 661.363C568.588 629.67 581.485 590.034 584.772 542.046H821.387V644.318V900H0V661.363V238.637V0H821.387Z";

export const INK = "#0c0b09";
export const PAPER = "#fefefe";

/** Rainbow hues shared by every wave: magenta, violet, orange, yellow, green */
export const HUES = [318, 268, 24, 56, 150];

/** deterministic per-cell pseudo-random */
export function hashCell(ix: number, iy: number): number {
  let h = ix * 374761393 + iy * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

/** The icon as a Path2D normalized to unit height, centered on origin */
export function makeIconPath(): Path2D {
  const raw = new Path2D(ICON_D);
  const icon = new Path2D();
  icon.addPath(raw, new DOMMatrix().scale(1 / 900).translate(-411, -450));
  return icon;
}
