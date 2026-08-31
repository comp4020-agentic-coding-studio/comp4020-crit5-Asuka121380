# Crit 5 reflection

**What was the breakthrough that moved the work forward?**

It was realising that reading the code was not the same as testing the game,
and that the two disagreed. Everything looked right on paper — the split rule
matched the contract test, the collision logic looked reasonable, the balance
constants were sensible-sounding guesses. But driving the actual built site in
a real headless browser, screenshotting a scripted dodge-and-fire session,
showed something the code review never would have: four persistent enemies
alive at once in a 180-pixel-wide arena, and the ship dead within nineteen
seconds. That number — not a feeling, not a re-read of `game.ts` — is what
justified lowering the enemy cap, and re-running the identical script and
watching survival time roughly double is what confirmed the fix actually
worked rather than just feeling safer.

**What did this work change about who I want to be as a software developer?**

I want to be someone who treats "the tests pass" and "I played it and it's
good" as two separate claims, not one. A green `vitest run` here proved exactly
one narrow contract about an enemy-removal function; it said nothing about
whether the finished game was fun, fair, or even fully wired together. The gap
between those two kinds of confidence is where the real bugs and the real
balance problems live, and this project is the first time I've deliberately
built evidence for the second kind — screenshots, console logs, a before/after
comparison from an actual playtest — rather than treating a passing check
suite as the finish line.
