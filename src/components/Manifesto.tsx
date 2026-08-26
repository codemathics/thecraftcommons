import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { paintDither } from "../lib/dither.ts";
import Signature from "./Signature.tsx";

gsap.registerPlugin(useGSAP);

const DITHER_CELL = 4;
const OPEN_S = 0.46;
const CLOSE_S = 0.4;

/** a note that dithers open from the centre. */
export default function Manifesto({
  open,
  onClose,
  originRef,
}: {
  open: boolean;
  onClose: () => void;
  originRef: RefObject<HTMLButtonElement | null>;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const ditherRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const mountedRef = useRef(false);

  useGSAP(
    () => {
      const overlay = overlayRef.current!;
      gsap.set(overlay, { autoAlpha: 0 });
    },
    { scope: overlayRef }
  );

  useEffect(() => {
    const overlay = overlayRef.current;
    const sheet = sheetRef.current;
    const canvas = ditherRef.current;
    const close = closeRef.current;
    if (!overlay || !sheet || !canvas || !close) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sizeCanvas = () => {
      const w = Math.max(1, Math.round(sheet.clientWidth / DITHER_CELL));
      const h = Math.max(1, Math.round(sheet.clientHeight / DITHER_CELL));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const NONE = "linear-gradient(#0000, #0000)";

    const maskUrl = (image: string) => {
      sheet.style.webkitMaskImage = image;
      sheet.style.webkitMaskSize = "100% 100%";
      sheet.style.webkitMaskRepeat = "no-repeat";
      sheet.style.maskImage = image;
      sheet.style.maskSize = "100% 100%";
      sheet.style.maskRepeat = "no-repeat";
    };

    const clearMask = () => {
      sheet.style.webkitMaskImage = "";
      sheet.style.maskImage = "";
      sheet.classList.add("manifesto__sheet--resolved");
    };

    const applyMask = (p: number) => {
      sizeCanvas();
      const v = Math.max(0, Math.min(1, p));
      paintDither(ctx, canvas.width, canvas.height, v);
      sheet.classList.remove("manifesto__sheet--resolved");
      if (v <= 0) {
        maskUrl(NONE);
        return;
      }
      maskUrl(`url(${canvas.toDataURL("image/png")})`);
    };

    tlRef.current?.kill();

    if (!mountedRef.current) {
      mountedRef.current = true;
      if (!open) return;
    }

    if (open) {
      const tl = gsap.timeline({
        onComplete: () => closeRef.current?.focus(),
      });
      tlRef.current = tl;
      gsap.set(overlay, { autoAlpha: 1, pointerEvents: "auto" });

      if (reduced) {
        clearMask();
        closeRef.current?.focus();
        return;
      }

      const meter = { p: 0 };
      applyMask(0);
      tl.to(meter, {
        p: 1,
        duration: OPEN_S,
        ease: "power2.inOut",
        onUpdate: () => applyMask(meter.p),
      });
      tl.add(clearMask);
    } else {
      const tl = gsap.timeline({
        onComplete: () => originRef.current?.focus(),
      });
      tlRef.current = tl;

      if (reduced) {
        clearMask();
        gsap.set(overlay, { autoAlpha: 0, pointerEvents: "none" });
        return;
      }

      const meter = { p: 1 };
      applyMask(1);
      tl.to(meter, {
        p: 0,
        duration: CLOSE_S,
        ease: "power2.inOut",
        onUpdate: () => applyMask(meter.p),
      });
      tl.set(overlay, { autoAlpha: 0, pointerEvents: "none" });
    }

    return () => {
      tlRef.current?.kill();
    };
  }, [open, originRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className="manifesto-overlay manifesto"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="manifesto-title"
      aria-hidden={!open}
      onClick={onClose}
    >
      <div
        className="manifesto__inner"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="manifesto__sheet" ref={sheetRef}>
          <article className="manifesto__card">
            <button
              type="button"
              className="manifesto__close"
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
            >
              Close
            </button>

            <div className="manifesto__body">
              <p className="manifesto__lede" id="manifesto-title">
                Talent is everywhere. Access is not.
              </p>

              <div className="manifesto__note">
                <p>
                  Across Africa and its diaspora, people are already making
                  work that deserves to be seen. What is missing is not talent.
                  It is time. Tools. A mentor close enough to care. A door into
                  the rooms where work becomes opportunity.
                </p>
                <p>This is not a giveaway. It is not a bootcamp.</p>
                <p>
                  It is a bet. We put tools in a few hands. We sit with them
                  while they finish. We make sure the work is seen.
                </p>
                <p>
                  Great work should be visible. Where you were born should not
                  decide who gets to shape what comes next. African creatives
                  should not only arrive in this era. They should build inside
                  it, lead it, and keep what they make.
                </p>
                <p>
                  We start small. Three months. A handful of designers. We
                  learn in public. We refine the model. We build proof.
                </p>
                <p>
                  In time, a network: global work, companies, collaborators.
                  And one day, the next generation of founders.
                </p>
                <p className="manifesto__motto">
                  African-first. Globally ambitious.
                </p>
              </div>

              <Signature play={open} />
            </div>
          </article>
          <canvas
            className="manifesto__dither"
            ref={ditherRef}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
