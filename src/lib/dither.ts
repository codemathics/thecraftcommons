import { hashCell } from "./mark.ts";

/** 4x4 ordered dither matrix, classic bayer thresholds 0..15 */
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * paint a centre-out dither mask: opaque white cells are revealed,
 * transparent cells stay hidden. progress 0 = nothing, 1 = solid.
 * hashCell grain keeps the dissolve in the same family as the lace.
 */
export function paintDither(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  progress: number
): void {
  ctx.clearRect(0, 0, w, h);
  if (progress <= 0) return;
  if (progress >= 1) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    return;
  }

  const img = ctx.createImageData(w, h);
  const data = img.data;
  const cx = (w - 1) * 0.5;
  const cy = (h - 1) * 0.5;
  const maxR =
    Math.hypot(
      Math.max(cx, w - 1 - cx),
      Math.max(cy, h - 1 - cy)
    ) || 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dist = Math.hypot(x - cx, y - cy) / maxR;
      const bayer = BAYER4[y & 3][x & 3] / 16;
      const grain = hashCell(x, y) * 0.1;
      const threshold = dist * 0.76 + bayer * 0.2 + grain;
      if (progress > threshold) {
        const i = (y * w + x) * 4;
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}
