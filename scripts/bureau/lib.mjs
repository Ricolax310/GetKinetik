import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatDelta,
  writeAuditIndex,
  formatAsOfDate,
  stripEmoji,
  resolveRouting,
} from "./report-helpers.mjs";
import {
  composeDeltaThread,
  composeDeltaTweet,
  composeNetworkTweet,
  composeVerifyTweet,
  formatDeltaPostsMarkdown,
  formatPostsMarkdown,
} from "./tweet-compose.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const REGISTRY_PATH = path.join(__dirname, "networks.json");
export const LOG_PATH = path.join(REPO_ROOT, "scripts/data/bureau-run-log.json");
export const OUTREACH_DIR = path.join(REPO_ROOT, "docs/outreach/generated");
export const PIPELINE_PATH = path.join(REPO_ROOT, "scripts/data/bureau-pipeline.json");
export const DAILY_DIR = path.join(REPO_ROOT, "docs/bureau/daily");
const STALE_MS = 7 * 24 * 3_600_000;

const REDACT_PATTERNS = [
  /api-key=[^&\s"']+/gi,
  /apikey=[^&\s"']+/gi,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
];

export function redactSecrets(text) {
  let out = String(text);
  for (const re of REDACT_PATTERNS) {
    out = out.replace(re, "api-key=[REDACTED]");
  }
  return out;
}

export function loadRegistry() {
  const raw = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  if (!Array.isArray(raw.networks)) {
    throw new Error("networks.json: missing networks array");
  }
  return raw.networks;
}

export function loadAnomalyTaxonomy() {
  const raw = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  return raw.anomalyTaxonomy || {};
}

export function resolveRepo(rel) {
  return path.join(REPO_ROOT, rel);
}

export function fileAgeMs(absPath) {
  if (!fs.existsSync(absPath)) return null;
  const st = fs.statSync(absPath);
  return Date.now() - st.mtimeMs;
}

export function formatAge(ms) {
  if (ms == null) return "never";
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function loadEnvQuiet() {
  const envPath = path.join(REPO_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

export function appendLog(entry) {
  let log = { runs: [] };
  if (fs.existsSync(LOG_PATH)) {
    try {
      log = JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
    } catch {
      log = { runs: [] };
    }
  }
  log.runs.unshift({
    ...entry,
    at: new Date().toISOString(),
  });
  log.runs = log.runs.slice(0, 100);
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
}

export function loadNetworkSnapshotStats(net) {
  const snapPath = resolveRepo(net.snapshot);
  if (!fs.existsSync(snapPath)) return { stats: null, prevStats: null };
  try {
    const snap = JSON.parse(fs.readFileSync(snapPath, "utf8"));
    return {
      stats: snap.stats || null,
      prevStats: snap.prevStats || null,
      generatedAt: snap.generatedAt || snap.stats?.generatedAt || null,
    };
  } catch {
    return { stats: null, prevStats: null };
  }
}

/** One-line delta for daily brief / outreach when snapshot has prevStats. */
export function summarizeSnapshotDelta(net) {
  const { stats, prevStats } = loadNetworkSnapshotStats(net);
  if (!stats || !prevStats) return null;
  const pairs = [
    ["exactDupGroups", "exact dup groups", true],
    ["nearDupClusters", "≤10m clusters", true],
    ["overCapacityCells", "over-capacity cells", true],
    ["top20ShareOfSupply", "top-20 HONEY share", true, true],
    ["flaggedPct", "fleet flagged", true, true],
  ];
  for (const [key, label, lowerIsBetter, asPct] of pairs) {
    if (typeof stats[key] === "number" && typeof prevStats[key] === "number") {
      return `${label}: ${formatDelta(stats[key], prevStats[key], {
        lowerIsBetter,
        pct: asPct,
      })}`;
    }
  }
  return null;
}

export { writeAuditIndex };

export function collectNetworkStatus(registry, pipelineResults = null) {
  const taxonomy = loadAnomalyTaxonomy();
  const byId = new Map((pipelineResults || []).map((r) => [r.id, r]));
  return registry.map((net) => {
    const reportPath = resolveRepo(net.report);
    const ageMs = fileAgeMs(reportPath);
    let findings = [];
    if (fs.existsSync(reportPath)) {
      findings = extractHeadlineFindings(fs.readFileSync(reportPath, "utf8"));
    }
    const date = new Date().toISOString().slice(0, 10);
    const relDraft = `docs/outreach/generated/${net.id}-outreach-${date}.md`;
    const draftPath = resolveRepo(relDraft);
    const pipeline = byId.get(net.id);
    const outreachPath =
      pipeline?.outreachPath?.replace(/\\/g, "/") ||
      (fs.existsSync(draftPath) ? relDraft : null);
    const deltaLine = summarizeSnapshotDelta(net);
    const topFinding = findings[0] ? stripEmoji(findings[0]) : null;
    const routed = resolveRouting(net.routing, taxonomy, Boolean(topFinding));
    return {
      id: net.id,
      name: net.name,
      reportAge: formatAge(ageMs),
      reportAgeMs: ageMs,
      stale: ageMs == null || ageMs > STALE_MS,
      topFinding,
      snapshotDelta: deltaLine,
      findings,
      outreachPath,
      report: net.report,
      publicSource: net.publicSource,
      defaultEnabled: net.defaultEnabled !== false,
      scanOk: pipeline?.scanOk ?? null,
      anomalyType: routed.anomalyType,
      assetClass: routed.assetClass,
      verificationEligible: routed.verificationEligible,
      route: routed.route,
      reason: routed.reason,
      verificationCall: routed.verificationCall,
      clarificationRequest: routed.clarificationRequest,
    };
  });
}

export function writeOutreachQueue(resultsOrRegistry, pipelineResults = null) {
  const registry = Array.isArray(resultsOrRegistry)
    ? loadRegistry().filter((n) =>
        resultsOrRegistry.some((r) => r.id === n.id),
      )
    : loadRegistry().filter((n) => n.defaultEnabled !== false);
  const pipeline =
    pipelineResults ||
    (Array.isArray(resultsOrRegistry) ? resultsOrRegistry : null);
  const rows = collectNetworkStatus(registry, pipeline);
  const lines = [
    "# Outreach queue",
    "",
    `Updated: ${formatAsOfDate()}`,
    "",
    "| Network | Report age | Route | Next action | Draft | Top finding |",
    "|---------|------------|-------|-------------|-------|-------------|",
  ];
  for (const r of rows) {
    const draft = r.outreachPath || "_(run pipeline)_";
    const top = r.topFinding?.slice(0, 80) || "—";
    const action =
      r.route === "verify-device"
        ? (r.verificationCall || "Run verify-device on sampled entities.").slice(0, 80)
        : r.route === "clarify"
          ? (r.clarificationRequest || "Send a bounded reality-check before any device test.").slice(0, 80)
          : r.reason || "Monitor only";
    lines.push(
      `| ${r.name || r.id} | ${r.reportAge} | ${r.route} | ${action.replace(/\|/g, "\\|")} | \`${draft}\` | ${top.replace(/\|/g, "\\|")} |`,
    );
  }
  lines.push(
    "",
    "## Nurture order (Friday follow-up only — no cold DMs)",
    "",
    "Weekly route: Mon public → Tue comment → Wed intro → Thu marketer → Fri nurture.",
    "",
    "1. Hivemapper (if engaged)",
    "2. Geodnet (warm — Mike)",
    "3. WeatherXM (CEO validated)",
    "4. Others as needed",
    "",
  );
  const queuePath = path.join(REPO_ROOT, "docs/outreach/OUTREACH_QUEUE.md");
  fs.mkdirSync(path.dirname(queuePath), { recursive: true });
  fs.writeFileSync(queuePath, lines.join("\n"), "utf8");
}

export function pickFeaturedNetwork(rows) {
  const eligible = rows.filter((r) => r.topFinding);
  if (!eligible.length) return rows.find((r) => r.defaultEnabled) || rows[0];
  return eligible[new Date().getDay() % eligible.length];
}

function trimFinding(text, max = 120) {
  if (!text) return "";
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function snapshotStatsById(registry) {
  const out = {};
  for (const net of registry) {
    const { stats, prevStats } = loadNetworkSnapshotStats(net);
    out[net.id] = { stats, prevStats };
  }
  return out;
}

export function buildSocialPosts(featured, rows, registry) {
  const net = registry.find((n) => n.id === featured?.id);
  const { stats, prevStats } = net ? loadNetworkSnapshotStats(net) : { stats: null, prevStats: null };
  const sampleReadTweet = composeNetworkTweet(featured || {}, stats, prevStats);
  const verifyTweet = composeVerifyTweet();
  const linkedIn = sampleReadTweet;
  const stale = rows.filter((r) => r.stale && r.defaultEnabled);
  return { sampleReadTweet, verifyTweet, linkedIn, staleCount: stale.length };
}

export function buildDailyBrief(registry, pipelineResults = null) {
  const rows = collectNetworkStatus(registry, pipelineResults);
  const enabled = rows.filter((r) => r.defaultEnabled);
  const featured = pickFeaturedNetwork(enabled);
  const today = new Date().toISOString().slice(0, 10);
  const staleRows = enabled.filter((r) => r.stale);
  const sendCandidates = enabled.filter((r) => r.outreachPath && r.topFinding);

  const statusLines = enabled.map(
    (r) =>
      `| ${r.name} | ${r.reportAge}${r.stale ? " (stale)" : ""} | ${r.outreachPath ? "ready" : "—"} | ${trimFinding(r.topFinding, 50) || "—"} | ${r.snapshotDelta ? trimFinding(r.snapshotDelta, 40) : "—"} |`,
  );

  const whyToday = [];
  if (featured?.topFinding) {
    whyToday.push(
      `- **Featured read (${featured.name}):** ${trimFinding(featured.topFinding, 140)}`,
    );
    if (featured.route === "verify-device") {
      whyToday.push(
        `- **Resolution route:** verify-device · ${trimFinding(featured.verificationCall, 160)}`,
      );
    } else if (featured.route === "clarify") {
      whyToday.push(
        `- **Clarify first:** ${trimFinding(featured.clarificationRequest || featured.reason, 160)}`,
      );
    } else if (featured.reason) {
      whyToday.push(`- **Monitor route:** ${trimFinding(featured.reason, 160)}`);
    }
  }
  if (featured?.snapshotDelta) {
    whyToday.push(`- **Trend:** ${featured.snapshotDelta}`);
  }
  if (staleRows.length) {
    whyToday.push(
      `- **Stale reports:** refresh before outreach — ${staleRows.map((r) => r.name).join(", ")}`,
    );
  }
  if (!whyToday.length) {
    whyToday.push("- Reports are current — pick one send from the queue below.");
  }

  const actions = [];
  if (staleRows.length) {
    actions.push(
      `- **Refresh scans:** ${staleRows.map((r) => r.name).join(", ")} — run \`npm run bureau:scan\` or wait for Monday weekly job`,
    );
  }
  if (sendCandidates.length) {
    actions.push(
      `- **Review outreach:** ${sendCandidates.slice(0, 3).map((r) => `\`${r.outreachPath}\``).join(", ")}`,
    );
  }
  actions.push("- **Social:** review `latest-posts.md`");
  if (!actions.length) actions.push("- Bureau reports fresh. Focus on sends + one social post.");

  return `# Bureau daily — ${today}

${whyToday.join("\n")}

---

## Networks

| Network | Report | Outreach | Top finding | Since last run |
|---------|--------|----------|-------------|----------------|
${statusLines.join("\n")}

Featured: ${featured?.name || "—"} · Stale (>7d): ${staleRows.length ? staleRows.map((r) => r.name).join(", ") : "none"}

---

## Next

${actions.join("\n")}

---

## Send order

1. Hivemapper
2. Geodnet
3. WeatherXM
4. Others

Queue: [OUTREACH_QUEUE.md](../../outreach/OUTREACH_QUEUE.md)

---

- https://getkinetik.app/audits.html
- https://getkinetik.app/bureau/
- https://getkinetik.app/api/docs/
- [NEUTRALITY.md](https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md)
`;
}

export function buildDailyPosts(registry, pipelineResults = null) {
  const rows = collectNetworkStatus(registry, pipelineResults);
  const enabled = rows.filter((r) => r.defaultEnabled);
  const featured = pickFeaturedNetwork(enabled);
  const changed = enabled.filter((r) => r.snapshotDelta && !/unchanged vs last run/i.test(r.snapshotDelta));
  const statsMap = snapshotStatsById(registry.filter((n) => n.defaultEnabled !== false));
  const { sampleReadTweet, verifyTweet, linkedIn } = buildSocialPosts(featured, enabled, registry);
  const deltaTweet = changed.length ? composeDeltaTweet(changed, statsMap) : null;
  const deltaThread = changed.length ? composeDeltaThread(changed, statsMap) : null;
  const today = new Date().toISOString().slice(0, 10);

  return formatPostsMarkdown({
    sampleTweet: sampleReadTweet,
    verifyTweet,
    deltaTweet,
    deltaThread,
    linkedIn,
    today,
  });
}

export function writeDailyBrief(registry, pipelineResults = null) {
  const today = new Date().toISOString().slice(0, 10);
  const brief = buildDailyBrief(registry, pipelineResults);
  const posts = buildDailyPosts(registry, pipelineResults);
  fs.mkdirSync(DAILY_DIR, { recursive: true });

  const datedBrief = path.join(DAILY_DIR, `${today}-brief.md`);
  const datedPosts = path.join(DAILY_DIR, `${today}-posts.md`);
  const latestBrief = path.join(DAILY_DIR, "latest-brief.md");
  const latestPosts = path.join(DAILY_DIR, "latest-posts.md");

  fs.writeFileSync(datedBrief, brief, "utf8");
  fs.writeFileSync(datedPosts, posts, "utf8");
  fs.writeFileSync(latestBrief, brief, "utf8");
  fs.writeFileSync(latestPosts, posts, "utf8");

  writeOutreachQueue(registry.filter((n) => n.defaultEnabled !== false), pipelineResults);
  writeAuditIndex(REPO_ROOT, registry, resolveRepo, loadAnomalyTaxonomy());

  return {
    datedBrief: path.relative(REPO_ROOT, datedBrief),
    datedPosts: path.relative(REPO_ROOT, datedPosts),
    latestBrief: path.relative(REPO_ROOT, latestBrief),
    latestPosts: path.relative(REPO_ROOT, latestPosts),
  };
}

export function writePipelineSummary(results) {
  const payload = {
    updatedAt: new Date().toISOString(),
    networks: results,
  };
  fs.mkdirSync(path.dirname(PIPELINE_PATH), { recursive: true });
  fs.writeFileSync(PIPELINE_PATH, JSON.stringify(payload, null, 2), "utf8");
  writeOutreachQueue(results);
}

/** Pull numbered headline bullets from bureau markdown reports. */
function parseNumberedBullets(section) {
  return section
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+/.test(l))
    .slice(0, 4)
    .map((l) => l.replace(/^\d+\.\s+/, "").replace(/\*\*/g, ""));
}

export function extractHeadlineFindings(reportMd) {
  const exec = reportMd.match(/## Executive summary\r?\n\r?\n([\s\S]*?)\r?\n\r?\n---/);
  if (exec) {
    const bullets = parseNumberedBullets(exec[1]);
    if (bullets.length) return bullets;
  }
  const m = reportMd.match(/## Headline findings\r?\n\r?\n([\s\S]*?)\r?\n\r?\n---/);
  if (m) {
    return parseNumberedBullets(m[1]);
  }
  const bullets = reportMd
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+\*\*/.test(l))
    .slice(0, 4)
    .map((l) => l.replace(/^\d+\.\s+/, "").replace(/\*\*/g, ""));
  return bullets;
}

export function extractReportMeta(reportMd) {
  const raw = reportMd.match(/\*\*(?:Generated|As of):\*\*\s*([^\n]+)/)?.[1]?.trim();
  const generated = raw ? formatAsOfDate(raw) : null;
  const source =
    reportMd.match(/\*\*Public source:\*\*\s*`([^`]+)`/)?.[1]?.trim() ||
    reportMd.match(/\*\*Solana RPC used:\*\*\s*`([^`]+)`/)?.[1]?.trim() ||
    null;
  const observed =
    reportMd.match(/\*\*Stations observed:\*\*\s*([\d,]+)/)?.[1]?.replace(/,/g, "") ||
    reportMd.match(/\*\*Cells observed:\*\*\s*([\d,]+)/)?.[1]?.replace(/,/g, "") ||
    null;
  return { generated, source: source ? redactSecrets(source) : null, observed };
}

export function buildOutreachDraft(net, reportMd) {
  const findings = extractHeadlineFindings(reportMd).map((f) => stripEmoji(f));
  const meta = extractReportMeta(reportMd);
  const deltaLine = summarizeSnapshotDelta(net);
  const routed = resolveRouting(
    net.routing,
    loadAnomalyTaxonomy(),
    Boolean(findings[0]),
  );
  const reportUrl = `https://github.com/Ricolax310/GetKinetik/blob/main/${net.report.replace(/\\/g, "/")}`;
  const leadFinding = findings[0] || null;
  const findingBlock =
    findings.length > 0
      ? findings.map((f, i) => `${i + 1}. ${f}`).join("\n")
      : "1. _(Re-run scan — headline findings section missing from report.)_";
  const leadBlock = leadFinding
    ? `${leadFinding}${deltaLine ? ` (${deltaLine})` : ""}`
    : "";

  return `# ${net.name} — outreach

## Email

Subject: ${net.name} public read — sharing before we post

Hi <name>,

Eric here (GETKINETIK). We run independent reads on public DePIN endpoints — no internal ${net.name} data, methodology in the repo.

Source: ${net.publicSource}${meta.generated ? ` · as of ${meta.generated}` : ""}.

${leadBlock ? `${leadBlock}\n\n` : ""}Headlines:

${findingBlock}

Resolution route: ${routed.route}
${routed.route === "verify-device"
    ? `Verification action: ${routed.verificationCall || "Run POST /api/verify-device on sampled entities from §1."}`
    : routed.route === "clarify"
      ? `Clarify first (bounded reality-check, not a test): ${routed.clarificationRequest || routed.reason || "Confirm whether the observed discontinuity is expected in production before any device verification."}`
      : `Monitor reason: ${routed.reason || "This anomaly class is not device-verifiable by policy."}`}

Report: ${reportUrl}

Happy to walk through on a call if useful. Optional device check: POST https://getkinetik.app/api/verify-device with a Proof of Origin URL.

— Eric · eric@outfromnothingllc.com · https://getkinetik.app/bureau/

## Discord (short)

Eric / GETKINETIK — ran a public read on ${net.name}. ${findings.slice(0, 2).map((f) => f.replace(/\.\s*$/, "")).join("; ")}. Report: ${reportUrl}
`;
}
