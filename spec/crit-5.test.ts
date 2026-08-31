import { describe, expect, it } from "vitest";
import { resolveUnstableEnemyRemoval, type Enemy } from "../enemies";

// Crit 5 ("A game") contract:
// https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/05-game/
//
// Most of this week's spec is judged live at the crit --- whether the opening
// screen makes the first move obvious with zero on-screen instructions,
// whether a stranger reaches an ending inside five minutes, whether a change
// really came from playing rather than reading the code --- and no static
// test can stand in for a person playing the thing cold. This file covers
// only the one rule chosen as the focused, mechanically checkable case: the
// unstable enemy's removal transition. Everything else in the spec is judged
// at the crit, not tested here.
//
// The rule: an unstable enemy that times out disappears on its own and
// spawns nothing; one destroyed by a player projectile is removed and
// spawns exactly two persistent enemies. `resolveUnstableEnemyRemoval` is
// the pure function the game logic calls at that removal point --- write it
// in `enemies.ts` at the repo root (see CLAUDE.md: app modules live flat at
// the root, not under `src/`).

describe("crit 5: unstable enemy transition", () => {
  const unstable: Enemy = { kind: "unstable", x: 120, y: 240 };

  it("removes itself with no spawn when it times out", () => {
    const spawned = resolveUnstableEnemyRemoval(unstable, "timeout");
    expect(spawned).toHaveLength(0);
  });

  it("spawns exactly two enemies when destroyed by a player projectile", () => {
    const spawned = resolveUnstableEnemyRemoval(unstable, "destroyed");
    expect(spawned).toHaveLength(2);
  });

  it("spawns only persistent enemies from a destroyed unstable one", () => {
    const spawned = resolveUnstableEnemyRemoval(unstable, "destroyed");
    for (const enemy of spawned) {
      expect(enemy.kind).toBe("persistent");
    }
  });

  it("never spawns another unstable enemy from a destroyed one", () => {
    const spawned = resolveUnstableEnemyRemoval(unstable, "destroyed");
    expect(spawned.every((enemy) => enemy.kind !== "unstable")).toBe(true);
  });
});
