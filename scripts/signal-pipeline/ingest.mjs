// Step 1: data ingestion. Pull latest public data for every network, then
// refresh the audit index so downstream signal detection sees fresh snapshots.
//
// Resilient by design: a failed or skipped scan never aborts the run. We fall
// back to the most recent snapshot on disk so the pipeline stays autonomous.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  loadRegistry,
  loadAnomalyTaxonomy,
  loadEnvQuiet,
  resolveRepo,
  redactSecrets,
  writeAuditIndex,
} from "../bureau/lib.mjs";
import { REPO_ROOT, PIPELINE_NETWORKS } from "./config.mjs";

const SCAN_TIMEOUT_MS = 180_000;

function missingEnv(net) {
  return (net.requiresEnv || []).filter((k) => !process.env[k]?.trim());
}

function runScan(net) {
  if (!net.scanScript) {
    return { ok: false, skipped: true, reason: "no scanner wired" };
  }
  const script = path.join(REPO_ROOT, "scripts", net.scanScript);
  if (!fs.existsSync(script)) {
    return { ok: false, skipped: true, reason: `scan script missing: ${net.scanScript}` };
  }
  const miss = missingEnv(net);
  if (miss.length) {
    return { ok: false, skipped: true, reason: `missing env: ${miss.join(", ")}` };
  }
  try {
    execFileSync(process.execPath, [script], {
      cwd: REPO_ROOT,
      stdio: "ignore",
      env: process.env,
      timeout: SCAN_TIMEOUT_MS,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: redactSecrets(String(e?.message || e)).slice(0, 200) };
  }
}

function snapshotAgeDays(net) {
  if (!net.snapshot) return null;
  const p = path.join(REPO_ROOT, net.snapshot);
  if (!fs.existsSync(p)) return null;
  return Math.round((Date.now() - fs.statSync(p).mtimeMs) / 86_400_000);
}

/**
 * @param {{ live?: boolean }} options live=true attempts fresh scans; otherwise
 *   the pipeline normalizes from existing snapshots (default, CI-safe).
 */
export function ingestAll(options = {}) {
  loadEnvQuiet();
  const live = options.live ?? false;
  const registry = loadRegistry();
  const byId = Object.fromEntries(registry.map((n) => [n.id, n]));

  const results = [];
  for (const meta of PIPELINE_NETWORKS) {
    const net = byId[meta.id];
    if (!net) {
      results.push({
        id: meta.id,
        name: meta.name,
        status: "pending",
        scanned: false,
        reason: "not in bureau registry (no scanner)",
      });
      continue;
    }
    let scan = { ok: false, skipped: true, reason: "snapshot reuse (offline mode)" };
    if (live) scan = runScan(net);
    results.push({
      id: net.id,
      name: net.name,
      status: scan.ok ? "scanned" : scan.skipped ? "snapshot" : "scan-error",
      scanned: scan.ok === true,
      reason: scan.reason || scan.error || null,
      snapshotAgeDays: snapshotAgeDays(net),
    });
  }

  // Refresh the audit index from whatever snapshots are now on disk.
  let indexRefreshed = false;
  try {
    writeAuditIndex(REPO_ROOT, registry, resolveRepo, loadAnomalyTaxonomy());
    indexRefreshed = true;
  } catch (e) {
    results.push({ id: "_index", status: "scan-error", reason: String(e?.message || e).slice(0, 160) });
  }

  return { live, indexRefreshed, networks: results, networksProcessed: PIPELINE_NETWORKS.map((n) => n.id) };
}
