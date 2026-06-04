// Frozen grammar definition (labels + limits only).
// Pure constants: no rendering, classification, or pipeline logic lives here.
// Stage C reads these tables; it never infers labels on its own.

export const GRAMMAR_V2 = Object.freeze({
  version: "v2",

  // Section bullet caps (deterministic limits, no inference).
  bulletLimits: Object.freeze({
    todaysRead: 5,
    whyItMatters: 4,
    networkWatch: 6,
  }),

  // Category -> human label used ONLY for "Why It Matters" headings.
  taxonomyTriggers: Object.freeze({
    CAPACITY: "capacity pressure",
    IDENTITY: "registry identity",
    CONSISTENCY: "telemetry consistency",
    ECONOMICS: "token economics",
    BEHAVIORAL: "behavioral activity",
    INFRASTRUCTURE: "infrastructure footprint",
  }),

  // Structure -> classification text used ONLY for pattern classification.
  classificationRules: Object.freeze({
    flat: "stable",
    incremental: "incremental drift",
    structural: "structural shift",
  }),
});

// v3 is a deterministic extension that MUST preserve v2 structure guarantees.
// It currently aliases v2 labels/limits so structure output is identical.
export const GRAMMAR_V3 = Object.freeze({
  ...GRAMMAR_V2,
  version: "v3",
});

const GRAMMAR_REGISTRY = Object.freeze({
  v2: GRAMMAR_V2,
  v3: GRAMMAR_V3,
});

/** Resolve the frozen grammar table for a resolved version string. */
export function getGrammar(version) {
  return GRAMMAR_REGISTRY[version] || GRAMMAR_V2;
}

/** Deterministic per-section bullet cap. */
export function getBulletLimits(section, grammar = GRAMMAR_V2) {
  const limit = grammar?.bulletLimits?.[section];
  return typeof limit === "number" ? limit : Infinity;
}
