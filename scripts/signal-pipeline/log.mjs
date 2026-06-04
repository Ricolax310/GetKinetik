// Step 6: system logging. One JSON record per run under logs/<cadence>/,
// plus a rolling latest.json for quick inspection.

import fs from "node:fs";
import path from "node:path";
import { PATHS } from "./config.mjs";

/**
 * @param {"daily"|"weekly"|"monthly"} cadence
 * @param {object} entry { job, timestamp, networksProcessed, signalsGenerated, reportsPublished, errors }
 */
export function writeRunLog(cadence, entry) {
  const dir = path.join(PATHS.logsDir, cadence);
  fs.mkdirSync(dir, { recursive: true });
  const stamp = (entry.timestamp || new Date().toISOString()).replace(/[:.]/g, "-");
  const record = {
    job: entry.job,
    cadence,
    timestamp: entry.timestamp || new Date().toISOString(),
    networksProcessed: entry.networksProcessed || [],
    signalsGenerated: entry.signalsGenerated ?? 0,
    reportsPublished: entry.reportsPublished || [],
    errors: entry.errors || [],
    ok: (entry.errors || []).length === 0,
  };
  const file = path.join(dir, `${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(record, null, 2), "utf8");
  fs.writeFileSync(path.join(dir, "latest.json"), JSON.stringify(record, null, 2), "utf8");
  return path.relative(PATHS.logsDir, file).replace(/\\/g, "/");
}
