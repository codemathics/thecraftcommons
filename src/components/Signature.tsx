import { useId, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const NAMES = "Clement & ÌníOlúwa";

/** a mostly-horizontal writing stroke, slight wander so it does not read as a wipe. */
function penPath(x0: number, x1: number, y: number): string {
  const s = x1 - x0;
  return [
    `M ${x0} ${y}`,
    `C ${x0 + s * 0.22} ${y - 3}, ${x0 + s * 0.45} ${y + 3}, ${x0 + s * 0.62} ${y - 1}`,
    `S ${x0 + s * 0.88} ${y + 2}, ${x1} ${y}`,
  ].join(" ");
}

export default function Signature({ play }: { play: boolean }) {
  const rawId = useId().replace(/:/g, "");
  const maskId = `cc-sig-${rawId}`;
  const firstRef = useRef<SVGPathElement>(null);
  const secondRef = useRef<SVGPathElement>(null);

  useGSAP(
    () => {
      const first = firstRef.current;
      const second = secondRef.current;
      if (!first || !second) return;

      let cancelled = false;
      let tl: gsap.core.Timeline | null = null;

      const run = async () => {
        await document.fonts.load("32px 'La Belle Aurore'");
        if (cancelled) return;

        const reduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

        if (!play || reduced) {
          gsap.set([first, second], { attr: { "stroke-dashoffset": 0 } });
          return;
        }

        gsap.set([first, second], { attr: { "stroke-dashoffset": 1 } });

        tl = gsap.timeline({ delay: 0.42 });
        tl.to(first, {
          attr: { "stroke-dashoffset": 0 },
          duration: 0.85,
          ease: "none",
        });
        tl.to(
          second,
          {
            attr: { "stroke-dashoffset": 0 },
            duration: 1.05,
            ease: "none",
          },
          "+=0.1"
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
      viewBox="0 0 280 56"
      role="img"
      aria-label={NAMES}
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
        >
          <path
            ref={firstRef}
            d={penPath(8, 154, 28)}
            fill="none"
            stroke="#fff"
            strokeWidth="36"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
          />
          <path
            ref={secondRef}
            d={penPath(148, 274, 28)}
            fill="none"
            stroke="#fff"
            strokeWidth="36"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
          />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <text
          className="manifesto__sig-ink"
          x="272"
          y="42"
          textAnchor="end"
        >
          {NAMES}
        </text>
      </g>
    </svg>
  );
}
