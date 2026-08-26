import { useId, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const NAMES = "Clement & ÌníOlúwa";
const SPLIT = "Clement & ".length;
const VB_W = 280;
const VB_H = 64;

export default function Signature({ play }: { play: boolean }) {
  const rawId = useId().replace(/:/g, "");
  const clipId = `cc-sig-${rawId}`;
  const textRef = useRef<SVGTextElement>(null);
  const wipeRef = useRef<SVGRectElement>(null);

  useGSAP(
    () => {
      const text = textRef.current;
      const wipe = wipeRef.current;
      if (!text || !wipe) return;

      let cancelled = false;
      let tl: gsap.core.Timeline | null = null;

      const revealAll = () => {
        gsap.set(wipe, { attr: { x: 0, width: VB_W } });
      };

      const run = async () => {
        await document.fonts.load("32px 'La Belle Aurore'");
        await document.fonts.ready;
        if (cancelled) return;

        const reduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

        if (!play || reduced) {
          revealAll();
          return;
        }

        let splitX = VB_W * 0.54;
        let endX = VB_W;
        try {
          splitX = text.getStartPositionOfChar(SPLIT).x;
          const last = text.getEndPositionOfChar(NAMES.length - 1).x;
          const first = text.getStartPositionOfChar(0).x;
          endX = last + 8;
          splitX = Math.max(first, splitX);
        } catch {
          /* font metrics unavailable; wipe the full line */
        }

        gsap.set(wipe, { attr: { x: 0, width: 0 } });

        tl = gsap.timeline({ delay: 0.42 });
        tl.to(wipe, {
          attr: { width: splitX + 6 },
          duration: 0.85,
          ease: "none",
        });
        tl.to(
          wipe,
          {
            attr: { width: Math.min(VB_W, endX) },
            duration: 1.05,
            ease: "none",
          },
          "+=0.12"
        );
      };

      void run();

      return () => {
        cancelled = true;
        tl?.kill();
      };
    },
    { dependencies: [play] }
  );

  return (
    <svg
      className="manifesto__sig"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="img"
      aria-label={NAMES}
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <rect ref={wipeRef} x="0" y="0" width="0" height={VB_H} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <text
          ref={textRef}
          className="manifesto__sig-ink"
          x="272"
          y="46"
          textAnchor="end"
        >
          {NAMES}
        </text>
      </g>
    </svg>
  );
}
