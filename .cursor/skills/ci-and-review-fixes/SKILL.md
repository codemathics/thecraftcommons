---
name: ci-and-review-fixes
description: >-
  How to correctly resolve CI/build failures and address review feedback —
  CodeRabbit comments and human teammates — by fixing the real root cause, never
  by silencing, gaming, or hacking around the check. Use this whenever a build
  or CI job is failing or red, a PR has failing checks, a test broke, a typecheck
  or lint error appears, CodeRabbit (or @coderabbitai) left review comments, or a
  reviewer requested changes on a PR. Trigger it even when the user just says
  "make CI green", "fix the build", "the checks are failing", "address the bot's
  comments", or "the PR has review feedback" — the discipline below applies to
  all of them. Do NOT reach for shortcuts like disabling rules, skipping tests,
  or `|| true` to force a pass; this skill exists to prevent exactly that. Also:
  the moment a PR is created, immediately share its GitHub link with the user so
  they can pass it to the team, then continue the fixes.
---

# CI and review fixes — fix the cause, never fake the pass

A green check and an addressed comment are supposed to *mean something*: the code
actually works, and the concern was actually understood. The fastest-looking
fix — silence the check, tweak config until it's quiet, reply that it's handled
when it isn't — destroys that meaning and, worse, breaks teammates when they
pull. This skill is about earning the green, not faking it.

Guiding rule (say it before every fix): **do not boycott the fix just to make it
work, only for it to start affecting teammates when they pull.** If a change
wouldn't survive a teammate cloning the branch fresh and running it, it's not a
fix.

## Share the PR link the moment it's created

The team can review in parallel while you fix the build, so the PR link is
time-sensitive. The instant a PR exists (right after it's opened, or when you're
handed one), post its full GitHub URL to the user immediately, before you start
the fixes, so they can forward it to the team. Then go on to the CI/build and
review work below. Do not sit on the link until everything is green: surface the
link first, fix after. (This comes after the PR itself is approved and created
per the scope-changes-documentation gate; once it's live, the link goes out
right away.)

## Fixing a CI / build failure

1. **Read the actual failure, fully.** Open the failing job's log and find the
   real error — the first one, not the cascade after it. The headline ("build
   failed") is never the cause; the cause is a specific line.

2. **Reproduce the exact command locally before changing anything.** Run the
   same command CI runs (the build/test/lint/typecheck step, with the same
   flags), not a narrower proxy. A passing local unit test while the CI *build*
   fails means you haven't reproduced it. If a scoped command fails only because
   a dependency package isn't built, run the dependency-aware build instead of
   dismissing it (e.g. a workspace `--filter <pkg>...` build, or a clean
   install + root build) — don't treat a local-only stumble as "unrelated."

3. **Diagnose the root cause, then fix that.** Trace from the error to the
   source. Fix the type, the missing import, the real logic bug, the actual
   broken test expectation (only if the expectation is genuinely wrong — not to
   make a real failure quiet).

4. **Never silence the check.** These are red flags, not fixes:
   - `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `# type: ignore`
     without a precise, justified, inline reason.
   - Skipping/`.skip`/`xit`/commenting-out a failing test.
   - `|| true`, `continue-on-error`, or removing/loosening a CI step.
   - Relaxing lint/tsconfig/compiler settings to make an error disappear.
   - Pinning around a problem, deleting an assertion, or weakening a type to
     `any` so it compiles.
   If you find yourself reaching for one of these, stop — you've found a symptom
   patch, not a cause fix. Surface the real problem to the user instead.

5. **Separate environmental noise from real failures.** Missing tools, absent
   secrets, registry/auth hiccups, or flaky infra are environmental — re-run or
   fix the environment (e.g. clean install + root build), don't contort the
   code around them. A genuine code failure is the opposite: the code is wrong
   and must change.

6. **Verify it's actually green before pushing.** Re-run the reproduced command
   and confirm it passes for the *right* reason. When you push the fix, name the
   exact command you reproduced and fixed, and distinguish it from any narrower
   checks you also ran — so the fix is auditable, not hopeful.

7. **No guess-and-check against CI.** Pushing speculative commits to see if the
   remote turns green is maneuvering, not fixing. Reproduce locally; push once
   you understand and have verified the fix.

## Addressing CodeRabbit comments and human review feedback

Review feedback — whether from CodeRabbit (`@coderabbitai`) or a teammate — is a
claim about the code that deserves to be understood, not dismissed or gamed.

- **Understand the concern first.** Read the comment and the code it points at.
  What is it actually worried about — a bug, an edge case, a security issue, a
  readability or consistency problem? Fix *that*. A reworded variable that
  technically makes the bot stop commenting, while the underlying concern stands,
  is not addressing the feedback.

- **Fix it properly, in the code.** Resolve the real issue. If you disagree with
  the suggestion, that's legitimate — explain your reasoning to the user/reviewer
  rather than silently working around it or applying a change you don't believe
  in just to clear the comment.

- **Never post a reply that contradicts reality.** Do not mark a thread resolved
  or comment "fixed" when it isn't, and never claim a fix that the code state
  doesn't support. If a reply asserting a fix would be untrue, don't post it.

- **Don't game the reviewer.** No tricks to suppress the bot, no superficial
  edits to make a comment auto-resolve, no rewording to dodge a lint rule the
  comment is correctly flagging. The goal is correct code, not a quiet PR.

- **Don't try random things hoping one sticks.** If you don't yet understand why
  the comment is right (or wrong), investigate until you do. Thrashing through
  variations to make feedback go away is the same anti-pattern as guess-and-check
  against CI.

- **Respect cross-repo / consumer contracts.** When a change touches shared
  packages with downstream consumers, a local green build isn't enough — the
  fix must also keep the consumer side correct (use additive/compatibility-safe
  changes and the agreed rollout order). Don't "fix" by breaking the contract.

## The test for any fix

Before you call a CI fix or a review response done, ask:

> If a teammate checks out this branch clean, installs, and runs the exact CI
> command — does it pass for the *right reason*, with the concern genuinely
> resolved and no check silenced?

If yes, ship it. If you had to quiet, skip, ignore, or reword-around something to
get there, you haven't fixed it yet — go back to the real cause, or tell the user
what's actually wrong.
