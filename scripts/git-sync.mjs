#!/usr/bin/env node
/** Pull --rebase current branch from origin (use before push if hooks not installed). */

import { execFileSync } from "node:child_process";

const branch = execFileSync("git", ["symbolic-ref", "--short", "HEAD"], {
  encoding: "utf8",
}).trim();

console.error(`git:sync → pull --rebase origin ${branch}\n`);
execFileSync("git", ["pull", "--rebase", "origin", branch], { stdio: "inherit" });
