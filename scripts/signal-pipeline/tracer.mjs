// Execution tracer — captures full pipeline state at each stage so any post
// can be replayed exactly from raw signal input.
//
// Replay contract: trace.input + trace.grammarVersion => identical output.
// Storage: logs/traces/YYYY-MM-DDTHH-MM-SS.json + logs/traces/latest.json

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const TRACES_DIR = path.join(REPO_ROOT, "logs/traces");

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function hashInput(feed) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(feed))
    .digest("hex")
    .slice(0, 16);
}

/**
 * Create a new trace context for one pipeline run.
 * Call trace.record(stage, data) at each stage, then trace.flush() at end.
 */
export function createTrace({ feed, grammarVersion, mode }) {
  const traceId = `${stamp()}-${hashInput(feed).slice(0, 8)}`;
  const stages = [];

  return {
    traceId,
    record(stageName, data) {
      stages.push({ stage: stageName, at: new Date().toISOString(), data });
    },
    flush(result) {
      const trace = {
        traceId,
        at: new Date().toISOString(),
        replayable: true,
        input: feed,
        grammarVersion,
        mode,
        inputHash: hashInput(feed),
        stages,
        output: result,
      };
      try {
        fs.mkdirSync(TRACES_DIR, { recursive: true });
        fs.writeFileSync(path.join(TRACES_DIR, `${traceId}.json`), JSON.stringify(trace, null, 2), "utf8");
        fs.writeFileSync(path.join(TRACES_DIR, "latest.json"), JSON.stringify(trace, null, 2), "utf8");
      } catch { /* non-fatal */ }
      return trace;
    },
  };
}

/**
 * Replay a stored trace exactly.
 * Loads the trace file, re-runs the pipeline with the stored input +
 * grammarVersion, and returns the new output alongside the original.
 *
 * @param {string} tracePathOrId - absolute path OR traceId (looks in logs/traces/)
 * @param {function} runFn - the same runCompiler function used in run.mjs
 * @returns {{ original, replayed, match: boolean }}
 */
export async function replayTrace(tracePathOrId, runFn) {
  let filePath = tracePathOrId;
  if (!path.isAbsolute(tracePathOrId)) {
    filePath = path.join(TRACES_DIR, tracePathOrId.endsWith(".json") ? tracePathOrId : `${tracePathOrId}.json`);
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Trace not found: ${filePath}`);
  }
  const trace = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const replayed = await runFn({ input: trace.input, grammarVersion: trace.grammarVersion });

  const originalMd = trace.output?.markdown || "";
  const replayedMd = replayed?.markdown || "";
  const match = originalMd === replayedMd;

  return {
    traceId: trace.traceId,
    grammarVersion: trace.grammarVersion,
    inputHash: trace.inputHash,
    original: trace.output,
    replayed,
    match,
    verdict: match ? "DETERMINISTIC" : "DIVERGED",
  };
}

/** List all stored traces, newest first. */
export function listTraces() {
  if (!fs.existsSync(TRACES_DIR)) return [];
  return fs
    .readdirSync(TRACES_DIR)
    .filter((f) => f.endsWith(".json") && f !== "latest.json")
    .sort()
    .reverse()
    .map((f) => {
      try {
        const t = JSON.parse(fs.readFileSync(path.join(TRACES_DIR, f), "utf8"));
        return { traceId: t.traceId, at: t.at, grammarVersion: t.grammarVersion, mode: t.mode, verdict: t.output?.posted ? "posted" : "not-posted" };
      } catch { return null; }
    })
    .filter(Boolean);
}
