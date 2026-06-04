// Versioned signal interpretation engine.
// Signals -> classification -> grammar interpretation -> structured report.
// Observability/reporting layer only; does not mutate production feed outputs.

import { resolveGrammarVersion, classifyByGrammarVersion } from "./grammar-runtime.mjs";
import { mapLegacyToV2, V2_CATEGORIES } from "./taxonomy-v2.mjs";

const CATEGORY_ORDER = ["CAPACITY", "IDENTITY", "CONSISTENCY", "ECONOMICS", "BEHAVIORAL", "INFRASTRUCTURE"];

const UNKNOWN_BY_CATEGORY = {
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

const TRIVIAL_ABS = {
  drivers: 10,
};

let warnedMismatch = false;
function warnMismatchOnce() {
  if (warnedMismatch) return;
  warnedMismatch = true;
  console.warn("grammar mismatch detected — fallback to legacy for signal");
}

function asNumber(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function fmtMetricValue(signal, value) {
  if (value == null) return "—";
  const key = String(signal.metric || signal.metricKey || "");
  if (/share|pct/i.test(key)) return `${(value * 100).toFixed(2)}%`;
  return value.toLocaleString();
}

export function renderDelta(signal) {
  const prev = asNumber(signal.previous);
  const curr = asNumber(signal.value);
  const d = asNumber(signal.delta) ?? 0;

  if (prev != null && curr != null && d !== 0) {
    const verb = d > 0 ? "rose" : "declined";
    return `${verb} from ${fmtMetricValue(signal, prev)} to ${fmtMetricValue(signal, curr)}`;
  }
  if (curr != null) {
    return `recorded at ${fmtMetricValue(signal, curr)}`;
  }
  return signal.message || "no delta available";
}

export function renderStability(signal) {
  const curr = asNumber(signal.value);
  const d = asNumber(signal.delta) ?? 0;
  const key = String(signal.metric || signal.metricKey || "");
  // If delta is non-zero, delta phrase already expresses the change — suppress echo.
  if (d !== 0) return renderDelta(signal);
  if (key === "kmFrozenDays" && curr != null) return `unchanged for ${curr} days`;
  if (/share|pct/i.test(key) && curr != null) return `remains near ${fmtMetricValue(signal, curr)}`;
  if (curr != null) return `unchanged at ${fmtMetricValue(signal, curr)}`;
  return renderDelta(signal);
}

export function renderSuppression(signal) {
  const key = String(signal.metric || signal.metricKey || "");
  const threshold = TRIVIAL_ABS[key];
  const d = Math.abs(asNumber(signal.delta) ?? 0);
  if (typeof threshold === "number" && d <= threshold) {
    return { suppressed: true, reason: `TRIVIAL_ABS(${key}) <= ${threshold}` };
  }
  return { suppressed: false, reason: null };
}

export function classifyStructure(signal, suppressed) {
  const d = Math.abs(asNumber(signal.delta) ?? 0);
  const prev = asNumber(signal.previous);
  if (suppressed || d === 0) return "flat";
  const rel = prev && prev !== 0 ? d / Math.abs(prev) : 0;
  if (rel >= 0.1 || signal.severity === "high") return "structural";
  return "incremental";
}

function classifyV1(signal) {
  return String(signal.type || "unclassified").toLowerCase();
}

function classifyCategory(signal, grammarVersion) {
  const v1 = classifyV1(signal);
  const direct = String(signal.type || "").toUpperCase();
  if (V2_CATEGORIES.includes(direct)) {
    return { v1, category: direct, fallback: false };
  }
  try {
    const category = classifyByGrammarVersion(signal, v1, grammarVersion);
    if (!category || category === "UNMAPPED") throw new Error("unmapped");
    return { v1, category, fallback: false };
  } catch {
    warnMismatchOnce();
    return { v1, category: mapLegacyToV2(v1) || "UNMAPPED", fallback: true };
  }
}

function getActiveSignals(feed, grammarVersion) {
  const rows = [];
  for (const net of feed?.networks || []) {
    for (const signal of net?.signals || []) {
      const suppression = renderSuppression(signal);
      const cls = classifyCategory(signal, grammarVersion);
      const structure = classifyStructure(signal, suppression.suppressed);
      rows.push({
        network: net.network || signal.network || net.networkId || "unknown",
        networkId: net.networkId || "unknown",
        signal,
        v1_category: cls.v1,
        category: cls.category,
        fallback: cls.fallback,
        suppressed: suppression.suppressed,
        suppressionReason: suppression.reason,
        structure,
        deltaPhrase: renderDelta(signal),
        trendPhrase: renderStability(signal),
      });
    }
  }
  return rows;
}

export function getScope(category, interpretedRows) {
  const networks = new Set(
    interpretedRows.filter((r) => r.category === category && !r.suppressed).map((r) => r.network),
  );
  if (networks.size >= 3) return "systemic";
  if (networks.size >= 2) return "cross-network";
  return "localized";
}

function executiveSummary(rows) {
  const unsuppressed = rows.filter((r) => !r.suppressed);
  const top = [...unsuppressed]
    .sort((a, b) => Math.abs(asNumber(b.signal.delta) ?? 0) - Math.abs(asNumber(a.signal.delta) ?? 0))
    .slice(0, 5);
  if (!top.length) return ["No unsuppressed delta signals in the active feed."];
  return top.map((r) => `${r.network}: ${r.deltaPhrase}.`);
}

function crossNetworkPatterns(rows) {
  const out = [];
  for (const category of CATEGORY_ORDER) {
    const items = rows.filter((r) => r.category === category && !r.suppressed);
    if (!items.length) continue;
    const networks = [...new Set(items.map((r) => r.network))];
    const scope = getScope(category, rows);
    const structural =
      items.some((r) => r.structure === "structural")
        ? "structural"
        : items.some((r) => r.structure === "incremental")
          ? "incremental"
          : "flat";
    out.push({
      category,
      observed_networks: networks,
      signal_summary: items.map((r) => `${r.network}: ${r.trendPhrase}.`),
      scope_classification: scope,
      structural_classification: structural,
      unknowns: UNKNOWN_BY_CATEGORY[category],
    });
  }
  return out;
}

function networkWatch(rows) {
  const byNetwork = new Map();
  for (const row of rows) {
    if (!byNetwork.has(row.network)) byNetwork.set(row.network, []);
    byNetwork.get(row.network).push(row);
  }

  const out = [];
  for (const [network, items] of byNetwork.entries()) {
    const unsuppressed = items.filter((i) => !i.suppressed);
    const focus = unsuppressed[0] || items[0];
    const whatChanged = unsuppressed.length
      ? unsuppressed.map((i) => `${i.signal.metric || i.signal.metricKey || i.signal.anomalyType}: ${i.deltaPhrase}`)
      : ["No unsuppressed deltas after grammar suppression."];

    out.push({
      network,
      what_changed: whatChanged,
      signal_type: focus?.category || "UNMAPPED",
      trend: focus?.trendPhrase || "no trend available",
      open_question: `Does ${network}'s public feed match expected internal behavior for these metrics?`,
      what_we_dont_know: UNKNOWN_BY_CATEGORY[focus?.category] || "Public data alone cannot disambiguate root cause.",
    });
  }
  return out;
}

function dataAppendix(feed, rows) {
  return {
    raw_deltas: rows.map((r) => ({
      network: r.network,
      metric: r.signal.metric || r.signal.metricKey || "unknown",
      previous: asNumber(r.signal.previous),
      current: asNumber(r.signal.value),
      delta: asNumber(r.signal.delta) ?? 0,
      suppressed: r.suppressed,
      suppression_reason: r.suppressionReason,
    })),
    signals_to_watch: rows
      .filter((r) => !r.suppressed)
      .slice(0, 10)
      .map((r) => `${r.network}: ${r.trendPhrase}`),
    sources_methodology: [
      "Feed source: signals/<cadence>/latest.json",
      "Classification: grammar-runtime.mjs + taxonomy-v2.mjs",
      "Suppression: TRIVIAL_ABS thresholds from signal-interpretation.mjs",
    ],
    feed_meta: {
      generated_at: feed?.generatedAt || null,
      cadence: feed?.cadence || null,
    },
  };
}

function semanticDiffSummary(rows) {
  const divergent = rows.filter((r) => {
    const v2 = classifyByGrammarVersion(r.signal, r.v1_category, "v2");
    const v3 = classifyByGrammarVersion(r.signal, r.v1_category, "v3");
    return v2 !== v3 || (mapLegacyToV2(r.v1_category) || "UNMAPPED") !== v2;
  });

  const byCategory = {};
  for (const r of divergent) {
    byCategory[r.v1_category] = (byCategory[r.v1_category] || 0) + 1;
  }

  return {
    total_signals: rows.length,
    divergent_signals: divergent.length,
    divergence_pct: rows.length ? Number(((divergent.length / rows.length) * 100).toFixed(2)) : 0,
    top_divergent_v1_categories: Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count })),
  };
}

/**
 * Execute versioned signal interpretation over structured telemetry.
 *
 * options:
 *   - grammarVersion?: "v2" | "v3"
 *   - semanticDiff?: boolean
 */
export function runSignalInterpretation(feed, options = {}) {
  const grammarVersion = resolveGrammarVersion(options.grammarVersion);
  const rows = getActiveSignals(feed, grammarVersion);

  if (options.semanticDiff) {
    return {
      mode: "semantic_diff",
      grammar_version: grammarVersion,
      divergence_summary: semanticDiffSummary(rows),
    };
  }

  return {
    grammar_version: grammarVersion,
    executive_summary: executiveSummary(rows).slice(0, 5),
    cross_network_patterns: crossNetworkPatterns(rows),
    network_watch: networkWatch(rows),
    data_appendix: dataAppendix(feed, rows),
  };
}

