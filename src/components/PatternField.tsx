import { useEffect, useRef } from "react";
import { INK, HUES, hashCell, makeIconPath } from "../lib/mark.ts";

/** grid pitch — finer on narrow screens so the lace keeps its detail */
const cellFor = (w: number) => Math.max(15, Math.min(26, w / 24));
const CURSOR_RADIUS = 170; // px reach of the cursor bulge
const CURSOR_BOOST = 0.55; // how much the cursor inflates nearby glyphs

/**
 * Poster-style field of the () mark: a solid mass hanging from the top that
 * dissolves downward into scattered glyphs (ref: Jancsó Áron, Blend
 * Experiment). Glyphs inflate around the cursor; hovering the CTA sends a
 * rainbow pulse through the pattern (cc-wave-on event).
 */
export default function PatternField({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // No cursor on touch devices — a gentle ripple flows through instead
    const ambient =
      window.matchMedia("(hover: none)").matches && !reducedMotion;
    const RIPPLE_PERIOD_S = 7; // full cycle incl. rest
    const RIPPLE_TRAVEL_S = 4.2; // time the ripple spends crossing
    const RIPPLE_WIDTH = 95; // softness of the front, px
    const RIPPLE_BOOST = 0.3; // gentle inflation

    /** y-position of the ripple front, or null while resting */
    const rippleFront = (now: number) => {
      const t = (now / 1000) % RIPPLE_PERIOD_S;
      if (t >= RIPPLE_TRAVEL_S) return null;
      const p = t / RIPPLE_TRAVEL_S;
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * p); // ease in-out
      const start = -RIPPLE_WIDTH * 2;
      const end = h * 0.8 + w * 0.12 + RIPPLE_WIDTH * 2;
      return start + (end - start) * eased;
    };

    const icon = makeIconPath();

    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      rainbow.width = Math.round(w * dpr);
      rainbow.height = Math.round(h * dpr);
      buildShapeMask();
      dirty = true;
    };

    // Cursor state, smoothed for a fluid feel
    const mouse = { x: -9999, y: -9999 };
    const eased = { x: -9999, y: -9999 };
    let dirty = true;
    let raf = 0;

    // Rainbow wave: a single travelling pulse per CTA hover — it sweeps
    // top-down through the pattern and exits; nothing lingers.
    const WAVE_MS = 2600;
    const wave = { running: false, startedAt: 0, alpha: 0 };
    const rainbow = document.createElement("canvas");
    const rctx = rainbow.getContext("2d")!;

    const onWaveOn = () => {
      if (!wave.running) {
        wave.running = true;
        wave.startedAt = performance.now();
        dirty = true;
      }
    };

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      dirty = true;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
      dirty = true;
    };

    /**
     * Density field: 1 deep inside the hanging mass, 0 outside.
     * The mass covers the top and bulges furthest down at the centre.
     */
    const envelope = (x: number) => {
      const nx = (x - w / 2) / (w / 2); // -1..1
      return h * (0.3 + 0.38 * Math.exp(-2.6 * nx * nx));
    };

    /**
     * Low-res alpha silhouette of the pattern's overall shape (the hanging
     * dome), feathered past its edge. Upscaled bilinearly when composited,
     * it confines the rainbow to the hero pattern.
     */
    const MASK_RES = 64;
    const shapeMask = document.createElement("canvas");
    shapeMask.width = MASK_RES;
    shapeMask.height = MASK_RES;
    const buildShapeMask = () => {
      const mctx = shapeMask.getContext("2d")!;
      const im = mctx.createImageData(MASK_RES, MASK_RES);
      const pad = h * 0.07; // let the bloom breathe slightly past the glyphs
      const feather = h * 0.16;
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

    /**
     * Fluid rainbow band: drifting radial hue blobs, alpha-masked to a soft
     * horizontal band that sweeps from the top down to the dissolve zone.
     */
    const drawRainbow = (now: number, p: number) => {
      // steady glide from above the pattern to past its tip
      const glide = 0.5 - 0.5 * Math.cos(Math.PI * p);
      const waveY = h * (-0.3 + 1.35 * glide);

      rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rctx.clearRect(0, 0, w, h);
      rctx.globalCompositeOperation = "source-over";

      HUES.forEach((hue, i) => {
        const x =
          w * (0.08 + 0.21 * i) +
          Math.sin(now * 0.00055 + i * 1.7) * w * 0.11;
        const y = waveY + Math.sin(now * 0.0004 + i * 2.3) * h * 0.06;
        const r = w * 0.3;
        const g = rctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `hsla(${hue}, 92%, 62%, 0.9)`);
        g.addColorStop(1, `hsla(${hue}, 92%, 62%, 0)`);
        rctx.fillStyle = g;
        rctx.fillRect(x - r, y - r, r * 2, r * 2);
      });

      // Soft band mask around the wave front
      rctx.globalCompositeOperation = "destination-in";
      const m = rctx.createLinearGradient(0, waveY - h * 0.5, 0, waveY + h * 0.5);
      m.addColorStop(0, "rgba(0,0,0,0)");
      m.addColorStop(0.35, "rgba(0,0,0,1)");
      m.addColorStop(0.65, "rgba(0,0,0,1)");
      m.addColorStop(1, "rgba(0,0,0,0)");
      rctx.fillStyle = m;
      rctx.fillRect(0, 0, w, h);

      // Confine the wave to the pattern's overall silhouette
      rctx.imageSmoothingEnabled = true;
      rctx.drawImage(shapeMask, 0, 0, w, h);
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = INK;

      const cell = cellFor(w);
      const cols = Math.ceil(w / cell) + 2;
      const rows = Math.ceil((h * 0.82) / cell) + 1;
      const rippleY = ambient ? rippleFront(performance.now()) : null;

      for (let iy = 0; iy < rows; iy++) {
        for (let ix = 0; ix < cols; ix++) {
          const cx = ix * cell;
          const cy = iy * cell;
          const r = hashCell(ix, iy);

          // Signed depth into the mass, jittered so the edge crumbles
          const t = (envelope(cx) - cy) / (h * 0.22) + (r - 0.5) * 0.35;

          // Boosts only amplify cells that already exist; they fade out
          // just past the pattern's edge so blank space stays blank
          const presence = Math.max(0, Math.min(1, t * 4 + 0.4));
          let boost = 0;

          // Cursor bulge
          if (!reducedMotion && presence > 0) {
            const dx = cx - eased.x;
            const dy = cy - eased.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < CURSOR_RADIUS * CURSOR_RADIUS * 4) {
              boost =
                Math.exp(-d2 / (CURSOR_RADIUS * CURSOR_RADIUS)) *
                CURSOR_BOOST *
                presence;
            }
          }

          // Ambient ripple (touch devices): a soft diagonal front
          if (rippleY !== null && presence > 0) {
            const dRip = cy + cx * 0.12 - rippleY;
            boost +=
              Math.exp(-(dRip * dRip) / (RIPPLE_WIDTH * RIPPLE_WIDTH)) *
              RIPPLE_BOOST *
              presence;
          }

          const s = Math.max(0, Math.min(1, t)) + boost;
          if (s <= 0.02) continue;
          // Sparse dropout near the edge — scattered survivors, like the poster
          if (s < 0.25 && r > s * 3) continue;

          // Tile edge-to-edge; mirror alternate cells for kaleidoscope symmetry
          const size = cell * (0.15 + 0.92 * Math.min(s, 1.15));
          const flipX = ix % 2 ? -1 : 1;
          const flipY = iy % 2 ? -1 : 1;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(boost * 0.6);
          ctx.scale(size * flipX, size * flipY);
          ctx.fill(icon);
          ctx.restore();
        }
      }

      // Composite the rainbow pulse through the pattern
      if (wave.running) {
        const now = performance.now();
        const p = Math.min(1, (now - wave.startedAt) / WAVE_MS);
        // fade in as it enters, fade out as it leaves
        const fadeIn = Math.min(1, p / 0.14);
        const fadeOut = Math.min(1, (1 - p) / 0.2);
        wave.alpha = Math.min(fadeIn, fadeOut);
        if (p >= 1) {
          wave.running = false;
          wave.alpha = 0;
        } else {
          drawRainbow(now, p);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          // saturate the glyphs the wave is crossing
          ctx.globalCompositeOperation = "source-atop";
          ctx.globalAlpha = 0.92 * wave.alpha;
          ctx.drawImage(rainbow, 0, 0);
          // soft bloom in the whitespace around them
          ctx.globalCompositeOperation = "destination-over";
          ctx.globalAlpha = 0.3 * wave.alpha;
          ctx.drawImage(rainbow, 0, 0);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
        }
      }
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dx = mouse.x - eased.x;
      const dy = mouse.y - eased.y;
      const moving = Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;
      if (moving) {
        // jump if the cursor is far away (first entry), otherwise glide
        const far = dx * dx + dy * dy > 500 * 500;
        eased.x = far ? mouse.x : eased.x + dx * 0.16;
        eased.y = far ? mouse.y : eased.y + dy * 0.16;
      }
      // Keep redrawing while a pulse or ambient ripple is travelling
      if (wave.running) dirty = true;
      if (ambient && rippleFront(performance.now()) !== null) dirty = true;
      if (dirty || moving) {
        draw();
        dirty = false;
      }
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("cc-wave-on", onWaveOn);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("cc-wave-on", onWaveOn);
    };
  }, []);

  return (
    <canvas
      className={`pattern-field ${active ? "pattern-field--visible" : ""}`}
      ref={canvasRef}
      aria-hidden="true"
    />
  );
}
