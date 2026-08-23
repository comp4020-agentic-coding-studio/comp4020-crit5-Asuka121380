import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { expectedReflections } from "./check-evidence.ts";

// The expected reflection names derive from the repo name alone — offline,
// no course calendar. The final repo spans several deliverables, so any of
// its names counts; which weeks have entries is the tutor's question.
describe("expectedReflections", () => {
  it("names the weekly crit's reflection from the repo prefix", () => {
    expect(expectedReflections("comp4020-crit1-alice")).toEqual(["crit-1.md"]);
    expect(expectedReflections("comp4020-crit5-alice")).toEqual(["crit-5.md"]);
  });

  it("names the assignment's reflection, which the retro crit reads too", () => {
    expect(expectedReflections("comp4020-ass1-alice")).toEqual(["assignment-1.md"]);
  });

  it("accepts any of the shared final repo's names", () => {
    expect(expectedReflections("comp4020-final-alice")).toEqual([
      "crit-8.md",
      "crit-9.md",
      "crit-10.md",
      "final-project.md",
    ]);
  });

  it("matches nothing for a repo without a course prefix", () => {
    expect(expectedReflections("template-static")).toBeNull();
  });
});

const script = resolve("scripts/check-evidence.ts");
const fixtures: string[] = [];

const env = {
  ...process.env,
  // in CI this names the repo running the tests, not the fixture
  GITHUB_REPOSITORY: "",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
};

function fixture(withClaudeMd = true, reflection = "crit-1.md"): string {
  const cwd = mkdtempSync(join(tmpdir(), "check-evidence-"));
  fixtures.push(cwd);
  mkdirSync(join(cwd, "reflections"));
  writeFileSync(join(cwd, "reflections", reflection), "# Reflection\n");
  if (withClaudeMd) writeFileSync(join(cwd, "CLAUDE.md"), "# Working method\n");
  execFileSync("git", ["init", "-q"], { cwd, env });
  execFileSync(
    "git",
    ["remote", "add", "origin", "https://github.com/comp4020-agentic-coding-studio/comp4020-crit1-alice.git"],
    { cwd, env },
  );
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--allow-empty",
      "-m",
      "fixture",
      "-q",
    ],
    { cwd, env },
  );
  const sha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd,
    env,
    encoding: "utf8",
  }).trim();
  writeFileSync(
    join(cwd, "PROCESS.md"),
    `# Process\n\nEvidence: [${sha.slice(0, 8)}](https://example.invalid/commit/${sha})\n`,
  );
  return cwd;
}

afterEach(() => {
  for (const cwd of fixtures.splice(0)) rmSync(cwd, { recursive: true });
});

describe("check:evidence", () => {
  it("passes with the reflection the repo's name expects", () => {
    const result = spawnSync(process.execPath, [script], {
      cwd: fixture(),
      env,
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("reflections/crit-1.md");
  });

  it("rejects a repo whose expected reflection is missing", () => {
    const result = spawnSync(process.execPath, [script], {
      cwd: fixture(true, "crit-2.md"),
      env,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("the marker reads reflections/crit-1.md");
  });

  it("rejects a missing CLAUDE.md", () => {
    const result = spawnSync(process.execPath, [script], {
      cwd: fixture(false),
      env,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("no CLAUDE.md");
  });
});
