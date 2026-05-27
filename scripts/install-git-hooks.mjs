#!/usr/bin/env node
// One-time per clone: npm run git:hooks-install

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS_DIR = path.join(ROOT, ".githooks");
const PRE_PUSH = path.join(HOOKS_DIR, "pre-push");

function run(cmd, args) {
  execFileSync(cmd, args, { cwd: ROOT, stdio: "inherit" });
}

if (!fs.existsSync(PRE_PUSH)) {
  console.error("Missing .githooks/pre-push");
  process.exit(1);
}

try {
  run("git", ["config", "core.hooksPath", ".githooks"]);
  run("git", ["config", "pull.rebase", "true"]);
  run("git", ["config", "fetch.prune", "true"]);
  // Store executable bit in git (Git Bash runs hooks on Windows)
  try {
    run("git", ["add", "--chmod=+x", ".githooks/pre-push"]);
  } catch {
    run("git", ["update-index", "--chmod=+x", ".githooks/pre-push"]);
  }
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}

console.log(`
Git hooks installed for this repo only (not global).

  core.hooksPath = .githooks
  pull.rebase    = true

Before every push to main/master:
  → fetch origin
  → rebase if bureau automation (or anyone) pushed first

Commands:
  npm run git:sync   — pull --rebase without pushing
  npm run git:push   — sync then push current branch

See docs/DEV_GIT.md
`);
