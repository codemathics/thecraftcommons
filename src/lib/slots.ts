/** stills that play inside the wordmark during the preloader — African
 *  makers at work (Unsplash, uniform b/w grade + 3:4 crop via CDN params).
 *  Sequenced in three reels: wood & fiber hands, clay & cloth hands, then
 *  makers at work. w/h are em; the film's aperture sizes live in the REELS
 *  table in Preloader.tsx. */
export const SLOT_FRAMES = [
  { src: "/slots/01.jpg", w: 2.15, h: 3.85 },
  { src: "/slots/02.jpg", w: 2.35, h: 3.25 },
  { src: "/slots/03.jpg", w: 2.2, h: 4.05 },
  { src: "/slots/04.jpg", w: 2.45, h: 3.1 },
  { src: "/slots/05.jpg", w: 2.1, h: 4.2 },
  { src: "/slots/06.jpg", w: 2.3, h: 3.45 },
  { src: "/slots/07.jpg", w: 2.25, h: 3.7 },
  { src: "/slots/08.jpg", w: 2.4, h: 3.2 },
  { src: "/slots/09.jpg", w: 2.15, h: 3.95 },
  { src: "/slots/10.jpg", w: 2.2, h: 3.55 },
  { src: "/slots/11.jpg", w: 2.35, h: 3.3 },
  { src: "/slots/12.jpg", w: 2.6, h: 2.95 },
  { src: "/slots/13.jpg", w: 2.2, h: 3.8 },
  { src: "/slots/14.jpg", w: 2.55, h: 3.05 },
] as const;

function load(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = () => {
      if (typeof img.decode === "function") {
        img.decode().then(done).catch(done);
      } else {
        done();
      }
    };
    img.onerror = done;
    img.src = src;
  });
}

/** kick off as soon as this module is imported so the film is warm. */
export const slotPreload = Promise.all(SLOT_FRAMES.map((f) => load(f.src)));

/** wait until every still is decoded, or give up so a hang cannot block open. */
export function waitForSlots(ms = 8000): Promise<void> {
  return Promise.race([
    slotPreload.then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ]);
}
