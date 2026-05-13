import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "geodnet-scan-"));

try {
  const input = path.join(tmp, "stations.json");
  const report = path.join(tmp, "report.md");
  const snapshot = path.join(tmp, "snapshot.json");

  fs.writeFileSync(
    input,
    JSON.stringify([
      { name: "****MASK1", lat: 0.00001, lng: 0.00001 },
      { name: "****MASK2", lat: 0.00002, lng: 0.00002 },
      { name: "****MASK1", lat: 1.00001, lng: 1.00001 },
      { name: "****MASK2", lat: 1.00002, lng: 1.00002 },
    ]),
  );

  execFileSync(
    process.execPath,
    [
      "scripts/sybil-scan-geodnet.mjs",
      `--input=${input}`,
      `--out=${report}`,
      `--snapshot=${snapshot}`,
      "--generated-at=2026-05-13T00:00:00.000Z",
    ],
    { cwd: path.resolve("."), stdio: "pipe" },
  );

  const markdown = fs.readFileSync(report, "utf8");
  assert.match(markdown, /Stations flagged \(any heuristic\):\*\* 4 \(100\.00%\)/);
  assert.match(markdown, /Near-duplicate stations within 10 m — 2 clusters/);

  const data = JSON.parse(fs.readFileSync(snapshot, "utf8"));
  assert.equal(data.duplicates.length, 2);
  assert.deepEqual(Object.keys(data.duplicates[0][0]).sort(), ["lat", "lng", "name"]);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
