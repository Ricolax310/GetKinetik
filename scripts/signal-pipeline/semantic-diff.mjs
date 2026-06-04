// Semantic diff engine: taxonomy v1 (legacy) vs taxonomy v2 classification.
// Observability only — does not alter production feed or render outputs.

import { SIGNAL_TYPE_BY_ANOMALY, SECTOR_ORDER } from "./config.mjs";
import { V2_CATEGORIES } from "./taxonomy-v2.mjs";
import { classifyByGrammarVersion, resolveGrammarVersion } from "./grammar-runtime.mjs";

const REFINEMENT_BY_V1 = {
  integrity: new Set(["IDENTITY"]),
  health: new Set(["CAPACITY", "CONSISTENCY", "BEHAVIORAL"]),
  growth: new Set(["INFRASTRUCTURE"]),
  economics: new Set(["ECONOMICS"]),
};

const LEGACY_BY_V2 = {
  CAPACITY: "health",
  CONSISTENCY: "health",
  BEHAVIORAL: "health",
  IDENTITY: "integrity",
  INFRASTRUCTURE: "growth",
  ECONOMICS: "economics",
};

function stablePercent(count, total) {
  if (!total) return 0;
  return Number(((count / total) * 100).toFixed(2));
}

function classifyV1(signal) {
  const t = typeof signal?.type === "string" ? signal.type.toLowerCase() : null;
  if (t && SECTOR_ORDER.includes(t)) return t;
  const anomaly = typeof signal?.anomalyType === "string" ? signal.anomalyType : null;
  if (anomaly && SIGNAL_TYPE_BY_ANOMALY[anomaly]) return SIGNAL_TYPE_BY_ANOMALY[anomaly];
  return t || "unclassified";
}

function classifyV2(signal, v1Category, grammarVersion) {
  const directType = typeof signal?.type === "string" ? signal.type.toUpperCase() : "";
  if (V2_CATEGORIES.includes(directType)) return directType;
  return classifyByGrammarVersion(signal, v1Category, grammarVersion);
}

function buildScopeCounts(records) {
  const v1 = {};
  const v2 = {};
  for (const r of records) {
    if (!v1[r.v1_category]) v1[r.v1_category] = new Set();
    if (!v2[r.v2_category]) v2[r.v2_category] = new Set();
    v1[r.v1_category].add(r.network);
    v2[r.v2_category].add(r.network);
  }
  return { v1, v2 };
}

function shiftTypeFor(record, scopeSets) {
  if (record.v1_category === record.v2_category) return "stable";

  const refined = REFINEMENT_BY_V1[record.v1_category]?.has(record.v2_category);
  const collapsedFromV2 = LEGACY_BY_V2[record.v2_category] === record.v1_category;

  const v1Scope = scopeSets.v1[record.v1_category]?.size || 0;
  const v2Scope = scopeSets.v2[record.v2_category]?.size || 0;
  if (v2Scope > v1Scope) return "expanded_scope";
  if (v2Scope < v1Scope) return "collapsed_scope";

  if (refined) return "refined";
  if (collapsedFromV2) return "collapsed_scope";
  return "reclassified";
}

function topUnstableCategories(records) {
  const counts = {};
  for (const r of records) {
    if (r.shift_type === "stable") continue;
    counts[r.v1_category] = (counts[r.v1_category] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => ({ category, count }));
}

/**
 * Run semantic classification diff for the current normalized feed.
 *
 * Input:
 *   feed.networks[] where each network has signals[]
 *
 * Output:
 * {
 *   grammar_version: "v2" | "v3",
 *   records: [{ network, signalType, v1_category, v2_category, shift_type }],
 *   summary: {
 *     total_signals,
 *     stable_pct,
 *     reclassified_pct,
 *     refined_pct,
 *     top_unstable_categories
 *   }
 * }
 */
export function runSemanticDiff(feed, options = {}) {
  const grammarVersion = resolveGrammarVersion(options.grammarVersion);
  console.log("SEMANTIC DIFF ENGINE ACTIVE");

  const records = [];
  for (const net of feed?.networks || []) {
    for (const signal of net?.signals || []) {
      const v1Category = classifyV1(signal);
      const v2Category = classifyV2(signal, v1Category, grammarVersion);
      records.push({
        network: net.network || signal.network || net.networkId || "unknown",
        signalType: signal.anomalyType || signal.metric || signal.type || "unknown",
        v1_category: v1Category,
        v2_category: v2Category,
        shift_type: "reclassified", // finalized below after scope index is built
      });
    }
  }

  const scopeSets = buildScopeCounts(records);
  for (const r of records) {
    r.shift_type = shiftTypeFor(r, scopeSets);
  }

  const total = records.length;
  const stable = records.filter((r) => r.shift_type === "stable").length;
  const reclassified = records.filter((r) => r.shift_type === "reclassified").length;
  const refined = records.filter((r) => r.shift_type === "refined").length;

  return {
    grammar_version: grammarVersion,
    records,
    summary: {
      total_signals: total,
      stable_pct: stablePercent(stable, total),
      reclassified_pct: stablePercent(reclassified, total),
      refined_pct: stablePercent(refined, total),
      top_unstable_categories: topUnstableCategories(records),
    },
  };
}
