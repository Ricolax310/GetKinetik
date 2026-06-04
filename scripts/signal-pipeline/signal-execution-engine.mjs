// Kinetik Signal Execution Engine.
// Deterministic semantic compiler: structured signal data -> grammar-compliant
// markdown report. Fixed 3-stage pipeline, no stage skipped, no freeform text.
//
//   STAGE A (schema-contracts.mjs)   schema validation / normalization
//   STAGE B (grammar runtime fns)    classification + grammar interpretation
//   STAGE C (this module, render)    deterministic markdown assembly
//
// Same input + same GRAMMAR_VERSION => byte-identical output.

import { resolveGrammarVersion, classifyByGrammarVersion } from "./grammar-runtime.mjs";
import {
  renderDelta,
  renderStability,
  renderSuppression,
  classifyStructure,
  getScope,
} from "./signal-interpretation.mjs";
import { getGrammar, getBulletLimits } from "./grammar-v2.mjs";
import {
  CategoryEnum,
  ExecutionFeedSchema,
  FeedNetworkSchema,
  SignalLikeSchema,
} from "./schema-contracts.mjs";

const CATEGORY_ORDER = ["CAPACITY", "IDENTITY", "CONSISTENCY", "ECONOMICS", "BEHAVIORAL", "INFRASTRUCTURE"];
const SEVERITY_RANK = { high: 3, medium: 2, low: 1 };
const STRUCTURE_RANK = { structural: 3, incremental: 2, flat: 1 };
const SCOPE_RANK = { systemic: 3, "cross-network": 2, localized: 1 };

// ---------------------------------------------------------------------------
// STAGE A — schema validation (no interpretation)
// ---------------------------------------------------------------------------

function missingRequired(schema, obj) {
  if (!schema?.required) return [];
  if (obj == null || typeof obj !== "object") return [...schema.required];
  return schema.required.filter((k) => obj[k] === undefined);
}

function validateAndNormalize(feed) {
  const errors = [];
  if (missingRequired(ExecutionFeedSchema, feed).length || !Array.isArray(feed?.networks)) {
    errors.push("feed: failed ExecutionFeedSchema");
    return { networks: [], errors };
  }

  const networks = [];
  for (const net of feed.networks) {
    if (missingRequired(FeedNetworkSchema, net).length || !Array.isArray(net.signals)) {
      errors.push(`network: failed FeedNetworkSchema (${net?.networkId || "unknown"})`);
      continue;
    }
    const signals = [];
    for (const s of net.signals) {
      if (missingRequired(SignalLikeSchema, s).length) {
        errors.push(`signal: failed SignalLikeSchema (${net.networkId})`);
        continue;
      }
      signals.push(s);
    }
    networks.push({ network: net.network, networkId: net.networkId, status: net.status, signals });
  }
  return { networks, errors };
}

// ---------------------------------------------------------------------------
// STAGE B — grammar runtime processing (no formatting)
// ---------------------------------------------------------------------------

function assignCategory(signal, grammarVersion) {
  const direct = typeof signal.type === "string" ? signal.type.toUpperCase() : "";
  if (CategoryEnum.includes(direct)) return direct;
  const v1 = typeof signal.type === "string" ? signal.type.toLowerCase() : null;
  const cat = classifyByGrammarVersion(signal, v1, grammarVersion);
  return cat && cat !== "UNMAPPED" ? cat : "UNMAPPED";
}

function processSignals(networks, grammarVersion) {
  const processed = [];
  for (const net of networks) {
    for (const signal of net.signals) {
      const suppression = renderSuppression(signal);
      const category = assignCategory(signal, grammarVersion);
      const structure = classifyStructure(signal, suppression.suppressed);
      const delta = renderDelta(signal);
      const stability = renderStability(signal);
      processed.push({
        network: net.network,
        networkId: net.networkId,
        category,
        severity: signal.severity,
        structure,
        suppressed: suppression.suppressed,
        suppressionReason: suppression.reason,
        deltaPhrase: delta,
        stabilityPhrase: stability === delta ? null : stability,
        metric: signal.metric || signal.metricKey || signal.anomalyType || "signal",
        value: typeof signal.value === "number" ? signal.value : null,
        previous: typeof signal.previous === "number" ? signal.previous : null,
        delta: typeof signal.delta === "number" ? signal.delta : 0,
      });
    }
  }
  return processed;
}

function processPatterns(visible, grammar) {
  const patterns = [];
  for (const category of CATEGORY_ORDER) {
    const items = visible.filter((p) => p.category === category);
    if (!items.length) continue;
    const networks = [...new Set(items.map((p) => p.network))].sort();
    const scope = getScope(category, visible);
    const topStructure = items
      .map((p) => p.structure)
      .sort((a, b) => STRUCTURE_RANK[b] - STRUCTURE_RANK[a])[0];
    patterns.push({
      category,
      scope,
      structure: topStructure,
      networks,
      classificationText: grammar.classificationRules[topStructure] || grammar.classificationRules.flat,
      signalLines: items
        .slice()
        .sort(sortBySeverityThenName)
        .map((p) => `${p.network}: ${p.stabilityPhrase || p.deltaPhrase}`),
    });
  }
  return patterns;
}

// ---------------------------------------------------------------------------
// Deterministic comparators (fixed ordering, no randomness/time)
// ---------------------------------------------------------------------------

function sortBySeverityThenName(a, b) {
  const sev = (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0);
  if (sev !== 0) return sev;
  const net = a.network.localeCompare(b.network);
  if (net !== 0) return net;
  return String(a.metric).localeCompare(String(b.metric));
}

// ---------------------------------------------------------------------------
// STAGE C — deterministic rendering (no classification)
// ---------------------------------------------------------------------------

function renderTodaysRead(visible, grammar) {
  const limit = getBulletLimits("todaysRead", grammar);
  const ordered = visible.slice().sort(sortBySeverityThenName).slice(0, limit);
  const lines = ["## Today's Read", ""];
  if (!ordered.length) lines.push("- No visible signals after suppression.");
  else for (const p of ordered) {
    const phrase = p.stabilityPhrase ? `${p.deltaPhrase}; ${p.stabilityPhrase}` : p.deltaPhrase;
    lines.push(`- ${p.network}: ${phrase}.`);
  }
  return lines;
}

function renderWhyItMatters(visible, grammar) {
  const limit = getBulletLimits("whyItMatters", grammar);
  const lines = ["## Why It Matters", ""];
  const seen = [];
  for (const category of CATEGORY_ORDER) {
    const items = visible.filter((p) => p.category === category);
    if (!items.length) continue;
    const structure = items
      .map((p) => p.structure)
      .sort((a, b) => STRUCTURE_RANK[b] - STRUCTURE_RANK[a])[0];
    const trigger = grammar.taxonomyTriggers[category] || category.toLowerCase();
    seen.push(`- ${trigger}: ${grammar.classificationRules[structure] || grammar.classificationRules.flat}.`);
  }
  if (!seen.length) lines.push("- No structural signals to classify.");
  else lines.push(...seen.slice(0, limit));
  return lines;
}

function renderNetworkWatch(visible, grammar) {
  const limit = getBulletLimits("networkWatch", grammar);
  const lines = ["## Network Watch", ""];
  const networks = [...new Set(visible.map((p) => p.network))].sort((a, b) => a.localeCompare(b));
  if (!networks.length) {
    lines.push("_No networks with visible signals._");
    return lines;
  }
  for (const network of networks) {
    const items = visible
      .filter((p) => p.network === network)
      .sort(sortBySeverityThenName)
      .slice(0, limit);
    lines.push(`### ${network}`);
    for (const p of items) {
      const phrase = p.stabilityPhrase ? `${p.deltaPhrase}; ${p.stabilityPhrase}` : p.deltaPhrase;
      lines.push(`- [${p.category}] ${phrase}.`);
    }
    lines.push("");
  }
  return lines;
}

function renderCrossNetworkPatterns(patterns) {
  const lines = ["## Cross-Network Patterns", ""];
  // localized hidden; systemic first, then cross-network.
  const shown = patterns
    .filter((p) => p.scope !== "localized")
    .sort((a, b) => SCOPE_RANK[b.scope] - SCOPE_RANK[a.scope] || a.category.localeCompare(b.category));
  if (!shown.length) {
    lines.push("_No cross-network or systemic patterns this run._");
    return lines;
  }
  for (const p of shown) {
    lines.push(`### ${p.category} (${p.scope})`);
    lines.push(`- classification: ${p.classificationText}`);
    lines.push(`- networks: ${p.networks.join(", ")}`);
    for (const s of p.signalLines) lines.push(`- ${s}`);
    lines.push("");
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Execute the deterministic 3-stage signal-to-report pipeline.
 *
 * @param {object} feed - normalized signal feed (ExecutionFeedSchema shape)
 * @param {object} [options]
 * @param {string} [options.grammarVersion] - "v2" | "v3" (defaults via env)
 * @returns {{ markdown: string, grammarVersion: string, stats: object }}
 */
export function runSignalExecution(feed, options = {}) {
  const grammarVersion = resolveGrammarVersion(options.grammarVersion);
  const grammar = getGrammar(grammarVersion);

  // STAGE A
  const { networks } = validateAndNormalize(feed);

  // STAGE B
  const processed = processSignals(networks, grammarVersion);
  const visible = processed.filter((p) => !p.suppressed);
  const patterns = processPatterns(visible, grammar);

  // STAGE C
  const md = [
    `# Kinetik Signal Report (grammar ${grammarVersion})`,
    "",
    ...renderTodaysRead(visible, grammar),
    "",
    ...renderWhyItMatters(visible, grammar),
    "",
    ...renderNetworkWatch(visible, grammar),
    ...renderCrossNetworkPatterns(patterns),
  ].join("\n");

  const categoryBreakdown = {};
  for (const p of visible) categoryBreakdown[p.category] = (categoryBreakdown[p.category] || 0) + 1;

  return {
    markdown: md,
    grammarVersion,
    stats: {
      signalCount: processed.length,
      suppressedCount: processed.length - visible.length,
      categoryBreakdown,
    },
  };
}
