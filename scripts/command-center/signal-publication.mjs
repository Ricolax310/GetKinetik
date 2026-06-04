// Signal-publication layer — signals → reports → narratives (never reversed).
// No CRM, scoring, funnel, or synthetic thread states.

import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./config.mjs";
import { formatDelta } from "../bureau/report-helpers.mjs";
import resolveGrammar from "../../signal-engine/grammar/grammar.resolve.ts";
import {
  buildTodaysReadFromPublication,
  buildDailyWhyItMatters,
  wrapDualLayerDaily,
  buildWeeklyExecutiveBullets,
} from "../../editorial-engine/executive.mjs";

const grammar = resolveGrammar(process.env.GRAMMAR_VERSION);

console.log("[GRAMMAR] engine bound to publication layer");

let grammarLegacyFallback = false;

function activateLegacyFallback(reason) {
  if (grammarLegacyFallback) return;
  grammarLegacyFallback = true;
  console.warn(`[GRAMMAR] mismatch detected, reverting to legacy inline logic (${reason})`);
}

const DAILY_DIR = path.join(REPO_ROOT, "docs/reports/daily");
const WEEKLY_DIR = path.join(REPO_ROOT, "docs/reports/weekly");
const MONTHLY_DIR = path.join(REPO_ROOT, "docs/reports/monthly");
const AUDIT_INDEX = path.join(REPO_ROOT, "scripts/data/bureau-audit-index.json");
const NETWORKS_REG = path.join(REPO_ROOT, "scripts/bureau/networks.json");

const WATCH_NETWORKS = ["weatherxm", "geodnet", "natix", "hivemapper"];

/** Maps measurable fields → narrative bucket (only used when observation exists). */
const NARRATIVE_BY_ANOMALY = {
  duplication_cluster: "registry quality",
  capacity_violation: "capacity pressure",
  identity_collision: "registry quality",
  telemetry_discontinuity: "metric drift",
  economic_concentration: "reward concentration",
};

const METRIC_LABELS = {
  exactDupGroups: "exact (lat,lng) duplicate groups",
  observed: "entities on public map",
  overCapacityCells: "cells over designed capacity",
  overCapacityPct: "share of map over capacity",
  top20ShareOfSupply: "top-20 SPL share of UI supply",
  kmMapped: "KM mapped (cumulative)",
  kmFrozenDays: "KM-mapped frozen run (days)",
  detections: "detections (live endpoint)",
  detectionsZeroDays: "days detections at zero",
  drivers: "registered drivers",
  burnFrozenDays: "days $NATIX burned flat",
  flaggedPct: "fleet share flagged (any heuristic)",
};

function loadRegistry() {
  if (!fs.existsSync(NETWORKS_REG)) return [];
  return JSON.parse(fs.readFileSync(NETWORKS_REG, "utf8")).networks || [];
}

function loadAuditNetworks() {
  if (!fs.existsSync(AUDIT_INDEX)) return [];
  return JSON.parse(fs.readFileSync(AUDIT_INDEX, "utf8")).networks || [];
}

function loadSnapshot(networkId) {
  const reg = loadRegistry().find((n) => n.id === networkId);
  if (!reg?.snapshot) return null;
  const p = path.join(REPO_ROOT, reg.snapshot);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function clean(text) {
  return String(text || "")
    .replace(/\*\*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function fmtVal(key, v) {
  if (typeof v !== "number" || !isFinite(v)) return "—";
  if (key.includes("Share") || key.includes("Pct")) return `${(v * 100).toFixed(2)}%`;
  return v.toLocaleString();
}

function legacyDeltaText(cur, prev, key) {
  return formatDelta(cur, prev, {
    lowerIsBetter: key.includes("Share") || key.includes("frozen") || key.includes("Zero"),
    pct: key.includes("Share") || key.includes("Pct"),
  });
}

function renderDeltaText(cur, prev, key) {
  const legacy = legacyDeltaText(cur, prev, key);
  if (!grammar || grammarLegacyFallback || !Number.isFinite(cur) || !Number.isFinite(prev)) {
    return legacy;
  }

  const legacyToken = cur < prev ? "declined" : cur > prev ? "increased" : "fallback";
  const grammarToken = grammar.renderDelta({
    metric: key,
    metricKey: key,
    current: cur,
    previous: prev,
    delta: cur - prev,
  });

  if (grammarToken !== legacyToken) {
    activateLegacyFallback(`renderDelta:${key}`);
    return legacy;
  }
  return legacy;
}

function isLegacySuppressed(deltaText) {
  if (deltaText === "unchanged vs last run") return true;
  if (/^\+0(\.0+)?(\s|$| pp)/.test(deltaText)) return true;
  return false;
}

function shouldSuppressMetric(key, cur, prev, deltaText) {
  const legacySuppressed = isLegacySuppressed(deltaText);
  if (!grammar || grammarLegacyFallback) return legacySuppressed;

  const grammarSuppressed = grammar.renderSuppression({
    metric: key,
    metricKey: key,
    current: cur,
    previous: prev,
    delta: Number.isFinite(cur) && Number.isFinite(prev) ? cur - prev : 0,
  });

  if (grammarSuppressed !== legacySuppressed) {
    activateLegacyFallback(`renderSuppression:${key}`);
    return legacySuppressed;
  }
  return grammarSuppressed;
}

function getScopeForNetworks(networks) {
  const legacyScope = networks.length >= 3 ? "systemic" : networks.length >= 2 ? "cross-network" : "localized";
  if (!grammar || grammarLegacyFallback) return legacyScope;
  const grammarScope = grammar.getScope({ networks, historyDays: 0, historyLen: 0 });
  if (grammarScope !== legacyScope) {
    activateLegacyFallback("getScope");
    return legacyScope;
  }
  return grammarScope;
}

function operationalQuestion(net) {
  const q = {
    geodnet:
      "For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?",
    weatherxm:
      "On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?",
    natix:
      "Is the public Coverage Map metrics feed expected to show flat KM mapped / zero detections while driver registrations keep rising?",
    hivemapper:
      "Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?",
  };
  if (q[net.id]) return q[net.id];
  if (!net.topFinding) return null;
  return `Does the public read for ${net.name} match what your team sees internally, or is the public feed expected to look this way?`;
}

function whySentence(signal) {
  const bucket = NARRATIVE_BY_ANOMALY[signal.anomalyType];
  if (bucket === "capacity pressure") {
    return `${signal.network}: public cell capacity counts are a reproducible registry-pressure signal.`;
  }
  if (bucket === "registry quality") {
    return `${signal.network}: duplicate or inconsistent registry entries are grep-able from public data alone.`;
  }
  if (bucket === "metric drift") {
    return `${signal.network}: cumulative public metrics flatlined while other counters moved — worth a sanity-check on the feed.`;
  }
  if (bucket === "reward concentration") {
    return `${signal.network}: visible on-chain concentration is economic shape only — useful for custody reconciliation, not device claims.`;
  }
  return `${signal.network}: measurable public-data delta worth cross-checking with internal ops.`;
}

/** Human label for the kind of signal observed — classification only, never a verdict. */
const SIGNAL_TYPE_LABELS = {
  duplication_cluster: "Registry duplication",
  capacity_violation: "Capacity pressure",
  identity_collision: "Identity collision",
  telemetry_discontinuity: "Telemetry discontinuity",
  economic_concentration: "Economic concentration",
};

function signalTypeLabel(anomalyType) {
  return SIGNAL_TYPE_LABELS[anomalyType] || "Uncategorized public observation";
}

/** What the public data alone cannot disambiguate — bounded uncertainty, no accusation. */
const WHAT_WE_DONT_KNOW = {
  duplication_cluster:
    "Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.",
  capacity_violation:
    "Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.",
  identity_collision:
    "Whether colliding identifiers are distinct physical devices or one identity reused — public maps don't expose device-level attestation.",
  telemetry_discontinuity:
    "Whether the flat cumulative metric is an ETL/display freeze on the public feed or a real change in on-the-ground activity — the public endpoint alone can't say.",
  economic_concentration:
    "Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.",
};

function whatWeDontKnow(anomalyType) {
  return (
    WHAT_WE_DONT_KNOW[anomalyType] ||
    "What the public feed cannot disambiguate without operator confirmation."
  );
}

function extractSignalsFromNetwork(net) {
  if (!net.topFinding || !net.generatedAt) return [];
  const snap = loadSnapshot(net.id);
  const cur = snap?.stats || net.stats || {};
  const prev = snap?.prevStats || null;
  const signals = [];

  const headline = {
    network: net.name,
    networkId: net.id,
    anomalyType: net.anomalyType,
    narrative: NARRATIVE_BY_ANOMALY[net.anomalyType] || null,
    kind: "headline",
    label: "headline finding",
    current: null,
    previous: null,
    deltaText: clean(net.topFinding),
    report: net.report,
    publicSource: net.publicSource,
    asOf: net.generatedAt,
  };
  signals.push(headline);

  for (const [key, label] of Object.entries(METRIC_LABELS)) {
    if (typeof cur[key] !== "number") continue;
    const prevVal = prev && typeof prev[key] === "number" ? prev[key] : null;
    const deltaText =
      prevVal != null
        ? renderDeltaText(cur[key], prevVal, key)
        : "_(first snapshot — baseline recorded)_";
    if (prevVal != null && shouldSuppressMetric(key, cur[key], prevVal, deltaText)) continue;

    signals.push({
      network: net.name,
      networkId: net.id,
      anomalyType: net.anomalyType,
      narrative:
        key === "observed" && prevVal != null && cur[key] > prevVal
          ? "geographic expansion"
          : NARRATIVE_BY_ANOMALY[net.anomalyType] || null,
      kind: "metric",
      label,
      metricKey: key,
      current: cur[key],
      previous: prevVal,
      deltaText,
      report: net.report,
      publicSource: net.publicSource,
      asOf: net.generatedAt,
    });
  }

  return signals;
}

export function collectPublicSignals() {
  const networks = loadAuditNetworks();
  const byNetwork = {};
  const all = [];

  for (const net of networks) {
    const signals = extractSignalsFromNetwork(net);
    if (signals.length) {
      byNetwork[net.id] = { network: net.name, networkId: net.id, signals };
      all.push(...signals);
    }
  }

  return { networks: byNetwork, all, generatedAt: new Date().toISOString() };
}

function pickThreadSeed(replyBrief) {
  const seeds = replyBrief?.threadSeeds?.seeds || [];
  if (seeds.length) return seeds[0].suggestedPost;
  return null;
}

export function writeDailySignalBrief(today, replyBrief) {
  const { all, networks } = collectPublicSignals();
  fs.mkdirSync(DAILY_DIR, { recursive: true });

  const changed = all.filter(
    (s) => s.kind === "metric" || (s.kind === "headline" && s.deltaText),
  );
  let measurable = changed.filter((s) => s.kind === "metric");

  // Headline-only signals (e.g. Natix metric drift with flat counters) still belong in daily brief.
  for (const id of WATCH_NETWORKS) {
    if (measurable.some((s) => s.networkId === id)) continue;
    const headline = all.find((s) => s.networkId === id && s.kind === "headline");
    if (headline) measurable.push(headline);
  }

  if (!measurable.length) {
    for (const s of all.filter((x) => x.kind === "headline")) {
      measurable.push(s);
    }
  }

  const questions = [];
  for (const id of [...WATCH_NETWORKS, ...Object.keys(networks).filter((k) => !WATCH_NETWORKS.includes(k))]) {
    const net = loadAuditNetworks().find((n) => n.id === id);
    if (!net?.topFinding) continue;
    const q = operationalQuestion(net);
    if (q && !questions.includes(q)) questions.push(q);
  }

  const threadSeed = pickThreadSeed(replyBrief);

  const fullEvidenceLines = [
    "### What Changed Today",
    "",
  ];

  if (!measurable.length) {
    fullEvidenceLines.push("_No measurable deltas since last snapshot — run network scans to refresh public reads._");
  } else {
    for (const s of measurable) {
      if (s.kind === "metric") {
        fullEvidenceLines.push(
          `- **${s.network}** — ${s.label}: ${fmtVal(s.metricKey, s.current)} (${s.deltaText})`,
        );
      } else {
        fullEvidenceLines.push(`- **${s.network}** — ${s.deltaText}`);
      }
    }
  }

  const whyTargets = [...new Set(measurable.map((s) => s.networkId))];

  fullEvidenceLines.push("", "### Signal Type", "");
  if (!whyTargets.length) {
    fullEvidenceLines.push("_No classified signals today._");
  } else {
    for (const id of whyTargets) {
      const sig = measurable.find((s) => s.networkId === id) || all.find((s) => s.networkId === id);
      if (sig) fullEvidenceLines.push(`- **${sig.network}** — ${signalTypeLabel(sig.anomalyType)} (\`${sig.anomalyType}\`)`);
    }
  }

  fullEvidenceLines.push("", "### Signal Context", "");
  if (!whyTargets.length) {
    fullEvidenceLines.push("_No signals with supporting observations today._");
  } else {
    for (const id of whyTargets) {
      const sig = measurable.find((s) => s.networkId === id) || all.find((s) => s.networkId === id);
      if (sig) fullEvidenceLines.push(`- ${whySentence(sig)}`);
    }
  }

  fullEvidenceLines.push("", "### What We Don't Know", "");
  if (!whyTargets.length) {
    fullEvidenceLines.push("_No open observations to bound today._");
  } else {
    for (const id of whyTargets) {
      const sig = measurable.find((s) => s.networkId === id) || all.find((s) => s.networkId === id);
      if (sig) fullEvidenceLines.push(`- **${sig.network}** — ${whatWeDontKnow(sig.anomalyType)}`);
    }
  }

  fullEvidenceLines.push("", "### Questions Worth Asking", "");
  if (!questions.length) {
    fullEvidenceLines.push("_No operational questions — refresh audits when public data moves._");
  } else {
    questions.slice(0, 5).forEach((q) => fullEvidenceLines.push(`- ${q}`));
  }

  fullEvidenceLines.push("", "### Thread Seed", "");
  fullEvidenceLines.push(
    threadSeed ||
      "_No new thread seed today — all observable signals may already be in live threads._",
  );

  fullEvidenceLines.push("", "### Sources & Methodology", "");
  fullEvidenceLines.push("- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)");
  fullEvidenceLines.push("- Reproduce scans: `node scripts/sybil-scan-<network>.mjs` (see each report header)");
  for (const id of whyTargets) {
    const net = loadAuditNetworks().find((n) => n.id === id);
    if (!net) continue;
    fullEvidenceLines.push(`- **${net.name}:** \`${net.report}\`${net.publicSource ? ` · ${net.publicSource}` : ""}`);
  }

  const categories = [...new Set(measurable.map((s) => signalTypeLabel(s.anomalyType).toUpperCase().replace(/\s+/g, "_")))];
  const todaysRead = buildTodaysReadFromPublication(measurable);
  const whyItMatters = buildDailyWhyItMatters({
    categories,
    networkCount: whyTargets.length,
    signalCount: measurable.length,
    signals: measurable.map((s) => ({
      severity: s.severity || "low",
      delta: typeof s.current === "number" && typeof s.previous === "number" ? s.current - s.previous : 0,
    })),
  });

  const md = wrapDualLayerDaily({
    title: "# Daily Signal Brief",
    dateLine: `> ${today} · derived from public audit snapshots only. Signals → report (not narrative-first).`,
    todaysRead,
    whyItMatters,
    fullEvidence: fullEvidenceLines.join("\n"),
  });
  const file = path.join(DAILY_DIR, `${today}-signal-brief.md`);
  fs.writeFileSync(file, md, "utf8");
  fs.writeFileSync(path.join(DAILY_DIR, "latest-signal-brief.md"), md, "utf8");

  const jsonPath = path.join(DAILY_DIR, `${today}-signal.json`);
  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ date: today, signals: all, questions, threadSeed }, null, 2),
    "utf8",
  );

  return {
    path: path.relative(REPO_ROOT, file).replace(/\\/g, "/"),
    markdown: md,
    signalCount: measurable.length,
  };
}

function isoWeekId(isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function loadDailySignalJsonFiles(sinceDate) {
  if (!fs.existsSync(DAILY_DIR)) return [];
  const since = new Date(`${sinceDate}T00:00:00Z`).getTime();
  const out = [];
  for (const name of fs.readdirSync(DAILY_DIR)) {
    const m = name.match(/^(\d{4}-\d{2}-\d{2})-signal\.json$/);
    if (!m) continue;
    if (new Date(`${m[1]}T12:00:00Z`).getTime() < since) continue;
    try {
      out.push(JSON.parse(fs.readFileSync(path.join(DAILY_DIR, name), "utf8")));
    } catch {
      /* skip */
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function trendLabel(deltas) {
  if (!deltas.length) return "insufficient history";
  const moved = deltas.filter((d) => d && !d.includes("unchanged") && !d.includes("first snapshot"));
  if (!moved.length) return "flat week";
  if (moved.length === 1) return "single delta observed";
  return "multiple deltas observed";
}

// ---- Signal taxonomy v2 (cross-network pattern layer) -------------------

const TAXONOMY_V2 = {
  capacity_violation: "CAPACITY",
  duplication_cluster: "IDENTITY",
  identity_collision: "IDENTITY",
  telemetry_discontinuity: "CONSISTENCY",
  economic_concentration: "ECONOMICS",
  inactivity_anomaly: "BEHAVIORAL",
};

const TAXONOMY_V2_ORDER = ["CAPACITY", "IDENTITY", "CONSISTENCY", "ECONOMICS", "BEHAVIORAL", "INFRASTRUCTURE"];

const TAXONOMY_V2_UNKNOWN = {
  CAPACITY:
    "Public data cannot determine whether pressure reflects density, registry effects, or expected reward behavior.",
  IDENTITY:
    "Public data cannot confirm whether shared coordinates are distinct devices or one identity reused.",
  CONSISTENCY:
    "Public data cannot distinguish between feed issues and underlying activity changes.",
  ECONOMICS:
    "Public data cannot determine whether concentrated holdings are treasury, market-maker, exchange custody, or operators.",
  BEHAVIORAL:
    "Public data cannot determine whether behavioral shifts reflect real activity or reporting changes.",
  INFRASTRUCTURE:
    "Public data cannot confirm whether footprint changes reflect physical deployments or registration effects.",
};

const CATEGORY_PRIMARY_METRIC = {
  CAPACITY: "overCapacityCells",
  IDENTITY: "exactDupGroups",
  CONSISTENCY: "kmFrozenDays",
  ECONOMICS: "top20ShareOfSupply",
  INFRASTRUCTURE: "observed",
};

function networkPrimaryCategory(netBlock, netMeta) {
  const headline = netBlock?.signals?.find((s) => s.kind === "headline");
  const anomalyType = headline?.anomalyType || netBlock?.signals?.[0]?.anomalyType || netMeta?.anomalyType;
  return TAXONOMY_V2[anomalyType] || null;
}

function statPair(netId, key) {
  const snap = loadSnapshot(netId);
  const cur = snap?.stats?.[key];
  const prev = snap?.prevStats?.[key];
  return { cur: typeof cur === "number" ? cur : null, prev: typeof prev === "number" ? prev : null };
}

function directionWord(cur, prev) {
  if (cur == null || prev == null) return "flat";
  if (cur < prev) return "down";
  if (cur > prev) return "up";
  return "flat";
}

function patternSignalSentence(category, netId, netName, single) {
  const tail = single ? "" : ` on ${netName}`;
  if (category === "CAPACITY") {
    const { cur, prev } = statPair(netId, "overCapacityCells");
    if (cur != null && prev != null && cur !== prev) {
      return `Over-capacity H3 cells ${cur < prev ? "declined" : "rose"} from ${prev.toLocaleString()} to ${cur.toLocaleString()}${tail}.`;
    }
    if (cur != null) return `Over-capacity H3 cells observed at ${cur.toLocaleString()}${tail}.`;
  }
  if (category === "IDENTITY") {
    const { cur, prev } = statPair(netId, "exactDupGroups");
    if (cur != null && prev != null && cur !== prev) {
      return `Exact coordinate-duplicate groups ${cur < prev ? "declined" : "rose"} from ${prev} to ${cur}${tail}.`;
    }
    if (cur != null) return `Exact coordinate-duplicate groups observed at ${cur}${tail}.`;
  }
  if (category === "CONSISTENCY") {
    const { cur } = statPair(netId, "kmFrozenDays");
    const drivers = statPair(netId, "drivers");
    const rising = drivers.cur != null && drivers.prev != null && drivers.cur > drivers.prev;
    if (cur != null) {
      return `Public coverage metrics remained unchanged for ${cur} days${rising ? " while registrations increased" : ""}.`;
    }
    return "Public coverage metrics show a flat cumulative output run.";
  }
  if (category === "ECONOMICS") {
    const { cur } = statPair(netId, "top20ShareOfSupply");
    if (cur != null) return `Top-20 account share of supply observed near ${(cur * 100).toFixed(2)}%${tail}.`;
  }
  if (category === "INFRASTRUCTURE") {
    const { cur, prev } = statPair(netId, "observed");
    if (cur != null && prev != null && cur !== prev) {
      return `Entities on the public map ${cur < prev ? "declined" : "rose"} from ${prev.toLocaleString()} to ${cur.toLocaleString()}${tail}.`;
    }
    if (cur != null) return `Entities on the public map observed at ${cur.toLocaleString()}${tail}.`;
  }
  return null;
}

function classifyPattern(category, directions) {
  if (category === "CONSISTENCY") return "drift";
  if (category === "ECONOMICS") return "concentration";
  if (category === "BEHAVIORAL") return "shift";
  const set = new Set(directions.filter(Boolean));
  const hasUp = set.has("up");
  const hasDown = set.has("down");
  const allFlat = !hasUp && !hasDown;
  const hasStructural = hasUp && hasDown;
  if (grammar && !grammarLegacyFallback) {
    const structure = grammar.classifyStructure({ allFlat, hasStructural });
    const expectedStructure = allFlat ? "flat" : hasStructural ? "structural" : "incremental";
    if (structure !== expectedStructure) {
      activateLegacyFallback(`classifyStructure:${category}`);
    }
  }
  if (hasUp && hasDown) return "divergence";
  if (category === "INFRASTRUCTURE") return hasUp ? "expansion" : hasDown ? "contraction" : "stability";
  return hasUp ? "escalation" : "stability"; // CAPACITY / IDENTITY
}

/** Cross-network pattern blocks grouped by taxonomy v2 — leads the weekly report. */
function buildCrossNetworkPatternBlocks(currentSignals, ordered) {
  const byCategory = {};
  for (const id of ordered) {
    const netBlock = currentSignals[id];
    if (!netBlock?.signals?.length) continue;
    const netMeta = loadAuditNetworks().find((n) => n.id === id);
    const category = networkPrimaryCategory(netBlock, netMeta);
    if (!category) continue;
    (byCategory[category] ||= []).push({ id, name: netBlock.network || netMeta?.name || id });
  }

  const blocks = [];
  for (const category of TAXONOMY_V2_ORDER) {
    const nets = byCategory[category];
    if (!nets?.length) continue;
    const networks = nets.map((n) => n.name);
    const scope = getScopeForNetworks(networks);
    const single = nets.length === 1;
    const sentences = [];
    const directions = [];
    const primaryKey = CATEGORY_PRIMARY_METRIC[category];
    for (const n of nets) {
      const sentence = patternSignalSentence(category, n.id, n.name, single);
      if (sentence) sentences.push(sentence);
      if (primaryKey) {
        const { cur, prev } = statPair(n.id, primaryKey);
        directions.push(directionWord(cur, prev));
      }
    }
    const classification = classifyPattern(category, directions);
    const signalText = sentences.length
      ? sentences.join(" ")
      : "Signal present in public reads; see Network Watch for detail.";
    blocks.push({
      category,
      networks,
      scope,
      lines: [
        `### ${category}`,
        "",
        "**Observed in:**",
        ...networks.map((nm) => `- ${nm}`),
        "",
        `**Signal:** ${signalText}`,
        "",
        `**Scope:** ${scope}`,
        "",
        `**Classification:** ${classification}`,
        "",
        `**Unknown:** ${TAXONOMY_V2_UNKNOWN[category]}`,
        "",
      ],
    });
  }

  if (!blocks.length) {
    blocks.push({
      category: "NONE",
      networks: [],
      scope: "localized",
      lines: ["_No cross-network patterns tagged this week._", ""],
    });
  }
  return blocks;
}

export function writeWeeklySignalReport(today) {
  fs.mkdirSync(WEEKLY_DIR, { recursive: true });
  const weekId = isoWeekId(today);
  const d = new Date(`${today}T12:00:00Z`);
  const day = d.getUTCDay() || 7;
  const weekStart = new Date(d);
  weekStart.setUTCDate(d.getUTCDate() - day + 1);
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  const dailies = loadDailySignalJsonFiles(weekStartIso);
  const { networks: currentSignals } = collectPublicSignals();

  const ordered = [
    ...WATCH_NETWORKS,
    ...Object.keys(currentSignals).filter((k) => !WATCH_NETWORKS.includes(k)),
  ];
  const latestDaily = dailies[dailies.length - 1];
  const todayMetrics = (latestDaily?.signals || []).filter((s) => s.kind === "metric");

  // Patterns first: group signals across networks by taxonomy v2.
  const patternBlocks = buildCrossNetworkPatternBlocks(currentSignals, ordered);

  // Executive Summary (≤5 bullets), driven by the cross-network patterns.
  const weekSignals = todayMetrics.length
    ? todayMetrics
    : (latestDaily?.signals || []).filter((s) => s.kind === "headline");
  const executive = buildWeeklyExecutiveBullets({
    signalCount: weekSignals.length,
    networkCount: Object.keys(currentSignals).length,
    patterns: patternBlocks
      .filter((b) => b.category !== "NONE")
      .map((b) => ({ scope: b.scope, category: b.category, networks: b.networks })),
    weekLabel: weekId,
  });

  // Network Watch: keep the network-by-network detail (now after patterns).
  const networkWatch = [];
  for (const id of ordered) {
    const netBlock = currentSignals[id];
    const netMeta = loadAuditNetworks().find((n) => n.id === id);
    const name = netBlock?.network || netMeta?.name || id;
    networkWatch.push(`### ${name}`, "");

    if (!netBlock?.signals?.length) {
      networkWatch.push("_No public signal this week — scan not run or no headline finding._", "");
      continue;
    }

    const headline = netBlock.signals.find((s) => s.kind === "headline");
    const metrics = netBlock.signals.filter((s) => s.kind === "metric");
    const weekDeltas = dailies.flatMap((day) =>
      (day.signals || []).filter((s) => s.networkId === id && s.kind === "metric").map((s) => s.deltaText),
    );

    networkWatch.push("**What changed**");
    if (metrics.length) {
      metrics.forEach((m) => networkWatch.push(`- ${m.label}: ${fmtVal(m.metricKey, m.current)} (${m.deltaText})`));
    } else if (headline) {
      networkWatch.push(`- ${headline.deltaText}`);
    } else {
      networkWatch.push("- _No measurable delta in latest snapshot._");
    }

    const anomalyType = headline?.anomalyType || metrics[0]?.anomalyType || netMeta?.anomalyType;
    networkWatch.push("", "**Signal type**", `- ${signalTypeLabel(anomalyType)} (\`${anomalyType || "n/a"}\`)`);
    networkWatch.push("", "**Trend**", `- ${trendLabel(weekDeltas)}`);
    const q = netMeta ? operationalQuestion(netMeta) : null;
    networkWatch.push("", "**Open question**", `- ${q || "_None formulated._"}`);
    networkWatch.push("", "**What we don't know**", `- ${whatWeDontKnow(anomalyType)}`, "");
  }

  // Data Appendix: retain raw evidence + open questions + methodology.
  const appendix = ["### What Changed Today", ""];
  if (latestDaily && todayMetrics.length) {
    appendix.push(`_Latest reading: ${latestDaily.date}_`, "");
    for (const s of todayMetrics) {
      appendix.push(`- **${s.network}** — ${s.label}: ${fmtVal(s.metricKey, s.current)} (${s.deltaText})`);
    }
  } else if (latestDaily) {
    appendix.push(`_Latest reading ${latestDaily.date}: no measurable deltas — headline observations only._`);
  } else {
    appendix.push("_No daily signal recorded yet this week._");
  }

  appendix.push("", "### Signals To Watch", "");
  const openQuestions = [
    ...new Set(
      dailies.flatMap((d) => d.questions || []).concat(
        ordered
          .map((id) => loadAuditNetworks().find((n) => n.id === id))
          .filter(Boolean)
          .map(operationalQuestion),
      ),
    ),
  ].filter(Boolean);
  if (!openQuestions.length) {
    appendix.push("_Carry forward daily questions as public feeds update._");
  } else {
    openQuestions.slice(0, 6).forEach((q) => appendix.push(`- ${q}`));
  }

  appendix.push("", "### Sources & Methodology", "");
  appendix.push("- Weekly report aggregates **daily signal briefs** and latest audit snapshots.");
  appendix.push("- Patterns lead; network detail and raw evidence follow. Narratives appear only when tied to observations above.");
  appendix.push("- Public scans: `scripts/sybil-scan-*.mjs` · Index: `scripts/data/bureau-audit-index.json`");

  const md = [
    "# Weekly DePIN Signal Report",
    "",
    `> Week ${weekId} · ${weekStartIso} → ${today} · patterns first, then networks.`,
    "",
    "## Executive Summary",
    "",
    ...executive.map((b) => `- ${b}`),
    "",
    "## Cross-Network Patterns",
    "",
    "Taxonomy v2: CAPACITY · IDENTITY · CONSISTENCY · ECONOMICS · BEHAVIORAL · INFRASTRUCTURE",
    "",
    ...patternBlocks.flatMap((b) => b.lines),
    "## Network Watch",
    "",
    ...networkWatch,
    "## Data Appendix",
    "",
    ...appendix,
    "",
  ].join("\n");

  const file = path.join(WEEKLY_DIR, `${weekId}-signal-report.md`);
  fs.writeFileSync(file, md, "utf8");
  fs.writeFileSync(path.join(WEEKLY_DIR, "latest-signal-report.md"), md, "utf8");

  return {
    path: path.relative(REPO_ROOT, file).replace(/\\/g, "/"),
    weekId,
    markdown: md,
  };
}

export function writeMonthlyStateOfDepin(today) {
  fs.mkdirSync(MONTHLY_DIR, { recursive: true });
  const monthId = today.slice(0, 7);
  const monthStart = `${monthId}-01`;

  const dailies = loadDailySignalJsonFiles(monthStart);
  const { all, networks } = collectPublicSignals();

  const observationsByNarrative = {};
  for (const s of all) {
    if (!s.narrative) continue;
    if (!observationsByNarrative[s.narrative]) observationsByNarrative[s.narrative] = [];
    const line =
      s.kind === "metric"
        ? `${s.network}: ${s.label} ${fmtVal(s.metricKey, s.current)} (${s.deltaText})`
        : `${s.network}: ${s.deltaText}`;
    if (!observationsByNarrative[s.narrative].includes(line)) {
      observationsByNarrative[s.narrative].push(line);
    }
  }

  const lines = [
    "# State of DePIN",
    "",
    `> ${monthId} · narratives derived from accumulated public observations only.`,
    "",
    "_Rule: signals create reports; reports create narratives. Observations below precede any narrative label._",
    "",
  ];

  const latestDaily = dailies[dailies.length - 1];
  lines.push("## What Changed Today", "");
  const todayMetrics = (latestDaily?.signals || []).filter((s) => s.kind === "metric");
  if (latestDaily && todayMetrics.length) {
    lines.push(`_Latest reading: ${latestDaily.date}_`, "");
    for (const s of todayMetrics) {
      lines.push(`- **${s.network}** — ${s.label}: ${fmtVal(s.metricKey, s.current)} (${s.deltaText})`);
    }
  } else if (latestDaily) {
    lines.push(`_Latest reading ${latestDaily.date}: no measurable deltas — headline observations only._`);
  } else {
    lines.push("_No daily signal recorded yet this month._");
  }
  lines.push("");

  const narrativeOrder = [
    "capacity pressure",
    "registry quality",
    "geographic expansion",
    "reward concentration",
    "metric drift",
  ];

  let anyNarrative = false;
  for (const theme of narrativeOrder) {
    const obs = observationsByNarrative[theme];
    if (!obs?.length) continue;
    anyNarrative = true;
    lines.push(`## ${theme.charAt(0).toUpperCase() + theme.slice(1)}`, "");
    lines.push("**Supporting observations**");
    obs.forEach((o) => lines.push(`- ${o}`));
    lines.push("");
  }

  if (!anyNarrative) {
    lines.push("## Observations", "");
    lines.push("_Insufficient accumulated observations for themed narratives this month._");
    if (Object.keys(networks).length) {
      lines.push("");
      lines.push("**Latest headline reads**");
      for (const id of Object.keys(networks)) {
        const h = networks[id].signals.find((s) => s.kind === "headline");
        if (h) lines.push(`- ${h.deltaText}`);
      }
    }
    lines.push("");
  }

  const orderedNets = [
    ...WATCH_NETWORKS,
    ...Object.keys(networks).filter((k) => !WATCH_NETWORKS.includes(k)),
  ];

  lines.push("## Signal Type", "");
  let anyType = false;
  for (const id of orderedNets) {
    const block = networks[id];
    if (!block) continue;
    anyType = true;
    const sig = block.signals.find((s) => s.anomalyType) || block.signals[0];
    lines.push(`- **${block.network}** — ${signalTypeLabel(sig?.anomalyType)} (\`${sig?.anomalyType || "n/a"}\`)`);
  }
  if (!anyType) lines.push("_No classified signals this month._");
  lines.push("");

  lines.push("## Network snapshot (public reads)", "");
  for (const id of orderedNets) {
    const block = networks[id];
    if (!block) continue;
    lines.push(`### ${block.network}`);
    const h = block.signals.find((s) => s.kind === "headline");
    if (h) lines.push(`- ${h.deltaText}`);
    else lines.push("- _No headline finding._");
    lines.push("");
  }

  lines.push("## What We Don't Know", "");
  const dontKnowTypes = new Set();
  let anyDontKnow = false;
  for (const id of orderedNets) {
    const block = networks[id];
    if (!block) continue;
    const sig = block.signals.find((s) => s.anomalyType) || block.signals[0];
    const t = sig?.anomalyType;
    if (!t || dontKnowTypes.has(`${id}:${t}`)) continue;
    dontKnowTypes.add(`${id}:${t}`);
    anyDontKnow = true;
    lines.push(`- **${block.network}** — ${whatWeDontKnow(t)}`);
  }
  if (!anyDontKnow) lines.push("_No open observations to bound this month._");
  lines.push("");

  lines.push("## Methodology", "");
  lines.push(`- ${dailies.length} daily signal record(s) in ${monthId}.`);
  lines.push("- Themed sections appear only when observations exist in audit snapshots / daily signals.");
  lines.push("- Full audit reports: [getkinetik.app/audits](https://getkinetik.app/audits.html)");
  lines.push("");

  const md = lines.join("\n");
  const file = path.join(MONTHLY_DIR, `${monthId}-state-of-depin.md`);
  fs.writeFileSync(file, md, "utf8");
  fs.writeFileSync(path.join(MONTHLY_DIR, "latest-state-of-depin.md"), md, "utf8");

  return {
    path: path.relative(REPO_ROOT, file).replace(/\\/g, "/"),
    monthId,
    markdown: md,
  };
}

/**
 * @param {string} today YYYY-MM-DD
 * @param {object} replyBrief from buildReplyBrief
 */
export function publishSignalReports(today, replyBrief) {
  const daily = writeDailySignalBrief(today, replyBrief);
  const weekly = writeWeeklySignalReport(today);
  const monthly = writeMonthlyStateOfDepin(today);

  return {
    daily,
    weekly,
    monthly,
    latest: {
      daily: "docs/reports/daily/latest-signal-brief.md",
      weekly: "docs/reports/weekly/latest-signal-report.md",
      monthly: "docs/reports/monthly/latest-state-of-depin.md",
    },
  };
}
