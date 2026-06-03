// Step 2 + 3: standardized signal detection → unified normalized format.
//
// Unified per-signal shape (cross-network contract):
//   { network, type, message, severity, confidence }
// type: integrity | health | growth | economics
// severity: low | medium | high
// confidence: 0..1
//
// Detection reuses reproducible public reads already collected by the audit
// layer (coverage anomalies, duplicate/integrity, capacity pressure, reward
// concentration, metric drift). No verdicts — evidence only.

import fs from "node:fs";
import path from "node:path";
import { collectPublicSignals } from "../command-center/signal-publication.mjs";
import { PIPELINE_NETWORKS, SIGNAL_TYPE_BY_ANOMALY, REPO_ROOT } from "./config.mjs";

// Canonical numeric anchor for headline-only findings, so every signal in the
// feed carries a value/delta the distribution engine can normalize.
const CANONICAL_METRIC = {
  duplication_cluster: "exactDupGroups",
  identity_collision: "identityCollisions",
  capacity_violation: "overCapacityCells",
  telemetry_discontinuity: "kmFrozenDays",
  economic_concentration: "top20ShareOfSupply",
};

let _statsCache = null;
function statsByNetwork() {
  if (_statsCache) return _statsCache;
  _statsCache = {};
  try {
    const reg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "scripts/bureau/networks.json"), "utf8"));
    for (const n of reg.networks || []) {
      if (!n.snapshot) continue;
      const p = path.join(REPO_ROOT, n.snapshot);
      if (!fs.existsSync(p)) continue;
      try {
        const snap = JSON.parse(fs.readFileSync(p, "utf8"));
        _statsCache[n.id] = { stats: snap.stats || null, prevStats: snap.prevStats || null };
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  return _statsCache;
}

function fmtVal(key, v) {
  if (typeof v !== "number" || !isFinite(v)) return "—";
  if (key && (key.includes("Share") || key.includes("Pct"))) return `${(v * 100).toFixed(2)}%`;
  return v.toLocaleString();
}

function pctMagnitude(deltaText) {
  const m = deltaText && deltaText.match(/\(([+-]?\d+(?:\.\d+)?)%\)/);
  return m ? Math.abs(parseFloat(m[1])) : null;
}

function signalType(rawSignal) {
  // Growth is detected, not assigned by anomaly: a rising public entity count.
  if (
    rawSignal.kind === "metric" &&
    rawSignal.metricKey === "observed" &&
    typeof rawSignal.previous === "number" &&
    rawSignal.current > rawSignal.previous
  ) {
    return "growth";
  }
  return SIGNAL_TYPE_BY_ANOMALY[rawSignal.anomalyType] || "health";
}

function severityFor(rawSignal) {
  if (rawSignal.anomalyType === "telemetry_discontinuity") return "high";
  if (rawSignal.kind === "metric") {
    const p = pctMagnitude(rawSignal.deltaText);
    if (p == null) return "low";
    if (p >= 5) return "high";
    if (p >= 1) return "medium";
    return "low";
  }
  if (rawSignal.anomalyType === "economic_concentration") return "medium";
  return "medium";
}

function confidenceFor(rawSignal) {
  if (rawSignal.kind === "metric") return rawSignal.previous != null ? 0.85 : 0.55;
  if (rawSignal.anomalyType === "economic_concentration") return 0.7;
  return 0.7;
}

function messageFor(rawSignal) {
  if (rawSignal.kind === "metric") {
    return `${rawSignal.label}: ${fmtVal(rawSignal.metricKey, rawSignal.current)} (${rawSignal.deltaText})`;
  }
  return rawSignal.deltaText;
}

function valueDeltaFor(rawSignal, networkId) {
  if (rawSignal.kind === "metric") {
    const value = typeof rawSignal.current === "number" ? rawSignal.current : null;
    const previous = typeof rawSignal.previous === "number" ? rawSignal.previous : null;
    const delta = value != null && previous != null ? value - previous : 0;
    return { metric: rawSignal.metricKey || rawSignal.anomalyType, value, previous, delta };
  }
  // Headline: anchor to the canonical metric from the snapshot.
  const key = CANONICAL_METRIC[rawSignal.anomalyType];
  const s = statsByNetwork()[networkId];
  const value = key && typeof s?.stats?.[key] === "number" ? s.stats[key] : null;
  const previous = key && typeof s?.prevStats?.[key] === "number" ? s.prevStats[key] : null;
  const delta = value != null && previous != null ? value - previous : 0;
  return { metric: key || rawSignal.anomalyType, value, previous, delta };
}

function normalizeSignal(rawSignal, networkId) {
  const vd = valueDeltaFor(rawSignal, networkId);
  return {
    network: rawSignal.network,
    type: signalType(rawSignal),
    metric: vd.metric,
    value: vd.value,
    previous: vd.previous,
    delta: vd.delta,
    message: messageFor(rawSignal),
    severity: severityFor(rawSignal),
    confidence: confidenceFor(rawSignal),
    anomalyType: rawSignal.anomalyType,
    kind: rawSignal.kind,
    metricKey: rawSignal.metricKey || null,
    timestamp: rawSignal.asOf || null,
    asOf: rawSignal.asOf || null,
  };
}

/**
 * Build normalized per-network signal sets across the full pipeline registry.
 * Networks with no current public finding are returned with status "pending"
 * so the cross-network view always covers the whole sector.
 */
export function buildNormalizedNetworks() {
  const { networks } = collectPublicSignals();
  const out = [];
  const seen = new Set();

  for (const meta of PIPELINE_NETWORKS) {
    seen.add(meta.id);
    const block = networks[meta.id];
    if (!block?.signals?.length) {
      out.push({
        network: meta.name,
        networkId: meta.id,
        status: "pending",
        note:
          meta.id === "dimo"
            ? "No public scanner wired yet — included for cross-network coverage."
            : "No qualifying public finding in latest snapshot.",
        signals: [],
      });
      continue;
    }
    const signals = block.signals.map((s) => normalizeSignal(s, meta.id));
    out.push({
      network: block.network,
      networkId: meta.id,
      status: "active",
      signals,
    });
  }

  // Any audited network not in the fixed registry still gets represented,
  // appended after the canonical order (never promoted above it).
  for (const id of Object.keys(networks)) {
    if (seen.has(id)) continue;
    const block = networks[id];
    if (!block?.signals?.length) continue;
    out.push({
      network: block.network,
      networkId: id,
      status: "active",
      signals: block.signals.map((s) => normalizeSignal(s, id)),
    });
  }

  return out;
}
