---
name: scope-changes-documentation
description: >-
  Generate a clear "what changed and why" summary for a pull request
  description, derived strictly from the code that actually ships (the branch
  diff / commits against the base) — not from the conversation. Use this
  whenever opening or updating a PR, writing or refreshing a PR description, or
  documenting the scope of a branch's changes. It explains each meaningful change
  with enough context for a reviewer, and deliberately EXCLUDES anything outside
  the scope of what's pushed: side-quests, exploratory tangents, personal or
  off-topic questions, requests like "now make a figma version of this html",
  reverted experiments, local-only scaffolding, and process back-and-forth.
  Trigger it even when the user just says "write the pr description", "document
  what changed", "summarize this branch", or "add the changes to the pr". The
  prose in the output is written in lowercase per the user's PR-text convention.
  Always present the proposed PR title and description to the user for review,
  let them edit, and get one final explicit approval before pushing anything to
  GitHub.
---

# Scope changes documentation

A PR description should answer, for a reviewer who wasn't in the room: **what
changed, and why.** This skill produces exactly that text for the PR body —
accurately scoped to what's actually being merged, and nothing else.

## Show it and get final approval before pushing

This documentation goes onto a PR, and a push to GitHub is effectively
irreversible from the user's side — so generating the description is never the
last step you take silently. Once the title and description are drafted, present
them and stop:

1. Show the proposed **PR title** and the **full description** — the exact
   markdown that will appear on GitHub — so the user can read precisely what is
   about to be published.
2. Invite edits. They may want to reword the summary, add or cut a line, or
   adjust scope. Apply whatever they ask.
3. Ask for **one final, explicit approval** (e.g. "ready to push this?") and wait
   for a clear yes. Do not push, open, or update the PR on GitHub until you have
   it.

If the user changes anything, show the revised title/description again and
re-confirm. The push only happens after that final go-ahead. (This is also why
the rest of this skill matters: the thing they're approving should already be
accurate and scoped, so the review is a quick confirmation, not a rewrite.)

## The rule that makes scoping work: scope from the diff, not the chat

The ground truth of "what shipped" is the code going into the PR — the commits
on the branch and the diff against the base — NOT the conversation that produced
it. A working session is full of things that never ship: exploratory tangents,
reverted experiments, local-only scaffolding, and personal or side requests like
"now make a figma component version of this html" or off-topic questions. None
of that is part of the change set, so none of it belongs in the description.

So decide **what** to document from the diff:

```bash
git fetch origin
git log --oneline origin/main..HEAD      # commits in this PR (use the real base branch)
git diff --stat origin/main...HEAD       # files + scale
git diff origin/main...HEAD              # the actual content to summarize
```

If something was discussed but isn't in that diff, it does not go in the
description. If something is in the diff, it does — explained. (You can still
draw on your understanding from the session to explain the **why** of a change —
just only for changes that are actually in the diff.)

## What to exclude (deliberately out of scope)

- **Side-quests and personal/parallel asks** — e.g. "create a figma version of
  what we built", "explore an alternative approach", design explorations that
  weren't merged, and any personal or off-topic questions. Not part of the
  shipped change → not in the description.
- **Local-only scaffolding** — env files, db seeds, env wildcards, dev-login
  shims, mock/preview fixtures, dev tools (agentation), debug instrumentation.
  Per the shipping-discipline skill these never reach the branch, so they won't
  be in the diff. Do NOT mention them anywhere in the pr — not in the summary,
  the body, the scope, or the "out of scope" section, and not in any handoff /
  constraints field. They are simply absent from the change; calling out that
  agentation (or any local-only tool) was "kept local" / "not in this branch" is
  noise the reviewer does not need. If you actually spot one in the diff, that's
  a leak to fix, not to document.
- **Process noise** — the iteration back-and-forth, false starts, "tried X then
  Y", how long it took. Document the result, not the journey.

## What to include (enough context for a reviewer)

For each meaningful change in the diff, give the reviewer enough to evaluate it
without spelunking:

- **what changed** — the concrete change in plain terms, with real identifiers,
  file names, and components written as-is.
- **why** — the problem it solves or the reason for the approach. This is the
  part reviewers value most and authors most often omit; don't skip it.
- **context only where it helps** — a tradeoff made, a non-obvious constraint, a
  follow-up intentionally deferred. Leave out context that doesn't aid review.

Group related changes by area or feature rather than listing files one by one.
A reviewer wants the story of the change organized by intent, not a file dump.

## PR description template

Use this shape; adapt it to the change and drop sections that don't apply. Write
the prose in lowercase (see the style note); keep code, paths, and identifiers
exactly as written.

```markdown
## summary
<1-2 sentences: what this pr does and why, lowercase>

## what changed
- **<area or feature>** - <what changed and why, identifiers as-is>
- **<area or feature>** - <...>

## why
<the motivation / problem being solved, if not already clear from the summary>

## notes for reviewers
<tradeoffs, anything intentionally out of scope, follow-ups, validation done>
```

**Example** — illustrating both tone and scoping. Suppose the diff made the
slack settings cancel and secondary actions use `variant="secondary"`
consistently and made a search field borderless with a separator, and the
session also included a request to mock up a figma version (which was not
shipped):

```markdown
## summary
align the slack settings buttons and the scope search field with the carrot ui
design system.

## what changed
- **button variants** - switched the cancel and secondary actions to
  `variant="secondary"` so they read consistently across the slack settings
  surfaces, matching the rest of the app.
- **scope search field** - removed the input border and added a separator
  between the checkbox and the field, matching the existing repo-search pattern.

## notes for reviewers
styling only, no behavior change; verified in the running app.
```

Note that the figma request is simply absent — it was never part of what shipped,
so it's not in the description.

## Style: the user's personal-text conventions

This documentation is the user's personal-touch text on a PR, so follow their
personal-text conventions for every word you write here:

- **Lowercase.** Write the title, body prose, section headers, and bullet labels
  in lowercase.
- **No em dashes.** Never use "—" in this text. Where an em dash would normally
  go, use a hyphen "-" instead, or split the thought into separate sentences.
- **Always punctuate.** Write complete, properly punctuated sentences (commas,
  periods, and so on); do not drop end punctuation.
- **Leave code untouched.** Code, file paths, identifiers, acronyms, and proper
  nouns stay exactly as written (`SlackSolidIcon`, `coderabbit-ui`, `CI`,
  `viewBox`), and markdown structure (`##`, lists, links) stays intact; only the
  words are affected.

These conventions apply only to the user's personal text (PR titles,
descriptions, and similar), never to code. They match the PR-text convention in
the shipping-discipline skill.
