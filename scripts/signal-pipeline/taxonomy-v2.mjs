// Taxonomy v2 compatibility layer (dual-run, NOT a replacement).
//
// The pipeline's legacy 4-bucket taxonomy (integrity / health / growth /
// economics) remains the default and the source of truth for downstream
// consumers (e.g. docs/reports/weekly/latest.md, /api/signals/latest.json).
// This module only *maps* legacy keys onto Taxonomy v2 categories so v2 can be
// rendered opt-in via USE_V2_TAXONOMY=true. No legacy logic is removed here.

export const V2_CATEGORIES = [
  "CAPACITY",
  "IDENTITY",
  "CONSISTENCY",
  "ECONOMICS",
  "BEHAVIORAL",
  "INFRASTRUCTURE",
];

export const V2_LABELS = {
  CAPACITY: "Capacity",
  IDENTITY: "Identity & registry",
  CONSISTENCY: "Telemetry consistency",
  ECONOMICS: "Token economics",
  BEHAVIORAL: "Behavioral activity",
  INFRASTRUCTURE: "Infrastructure footprint",
};

// Prefix rules from the migration spec (legacy family → v2).
const V2_PREFIX = [
  ["capacity", "CAPACITY"],
  ["identity", "IDENTITY"],
  ["consistency", "CONSISTENCY"],
  ["economic", "ECONOMICS"],
  ["behavioral", "BEHAVIORAL"],
  ["infrastructure", "INFRASTRUCTURE"],
];

// Concrete legacy keys present in this repo: 4-bucket sector types plus the
// anomaly primitives that feed them. Exact matches win over prefix rules.
const V2_EXACT = {
  // 4-bucket sector types (signal.type)
  integrity: "IDENTITY",
  health: "CAPACITY",
  growth: "INFRASTRUCTURE",
  economics: "ECONOMICS",
  // anomaly primitives (signal.anomalyType) — more precise than sector type
  duplication_cluster: "IDENTITY",
  identity_collision: "IDENTITY",
  capacity_violation: "CAPACITY",
  capacity_pressure: "CAPACITY",
  telemetry_discontinuity: "CONSISTENCY",
  inactivity_anomaly: "BEHAVIORAL",
  economic_concentration: "ECONOMICS",
};

/** Map a legacy taxonomy key (sector type or anomaly type) to a v2 category. */
export function mapLegacyToV2(key) {
  if (!key) return null;
  const k = String(key).toLowerCase();
  if (V2_EXACT[k]) return V2_EXACT[k];
  for (const [prefix, cat] of V2_PREFIX) {
    if (k.startsWith(prefix)) return cat;
  }
  return null;
}

/** True when the v2 layer is opted into for this process. */
export function v2Enabled() {
  return process.env.USE_V2_TAXONOMY === "true";
}

let _warned = false;
/** Emit the legacy-active warning exactly once per process. */
export function warnLegacyTaxonomyOnce() {
  if (_warned) return;
  _warned = true;
  console.warn("legacy taxonomy active — v2 available");
}

/**
 * Group a feed's signals across networks into v2 categories.
 * Prefers the anomaly primitive, falling back to the sector type.
 */
export function groupByV2(feed) {
  const groups = {};
  for (const net of feed.networks || []) {
    for (const s of net.signals || []) {
      const cat = mapLegacyToV2(s.anomalyType) || mapLegacyToV2(s.type);
      if (!cat) continue;
      if (!groups[cat]) {
        groups[cat] = { category: cat, label: V2_LABELS[cat], networks: new Set(), signals: [] };
      }
      groups[cat].networks.add(net.network);
      groups[cat].signals.push({ ...s, network: net.network });
    }
  }
  return V2_CATEGORIES.filter((c) => groups[c]).map((c) => ({
    category: groups[c].category,
    label: groups[c].label,
    networks: [...groups[c].networks],
    signals: groups[c].signals,
  }));
}
