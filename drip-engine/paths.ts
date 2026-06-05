// Shared filesystem paths for the distribution engine.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "..");

function firstExisting(...candidates: string[]): string {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

export const PATHS = {
  signalsLatest: firstExisting(
    path.join(REPO_ROOT, "signals/latest.json"),
    path.join(REPO_ROOT, "landing/api/signals/latest.json"),
  ),
  signalsHistory: path.join(REPO_ROOT, "signals/history.json"),
  signalsWeekly: path.join(REPO_ROOT, "signals/weekly/latest.json"),
  signalsMonthly: path.join(REPO_ROOT, "signals/monthly/latest.json"),
  signalsDailyDir: path.join(REPO_ROOT, "signals/daily"),
  publicDrip: path.join(REPO_ROOT, "landing/public/drip"),
  apiDrip: path.join(REPO_ROOT, "landing/api/drip"),
};

export const SITE_URL = "getkinetik.app/site";
