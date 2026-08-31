# Process overview

A reading-guide to how the work came together --- a map to your process, not an
essay about it. Markers read this file and follow its citations; they don't
trawl the repo for evidence you didn't point at, so if a moment mattered, cite
it.

This file is the shape; the course site's
[assessment page](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#what-you-submit)
is the requirement, and its
[word counts](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#word-counts)
cover every deliverable.

## What I built

**Stillfire**, a pointer-controlled vertical shooter with zero on-screen text.
The ship follows the pointer; moving disables firing, and holding still charges
a shot that then auto-fires on an interval. Two enemy kinds read differently on
sight: solid orange squares (persistent) that must be shot down, and flickering
purple diamonds (unstable) that either expire harmlessly on their own or, if
shot, split into two persistent enemies with a brief grace period so the split
isn't an unfair instant hit. Health is five pixel hearts; a wandering green
cross appears only while the player is missing health and heals on touch. The
game ends in a clearly distinct loss (dark red vignette) or win (warm gold
vignette, after surviving 60 seconds), and any tap/click restarts from either
end state. Gameplay state (`game.ts`, `enemies.ts`, `player.ts`, `projectiles.ts`,
`pickup.ts`, `motion.ts`, `effects.ts`) is kept separate from the pure Canvas
renderer (`render.ts`) and from pointer input (`input.ts`).

## The moments that mattered

1. **Confirming the red test failed for the right reason before writing code.**
   The committed contract test imports `resolveUnstableEnemyRemoval` from a
   root-level `enemies.ts` that didn't exist yet. Rather than assume that was
   the failure, I ran `vitest run spec/crit-5.test.ts` first and read the
   actual error (`Cannot find module '../enemies'`) before writing anything,
   then implemented just enough of `enemies.ts` to turn all four assertions
   green.
   [`384039c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Asuka121380/commit/384039c)
   →
   [`03facef`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Asuka121380/commit/03facef)

2. **Keeping the split rule out of the direct-collision path.** The contract
   only defines splitting for a projectile-destroyed unstable enemy. It would
   have been easy to route every unstable-enemy removal (including a direct
   ship collision) through the same `resolveUnstableEnemyRemoval` call for
   consistency. I deliberately didn't: `resolveCollisions` in `game.ts` drops
   a directly-collided enemy with just an explosion effect and never calls the
   split function, because the spec only promises splitting on the
   projectile-destroyed transition, not on contact. I checked this by tracing
   both collision branches in `game.ts` against the spec test's two named
   causes (`"timeout"`, `"destroyed"`) before shipping it.
   [`03facef`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Asuka121380/commit/03facef)

3. **Real playtest evidence over guessed balance numbers.** All numeric
   constants started as provisional guesses. Rather than tune by feel, I drove
   a scripted Playwright session (dodge sideways, hold still to fire, repeat)
   against the built `dist/` output and screenshotted it: by ~12 seconds in,
   four persistent enemies were alive at once in the 180px-wide arena, and the
   ship was dead by ~19 seconds. That's a concrete, reproducible overcrowding
   signal, not a guess, so I dropped `PERSISTENT_MAX_COUNT` from 6 to 4 and
   re-ran the identical script: survival roughly doubled, to ~36 seconds. I
   also used a deliberately temporary, reverted change (`VICTORY_DURATION_MS`
   dropped to 3s, screenshotted, then set back to 60000) purely to see the win
   overlay render for real in a browser, since 60 seconds of scripted dodging
   isn't a reliable stand-in for a human win.
   [`7633e1e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Asuka121380/commit/7633e1e)

4. **A TypeScript gotcha that isn't obvious from the type checker's message
   alone.** `main.ts`'s top-level `if (!canvas) throw` narrows `canvas` to
   non-null at module scope, but `tsc` still flagged it as possibly-null
   *inside* the later `resize()` and `frame()` closures. That's because
   control-flow narrowing doesn't survive into a nested function body — the
   checker has to assume the closure could run at any time. I confirmed this
   was the real cause (not a logic bug) by keeping the runtime guard exactly
   where it was and adding non-null assertions only at the two closure call
   sites, then re-ran `pnpm check` to confirm typecheck, build, and all tests
   passed clean.
   [`03facef`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Asuka121380/commit/03facef)

## Verification

`pnpm check` (typecheck + build + `vitest run`) is green: 3 test files, 21
tests. Beyond the automated suite, the finished build was driven in a real
headless Chromium browser (Playwright) at both a desktop viewport
(1920×1080, mouse) and a phone viewport (390×844, touch, 3x device scale),
covering: pointer follow, moving-disables-fire, stillness-triggers-charge-
then-fire, both enemy types, an unstable-enemy split (two persistent enemies
appearing together, screenshotted), the pickup appearing only while missing
health and healing on touch, loss (dark red vignette + restart glyph, all
hearts empty), restart after loss (hearts reset to full, ship respawns,
enemies clear), and the win overlay (warm gold vignette, distinct from loss).
Across every one of these sessions the browser console stayed completely
clean --- no errors, warnings, or failed requests from the shipped game code.
(One console warning did appear, but only from the *test harness's* own
repeated `getImageData` calls in a throwaway reactive-dodge script used to
probe for the win condition --- the shipped game never calls `getImageData`,
so this is a test-tooling artifact, not a game defect.)

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that a
reflection entry the marker reads is in `reflections/`, and that your
`CLAUDE.md` is there --- before a marker ever opens the file. It checks that
your map is traceable, not that it is good: the marker judges whether your
small, deliberately chosen set of moments shows real judgement and reflection. A
green check is not a substitute for that curation.

Images aren't checked: unlike a citation whose SHA doesn't resolve, a broken
image is visible the moment this file is rendered on GitHub.
