// Step 5 (render): cross-network-first markdown + self-contained HTML.
// Dual-layer format: executive scan layer + full evidence appendix.

import { SECTOR_ORDER, SECTOR_LABELS, WHAT_WE_DONT_KNOW } from "./config.mjs";
import { groupByV2, v2Enabled, warnLegacyTaxonomyOnce } from "./taxonomy-v2.mjs";
import {
  buildTodaysReadFromDrip,
  buildDailyWhyItMatters,
  wrapDualLayerDaily,
  wrapDualLayerWeekly,
  buildWeeklyExecutiveBullets,
} from "../../editorial-engine/executive.mjs";
function sevTag(s) {
  return `${s.severity} · conf ${s.confidence.toFixed(2)}`;
}

/** Group signals across all networks by sector (cross-network first). */
function groupBySector(feed) {
  const groups = {};
  for (const net of feed.networks) {
    for (const s of net.signals || []) {
      const t = s.type;
      if (!groups[t]) groups[t] = { type: t, label: SECTOR_LABELS[t] || t, signals: [], networks: new Set() };
      groups[t].signals.push({ ...s, network: net.network });
      groups[t].networks.add(net.network);
    }
  }
  return SECTOR_ORDER.filter((t) => groups[t]).map((t) => groups[t]);
}

function crossNetworkSummaryTable(feed) {
  const lines = ["| Sector | Signals | Networks | Top severity |", "|---|---:|---|---|"];
  if (!feed.sectorSummary.length) {
    lines.push("| _none_ | 0 | — | — |");
  } else {
    for (const sec of feed.sectorSummary) {
      lines.push(
        `| ${sec.label} | ${sec.signalCount} | ${sec.networks.join(", ")} | ${sec.topSeverity || "—"} |`,
      );
    }
  }
  return lines;
}

function whatChangedToday(feed) {
  const groups = groupBySector(feed);
  const lines = [];
  if (!groups.length) {
    lines.push("_No measurable signals in the latest run._", "");
    return lines;
  }
  for (const sec of groups) {
    lines.push(`**${sec.label}**`);
    for (const s of sec.signals) {
      lines.push(`- **${s.network}** — ${s.message} _(${sevTag(s)})_`);
    }
    lines.push("");
  }
  return lines;
}

function signalTypeSection(feed) {
  if (!feed.sectorSummary.length) return ["_No classified signals._"];
  return feed.sectorSummary.map(
    (sec) =>
      `- **${sec.label}** (\`${sec.type}\`) — ${sec.signalCount} signal(s) across ${sec.networks.length} network(s): ${sec.networks.join(", ")}`,
  );
}

function whatWeDontKnowSection(feed) {
  if (!feed.sectorSummary.length) return ["_No open observations to bound._"];
  return feed.sectorSummary
    .map((sec) => `- **${sec.label}** — ${sec.whatWeDontKnow || WHAT_WE_DONT_KNOW[sec.type] || ""}`)
    .filter((l) => l.trim().endsWith("—") === false);
}

function networkBreakdown(feed) {
  const lines = [];
  for (const net of feed.networks) {
    lines.push(`### ${net.network}`);
    if (net.status !== "active" || !net.signals.length) {
      lines.push(`- _${net.note || "No public signal in latest snapshot."}_`, "");
      continue;
    }
    for (const s of net.signals) {
      lines.push(`- [${s.type}] ${s.message} _(${sevTag(s)})_`);
    }
    lines.push("");
  }
  return lines;
}

const METHODOLOGY = [
  "## Methodology",
  "",
  "- Automated pipeline: ingest public data → detect standardized signals → cross-network aggregate → publish.",
  "- Cross-network first by contract; per-network breakdown is secondary and never volume-ranked.",
  "- Signals are reproducible public reads (`scripts/sybil-scan-*.mjs`). Evidence, not verdicts.",
  "- Feed JSON: `signals/<cadence>/latest.json` · API: `/api/signals/latest.json`",
];

export function renderDailyMarkdown(feed, today) {
  const dripSignals = [];
  for (const net of feed.networks) {
    for (const s of net.signals || []) {
      dripSignals.push({
        network: net.network,
        metric: s.metric || s.metricKey || "signal",
        value: s.value,
        delta: typeof s.delta === "number" ? s.delta : 0,
        severity: s.severity || "low",
      });
    }
  }

  const fullEvidence = [
    "### Cross-Network Summary",
    "",
    ...crossNetworkSummaryTable(feed),
    "",
    `_Totals: ${feed.totals.signals} signal(s) across ${feed.totals.activeNetworks}/${feed.totals.networks} networks._`,
    "",
    "### What Changed Today",
    "",
    ...whatChangedToday(feed),
    "### Signal Type",
    "",
    ...signalTypeSection(feed),
    "",
    "### Signal Context",
    "",
    "_Operational context for observed metrics — not verdicts._",
    ...feed.sectorSummary.map(
      (sec) => `- **${sec.label}** — public ${sec.type} signals across ${sec.networks.join(", ")}.`,
    ),
    "",
    "### What We Don't Know",
    "",
    ...whatWeDontKnowSection(feed),
    "",
    "### Network Breakdown",
    "",
    ...networkBreakdown(feed),
    ...METHODOLOGY,
    "",
  ].join("\n");

  const categories = feed.sectorSummary.map((s) => s.type.toUpperCase());
  return wrapDualLayerDaily({
    title: "# Daily DePIN Signal Brief",
    dateLine: `> ${today} · automated cross-network pipeline · evidence not verdicts`,
    todaysRead: buildTodaysReadFromDrip(dripSignals),
    whyItMatters: buildDailyWhyItMatters({
      categories,
      networkCount: feed.totals.activeNetworks,
      signalCount: feed.totals.signals,
      signals: dripSignals,
    }),
    fullEvidence,
  });
}
function trendsSection(history) {
  const lines = [];
  if (history.length < 2) {
    lines.push("_Need at least two daily runs this week to compute trends._");
    return lines;
  }
  const first = history[0];
  const last = history[history.length - 1];
  const types = new Set([
    ...Object.keys(first.totals?.byType || {}),
    ...Object.keys(last.totals?.byType || {}),
  ]);
  lines.push(`_Comparing ${first.date || "start"} → ${last.date || "end"} (${history.length} runs)._`, "");
  for (const t of SECTOR_ORDER) {
    if (!types.has(t)) continue;
    const a = first.totals?.byType?.[t] || 0;
    const b = last.totals?.byType?.[t] || 0;
    const d = b - a;
    const arrow = d > 0 ? "▲" : d < 0 ? "▼" : "▬";
    lines.push(`- **${t}**: ${a} → ${b} ${arrow} (${d >= 0 ? "+" : ""}${d})`);
  }
  return lines;
}

// Legacy 4-bucket pattern section — DEFAULT. Preserved verbatim so
// docs/reports/weekly/latest.md and downstream consumers do not break.
function legacyPatternSection(feed) {
  const patternSec = [
    "## Cross-Network Patterns",
    "",
    "Taxonomy v2: CAPACITY · IDENTITY · CONSISTENCY · ECONOMICS · BEHAVIORAL · INFRASTRUCTURE",
    "",
  ];
  const multi = feed.sectorSummary.filter((s) => s.networks.length >= 2);
  if (!multi.length) patternSec.push("No cross-network patterns tagged this week.");
  else {
    for (const sec of multi) {
      const scope = sec.networks.length >= 3 ? "systemic" : "cross-network";
      patternSec.push(`- **${sec.label}** · scope: ${scope} · classification: convergence · networks: ${sec.networks.join(", ")}`);
    }
  }
  return patternSec;
}

// Taxonomy v2 pattern section — OPT-IN via USE_V2_TAXONOMY=true.
function v2PatternSection(feed) {
  const lines = [
    "## Cross-Network Patterns",
    "",
    "Taxonomy v2 (USE_V2_TAXONOMY): CAPACITY · IDENTITY · CONSISTENCY · ECONOMICS · BEHAVIORAL · INFRASTRUCTURE",
    "",
  ];
  const groups = groupByV2(feed);
  if (!groups.length) {
    lines.push("No signals to group under taxonomy v2 this week.");
    return lines;
  }
  for (const g of groups) {
    const scope = g.networks.length >= 3 ? "systemic" : g.networks.length >= 2 ? "cross-network" : "localized";
    const classification = g.networks.length >= 2 ? "convergence" : "localized";
    lines.push(
      `- **${g.category}** (${g.label}) · scope: ${scope} · classification: ${classification} · networks: ${g.networks.join(", ")}`,
    );
  }
  return lines;
}

export function renderWeeklyMarkdown(feed, history, weekId, range) {
  const useV2 = v2Enabled();
  if (!useV2) warnLegacyTaxonomyOnce();

  const patterns = useV2
    ? groupByV2(feed)
        .filter((g) => g.networks.length >= 2)
        .map((g) => ({
          scope: g.networks.length >= 3 ? "systemic" : "cross-network",
          category: g.category,
          networks: g.networks,
        }))
    : feed.sectorSummary
        .filter((s) => s.networks.length >= 2)
        .map((sec) => ({
          scope: sec.networks.length >= 3 ? "systemic" : "cross-network",
          category: sec.type.toUpperCase(),
          networks: sec.networks,
        }));

  const fullEvidence = [
    "### Cross-Network Summary",
    "",
    ...crossNetworkSummaryTable(feed),
    "",
    "### What Changed Today",
    "",
    ...whatChangedToday(feed),
    "### Trends",
    "",
    ...trendsSection(history),
    "",
    "### Signal Type",
    "",
    ...signalTypeSection(feed),
    "",
    "### What We Don't Know",
    "",
    ...whatWeDontKnowSection(feed),
    "",
    "### Network Watch",
    "",
    ...networkBreakdown(feed),
    ...METHODOLOGY,
    "",
  ].join("\n");

  const thisWeek = ["## This Week In Signals", ""];
  thisWeek.push(
    `Cross-network: ${feed.totals.signals} signal(s) across ${feed.totals.activeNetworks}/${feed.totals.networks} networks.`,
    "",
  );
  for (const net of feed.networks) {
    for (const s of net.signals || []) {
      thisWeek.push(`- **${net.network}** — ${s.message}`);
    }
  }

  const patternSec = useV2 ? v2PatternSection(feed) : legacyPatternSection(feed);

  const systemicSec = ["## Systemic Observations", ""];
  const multi = useV2
    ? groupByV2(feed).filter((g) => g.networks.length >= 2)
    : feed.sectorSummary.filter((s) => s.networks.length >= 2);
  const systemic = multi.filter((s) => s.networks.length >= 3);
  if (!systemic.length) systemicSec.push("No systemic-scope observations supported by three or more networks.");
  else {
    for (const sec of systemic) {
      systemicSec.push(`- ${sec.label} observed across ${sec.networks.length} networks (${sec.networks.join(", ")}).`);
    }
  }

  return wrapDualLayerWeekly({
    title: "# Weekly DePIN Signal Report",
    dateLine: `> Week ${weekId} · ${range} · aggregated from ${history.length} daily run(s)`,
    executive: buildWeeklyExecutiveBullets({
      signalCount: feed.totals.signals,
      networkCount: feed.totals.activeNetworks,
      patterns,
      weekLabel: weekId,
    }),
    bodySections: [thisWeek, patternSec, systemicSec],
    fullEvidence,
  });
}
function crossNetworkPatterns(feed) {
  const lines = [];
  const multi = feed.sectorSummary.filter((s) => s.networks.length >= 2);
  if (!multi.length) {
    lines.push("_No theme spans two or more networks yet — patterns require accumulated observations._");
    return lines;
  }
  for (const sec of multi) {
    lines.push(`- **${sec.label}** observed across ${sec.networks.length} networks: ${sec.networks.join(", ")}.`);
  }
  return lines;
}

export function renderMonthlyMarkdown(feed, history, monthId) {
  const lines = [
    "# State of DePIN",
    "",
    `> ${monthId} · ${history.length} daily signal record(s) · narratives derived from observations only`,
    "",
    "_Rule: signals create reports; reports create narratives. Patterns below are grounded in the cross-network observations that precede them._",
    "",
    "## Cross-Network Patterns",
    "",
    ...crossNetworkPatterns(feed),
    "",
    "## Cross-Network Summary",
    "",
    ...crossNetworkSummaryTable(feed),
    "",
    "## What Changed Today",
    "",
    ...whatChangedToday(feed),
    "## Signal Type",
    "",
    ...signalTypeSection(feed),
    "",
    "## What We Don't Know",
    "",
    ...whatWeDontKnowSection(feed),
    "",
    "## Network Breakdown",
    "",
    ...networkBreakdown(feed),
    ...METHODOLOGY,
    "",
  ];
  return lines.join("\n");
}

// ---- HTML (self-contained, regenerated each run) -------------------------

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderHtml(title, feed, cadence) {
  const sectorRows = feed.sectorSummary
    .map(
      (sec) =>
        `<tr><td>${esc(sec.label)}</td><td class="num">${sec.signalCount}</td><td>${esc(
          sec.networks.join(", "),
        )}</td><td><span class="sev sev-${esc(sec.topSeverity || "low")}">${esc(
          sec.topSeverity || "—",
        )}</span></td></tr>`,
    )
    .join("");

  const breakdown = feed.networks
    .map((net) => {
      const items =
        net.status === "active" && net.signals.length
          ? `<ul>${net.signals
              .map(
                (s) =>
                  `<li><span class="tag">${esc(s.type)}</span> ${esc(s.message)} <span class="sev sev-${esc(
                    s.severity,
                  )}">${esc(s.severity)}</span> <span class="conf">conf ${s.confidence.toFixed(2)}</span></li>`,
              )
              .join("")}</ul>`
          : `<p class="muted">${esc(net.note || "No public signal in latest snapshot.")}</p>`;
      return `<article class="net"><h3>${esc(net.network)}</h3>${items}</article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="index,follow" />
<title>${esc(title)} — GetKinetik</title>
<style>
  :root{--bg:#0a0a0a;--card:#111113;--line:rgba(255,255,255,.08);--text:#f4f4f6;--muted:#9aa3b7;--accent:#f9b233;}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 -apple-system,Segoe UI,system-ui,sans-serif;padding:24px;max-width:980px;margin:0 auto}
  h1{font-size:1.5rem;margin:0 0 4px} .meta{color:var(--muted);font-size:.85rem;margin-bottom:24px}
  h2{font-size:1rem;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);margin:28px 0 10px}
  table{width:100%;border-collapse:collapse;margin-bottom:8px} th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)} td.num,th.num{text-align:right}
  th{color:var(--muted);font-weight:600;font-size:.8rem;text-transform:uppercase;letter-spacing:.04em}
  .net{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin-bottom:12px}
  .net h3{margin:0 0 8px;font-size:.95rem} ul{margin:0;padding-left:18px} li{margin:4px 0}
  .tag{font-family:ui-monospace,monospace;font-size:.7rem;color:var(--accent);border:1px solid var(--line);border-radius:4px;padding:1px 5px}
  .sev{font-size:.7rem;border-radius:4px;padding:1px 6px} .sev-high{background:#5a1620;color:#ff9aa6} .sev-medium{background:#5a4416;color:#ffd166} .sev-low{background:#1f3a2a;color:#69f0ae}
  .conf{color:var(--muted);font-size:.72rem} .muted{color:var(--muted)} .totals{color:var(--muted);font-size:.85rem}
  footer{margin-top:32px;color:var(--muted);font-size:.78rem;border-top:1px solid var(--line);padding-top:14px}
</style>
</head><body>
<h1>${esc(title)}</h1>
<p class="meta">Generated ${esc(feed.generatedAt)} · cross-network first · evidence not verdicts</p>
<h2>Cross-Network Summary</h2>
<table><thead><tr><th>Sector</th><th class="num">Signals</th><th>Networks</th><th>Top severity</th></tr></thead>
<tbody>${sectorRows || '<tr><td colspan="4" class="muted">No signals in latest run.</td></tr>'}</tbody></table>
<p class="totals">${feed.totals.signals} signal(s) across ${feed.totals.activeNetworks}/${feed.totals.networks} networks.</p>
<h2>Network Breakdown</h2>
${breakdown}
<footer>Autonomous DePIN signal pipeline · ${esc(cadence)} cadence · feed: <code>/api/signals/latest.json</code></footer>
</body></html>`;
}
