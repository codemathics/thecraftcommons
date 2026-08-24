import { useEffect, useRef } from "react";
import { INK, HUES, hashCell, makeIconPath } from "../lib/mark.ts";

/** grid pitch — finer on narrow screens so the band keeps its detail */
const cellFor = (w: number) => Math.max(12, Math.min(18, w / 34));
const BAND_H = 150;
const WAVE_MS = 2200;

/**
 * The hero pattern compressed into a shallow band, doubling as the form's
 * progress indicator: it assembles left-to-right as `progress` (0..1) grows,
 * with a crumbly frontier like the homepage dissolve. Dispatch a
 * "cc-band-wave" window event to send a rainbow pulse through it
 * left-to-right, masked to the glyphs (used on form submit).
 */
export default function PatternBand({ progress = 1 }: { progress?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  const drawRef = useRef<() => void>(() => {});

  useEffect(() => {
    progressRef.current = progress;
    drawRef.current();
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const icon = makeIconPath();

    const rainbow = document.createElement("canvas");
    const rctx = rainbow.getContext("2d")!;

    let w = 0;
    const h = BAND_H;
    let dpr = 1;
    let raf = 0;
    const wave = { running: false, startedAt: 0 };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.parentElement?.clientWidth ?? window.innerWidth;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      rainbow.width = canvas.width;
      rainbow.height = canvas.height;
      buildShapeMask();
      draw();
    };

    // Density: solid along the top, dissolving toward the band bottom,
    // reaching slightly lower at the centre
    const envelope = (x: number) => {
      const nx = (x - w / 2) / (w / 2);
      return h * (0.42 + 0.3 * Math.exp(-2.6 * nx * nx));
    };

    // Soft alpha silhouette of the band's shape — keeps the wave's bloom
    // feathering out along the dissolve instead of cutting off at the
    // canvas edge (same technique as the hero pattern's mask)
    const MASK_RES = 64;
    const shapeMask = document.createElement("canvas");
    shapeMask.width = MASK_RES;
    shapeMask.height = MASK_RES;
    const buildShapeMask = () => {
      const mctx = shapeMask.getContext("2d")!;
      const im = mctx.createImageData(MASK_RES, MASK_RES);
      const pad = h * 0.1;
      const feather = h * 0.45;
      for (let j = 0; j < MASK_RES; j++) {
        const y = (j / (MASK_RES - 1)) * h;
        for (let i = 0; i < MASK_RES; i++) {
          const x = (i / (MASK_RES - 1)) * w;
          const a = Math.max(
            0,
            Math.min(1, (envelope(x) + pad - y) / feather)
          );
          const idx = (j * MASK_RES + i) * 4;
          im.data[idx + 3] = Math.round(a * 255);
        }
      }
      mctx.putImageData(im, 0, 0);
    };

    const drawRainbow = (now: number, p: number) => {
      const glide = 0.5 - 0.5 * Math.cos(Math.PI * p);
      const waveX = w * (-0.35 + 1.7 * glide);
      rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rctx.clearRect(0, 0, w, h);
      rctx.globalCompositeOperation = "source-over";
      HUES.forEach((hue, i) => {
        const x = waveX + (i - 2) * h * 0.9;
        const y = h * 0.4 + Math.sin(now * 0.0005 + i * 2.1) * h * 0.15;
        const r = h * 1.6;
        const g = rctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `hsla(${hue}, 92%, 62%, 0.9)`);
        g.addColorStop(1, `hsla(${hue}, 92%, 62%, 0)`);
        rctx.fillStyle = g;
        rctx.fillRect(x - r, y - r, r * 2, r * 2);
      });
      // soft horizontal window around the travelling front
      rctx.globalCompositeOperation = "destination-in";
      const m = rctx.createLinearGradient(waveX - w * 0.4, 0, waveX + w * 0.4, 0);
      m.addColorStop(0, "rgba(0,0,0,0)");
      m.addColorStop(0.4, "rgba(0,0,0,1)");
      m.addColorStop(0.6, "rgba(0,0,0,1)");
      m.addColorStop(1, "rgba(0,0,0,0)");
      rctx.fillStyle = m;
      rctx.fillRect(0, 0, w, h);

      // Confine the wave to the band's silhouette with a soft feather
      rctx.imageSmoothingEnabled = true;
      rctx.drawImage(shapeMask, 0, 0, w, h);
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = INK;

      // Progress reveal: glyphs exist only left of the advancing frontier
      const prog = progressRef.current;
      const fadeW = w * 0.14;
      const limit = prog * (w + fadeW);

      const cell = cellFor(w);
      const cols = Math.ceil(w / cell) + 2;
      const rows = Math.ceil(h / cell) + 1;
      for (let iy = 0; iy < rows; iy++) {
        for (let ix = 0; ix < cols; ix++) {
          const cx = ix * cell;
          const cy = iy * cell;
          const r = hashCell(ix, iy);

          const reveal = Math.max(0, Math.min(1, (limit - cx) / fadeW));
          if (reveal <= 0.02) continue;
          if (reveal < 1 && r > reveal * 2) continue; // crumbly frontier

          const t = (envelope(cx) - cy) / (h * 0.4) + (r - 0.5) * 0.35;
          const s = Math.max(0, Math.min(1, t));
          if (s <= 0.02) continue;
          if (s < 0.25 && r > s * 3) continue;
          const size =
            cell * (0.15 + 0.92 * Math.min(s, 1.15)) * (0.3 + 0.7 * reveal);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(size * (ix % 2 ? -1 : 1), size * (iy % 2 ? -1 : 1));
          ctx.fill(icon);
          ctx.restore();
        }
      }

      if (wave.running) {
        const now = performance.now();
        const p = Math.min(1, (now - wave.startedAt) / WAVE_MS);
        const alpha = Math.min(Math.min(1, p / 0.15), Math.min(1, (1 - p) / 0.2));
        if (p >= 1) {
          wave.running = false;
        } else {
          drawRainbow(now, p);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalCompositeOperation = "source-atop";
          ctx.globalAlpha = 0.92 * alpha;
          ctx.drawImage(rainbow, 0, 0);
          ctx.globalCompositeOperation = "destination-over";
          ctx.globalAlpha = 0.25 * alpha;
          ctx.drawImage(rainbow, 0, 0);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
        }
      }
    };

    const tick = () => {
      if (wave.running) {
        draw();
        raf = requestAnimationFrame(tick);
      }
    };

    const onWave = () => {
      if (!wave.running) {
        wave.running = true;
        wave.startedAt = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
      }
    };

    drawRef.current = draw;
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("cc-band-wave", onWave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("cc-band-wave", onWave);
    };
  }, []);

  return <canvas className="pattern-band" ref={canvasRef} aria-hidden="true" />;
}
