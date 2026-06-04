// Agent B — Runtime / Pipeline Operator
// Responsibilities:
// - signal ingestion
// - taxonomy-v2 mapping
// - grammar runtime execution (resolveGrammarVersion)
// - suppression decisions
// - structural classification
// Output: structured signal objects only (no formatting/report writing/schema edits)

import { buildNormalizedNetworks } from "./signals.mjs";
import { resolveGrammarVersion, classifyByGrammarVersion } from "./grammar-runtime.mjs";
import { mapLegacyToV2 } from "./taxonomy-v2.mjs";
import resolveGrammar from "../../signal-engine/grammar/grammar.resolve.ts";

function asFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function deriveDelta(signal) {
  const direct = asFiniteNumber(signal?.delta);
  if (direct != null) return direct;
  const current = asFiniteNumber(signal?.value ?? signal?.current);
  const previous = asFiniteNumber(signal?.previous);
  if (current == null || previous == null) return 0;
  return current - previous;
}

function deriveV1Category(signal) {
  return String(signal?.type || "unclassified").toLowerCase();
}

function mapToV2Category(signal, grammarVersion) {
  const v1 = deriveV1Category(signal);
  const directV2 = mapLegacyToV2(signal?.anomalyType) || mapLegacyToV2(v1) || null;
  const fromGrammar = classifyByGrammarVersion(signal, v1, grammarVersion);
  const category = fromGrammar && fromGrammar !== "UNMAPPED" ? fromGrammar : directV2 || "UNMAPPED";
  return {
    v1,
    category,
    fallback: !fromGrammar || fromGrammar === "UNMAPPED",
  };
}

function evaluateSignalWithGrammar(signal, grammarEngine) {
  const delta = deriveDelta(signal);
  const current = asFiniteNumber(signal?.value ?? signal?.current);
  const previous = asFiniteNumber(signal?.previous);

  const suppressed = grammarEngine.renderSuppression({
    metric: signal?.metric || signal?.metricKey || signal?.anomalyType || "",
    metricKey: signal?.metricKey || signal?.metric || "",
    delta,
    current,
    previous,
    severity: signal?.severity,
    network: signal?.network,
  });

  const structure = grammarEngine.classifyStructure({
    allFlat: delta === 0,
    hasStructural: signal?.severity === "high" && delta !== 0,
  });

  return {
    delta,
    suppression: {
      suppressed,
      source: "grammar.renderSuppression",
    },
    structure: {
      classification: structure,
      source: "grammar.classifyStructure",
    },
  };
}

function computeScopeByCategory(rows, grammarEngine) {
  const byCategory = new Map();
  for (const row of rows) {
    if (row.category === "UNMAPPED" || row.suppression.suppressed) continue;
    if (!byCategory.has(row.category)) byCategory.set(row.category, new Set());
    byCategory.get(row.category).add(row.network);
  }

  const out = new Map();
  for (const [category, networkSet] of byCategory.entries()) {
    const networks = [...networkSet];
    const scope = grammarEngine.getScope({
      networks,
      historyDays: 0,
      historyLen: 0,
    });
    out.set(category, {
      scope,
      networks,
      source: "grammar.getScope",
    });
  }
  return out;
}

function ingestFeed(feed) {
  if (feed && Array.isArray(feed.networks)) return feed;
  return {
    generatedAt: new Date().toISOString(),
    cadence: "runtime",
    networks: buildNormalizedNetworks(),
  };
}

export function runRuntimePipeline(feedInput, options = {}) {
  const feed = ingestFeed(feedInput);
  const grammarVersion = resolveGrammarVersion(options.grammarVersion);
  const grammarEngine = resolveGrammar(grammarVersion);

  const rows = [];
  for (const net of feed.networks || []) {
    for (const signal of net.signals || []) {
      const mapping = mapToV2Category(signal, grammarVersion);
      const evaluated = evaluateSignalWithGrammar(signal, grammarEngine);
      rows.push({
        network: signal?.network || net.network || net.networkId || "unknown",
        networkId: net.networkId || "unknown",
        status: net.status || "active",
        signal: {
          type: signal?.type || null,
          metric: signal?.metric || signal?.metricKey || null,
          value: asFiniteNumber(signal?.value ?? signal?.current),
          previous: asFiniteNumber(signal?.previous),
          delta: evaluated.delta,
          severity: signal?.severity || null,
          confidence: asFiniteNumber(signal?.confidence),
          anomalyType: signal?.anomalyType || null,
          kind: signal?.kind || null,
          timestamp: signal?.timestamp || signal?.asOf || null,
        },
        taxonomy: {
          v1: mapping.v1,
          v2: mapping.category,
          fallback: mapping.fallback,
          source: "taxonomy-v2",
        },
        suppression: evaluated.suppression,
        structure: evaluated.structure,
      });
    }
  }

  const scopeByCategory = computeScopeByCategory(rows, grammarEngine);
  for (const row of rows) {
    row.scope = scopeByCategory.get(row.taxonomy.v2) || {
      scope: "localized",
      networks: [row.network],
      source: "grammar.getScope",
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    grammarVersion,
    grammarEngineVersion: grammarEngine.version,
    sourceGeneratedAt: feed.generatedAt || null,
    cadence: feed.cadence || null,
    signals: rows,
  };
}

export default runRuntimePipeline;
