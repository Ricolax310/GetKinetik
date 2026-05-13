// ============================================================================
// Local regression checks for scripts/sybil-report.mjs.
//
// Run: node scripts/test-sybil-report.mjs
// ============================================================================

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function runReport(nodes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sybil-report-"));
  const input = path.join(dir, "nodes.json");
  fs.writeFileSync(input, JSON.stringify(nodes), "utf8");
  try {
    return execFileSync(
      process.execPath,
      ["scripts/sybil-report.mjs", input, "--network=RegressionNet"],
      { cwd: process.cwd(), encoding: "utf8" },
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const crossingHourStartMs = Date.UTC(2026, 0, 1, 0, 55, 0);
const crossingHourBurst = Array.from({ length: 10 }, (_, i) => ({
  id: `burst-${String(i + 1).padStart(2, "0")}`,
  firstSeenMs: crossingHourStartMs + i * 60_000,
  lifetimeBeats: 1,
}));

const report = runReport(crossingHourBurst);
assert.match(report, /Nodes flagged:\*\* 10 \(100\.0%\)/);
assert.match(report, /## 2\. Birth bursts — 1 window/);
assert.match(report, /burst-01/);
assert.match(report, /burst-10/);

console.log("sybil-report regression checks passed");
