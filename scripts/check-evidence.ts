#!/usr/bin/env node
// Checks the process evidence every submission carries: PROCESS.md with its
// template boilerplate gone, every cited commit hash resolving to a real
// commit in this repo (a citation is a markdown link whose text is an
// abbreviated SHA or a sha...sha range), a reflection entry the marker reads,
// and your CLAUDE.md.
//
// The repo's name carries the deliverable prefix (repo = <prefix>-<handle>),
// and the reflection is named for the deliverable, so the expected names
// derive from the name alone, offline. The final-project repo spans several
// deliverables; any one of its names counts here.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const REFLECTION_NAME = /^(crit-\d+|assignment-\d+|final-project)\.md$/;

// The repo's name is the one fact linking this working copy to a published
// deliverable. In CI it's authoritative; locally it comes from origin.
export function repoName(): string | undefined {
  const fromCI = process.env.GITHUB_REPOSITORY?.split("/").at(-1);
  if (fromCI) return fromCI;
  try {
    const origin = execFileSync("git", ["config", "--get", "remote.origin.url"], {
      encoding: "utf8",
    }).trim();
    return origin
      .replace(/\.git$/, "")
      .split(/[/:]/)
      .filter(Boolean)
      .at(-1);
  } catch {
    return undefined;
  }
}

/** The reflection filenames the marker reads for this repo, from its name
 *  alone; null for a repo without a course prefix. */
export function expectedReflections(repo: string): string[] | null {
  const crit = repo.match(/^comp4020-crit(\d+)-/);
  if (crit) return [`crit-${Number.parseInt(crit[1], 10)}.md`];
  const assignment = repo.match(/^comp4020-ass(\d+)-/);
  if (assignment) return [`assignment-${assignment[1]}.md`];
  if (repo.startsWith("comp4020-final-"))
    return ["crit-8.md", "crit-9.md", "crit-10.md", "final-project.md"];
  return null;
}

function main(): void {
  let failed = false;
  const fail = (msg: string): void => {
    console.error(`✗ ${msg}`);
    failed = true;
  };
  const skip = (msg: string): void => {
    console.warn(`! ${msg}`);
  };

  if (!existsSync("CLAUDE.md")) {
    fail("no CLAUDE.md in the repo root — the harness is part of what's marked");
  }

  const reflections = existsSync("reflections")
    ? readdirSync("reflections").filter((f) => f.endsWith(".md") && f !== "README.md")
    : [];
  for (const f of reflections.filter((name) => !REFLECTION_NAME.test(name))) {
    console.warn(`! reflections/${f} isn't a name the marker reads, so it won't be marked`);
  }

  const repo = repoName();
  const expected = repo && expectedReflections(repo);
  if (!repo) {
    skip("no origin remote to name this repo — skipping the reflection check");
  } else if (!expected) {
    skip(`${repo} doesn't carry a course repo prefix — skipping the reflection check`);
  } else {
    const found = expected.filter((name) => reflections.includes(name));
    if (found.length > 0) {
      console.log(`✓ reflections/${found.join(", reflections/")}: entries the marker reads`);
    } else {
      fail(
        expected.length === 1
          ? `no reflection — the marker reads reflections/${expected[0]}`
          : `no reflection — the marker reads these names: ${expected.join(", ")}`,
      );
    }
  }

  if (!existsSync("PROCESS.md")) {
    fail("no PROCESS.md in the repo root");
    process.exit(1);
  }

  const src = readFileSync("PROCESS.md", "utf8");

  if (src.includes("TEMPLATE:")) {
    fail(
      "PROCESS.md still contains the template comment — replace the boilerplate with your own overview",
    );
  }

  const shas = new Set<string>();
  for (const match of src.matchAll(/\[`?([0-9a-f]{7,40}(?:\.\.\.[0-9a-f]{7,40})?)`?\]\(/g)) {
    for (const sha of match[1].split("...")) shas.add(sha);
  }

  if (shas.size === 0) {
    fail("no commit citations found — cite each moment as [`<sha>`](<commit or compare URL>)");
  }

  for (const sha of shas) {
    try {
      execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], {
        stdio: "ignore",
      });
    } catch {
      fail(`cited commit ${sha} doesn't exist in this repo`);
    }
  }

  // Images aren't checked: whether one renders is visible the moment you look
  // at PROCESS.md on GitHub, unlike a citation whose SHA doesn't resolve,
  // which looks perfectly fine rendered.

  if (failed) process.exit(1);
  console.log(`✓ PROCESS.md: ${shas.size} cited commit(s) all resolve`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
