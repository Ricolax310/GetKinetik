// Weekly bulletin, one-pagers, delta posts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REPO_ROOT,
  collectNetworkStatus,
  extractHeadlineFindings,
  extractReportMeta,
  loadNetworkSnapshotStats,
  resolveRepo,
  summarizeSnapshotDelta,
} from "./lib.mjs";
import { formatAsOfDate } from "./report-helpers.mjs";
import {
  composeDeltaThread,
  composeDeltaTweet,
  composeNetworkTweet,
  formatDeltaPostsMarkdown,
} from "./tweet-compose.mjs";

export const PAPERS_DIR = path.join(REPO_ROOT, "docs/bureau/papers");
export const NETWORKS_DIR = path.join(PAPERS_DIR, "networks");

function trim(text, max = 120) {
  if (!text) return "";
  const t = String(text).replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function reportUrl(relReport) {
  return `https://github.com/Ricolax310/GetKinetik/blob/main/${relReport.replace(/\\/g, "/")}`;
}

function hasMaterialDelta(deltaLine) {
  if (!deltaLine) return false;
  return !/unchanged vs last run/i.test(deltaLine);
}

function extractCrossCheckItems(reportMd) {
  const m = reportMd.match(
    /## What to cross-check this week\r?\n\r?\n([\s\S]*?)\r?\n\r?\n>/,
  );
  if (!m) return [];
  return m[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^\d+\.\s+/, ""));
}

function extractSinceLastSnapshot(reportMd) {
  const m = reportMd.match(/## Since last snapshot\r?\n\r?\n([\s\S]*?)\r?\n\r?\n## /);
  if (!m) return null;
  return m[1].trim();
}

export function buildNetworkOnePager(net, reportMd) {
  const findings = extractHeadlineFindings(reportMd);
  const meta = extractReportMeta(reportMd);
  const deltaLine = summarizeSnapshotDelta(net);
  const crossCheck = extractCrossCheckItems(reportMd);
  const snapshotTable = extractSinceLastSnapshot(reportMd);
  const rel = net.report.replace(/\\/g, "/");
  const scanScript = net.scanScript || `sybil-scan-${net.id}.mjs`;

  const lines = [
    `# ${net.name} — sample read`,
    "",
    "> Public endpoints only. Not a verdict.",
    "",
    `**As of:** ${formatAsOfDate(meta.generated || new Date())}  `,
    `**Public source:** ${meta.source || net.publicSource}  `,
    `**Full report:** [${rel}](${reportUrl(rel)})  `,
    `**Live terminal:** https://getkinetik.app/audits.html  `,
    `**Charter:** https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md`,
    "",
    "---",
    "",
    "## Executive summary",
    "",
  ];

  if (findings.length) {
    findings.slice(0, 3).forEach((f, i) => lines.push(`${i + 1}. ${f}`));
  } else {
    lines.push("_Re-run scan for headline findings._");
  }

  lines.push("", "---", "", "## Trend since last run", "");
  if (snapshotTable) {
    lines.push(snapshotTable);
  } else if (deltaLine) {
    lines.push(`- ${deltaLine}`);
  } else {
    lines.push("_First run or no prior snapshot — deltas appear after the next weekly scan._");
  }

  lines.push("", "---", "", "## What to cross-check", "");
  if (crossCheck.length) {
    crossCheck.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
  } else {
    lines.push("1. Compare headline patterns in the full report against your internal registry.");
    lines.push("2. Reproduce: `node scripts/" + scanScript + "` — public methodology, no API key required unless noted.");
  }

  lines.push(
    "",
    "---",
    "",
    "## Reproduce",
    "",
    "```bash",
    `node scripts/${scanScript}`,
    "```",
    "",
    "---",
    "",
    "## Optional next step",
    "",
    "Hardware-rooted trust sanity check: `POST https://getkinetik.app/api/verify-device` with a Proof of Origin URL.",
    "",
    "— Eric · eric@outfromnothingllc.com · https://getkinetik.app/bureau/",
    "",
  );

  return lines.join("\n");
}

export function buildWeeklyBulletin(registry, pipelineResults = null) {
  const rows = collectNetworkStatus(registry, pipelineResults);
  const enabled = rows.filter((r) => r.defaultEnabled);
  const today = new Date().toISOString().slice(0, 10);
  const changed = enabled.filter((r) => hasMaterialDelta(r.snapshotDelta));
  const featured = changed[0] || enabled.find((r) => r.topFinding) || enabled[0];

  const networkRows = enabled.map((r) => {
    const rel = r.report.replace(/\\/g, "/");
    return `| [${r.name}](./networks/${r.id}-one-pager.md) | ${r.reportAge} | ${trim(r.topFinding, 55) || "—"} | ${r.snapshotDelta ? trim(r.snapshotDelta, 35) : "—"} | [full](${reportUrl(rel)}) |`;
  });

  const lines = [
    `# Bureau weekly — ${today}`,
    "",
    "> Public sample reads attached to outreach when useful.",
    "",
    "---",
    "",
    "## Lead this week",
    "",
  ];

  if (featured?.topFinding) {
    lines.push(
      `**${featured.name}** — ${trim(featured.topFinding, 160)}`,
      featured.snapshotDelta ? `\n_Trend:_ ${featured.snapshotDelta}` : "",
      "",
      `→ [One-pager](./networks/${featured.id}-one-pager.md) · [Full report](${reportUrl(featured.report)})`,
      "",
    );
  }

  lines.push(
    "## Networks at a glance",
    "",
    "| Network | Report age | Top finding | Since last run | Full |",
    "|---------|------------|-------------|----------------|------|",
    ...networkRows,
    "",
  );

  if (changed.length) {
    lines.push("## What moved this week", "");
    for (const r of changed) {
      lines.push(`- **${r.name}:** ${r.snapshotDelta}`);
    }
    lines.push("");
  } else {
    lines.push(
      "## What moved this week",
      "",
      "_No material snapshot deltas — fleet patterns stable vs last run. Still worth sharing one-pagers with BD/analytics._",
      "",
    );
  }

  lines.push(
    "---",
    "",
    "## This week",
    "",
    "1. Hivemapper → Geodnet → WeatherXM outreach (priority order)",
    "2. Share delta posts when fleet metrics move",
    "3. Attach network one-pagers to BD conversations",
    "",
    "---",
    "",
    "## Links",
    "",
    "- [Daily brief](../daily/latest-brief.md)",
    "- [Outreach queue](../../outreach/OUTREACH_QUEUE.md)",
    "- [Audits terminal](https://getkinetik.app/audits.html)",
    "- [All one-pagers](./networks/)",
    "",
  );

  return lines.join("\n");
}

export function buildPaperIndex(registry) {
  const rows = collectNetworkStatus(registry);
  const enabled = rows.filter((r) => r.defaultEnabled);
  const today = new Date().toISOString().slice(0, 10);

  const lines = [
    "# Bureau papers",
    "",
    `Updated: ${today}`,
    "",
    "## Weekly bulletin",
    "",
    "- [Latest bulletin](./latest-bulletin.md)",
    "",
    "## Network one-pagers (attach to outreach)",
    "",
  ];

  for (const r of enabled) {
    lines.push(
      `- **${r.name}** — [one-pager](./networks/${r.id}-one-pager.md) · [full report](${reportUrl(r.report)})`,
    );
  }

  lines.push(
    "",
    "## Daily outputs",
    "",
    "- [Daily brief](../daily/latest-brief.md)",
    "- [Social posts](../daily/latest-posts.md)",
    "- [Delta posts](../daily/latest-delta-posts.md)",
    "",
  );

  return lines.join("\n");
}

export function buildDeltaPosts(registry, pipelineResults = null) {
  const rows = collectNetworkStatus(registry, pipelineResults);
  const enabled = rows.filter((r) => r.defaultEnabled);
  const changed = enabled.filter((r) => hasMaterialDelta(r.snapshotDelta));
  const today = new Date().toISOString().slice(0, 10);
  const statsMap = {};
  for (const net of registry) {
    if (net.defaultEnabled === false) continue;
    statsMap[net.id] = loadNetworkSnapshotStats(net);
  }
  const deltaTweet = changed.length ? composeDeltaTweet(changed, statsMap) : null;
  const deltaThread = changed.length ? composeDeltaThread(changed, statsMap) : null;
  const linkedIn = changed.length ? deltaTweet : "";

  return formatDeltaPostsMarkdown({
    changed,
    deltaTweet,
    deltaThread,
    linkedIn,
    today,
  });
}

export function writePublishingPack(registry, pipelineResults = null) {
  const today = new Date().toISOString().slice(0, 10);
  fs.mkdirSync(NETWORKS_DIR, { recursive: true });

  const onePagers = [];
  for (const net of registry) {
    if (net.defaultEnabled === false) continue;
    const reportPath = resolveRepo(net.report);
    if (!fs.existsSync(reportPath)) continue;
    const reportMd = fs.readFileSync(reportPath, "utf8");
    const content = buildNetworkOnePager(net, reportMd);
    const outPath = path.join(NETWORKS_DIR, `${net.id}-one-pager.md`);
    fs.writeFileSync(outPath, content, "utf8");
    onePagers.push(path.relative(REPO_ROOT, outPath));
  }

  const bulletin = buildWeeklyBulletin(registry, pipelineResults);
  const bulletinDated = path.join(PAPERS_DIR, `${today}-bulletin.md`);
  const bulletinLatest = path.join(PAPERS_DIR, "latest-bulletin.md");
  fs.writeFileSync(bulletinDated, bulletin, "utf8");
  fs.writeFileSync(bulletinLatest, bulletin, "utf8");

  const index = buildPaperIndex(registry);
  fs.writeFileSync(path.join(PAPERS_DIR, "README.md"), index, "utf8");

  const deltaPosts = buildDeltaPosts(registry, pipelineResults);
  const deltaLatest = path.join(REPO_ROOT, "docs/bureau/daily/latest-delta-posts.md");
  const deltaDated = path.join(REPO_ROOT, "docs/bureau/daily", `${today}-delta-posts.md`);
  fs.mkdirSync(path.dirname(deltaLatest), { recursive: true });
  fs.writeFileSync(deltaLatest, deltaPosts, "utf8");
  fs.writeFileSync(deltaDated, deltaPosts, "utf8");

  return {
    bulletin: path.relative(REPO_ROOT, bulletinLatest),
    bulletinDated: path.relative(REPO_ROOT, bulletinDated),
    index: "docs/bureau/papers/README.md",
    onePagers,
    deltaPosts: path.relative(REPO_ROOT, deltaLatest),
    changedCount: collectNetworkStatus(registry, pipelineResults).filter(
      (r) => r.defaultEnabled && hasMaterialDelta(r.snapshotDelta),
    ).length,
  };
}

/** Standalone publish command (no scan). */
export function runPublish(registry, pipelineResults = null) {
  return writePublishingPack(registry, pipelineResults);
}
