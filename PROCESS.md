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

**Thunder Wing** (originally built as *Stillfire*, renamed in a later revision
pass — see moment 5), a pointer-controlled vertical shooter with zero on-screen
text besides a countdown and survival timer. The ship follows the pointer;
moving disables firing, and holding still charges a shot that then auto-fires
on an interval. Two enemy kinds read differently on sight: an armoured
hexagonal gunship (persistent) that must be shot down, and a spinning spiked
crystal (unstable) that either expires harmlessly on its own or, if shot,
splits into two persistent enemies with a brief grace period so the split
isn't an unfair instant hit. Health is five pixel hearts; a wandering green
cross appears only while the player is missing health and heals on touch. The
game opens on a frozen 3-second countdown, then ends in a clearly distinct
loss (dark red vignette) or win (warm gold vignette, after surviving 60
seconds), and any tap/click restarts from either end state. The whole thing is
presented inside a decorative, responsive arcade-cabinet frame. Gameplay state
(`game.ts`, `enemies.ts`, `player.ts`, `projectiles.ts`, `pickup.ts`,
`motion.ts`, `effects.ts`) is kept separate from the pure Canvas renderer
(`render.ts`) and from pointer input (`input.ts`).

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

5. **Catching a countdown freeze that was simulation-only, not visual, before
   it shipped.** Adding a `"countdown"` game phase and returning early from
   `updateGame` freezes game *state*, but `drawBackground`'s starfield drift
   and `drawPlayer`'s charge-ring/engine-flare progress are both driven
   directly by the wall-clock `now` passed into `draw`, not by state that had
   just stopped changing — so the scene would have kept visibly animating
   through a countdown that was supposedly frozen. I caught this by tracing
   where `now` flows into the renderer before running anything, and fixed it
   by feeding `draw` a frozen `bgNow` during the countdown and gating the
   player's charge/flare animation behind an `active = phase !== "countdown"`
   flag, so the ship reads as paused rather than mid-charge.
   [`4f10dda`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Asuka121380/commit/4f10dda)

6. **Measuring the cabinet layout instead of trusting how it looked.** The
   brief asked the desktop game to use available screen space "more
   effectively," so I built the cabinet with a control deck (joystick and
   buttons) below the screen. It looked plausible in the browser. Only after
   scripting a Playwright pass that measured `#game`'s actual bounding box
   (490x872 at 1920x1080) and comparing it against the pre-cabinet scale-to-fit
   math (up to 607x1080) did I notice the deck had made the real play area
   *smaller* than before — it was eating the vertical space the canvas used to
   own outright, the opposite of the brief's intent. The fix was to move the
   joystick and buttons into side panels beside the screen instead, spending
   only the horizontal letterboxing that a portrait game already wastes on a
   landscape monitor. Re-measuring after the fix showed 552x981.5 — most of
   the loss recovered, with the remainder being the accepted cost of a thin
   marquee bar. Nothing here was code that failed a test; the check suite
   couldn't have caught it, only a measured screenshot could.
   [`9fd519b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Asuka121380/commit/9fd519b)

7. **Discovering `ctx.imageSmoothingEnabled = false` doesn't do what a pixel-art
   brief needs.** That flag only affects `drawImage` scaling — Canvas2D still
   anti-aliases every filled/stroked vector path (`ctx.arc`, `ctx.ellipse`, a
   non-90°-multiple `ctx.rotate`), and nearly all of the pre-revision
   `render.ts` was built from exactly those calls. I confirmed this by reading
   the spec rather than assuming the existing flag was already sufficient,
   then wrote `pixels.ts` (a Bresenham circle, a scanline polygon rasterizer,
   integer-snapped rects) so every sprite is drawn from primitives that round
   to whole pixels by construction, and replaced continuous rotation (the
   unstable enemy's spin, projectile headings) with discrete animation frames
   — a deliberate pixel-art technique, not a compromise.
   [`07f1ee4`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Asuka121380/commit/07f1ee4)

8. **Proving the audio gesture-gate and SFX distinctness from outside the
   game, without touching shipped code.** The brief requires `AudioContext`
   to exist only after a real user gesture, and player/enemy fire to be
   audibly distinct. Rather than take my own implementation's word for it, I
   wrapped `AudioContext`'s constructor and `AudioParam.setValueAtTime` from
   a Playwright script before any app code ran, confirming zero contexts
   existed before the first synthetic `pointerdown` and exactly one
   `"running"` context after, then read back the actual scheduled
   frequencies to confirm `playerFire` (square, 880Hz) and `enemyFire`
   (sawtooth, 220Hz) really are two octaves and a waveform apart at runtime,
   not just in the source. (An early version of this check read
   `frequency.value` directly after `setValueAtTime` and got 440Hz back for
   everything — a Web Audio quirk where that getter doesn't reliably reflect
   a just-scheduled value — so I fixed the harness to capture the argument
   passed to `setValueAtTime` instead.)
   [`c601cc5`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Asuka121380/commit/c601cc5)

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

After the Thunder Wing revision (rename, countdown/timer, new art, arcade
cabinet), the same two-viewport Playwright pass was re-run against the
rebuilt `dist/` output, covering: the countdown numeral and ring on load, the
transition into "playing" once it elapses, the survival timer counting down,
still-to-fire and moving with the new sprites and planet background visible,
a midgame screenshot, and --- on desktop --- bounding-box measurements of the
canvas and both cabinet side panels to confirm the layout-regression fix
(moment 6) actually held after landing. On mobile, a computed-style check
confirmed the side panels collapse to `display: none` under the compact media
query, leaving the canvas essentially unchanged from the pre-cabinet phone
layout. Zero console/pageerror/requestfailed events across either viewport.

After the pixel-art and 8-bit audio revision (moments 7-8), `pnpm check` and
`pnpm check:evidence` were re-run clean (21/21 tests, same `dist/` build
budget), then a fresh two-viewport Playwright pass against the rebuilt
`dist/` confirmed: a scanline sample through the mid-arena at both viewports
found only 5 exact colors (no blended/anti-aliased in-between values);
screenshots at both sizes show stair-stepped cabinet chrome, banded planets,
and pixel-bitmap ship/hearts/HUD digits with no smooth gradients anywhere;
and zero console/pageerror/requestfailed events across either viewport. A
second, separately instrumented pass (detailed in moment 8) confirmed
`AudioContext` gating and captured `playerFire`, `enemyFire`, `chargeReady`,
`playerDamage`, `enemyDestroyed`, `unstableSplit`, and an organic `defeat`
firing live with their exact intended waveform and frequency, plus a
continuously-ticking music scheduler throughout a ~19-second played session.
`pickup`, `enemyCollision`, and `victory` didn't occur naturally in that
short a session (no pickup spawned in reach, no direct hull collision, and
victory needs 60 uninterrupted seconds) — those three were instead confirmed
by re-reading `game.ts`'s collision-resolution and phase-transition branches
directly against the same logic the pre-existing `resolveUnstableEnemyRemoval`
contract test already exercises, which stayed green and untouched throughout.

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that a
reflection entry the marker reads is in `reflections/`, and that your
`CLAUDE.md` is there --- before a marker ever opens the file. It checks that
your map is traceable, not that it is good: the marker judges whether your
small, deliberately chosen set of moments shows real judgement and reflection. A
green check is not a substitute for that curation.

Images aren't checked: unlike a citation whose SHA doesn't resolve, a broken
image is visible the moment this file is rendered on GitHub.
