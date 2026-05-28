#!/usr/bin/env node
// Bureau runner: scan → report → outreach files → brief/publish.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  REPO_ROOT,
  OUTREACH_DIR,
  appendLog,
  buildOutreachDraft,
  extractHeadlineFindings,
  fileAgeMs,
  formatAge,
  loadEnvQuiet,
  loadRegistry,
  redactSecrets,
  resolveRepo,
  writePipelineSummary,
  writeDailyBrief,
  writeAuditIndex,
} from "./bureau/lib.mjs";
import { runBureauNews } from "./bureau/news-run.mjs";
import { writeOperatorBrief } from "./bureau/operator-brief.mjs";
import { writeOpsPack } from "./bureau/ops-pack.mjs";
import { writeDepinChatContext } from "./bureau/build-depin-chat-context.mjs";
import { writePublishingPack } from "./bureau/publish.mjs";

const args = process.argv.slice(2);
const cmd = args[0] || "status";
const positional = args.filter((a, i) => i > 0 && !a.startsWith("--"));
const target = positional[0] || "all";
const onlyArg = args.find((a) => a.startsWith("--only="))?.split("=")[1];
const force = args.includes("--force");
const SCAN_DELAY_MS = 2500;

function usage() {
  console.error(`
GETKINETIK bureau runner

  node scripts/bureau-run.mjs status
  node scripts/bureau-run.mjs scan [network-id|all]
  node scripts/bureau-run.mjs outreach [network-id|all]
  node scripts/bureau-run.mjs pipeline [--only=id1,id2] [--force]
  node scripts/bureau-run.mjs brief
  node scripts/bureau-run.mjs publish
  node scripts/bureau-run.mjs news [--post]

Registry: scripts/bureau/networks.json
`);
}

function selectNetworks(registry) {
  let list = registry;
  if (onlyArg) {
    const ids = new Set(onlyArg.split(",").map((s) => s.trim()).filter(Boolean));
    list = list.filter((n) => ids.has(n.id));
  } else if (target !== "all") {
    list = list.filter((n) => n.id === target);
  } else if (cmd === "pipeline" || cmd === "scan") {
    list = list.filter((n) => n.defaultEnabled !== false);
  }
  if (list.length === 0) {
    console.error("No networks matched. Check scripts/bureau/networks.json");
    process.exit(1);
  }
  return list;
}

function missingEnv(net) {
  const req = net.requiresEnv || [];
  return req.filter((k) => !process.env[k]?.trim());
}

function runScan(net) {
  const script = resolveRepo(path.join("scripts", net.scanScript));
  if (!fs.existsSync(script)) {
    throw new Error(`scan script missing: ${net.scanScript}`);
  }
  const miss = missingEnv(net);
  if (miss.length) {
    console.error(
      `[warn] ${net.id}: skipping scan — set env ${miss.join(", ")} (${net.scanNotes})`,
    );
    return { ok: false, skipped: true, reason: `missing env: ${miss.join(", ")}` };
  }
  console.error(`[scan] ${net.id} → node ${net.scanScript}`);
  try {
    execFileSync(process.execPath, [script], {
      cwd: REPO_ROOT,
      stdio: "inherit",
      env: process.env,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: redactSecrets(String(e.message || e)) };
  }
}

function validateReport(net) {
  const reportPath = resolveRepo(net.report);
  if (!fs.existsSync(reportPath)) {
    return { ok: false, error: "report file missing after scan" };
  }
  const md = fs.readFileSync(reportPath, "utf8");
  if (md.length < 200) {
    return { ok: false, error: "report suspiciously short" };
  }
  const findings = extractHeadlineFindings(md);
  if (findings.length === 0) {
    return { ok: true, warn: "no Headline findings section — outreach will be generic" };
  }
  return { ok: true, findings: findings.length };
}

function runOutreach(net, opts = {}) {
  const forceRegen = opts.force ?? force;
  const reportPath = resolveRepo(net.report);
  if (!fs.existsSync(reportPath)) {
    return { ok: false, error: "report missing — run scan first" };
  }
  const reportMd = fs.readFileSync(reportPath, "utf8");
  const date = new Date().toISOString().slice(0, 10);
  const outFile = path.join(OUTREACH_DIR, `${net.id}-outreach-${date}.md`);
  if (fs.existsSync(outFile) && !forceRegen) {
    console.error(`[outreach] ${net.id}: exists ${path.relative(REPO_ROOT, outFile)} (use --force)`);
    return { ok: true, skipped: true, path: outFile };
  }
  const draft = buildOutreachDraft(net, reportMd);
  fs.mkdirSync(OUTREACH_DIR, { recursive: true });
  fs.writeFileSync(outFile, draft, "utf8");
  console.error(`[outreach] wrote ${path.relative(REPO_ROOT, outFile)}`);
  return { ok: true, path: outFile };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cmdStatus(registry) {
  loadEnvQuiet();
  console.log("GETKINETIK bureau status\n");
  for (const net of registry) {
    const reportPath = resolveRepo(net.report);
    const age = formatAge(fileAgeMs(reportPath));
    const snapPath = resolveRepo(net.snapshot);
    const snapAge = formatAge(fileAgeMs(snapPath));
    const envMiss = missingEnv(net).join(",") || "—";
    console.log(
      `  ${net.id.padEnd(12)} report: ${age.padEnd(8)} snapshot: ${snapAge.padEnd(8)} env: ${envMiss}`,
    );
  }
  console.log("\nRun: npm run bureau:pipeline");
}

async function cmdScan(registry) {
  loadEnvQuiet();
  const nets = selectNetworks(registry);
  const results = [];
  for (let i = 0; i < nets.length; i++) {
    const net = nets[i];
    const r = runScan(net);
    const v = r.ok ? validateReport(net) : { ok: false };
    results.push({ id: net.id, scan: r, validate: v });
    appendLog({
      action: "scan",
      network: net.id,
      ok: r.ok && v.ok !== false,
      detail: redactSecrets(JSON.stringify({ scan: r, validate: v })),
    });
    if (i < nets.length - 1) await sleep(SCAN_DELAY_MS);
  }
  const failed = results.filter((x) => !x.scan.ok || x.validate.ok === false);
  if (failed.length) process.exitCode = 1;
}

async function cmdOutreach(registry) {
  const nets = selectNetworks(registry);
  const results = [];
  for (const net of nets) {
    const r = runOutreach(net);
    results.push({ id: net.id, outreach: r });
    appendLog({ action: "outreach", network: net.id, ok: r.ok, path: r.path });
  }
}

async function cmdPipeline(registry) {
  loadEnvQuiet();
  const nets = selectNetworks(registry);
  const summary = [];
  for (let i = 0; i < nets.length; i++) {
    const net = nets[i];
    const scan = runScan(net);
    let validate = { ok: false };
    if (scan.ok) validate = validateReport(net);
    let outreach = { ok: false };
    if (scan.ok && validate.ok !== false) {
      outreach = runOutreach(net, { force });
    }
    summary.push({
      id: net.id,
      name: net.name,
      scanOk: scan.ok,
      validateOk: validate.ok !== false,
      outreachPath: outreach.path ? path.relative(REPO_ROOT, outreach.path) : null,
      skipped: scan.skipped || outreach.skipped,
      warn: validate.warn,
    });
    appendLog({
      action: "pipeline",
      network: net.id,
      ok: scan.ok && validate.ok !== false && outreach.ok,
      detail: redactSecrets(JSON.stringify(summary[summary.length - 1])),
    });
    if (i < nets.length - 1) await sleep(SCAN_DELAY_MS);
  }
  writePipelineSummary(summary);
  const briefOut = writeDailyBrief(registry, summary);
  const operatorOut = writeOperatorBrief(registry, summary);
  const opsPackOut = writeOpsPack(registry, summary);
  const depinChatCtx = await writeDepinChatContext();
  const pubOut = writePublishingPack(registry, summary);
  console.error(`\n[pipeline] summary → scripts/data/bureau-pipeline.json`);
  console.error(`[pipeline] depin chat → ${depinChatCtx}`);
  console.error(`[pipeline] brief   → ${briefOut.latestBrief}`);
  console.error(`[pipeline] ops     → ${operatorOut.latest}`);
  console.error(`[pipeline] calendar → ${opsPackOut.path}`);
  console.error(`[pipeline] bulletin → ${pubOut.bulletin} (${pubOut.onePagers.length} one-pagers)`);
  console.error(`[pipeline] deltas  → ${pubOut.deltaPosts} (${pubOut.changedCount} networks moved)`);
  const bad = summary.filter((s) => !s.scanOk);
  if (bad.length) process.exitCode = 1;
}

async function cmdBrief(registry) {
  let pipelineResults = null;
  if (fs.existsSync(path.join(REPO_ROOT, "scripts/data/bureau-pipeline.json"))) {
    try {
      pipelineResults = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, "scripts/data/bureau-pipeline.json"), "utf8"),
      ).networks;
    } catch {
      pipelineResults = null;
    }
  }
  const out = writeDailyBrief(registry, pipelineResults);
  const operatorOut = writeOperatorBrief(registry, pipelineResults);
  const opsPackOut = writeOpsPack(registry, pipelineResults);
  const depinChatCtx = await writeDepinChatContext();
  const pubOut = writePublishingPack(registry, pipelineResults);
  writeAuditIndex(REPO_ROOT, registry, resolveRepo);
  appendLog({
    action: "brief",
    ok: true,
    ...out,
    operator: operatorOut,
    opsPack: opsPackOut.path,
    depinChat: depinChatCtx,
    publish: pubOut,
  });
  console.log("GETKINETIK bureau daily brief\n");
  console.log(`  Ops:     ${operatorOut.latest}`);
  console.log(`  Ops pack: ${opsPackOut.path} → npm run bureau:ops (localhost)`);
  console.log(`  Public chat context: ${depinChatCtx} → https://getkinetik.app/bureau/ask/`);
  console.log(`  Brief:   ${out.latestBrief}`);
  console.log(`  Posts:   ${out.latestPosts}`);
  console.log(`  Deltas:  ${pubOut.deltaPosts} (${pubOut.changedCount} networks moved)`);
  console.log(`  Queue:   docs/outreach/OUTREACH_QUEUE.md`);
}

async function cmdPublish(registry) {
  let pipelineResults = null;
  if (fs.existsSync(path.join(REPO_ROOT, "scripts/data/bureau-pipeline.json"))) {
    try {
      pipelineResults = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, "scripts/data/bureau-pipeline.json"), "utf8"),
      ).networks;
    } catch {
      pipelineResults = null;
    }
  }
  const pubOut = writePublishingPack(registry, pipelineResults);
  writeAuditIndex(REPO_ROOT, registry, resolveRepo);
  const depinChatCtx = await writeDepinChatContext();
  appendLog({ action: "publish", ok: true, depinChat: depinChatCtx, ...pubOut });
  console.log("GETKINETIK bureau publishing pack\n");
  console.log(`  Bulletin:  ${pubOut.bulletin}`);
  console.log(`  Index:     ${pubOut.index}`);
  console.log(`  One-pagers: ${pubOut.onePagers.length} files`);
  console.log(`  Deltas:    ${pubOut.deltaPosts} (${pubOut.changedCount} networks moved)`);
}

async function cmdNews() {
  const post = args.includes("--post");
  const out = await runBureauNews({ post });
  console.log("GETKINETIK bureau news\n");
  console.log(`  Draft:   ${out.latest}`);
  console.log(`  Scored:  ${out.scoredCount} articles`);
  if (out.chosen) {
    console.log(`  Pick:    ${out.chosen.item.title.slice(0, 70)}…`);
    console.log(`  Action:  ${out.llm?.action} (confidence ${out.llm?.confidence})`);
    console.log(`  Model:   ${out.llm?._model || "—"}`);
  }
  if (out.posted) console.log(`  Posted:  https://x.com/i/web/status/${out.posted.id}`);
  else if (post) console.log("  Posted:  (none — low confidence, skip, or missing X keys)");
}

async function main() {
  if (args.includes("-h") || args.includes("--help")) {
    usage();
    return;
  }
  const registry = loadRegistry();
  switch (cmd) {
    case "status":
      cmdStatus(registry);
      break;
    case "scan":
      await cmdScan(registry);
      break;
    case "outreach":
      await cmdOutreach(registry);
      break;
    case "pipeline":
      await cmdPipeline(registry);
      break;
    case "brief":
      await cmdBrief(registry);
      break;
    case "publish":
      await cmdPublish(registry);
      break;
    case "news":
      await cmdNews();
      break;
    default:
      usage();
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(redactSecrets(String(e.message || e)));
  process.exit(1);
});
