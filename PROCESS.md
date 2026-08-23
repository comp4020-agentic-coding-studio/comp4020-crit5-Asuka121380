# Process overview

<!-- TEMPLATE: this file is a shape to fill in, not a form. Replace everything
     in it with your own overview, and delete this comment — `pnpm
     check:evidence` will remind you if it's still here. -->

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

One paragraph: the thing, and the idea behind it.

## The moments that mattered

Three or four for an assignment; fewer is fine for a weekly prototype. Keep the
list short so each moment has room to do all four jobs:

1. **what happened** --- the problem, or the thing that went wrong
2. **what you did instead of the obvious thing** --- the call you made, and why
   it beat the obvious one
3. **how you knew it was right** --- the check you ran, the viewport you looked
   at, what you read before accepting the diff
4. **the citation** --- a commit or commit range, a `CLAUDE.md` change, a check
   that went from red to green, a prompt paired with the commit it produced

Jobs 2 and 3 are the ones the repo can't tell a reader on its own, so they're
where the marks are. The strongest moments are the ones where a correction
landed in the **harness** --- the standards and checks your work has to satisfy
--- rather than in a retry: a rule added to `CLAUDE.md`, a check wired up, an
attempt thrown away. Retrying until it passes is the routine case, and changing
what the work runs against is the skilled one.

Cite each moment as a link whose text is the commit hash or range and whose
target is this repo's commit or compare URL, so a reader clicks straight to the
evidence:

- one commit: [`a1b2c3d`](https://github.com/YOUR-ORG/YOUR-REPO/commit/a1b2c3d)
- a range:
  [`a1b2c3d...e4f5a6b`](https://github.com/YOUR-ORG/YOUR-REPO/compare/a1b2c3d...e4f5a6b)

To pair a prompt with the commit it produced, quote the prompt (curated, not a
full transcript) next to the citation:

> the prompt, verbatim

Screenshots are welcome where one carries the verification better than a
sentence does. Commit the file to this repo and link it with a **relative**
path, which is what makes it render on GitHub: `![alt text](docs/before.png)`.
Images don't count towards the word count and don't replace the citation.

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that a
reflection entry the marker reads is in `reflections/`, and that your
`CLAUDE.md` is there --- before a marker ever opens the file. It checks that
your map is traceable, not that it is good: the marker judges whether your
small, deliberately chosen set of moments shows real judgement and reflection. A
green check is not a substitute for that curation.

Images aren't checked: unlike a citation whose SHA doesn't resolve, a broken
image is visible the moment this file is rendered on GitHub.
