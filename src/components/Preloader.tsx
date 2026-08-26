import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SLOT_FRAMES, waitForSlots } from "../lib/slots.ts";

gsap.registerPlugin(useGSAP);

const INK = "#0c0b09";
const PAPER = "#fefefe";

const SEEN_KEY = "cc-preloader-seen"; // full sequence runs once per session

const STILL_S = 0.13; // hold each portrait long enough to register (sub-100ms reads as flicker)

/** The film plays in three reels. The aperture keeps ONE size per reel and
 *  morphs only at reel boundaries — width/height animation forces layout
 *  (and reflows the wordmark halves), so per-cut morphing reads as jitter.
 *  Inside a reel, stills hard-cut like a flip-book. Sizes are em. */
const REELS = [
  { from: 0, to: 4, w: 2.15, h: 3.85 },
  { from: 5, to: 9, w: 2.35, h: 3.3 },
  { from: 10, to: 13, w: 2.55, h: 3.05 },
] as const;
const MAGNET_R = 130;
const MAGNET_PULL = 0.2;
const HOVER_SCALE = 1.2;

/** must match the .preloader--done CSS, which owns the docked position */
const dockFontPx = () => (window.innerWidth <= 640 ? 19 : 17);
const dockBottomPx = () => {
  const p = document.createElement("div");
  p.style.cssText =
    "position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px)";
  document.body.appendChild(p);
  const inset = parseFloat(getComputedStyle(p).paddingBottom) || 0;
  p.remove();
  return 20 + inset;
};

/**
 * loads in centered and closed, the () expands and a film of portraits
 * flips between the parens, they collapse shut, then the wordmark slides to
 * bottom-centre and stays there as the site's brand mark while the page
 * morphs to white. once docked, hover magnetises it to the cursor and
 * replays the film. the component never unmounts.
 */
export default function Preloader({
  onDone,
  onHome,
}: {
  onDone: () => void;
  onHome: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const filmRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current!;
      const bg = bgRef.current!;
      const word = wordRef.current!;
      const frame = frameRef.current!;
      const film = filmRef.current!;
      const stills = Array.from(
        film.querySelectorAll<HTMLImageElement>(".preloader__still")
      );

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (window.location.hash.includes("slow")) {
        gsap.globalTimeline.timeScale(0.25);
      }

      let cancelled = false;
      let filmPlaying = false;
      let docked = false;

      const em = () => parseFloat(getComputedStyle(word).fontSize) || 16;

      gsap.set(frame, { width: 0, height: 0, marginLeft: 0, marginRight: 0 });

      /** hard cut — opacity flips only, never size (size belongs to reels) */
      const showStill = (index: number) => {
        stills.forEach((el, i) => {
          el.style.opacity = i === index ? "1" : "0";
        });
      };

      /**
       * One unbroken movement: from the first cut to the collapse something
       * changes every STILL_S — cuts land on a strict metronome, reel
       * boundaries glide the aperture within a single beat, and the first
       * cut arrives while the opening expand is still settling.
       */
      const playFilm = (opts?: {
        onComplete?: () => void;
        onClosing?: () => void;
      }) => {
        if (filmPlaying) return;
        filmPlaying = true;
        const px = em();
        gsap.set(frame, { autoAlpha: 1 });
        showStill(0);
        const tl = gsap.timeline({
          onComplete: () => {
            filmPlaying = false;
            opts?.onComplete?.();
          },
        });
        tl.to(
          frame,
          {
            width: REELS[0].w * px,
            height: REELS[0].h * px,
            marginLeft: "0.14em",
            marginRight: "0.14em",
            duration: 0.3,
            ease: "expo.out",
          },
          0
        );
        let t = 0.17; // first cut lands inside the expand's settle
        REELS.forEach((reel, r) => {
          if (r > 0) {
            // boundary morph occupies exactly one beat — the rhythm never breaks
            tl.add(() => showStill(reel.from), t);
            tl.to(
              frame,
              {
                width: reel.w * px,
                height: reel.h * px,
                duration: STILL_S,
                ease: "power1.inOut",
              },
              t
            );
            t += STILL_S;
          }
          for (let i = reel.from + 1; i <= reel.to; i++) {
            tl.add(() => showStill(i), t);
            t += STILL_S;
          }
        });
        if (opts?.onClosing) tl.add(opts.onClosing, t);
        tl.to(
          frame,
          {
            width: 0,
            height: 0,
            marginLeft: 0,
            marginRight: 0,
            duration: 0.42,
            ease: "expo.inOut",
          },
          t
        );
      };

      const dockTransform = () => {
        const fontPx = parseFloat(getComputedStyle(word).fontSize);
        const scale = dockFontPx() / fontPx;
        const rect = word.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        // measure text height from a half, not the word box — the open
        // aperture inflates the box, and dock can start mid-collapse
        const textH = word.querySelector(".preloader__half")!.getBoundingClientRect().height;
        const targetY =
          window.innerHeight - dockBottomPx() - (textH * scale) / 2;
        return { y: targetY - centerY, scale };
      };

      const restCenter = () => {
        const scale = Number(gsap.getProperty(word, "scale")) || 1;
        const h = word.offsetHeight * scale;
        return {
          x: window.innerWidth / 2,
          y: window.innerHeight - dockBottomPx() - h / 2,
        };
      };

      const onMagnet = (e: PointerEvent) => {
        if (!docked || reducedMotion) return;
        const rest = restCenter();
        const dx = e.clientX - rest.x;
        const dy = e.clientY - rest.y;
        const d = Math.hypot(dx, dy);
        if (d > MAGNET_R) {
          gsap.to(word, {
            x: 0,
            y: 0,
            duration: 0.55,
            ease: "power3.out",
            overwrite: "auto",
          });
          return;
        }
        const f = (1 - d / MAGNET_R) * MAGNET_PULL;
        gsap.to(word, {
          x: dx * f,
          y: dy * f,
          duration: 0.28,
          ease: "power3.out",
          overwrite: "auto",
        });
      };

      const onEnter = () => {
        if (!docked) return;
        gsap.to(word, {
          scale: HOVER_SCALE,
          duration: 0.4,
          ease: "power3.out",
          overwrite: false,
        });
        if (!reducedMotion) playFilm();
      };
      // (docked hover replay uses the same continuous film)

      const onLeave = () => {
        if (!docked) return;
        gsap.to(word, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: "power3.out",
          overwrite: "auto",
        });
      };

      const bindDock = () => {
        docked = true;
        gsap.set(word, {
          xPercent: -50,
          x: 0,
          y: 0,
          scale: 1,
          transformOrigin: "50% 100%",
        });
        window.addEventListener("pointermove", onMagnet);
        word.addEventListener("pointerenter", onEnter);
        word.addEventListener("pointerleave", onLeave);
      };

      const finish = () => {
        sessionStorage.setItem(SEEN_KEY, "1");
        root.classList.add("preloader--done");
        gsap.set(word, { clearProps: "transform,scale" });
        bindDock();
        onDone();
      };

      const run = async () => {
        const seen =
          sessionStorage.getItem(SEEN_KEY) === "1" &&
          !window.location.hash.includes("loader");
        if (seen) {
          gsap.set(word, { autoAlpha: 1, color: INK });
          gsap.set(bg, { autoAlpha: 0 });
          finish();
          return;
        }

        if (reducedMotion) {
          const { y, scale } = dockTransform();
          gsap
            .timeline({ onComplete: finish })
            .to(word, { autoAlpha: 1, duration: 0.4 })
            .to(word, { y, scale, color: INK, duration: 0.01, delay: 1 })
            .to(bg, { backgroundColor: PAPER, duration: 0.6 }, "<")
            .to(bg, { autoAlpha: 0, duration: 0.01 });
          return;
        }

        gsap.fromTo(
          word,
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.42, ease: "power3.out" }
        );

        // start the film inside the fade's settle — assets gate, motion doesn't
        await Promise.all([
          document.fonts.ready,
          waitForSlots(),
          new Promise((r) => setTimeout(r, 260)),
        ]);
        if (cancelled) return;

        let dockStarted = false;
        const startDock = () => {
          if (cancelled || dockStarted) return;
          dockStarted = true;
          const { y, scale } = dockTransform();
          gsap
            .timeline({ onComplete: finish })
            .to(word, { y, scale, duration: 1.15, ease: "expo.inOut" }, 0)
            .to(
              bg,
              { backgroundColor: PAPER, duration: 0.9, ease: "power2.inOut" },
              0.2
            )
            .to(word, { color: INK, duration: 0.9, ease: "power2.inOut" }, 0.2)
            .to(bg, { autoAlpha: 0, duration: 0.01 });
        };

        // dock begins as the aperture starts closing — one continuous gesture
        playFilm({ onClosing: startDock });
      };

      run();

      return () => {
        cancelled = true;
        docked = false;
        window.removeEventListener("pointermove", onMagnet);
        word.removeEventListener("pointerenter", onEnter);
        word.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: rootRef }
  );

  return (
    <div className="preloader" ref={rootRef}>
      <div className="preloader__bg" ref={bgRef} />
      <button
        type="button"
        className="preloader__word"
        ref={wordRef}
        aria-label="the craft commons - home"
        onClick={onHome}
      >
        <span className="preloader__half">the craft c(</span>
        <div className="preloader__frame" ref={frameRef}>
          <div className="preloader__film" ref={filmRef} aria-hidden="true">
            {SLOT_FRAMES.map((slot, i) => (
              <img
                key={slot.src}
                className="preloader__still"
                src={slot.src}
                alt=""
                draggable={false}
                // React 18 DOM props are lowercase; fetchPriority warns
                {...{ fetchpriority: i < 6 ? "high" : "low" }}
                decoding="async"
              />
            ))}
          </div>
        </div>
        <span className="preloader__half">)mmons</span>
      </button>
    </div>
  );
}
