// Bureau publishing pack — weekly bulletin, network one-pagers, delta posts, paper index.
// Drafts only; never auto-sends or auto-posts.
import fs from "node:fs";
import path from "node:path";
import {
  REPO_ROOT,
  collectNetworkStatus,
  extractHeadlineFindings,
  extractReportMeta,
  resolveRepo,
  summarizeSnapshotDelta,
} from "./lib.mjs";

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
    `# ${net.name} — Bureau sample read (one-pager)`,
    "",
    "> **GETKINETIK neutral DePIN bureau** — friendly second read, not a verdict. ",
    "> Your verifier still runs. No internal network data used unless noted in the full report.",
    "",
    `**Generated:** ${meta.generated || new Date().toISOString()}  `,
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
    `# Bureau weekly bulletin — ${today}`,
    "",
    "> Auto-generated after the weekly pipeline. **Share internally or attach to outreach** — not a verdict.",
    "",
    "**Direction:** neutral DePIN bureau — friendly helper, second read not replacement.",
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
    "## Publish checklist (manual)",
    "",
    "1. Send outreach from `docs/outreach/generated/` (Hivemapper → Geodnet → WeatherXM)",
    "2. Post from `docs/bureau/daily/latest-delta-posts.md` if something moved",
    "3. Attach `./networks/<id>-one-pager.md` to DMs or emails",
    "4. Site updates automatically on push to `main` (Cloudflare Pages → `landing/`)",
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
    "# Bureau papers & one-pagers",
    "",
    "> Reproducible public sample reads — friendly helper, not gatekeeper.",
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
    "- [Post drafts](../daily/latest-posts.md)",
    "- [Delta-only posts](../daily/latest-delta-posts.md)",
    "",
    "## Regenerate locally",
    "",
    "```bash",
    "npm run bureau:publish    # one-pagers + bulletin + delta posts",
    "npm run bureau:pipeline   # full scan + publish pack",
    "```",
    "",
  );

  return lines.join("\n");
}

export function buildDeltaPosts(registry, pipelineResults = null) {
  const rows = collectNetworkStatus(registry, pipelineResults);
  const enabled = rows.filter((r) => r.defaultEnabled);
  const changed = enabled.filter((r) => hasMaterialDelta(r.snapshotDelta));
  const today = new Date().toISOString().slice(0, 10);

  if (!changed.length) {
    return `# Delta post drafts — ${today}

> **No material snapshot deltas today.** Skip the sample-read post — patterns stable vs last run.

Optional reuse (~1×/week):

\`\`\`
Optional trust sanity check for DePIN backends:

POST getkinetik.app/api/verify-device
→ valid/invalid + device age + signed chain

Your verifier still runs. Offline: npm i @getkinetik/verify
\`\`\`

_Full rotation posts still in [latest-posts.md](./latest-posts.md)._
`;
  }

  const bullets = changed
    .map((r) => `- **${r.name}:** ${trim(r.topFinding, 80) || "see report"} _(${r.snapshotDelta})_`)
    .join("\n");

  const tweet = changed
    .slice(0, 2)
    .map((r) => `${r.name}: ${trim(r.topFinding, 70)} (${r.snapshotDelta})`)
    .join("\n");

  return `# Delta post drafts — ${today}

> **Post only when something moved.** ${changed.length} network(s) with material deltas.

---

## What changed

${bullets}

---

## Twitter/X (delta thread — copy as one tweet or thread)

\`\`\`
Neutral DePIN bureau — weekly delta on public data:

${tweet}

Reproducible reads. Your verifier still runs.
getkinetik.app/audits.html
\`\`\`

---

## LinkedIn

\`\`\`
Weekly bureau delta (${today}): ${changed.map((r) => r.name).join(", ")} — patterns worth cross-checking against your internal analytics. Friendly second read, not a verdict. getkinetik.app/audits.html
\`\`\`

---

## Guardrails

- Pattern language only — not "fraud proved"
- Link getkinetik.app/audits.html or GitHub report
- **Do not auto-post**
`;
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
