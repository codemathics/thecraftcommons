# the craft c()mmons

CC is a fund for African designers, makers, engineers, and creators — cohort
members get AI tools, a mentor, and a reason to finish and share their work.

Vite + React 18 + TypeScript, plain CSS, GSAP. No router yet (view switch in
`App.tsx`). One custom font: OT Jubilee (`public/OTJubilee-Golden.woff`).

## Structure

- `src/App.tsx` — view switch: home ↔ apply form
- `src/components/Preloader.tsx` — the `()` wordmark: expands into a 0–100
  counter, collapses, docks bottom-centre and becomes the permanent brand
  mark / home button. Runs once per session (`sessionStorage`); `#loader`
  hash forces a replay, `#slow` runs it at quarter speed.
- `src/components/PatternField.tsx` — hero canvas: the brand mark tiled in a
  mirrored kaleidoscope quilt, dissolving downward (ref: Jancsó Áron's
  "Blend Experiment" poster). Cursor inflates glyphs on desktop; a gentle
  ripple loops on touch devices. CTA hover fires a rainbow pulse
  (`cc-wave-on` window event), masked to the pattern's silhouette.
- `src/components/PatternBand.tsx` — the same pattern compressed into the
  form's header band; doubles as the progress indicator (assembles
  left-to-right via the `progress` prop). `cc-band-wave` event fires a
  horizontal rainbow pulse (used on submit).
- `src/components/ApplyForm.tsx` — progressive application form (one
  question per step). Branching: Figma Education step only shows when Figma
  is in the applicant's tools; tool groups filter by what they make. Drafts
  and step position autosave to localStorage.
- `src/lib/mark.ts` — shared glyph geometry + palette + rainbow hues.

## Porting notes (backend)

- **Submit is a stub**: `submit()` in `ApplyForm.tsx` logs the draft and
  fakes a delay. Replace with the real endpoint. The draft shape is the
  `Draft` interface at the top of the file.
- `figmaEdu` is conditional — absent means "doesn't use Figma", which is
  itself the Figma-seat answer. Treat as nullable.
- Country is free text with suggestions — normalize server-side.
- When adding a router: home `/`, form `/apply`; the docked wordmark's
  `onHome` becomes a link to `/`.

## Commands

- `npm run dev` — dev server
- `npm run build` — production build to `dist/`
