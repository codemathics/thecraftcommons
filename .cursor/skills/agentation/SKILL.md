---
name: agentation
description: >-
  Install and wire up agentation (Benji Taylor's visual feedback tool for AI
  agents) into the current project's local dev environment, so the user can
  click any element on the running app, annotate design areas, and hand the
  agent structured feedback (selectors, element paths, source lines). Use this
  whenever the user invokes /agentation, asks to "install agentation", "set up
  agentation", "add agentation", or says they want to annotate the UI / point at
  design elements for the agent to fix. This is the user's go-to way to set up
  local design-annotation tooling, so trigger it even if they only say "let me
  mark up the design" or "set up my annotation tool". It installs agentation as
  a dev dependency, mounts it dev-gated so it never reaches production, and
  verifies it loads. The dependency and mount are local-only and must never be
  pushed to a PR.
---

# agentation — set up the design-annotation dev tool

agentation lets the user click any element on the running app, drop a note, and
copy structured markdown (CSS selectors, the React element path, and the source
file/line) that an agent can use to find and fix the exact code. It turns "the
spacing on that card is off" into a precise, code-locating instruction. It is a
local development aid, not product code.

When this skill is invoked, install and wire it up in the current project, then
confirm it works. Follow the steps below.

## 1. Detect the package manager and framework

These decide the install command and how the tool is mounted.

- Package manager: `pnpm-lock.yaml` -> pnpm, `package-lock.json` -> npm,
  `yarn.lock` -> yarn, `bun.lockb` -> bun.
- Framework: look for `vite.config.*` (Vite), `next.config.*` (Next.js), or a
  Create-React-App / other React setup. This sets the dev gate
  (`import.meta.env.DEV` for Vite vs `process.env.NODE_ENV` for Next) and where
  the component mounts (the app root / root layout).

## 2. Install as a dev dependency

Use the detected package manager (examples):

```bash
pnpm add -D agentation       # pnpm
npm install agentation -D    # npm
yarn add -D agentation       # yarn
bun add -d agentation        # bun
```

It ships a named export `Agentation` and requires React 18+ (desktop browser
only; mobile is not supported).

## 3. Mount it, dev-gated so production tree-shakes it

Mount `<Agentation />` once at the app root, behind a dev check, so it never
ships to production even if the file is committed. Pick the variant that matches
the framework.

**Vite + React** (gate on `import.meta.env.DEV`), in the root entry such as
`src/main.tsx`:

```tsx
const Agentation = import.meta.env.DEV
  ? lazy(() => import("agentation").then(m => ({ default: m.Agentation })))
  : undefined

// at the root render, alongside the app:
{Agentation ? (
  <Suspense fallback={null}>
    <Agentation />
  </Suspense>
) : null}
```

**Next.js** (gate on `process.env.NODE_ENV`), via a small client component
rendered in `app/layout.tsx`:

```tsx
"use client"
import { Agentation } from "agentation"

export function DevAgentation() {
  if (process.env.NODE_ENV !== "development") return null
  return <Agentation />
}
// then render <DevAgentation /> inside the root layout body
```

**Other React setups**: gate on whatever the project's dev flag is and render a
single `<Agentation />` at the app root.

If the project already uses a lazy, dev-gated pattern for other dev-only mounts,
match that pattern instead of introducing a new one.

## 4. Verify it loaded

Start or refresh the dev server and confirm the agentation toolbar appears in the
bottom-right corner, with no build error and no console error. If it overlaps an
existing corner widget (a support-chat bubble, etc.), that is fine and expected;
both stay clickable. Then tell the user it's ready and how to use it: click the
toolbar to activate, click an element, add a note, copy the markdown, and paste
it back so the agent can act on the exact code.

## 5. Optional: real-time MCP sync (ask first)

agentation can run a small MCP server so the agent reads annotations directly
instead of the user copy-pasting:

```bash
npx add-mcp "npx -y agentation-mcp server"
```

then pass `endpoint="http://localhost:4747"` to the component. This edits the
user's MCP config and runs a local server, so do not set it up without asking
first. The copy-paste flow works immediately without it.

## Keep it local — never push it

agentation is a local dev aid. Its dependency entry and its mount are local-only
and must not go into a PR (this is the shipping-discipline rule). Keep them
uncommitted or gitignored, or rely on the dev gate so production tree-shakes the
tool out; if a commit would otherwise carry them, strip them before opening the
PR.

## Adding more dev tools later

agentation is the first tool this skill installs. If asked to add another local
dev tool, follow the same shape: install it as a dev dependency, gate it to dev
only, verify it loads, and keep it out of PRs.
