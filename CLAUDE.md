# COMP4020 prototype

Your starter repo for a COMP4020 prototype: a static site in HTML/CSS/TypeScript
that builds to plain HTML/CSS/JS and deploys to GitHub Pages. The deployed site
is what gets marked, not this repo.

The
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec, and this repo's name tells you
which deliverable applies. Read both before you plan or build.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Run `pnpm check` before you push.
- Open the page in a browser and look at it. The rendered page is the truth;
  your mental model of it isn't.
- When a check fails, read its output before you change anything.
- Never commit a red state.

## The link-preview card

`public/card.png` (1200x630) is the image a shared link shows; `index.html`'s
head points at it. Replace it and the `description` meta, and copy the head
block into any new page. The card URL resolves against the page that names it,
like any link --- `./card.png` is wrong one directory down, and nothing in CI
checks it, so the deployed head is the only place a broken one shows up.

## The checks

`pnpm check` runs them, and `pnpm check:evidence` is the extra gate before you
ship. CI runs the same plus links, secrets and the deploy.

`spec/README.md`, `PROCESS.md` and `reflections/README.md` are in this repo and
say what they are for.

## This file is yours

A starting point, not a rulebook: what you add to it is the harness, and the
harness is assessed. This file and the sensors you wire into `check` carry
across the course --- both come with you into next week's repo. The prototype
doesn't: source, and the tests answering this week's published spec, stay
behind. `spec/README.md` draws the line.

## Facts about this stack that keep coming up

- **`.ts` extensions in relative imports are allowed but not used here.**
  This repo's `tsconfig.json` sets `allowImportingTsExtensions: true` (a prior
  week's carried-forward note claimed the opposite --- that was wrong for this
  checkout). Both `from "./module"` and `from "./module.ts"` typecheck; this
  project writes extensionless imports for consistency with Vite's own
  resolution, not because the extension is rejected.
- **All app modules live at the repo root, not under `src/`.**
  `tsconfig.json`'s `include` is `["*.ts", "spec", "scripts"]` --- a bare
  `*.ts` glob matches only root-level files, not a subdirectory. Adding a
  `src/` folder would silently drop those files from typecheck. Keep app
  modules flat at the root.
- **`spec/invariants.test.ts` parses built HTML without running scripts** ---
  `doc.querySelectorAll("h1").length === 1` sees every `<h1>` in the markup
  regardless of `hidden` or CSS `display: none`. Never duplicate a semantic
  landmark merely to support alternate visual states; keep one landmark in
  the static document and vary content inside it when necessary.
- **Static tests cannot validate runtime interaction.** Dragging, wheel input,
  focus order, motion preferences, viewport overflow, computed transforms,
  and audio timing need a real browser at the two marked viewport sizes.
  Treat screenshots and observed runtime values as evidence alongside
  `pnpm check`, not as a substitute for it.
- **Compose independent transforms on separate elements, not the same one.**
  When two effects animate the same visual property (position, rotation,
  scale) on one node, the later write overwrites the earlier one. Give each
  independent effect its own element in the DOM.
- **Asset paths are case-sensitive after deployment.** Copy user-supplied
  media into the repo, reference the committed filename rather than an
  absolute local path, and verify the exact extension casing in a production
  build.
- **`AudioContext.currentTime` is the clock for scheduled audio.**
  `setTimeout`/`requestAnimationFrame` may wake a scheduler or drive a visual
  cursor, but never gate *when a sound plays* --- always compute playback
  timing against the audio clock, not wall-clock timers.
- **Construct `AudioContext` only inside an explicit user-gesture handler.**
  Browsers block autoplay; building the context earlier either throws or
  leaves it suspended.

## Crit 5 lessons worth carrying

- **Keep game rules independent of Canvas rendering.** State transitions such
  as expiry, destruction, splitting, damage and healing should be deterministic
  functions that focused tests can exercise without a browser.
- **A frozen phase must freeze visual time as well as simulation time.** If a
  renderer reads the wall clock directly, backgrounds and charge animations can
  continue moving even while the state update loop is paused.
- **`imageSmoothingEnabled = false` does not pixelate vector paths.** Canvas
  still anti-aliases arcs, ellipses, rotations and arbitrary polygons. True
  pixel art needs integer-snapped raster primitives, bitmap sprites or discrete
  animation frames.
- **Verify perceptual distinctions at runtime.** Different source names do not
  prove that two sprites or sounds read differently; inspect rendered pixels and
  capture the actual waveform and frequency values scheduled by Web Audio.
- **Re-run the real artefact after every presentation pass.** A green unit suite
  cannot detect an overcrowded arena, a cabinet that shrinks the play area, an
  unreadable phone layout, or console failures from missing assets.
