import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const INK = "#0c0b09";
const PAPER = "#fefefe";

const SEEN_KEY = "cc-preloader-seen"; // full sequence runs once per session

const COUNT_S = 2.1; // 0 → 100 duration

/** must match the .preloader--done CSS, which owns the docked position */
const dockFontPx = () => (window.innerWidth <= 640 ? 19 : 17);
const dockBottomPx = () => {
  // resolve env(safe-area-inset-bottom) through a probe element
  const p = document.createElement("div");
  p.style.cssText =
    "position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px)";
  document.body.appendChild(p);
  const inset = parseFloat(getComputedStyle(p).paddingBottom) || 0;
  p.remove();
  return 20 + inset;
};

/**
 * Loads in centered and closed, the () expands and a counter runs 0 → 100
 * between the parens, they collapse shut, then the wordmark slides to
 * bottom-centre and stays there as the site's brand mark while the page
 * morphs to white. The component never unmounts.
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
  const countRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current!;
      const bg = bgRef.current!;
      const word = wordRef.current!;
      const frame = frameRef.current!;
      const count = countRef.current!;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      // Dev aid: append #slow to the URL to run the sequence at 1/4 speed
      if (window.location.hash.includes("slow")) {
        gsap.globalTimeline.timeScale(0.25);
      }

      let cancelled = false;

      // The frame's open size (CSS sets it; we capture then close it)
      const openW = frame.offsetWidth;
      const openH = frame.offsetHeight;
      gsap.set(frame, { width: 0, height: 0, marginLeft: 0, marginRight: 0 });

      const dockTransform = () => {
        // From viewport centre to bottom-centre, shrunk to signature size
        const fontPx = parseFloat(getComputedStyle(word).fontSize);
        const scale = dockFontPx() / fontPx;
        const rect = word.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const targetY =
          window.innerHeight - dockBottomPx() - (rect.height * scale) / 2;
        return { y: targetY - centerY, scale };
      };

      const finish = () => {
        sessionStorage.setItem(SEEN_KEY, "1");
        root.classList.add("preloader--done");
        // CSS owns the docked position from here (fixed bottom-centre,
        // safe-area aware, resize-proof) — drop the animation transform
        gsap.set(word, { clearProps: "transform,scale" });
        onDone();
      };

      const run = async () => {
        // Wait for the serif so the wordmark doesn't swap mid-animation
        await Promise.race([
          document.fonts.ready,
          new Promise((r) => setTimeout(r, 1500)),
        ]);
        if (cancelled) return;

        // Already seen this session → skip straight to the docked state.
        // (#loader in the URL forces a full replay, for design review.)
        const seen =
          sessionStorage.getItem(SEEN_KEY) === "1" &&
          !window.location.hash.includes("loader");
        if (seen) {
          const { y, scale } = dockTransform();
          gsap.set(word, { autoAlpha: 1, y, scale, color: INK });
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

        const tl = gsap.timeline();
        const meter = { v: 0 };

        // ---- 1. Wordmark loads in, closed
        tl.fromTo(
          word,
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out" }
        );

        // ---- 2. The () expands…
        tl.to(frame, {
          width: openW,
          height: openH,
          marginLeft: "0.14em",
          marginRight: "0.14em",
          duration: 0.85,
          ease: "expo.inOut",
          onStart: () => gsap.set(frame, { autoAlpha: 1 }),
        }, "+=0.15");

        // ---- 3. …and the load runs 0 → 100 between the parens
        tl.to(meter, {
          v: 100,
          duration: COUNT_S,
          ease: "power1.inOut",
          onUpdate: () => {
            count.textContent = String(Math.round(meter.v));
          },
        }, "-=0.35");

        // ---- 4. Collapse shut
        tl.to(frame, {
          width: 0,
          height: 0,
          marginLeft: 0,
          marginRight: 0,
          duration: 0.9,
          ease: "expo.inOut",
        }, "+=0.3");

        // ---- 5. Slide to bottom-centre and stay; the page morphs to
        //         white and the wordmark to black as it settles
        tl.add(() => {
          const { y, scale } = dockTransform();
          gsap
            .timeline({ onComplete: finish })
            .to(word, { y, scale, duration: 1.15, ease: "expo.inOut" }, 0)
            .to(bg, { backgroundColor: PAPER, duration: 0.9, ease: "power2.inOut" }, 0.2)
            .to(word, { color: INK, duration: 0.9, ease: "power2.inOut" }, 0.2)
            // bg and page are now the same white — drop the cover invisibly
            .to(bg, { autoAlpha: 0, duration: 0.01 });
        }, "+=0.35");
      };

      run();

      return () => {
        cancelled = true;
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
        aria-label="the craft commons — home"
        onClick={onHome}
      >
        <span className="preloader__half">the craft c(</span>
        <div className="preloader__frame" ref={frameRef}>
          <span className="preloader__count" ref={countRef}>
            0
          </span>
        </div>
        <span className="preloader__half">)mmons</span>
      </button>
    </div>
  );
}
