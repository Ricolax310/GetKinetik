#!/usr/bin/env node
// Strict regression check: any observed derived.score must be finite and [0, 1000].
// This script runs fuzz with a deterministic seed and enforces:
//   - score_oob === 0
//   - scores_seen > 0 (so the bound assertion is exercised)

import { spawn } from "node:child_process";

const cmd = process.execPath;
const args = [
  "scripts/fuzz/fuzz-verify-device.mjs",
  "--count",
  "250",
  "--seed",
  "12345",
];

const child = spawn(cmd, args, {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";

child.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  stdout += text;
  process.stdout.write(text);
});

child.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  stderr += text;
  process.stderr.write(text);
});

child.on("close", (code) => {
  if (code !== 0) {
    console.error(`\nREGRESSION FAIL: fuzz script exited with code ${code}`);
    process.exit(code ?? 1);
  }

  const scoreOobMatch = stdout.match(/score_oob:\s+(\d+)/);
  const scoresSeenMatch = stdout.match(/scores_seen:\s+(\d+)/);

  const scoreOob = scoreOobMatch ? Number(scoreOobMatch[1]) : NaN;
  const scoresSeen = scoresSeenMatch ? Number(scoresSeenMatch[1]) : NaN;

  if (!Number.isFinite(scoreOob) || !Number.isFinite(scoresSeen)) {
    console.error(
      "\nREGRESSION FAIL: could not parse score_oob/scores_seen from fuzz summary.",
    );
    process.exit(1);
  }

  if (scoresSeen < 1) {
    console.error(
      `\nREGRESSION FAIL: no derived.score observed (scores_seen=${scoresSeen}).`,
    );
    process.exit(1);
  }

  if (scoreOob !== 0) {
    console.error(
      `\nREGRESSION FAIL: derived.score out of bounds detected (score_oob=${scoreOob}).`,
    );
    process.exit(1);
  }

  console.log(
    `\nREGRESSION PASS: derived.score bounds hold (scores_seen=${scoresSeen}, score_oob=${scoreOob}).`,
  );
  process.exit(0);
});
