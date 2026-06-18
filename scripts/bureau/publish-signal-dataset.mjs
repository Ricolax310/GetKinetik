#!/usr/bin/env node
/**
 * Publish GETKINETIK signal reports to a private Hugging Face dataset.
 *
 * Why: versioned, reproducible history of the daily/weekly/monthly signal
 * outputs (git-backed on the Hub) so we can track drift and replay past runs.
 *
 * Auth: requires a WRITE token. Set HF_TOKEN (preferred) or run `hf auth login`.
 * Dataset id: --dataset arg or HF_DATASET_ID env (default below).
 *
 * Usage:
 *   node scripts/bureau/publish-signal-dataset.mjs --dry-run        # stage only, no upload, no token needed
 *   HF_TOKEN=hf_xxx node scripts/bureau/publish-signal-dataset.mjs  # create (if needed) + upload
 *   node scripts/bureau/publish-signal-dataset.mjs --dataset ericmg310/getkinetik-signal-reports
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadEnvQuiet } from "./lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const REPORTS_DIR = path.join(REPO_ROOT, "docs/reports");

const DEFAULT_DATASET_ID = "ericmg310/getkinetik-signal-reports";

function parseArgs(argv) {
  const args = { dryRun: false, dataset: null, public: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--public") args.public = true;
    else if (a === "--dataset") args.dataset = argv[++i];
  }
  return args;
}

/** Recursively collect report files we want to publish (structured + narrative). */
function collectReportFiles() {
  const wanted = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (/\.(json|md)$/i.test(entry.name)) wanted.push(abs);
    }
  };
  walk(REPORTS_DIR);
  return wanted.sort();
}

/** Summarize daily signal JSON files into a compact manifest for quick scanning. */
function buildManifest(files) {
  const daily = [];
  for (const abs of files) {
    const rel = path.relative(REPORTS_DIR, abs).replace(/\\/g, "/");
    if (!/^daily\/\d{4}-\d{2}-\d{2}-signal\.json$/.test(rel)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(abs, "utf8"));
      const signals = Array.isArray(data.signals) ? data.signals : [];
      const networks = [...new Set(signals.map((s) => s.networkId).filter(Boolean))];
      daily.push({
        date: data.date || rel.slice(6, 16),
        path: `reports/${rel}`,
        signalCount: signals.length,
        networks,
        questionCount: Array.isArray(data.questions) ? data.questions.length : 0,
      });
    } catch (e) {
      console.error(`[publish] skip unreadable ${rel}: ${e.message}`);
    }
  }
  daily.sort((a, b) => (a.date < b.date ? 1 : -1));
  return {
    name: "getkinetik-signal-reports",
    description:
      "Versioned snapshots of GETKINETIK neutral DePIN bureau signal reports (daily/weekly/monthly).",
    generatedAt: new Date().toISOString(),
    fileCount: files.length,
    dailyCount: daily.length,
    daily,
  };
}

function buildDatasetCard(manifest) {
  const latest = manifest.daily[0];
  return `---
license: other
tags:
  - depin
  - registry-integrity
  - getkinetik
  - signals
pretty_name: GETKINETIK Signal Reports
---

# GETKINETIK Signal Reports

Versioned snapshots of the GETKINETIK neutral DePIN bureau signal pipeline.

- **Daily reports:** structured \`signals\` JSON + public briefs
- **Weekly / monthly:** synthesis markdown
- **Generated:** ${manifest.generatedAt}
- **Daily snapshots:** ${manifest.dailyCount}
${latest ? `- **Latest:** ${latest.date} (${latest.signalCount} signals across ${latest.networks.join(", ") || "—"})` : ""}

Each daily \`signals\` entry is a reproducible read on **public** network data
(coordinates, capacity cells, on-chain concentration). This is registry-hygiene
signal — never an accusation of fraud. See \`manifest.json\` for the index.
`;
}

function copyInto(stageDir, files) {
  for (const abs of files) {
    const rel = path.relative(REPORTS_DIR, abs);
    const dest = path.join(stageDir, "reports", rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(abs, dest);
  }
}

/** Quote an argument so spaces/parens survive the Windows + POSIX shells. */
function quoteArg(a) {
  return `"${String(a).replace(/"/g, '\\"')}"`;
}

function runHf(cmdArgs, token) {
  const cmd = ["hf", ...cmdArgs].map(quoteArg).join(" ");
  return execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env, HF_TOKEN: token },
  });
}

function main() {
  loadEnvQuiet();
  const args = parseArgs(process.argv.slice(2));
  const datasetId = args.dataset || process.env.HF_DATASET_ID || DEFAULT_DATASET_ID;
  const token = process.env.HF_TOKEN?.trim();

  const files = collectReportFiles();
  if (!files.length) {
    console.error(`[publish] no report files found under ${REPORTS_DIR}`);
    process.exit(1);
  }

  const manifest = buildManifest(files);
  const card = buildDatasetCard(manifest);

  const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), "kinetik-hf-"));
  try {
    copyInto(stageDir, files);
    fs.writeFileSync(path.join(stageDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
    fs.writeFileSync(path.join(stageDir, "README.md"), card, "utf8");

    console.error(
      `[publish] staged ${files.length} files (${manifest.dailyCount} daily) → ${datasetId}`,
    );

    if (args.dryRun) {
      console.error(`[publish] --dry-run: staged at ${stageDir} (not uploaded)`);
      console.log(JSON.stringify({ datasetId, fileCount: manifest.fileCount, dailyCount: manifest.dailyCount, latest: manifest.daily[0] || null }, null, 2));
      return;
    }

    if (!token) {
      console.error(
        "[publish] No HF_TOKEN set. Export a write token (HF_TOKEN=hf_xxx) or run `hf auth login`, then retry.",
      );
      process.exit(2);
    }

    runHf(
      ["repos", "create", datasetId, "--type", "dataset", args.public ? "--public" : "--private", "--exist-ok"],
      token,
    );
    runHf(
      [
        "upload",
        datasetId,
        stageDir,
        ".",
        "--type",
        "dataset",
        "--commit-message",
        `signal reports ${manifest.generatedAt.slice(0, 10)} (${manifest.dailyCount} daily)`,
      ],
      token,
    );

    console.error(`[publish] done → https://huggingface.co/datasets/${datasetId}`);
  } finally {
    fs.rmSync(stageDir, { recursive: true, force: true });
  }
}

main();
