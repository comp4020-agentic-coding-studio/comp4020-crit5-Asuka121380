# Process overview

## What I built

**Thunder Wing** is a pointer-controlled pixel-art shooter inside a responsive
arcade cabinet. Moving disables firing; holding still charges and auto-fires.
Persistent enemies must be destroyed, while an unstable enemy expires safely
unless shot, when it splits into two persistent enemies. A wandering pickup
restores health. The game has a countdown, survival timer, distinct endings,
original 8-bit audio, and no instructions.

## The moments that mattered

1. **I made the unusual enemy rule executable first.** The focused test
   distinguishes natural expiry (spawn nothing) from projectile destruction
   (spawn exactly two persistent enemies). I confirmed the committed test
   failed because `enemies.ts` was missing, then implemented enough logic to
   turn its four assertions green. Keeping the rule independent of rendering
   also stopped direct ship collisions from triggering a split.
   [`384039c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Asuka121380/commit/384039c)
   →
   [`03facef`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Asuka121380/commit/03facef)

2. **Playing changed the balance.** A repeated dodge-and-fire browser run
   produced four persistent enemies and killed the ship after roughly nineteen
   seconds. I reduced the cap from six to four and repeated the same run;
   survival roughly doubled. The observed artefact, not another reading of its
   constants, justified the change.
   [`7633e1e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Asuka121380/commit/7633e1e)

3. **The presentation needed specialised checks.** Canvas vector paths still
   anti-aliased with image smoothing disabled, so I replaced them with
   integer-snapped primitives and discrete frames. I gesture-gated Web Audio
   and gave player and enemy fire different waveforms and pitch ranges.
   [`07f1ee4`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Asuka121380/commit/07f1ee4)
   →
   [`c601cc5`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Asuka121380/commit/c601cc5)

## Verification

`pnpm check` passes typecheck, build, and all 21 tests. The production build was
driven at both marking viewports through control, combat, healing, restart and
both endings, with a clean browser console.
