#!/usr/bin/env node
/** Safe push: rebase onto origin first, then push (same idea as pre-push hook). */

import { execFileSync } from "node:child_process";

const branch = execFileSync("git", ["symbolic-ref", "--short", "HEAD"], {
  encoding: "utf8",
}).trim();

const porcelain = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" });
const dirty = porcelain.split("\n").some((l) => l && !l.startsWith("??"));
if (dirty) {
  console.error("git:push — commit or stash tracked changes first.");
  process.exit(1);
}

console.error(`git:push → pull --rebase origin ${branch}, then push\n`);
execFileSync("git", ["pull", "--rebase", "origin", branch], { stdio: "inherit" });
execFileSync("git", ["push", "origin", branch], { stdio: "inherit" });
