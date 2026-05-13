// ============================================================================
// @getkinetik/evidence-mapping — package smoketest.
// ----------------------------------------------------------------------------
// Pure-function tests: same input always returns same output. No crypto, no
// network. The math here MUST stay byte-for-byte aligned with the `derived`
// block produced by functions/api/verify-device.js. If you change one,
// change both in the same commit.
//
// Run AFTER `npm run build`. Imports from ./dist on purpose.
//
// Exit code 0 = all pass. Anything else = bug.
// ============================================================================

import {
  DEFAULT_POLICY,
  POLICY_VERSION,
  attestationToTier,
} from "./dist/index.js";

let passed = 0;
let failed = 0;

const assert = (cond, label) => {
  if (cond) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}`);
  }
};

console.log(
  `@getkinetik/evidence-mapping smoketest — policy version ${POLICY_VERSION}\n`,
);

// Helper: build a baseline attestation with sensible defaults. Each test
// overrides the fields it cares about.
function buildAttestation(overrides = {}) {
  const now = Date.now();
  return {
    v: 1,
    kind: "attestation",
    attribution: "GETKINETIK by OutFromNothing LLC",
    pubkey: "00".repeat(32),
    bureauTs: now,
    subject: {
      chainTip: null,
      mintedAt: now,
      nodeId: "KINETIK-NODE-DEADBEEF",
      pubkey: "11".repeat(32),
    },
    bureauObserved: {
      firstSeenMs: now,
      lastSeenMs: now,
      peakLifetimeBeats: 0,
    },
    chainClaim: {
      firstBeatTs: null,
      lifetimeBeats: 0,
      schema: "proof-of-origin:v2",
    },
    sensorCoherence: {
      luxObserved: false,
      luxPlausible: null,
      motionRmsObserved: false,
      motionRmsPlausible: null,
      pressureHpaObserved: false,
      pressureHpaPlausible: null,
    },
    flags: [],
    witnesses: [],
    ...overrides,
  };
}

// ---- [1] brand-new node — baseline only ------------------------------------
console.log("[1] brand-new node (no chain, no sensors, no flags)");
{
  const att = buildAttestation();
  const r = attestationToTier(att);
  assert(r.score === DEFAULT_POLICY.baseline, "score = baseline (200)");
  assert(r.tier === "NEW", "tier is NEW");
  assert(r.flagged === false, "not flagged");
  assert(r.contributingFactors.baseline === 200, "baseline factor = 200");
  assert(r.contributingFactors.bureauObservedAge === 0, "no observed age");
  assert(r.contributingFactors.lifetimeBeats === 0, "no beats");
  assert(r.contributingFactors.sensorCoherence === 0, "no sensors");
  assert(r.policyVersion === POLICY_VERSION, "policy version pinned");
}

// ---- [2] long-running, fully sensor-coherent node — should hit STRONG ------
console.log("\n[2] long-running, fully sensor-coherent");
{
  const now = Date.now();
  const att = buildAttestation({
    bureauObserved: {
      firstSeenMs: now - 180 * 86_400_000,
      lastSeenMs: now,
      peakLifetimeBeats: 250_000,
    },
    chainClaim: {
      firstBeatTs: now - 180 * 86_400_000,
      lifetimeBeats: 250_000,
      schema: "proof-of-origin:v2",
    },
    sensorCoherence: {
      luxObserved: true,
      luxPlausible: true,
      motionRmsObserved: true,
      motionRmsPlausible: true,
      pressureHpaObserved: true,
      pressureHpaPlausible: true,
    },
  });
  const r = attestationToTier(att);
  // baseline 200 + age 300 (full credit) + beats ~270 + sensors 200 = ~970
  // Capped at 1000, well above PREMIER threshold (900).
  assert(r.score >= 900, `score >= 900 (got ${r.score})`);
  assert(r.tier === "PREMIER", `tier is PREMIER (got ${r.tier})`);
  assert(r.flagged === false, "not flagged");
  assert(
    r.contributingFactors.bureauObservedAge === DEFAULT_POLICY.ageScoreCap,
    "age contribution at cap",
  );
}

// ---- [3] flagged node — chain_rewind floors to TAMPERED --------------------
console.log("\n[3] flagged node (chain_rewind)");
{
  const now = Date.now();
  const att = buildAttestation({
    bureauObserved: {
      firstSeenMs: now - 365 * 86_400_000,
      lastSeenMs: now,
      peakLifetimeBeats: 500_000,
    },
    chainClaim: {
      firstBeatTs: now - 365 * 86_400_000,
      lifetimeBeats: 500_000,
      schema: "proof-of-origin:v2",
    },
    sensorCoherence: {
      luxObserved: true,
      luxPlausible: true,
      motionRmsObserved: true,
      motionRmsPlausible: true,
      pressureHpaObserved: true,
      pressureHpaPlausible: true,
    },
    flags: ["chain_rewind"],
  });
  const r = attestationToTier(att);
  // Even though the underlying score would be PREMIER, the flag forces
  // TAMPERED and floors the score to <= 199.
  assert(r.flagged === true, "flagged");
  assert(r.tier === "TAMPERED", "tier is TAMPERED");
  assert(
    r.score <= DEFAULT_POLICY.flaggedScoreCeiling,
    `score <= ${DEFAULT_POLICY.flaggedScoreCeiling} (got ${r.score})`,
  );
  assert(r.flags.includes("chain_rewind"), "chain_rewind in flags");
}

// ---- [4] sensor observed but implausible — floor still applies -------------
console.log("\n[4] sensor implausible (lux out of range)");
{
  const att = buildAttestation({
    bureauObserved: {
      firstSeenMs: Date.now() - 30 * 86_400_000,
      lastSeenMs: Date.now(),
      peakLifetimeBeats: 100_000,
    },
    chainClaim: {
      firstBeatTs: Date.now() - 30 * 86_400_000,
      lifetimeBeats: 100_000,
      schema: "proof-of-origin:v2",
    },
    sensorCoherence: {
      luxObserved: true,
      luxPlausible: false,
      motionRmsObserved: true,
      motionRmsPlausible: true,
      pressureHpaObserved: true,
      pressureHpaPlausible: true,
    },
    flags: ["lux_implausible"],
  });
  const r = attestationToTier(att);
  assert(r.flagged === true, "flagged");
  assert(r.tier === "TAMPERED", "tier is TAMPERED");
  // lux observed-but-implausible adds 0 to sensorCoherence (only plausible
  // fields contribute). The baseline sensor bonus still fires because at
  // least one sensor was observed.
  assert(
    r.contributingFactors.sensorCoherence ===
      DEFAULT_POLICY.sensorBaseline + 2 * DEFAULT_POLICY.sensorPerFieldPoints,
    "sensor coherence = baseline + 2 plausible fields",
  );
}

// ---- [5] pure-function determinism -----------------------------------------
console.log("\n[5] determinism (same input → same output)");
{
  const att = buildAttestation({
    bureauObserved: {
      firstSeenMs: 1_700_000_000_000,
      lastSeenMs: 1_710_000_000_000,
      peakLifetimeBeats: 42_000,
    },
    chainClaim: {
      firstBeatTs: 1_700_000_000_000,
      lifetimeBeats: 42_000,
      schema: "proof-of-origin:v2",
    },
    sensorCoherence: {
      luxObserved: true,
      luxPlausible: true,
      motionRmsObserved: false,
      motionRmsPlausible: null,
      pressureHpaObserved: false,
      pressureHpaPlausible: null,
    },
  });
  const r1 = attestationToTier(att);
  const r2 = attestationToTier(att);
  assert(r1.score === r2.score, "score is deterministic");
  assert(r1.tier === r2.tier, "tier is deterministic");
  assert(
    JSON.stringify(r1.contributingFactors) ===
      JSON.stringify(r2.contributingFactors),
    "contributingFactors deterministic",
  );
}

// ---- [6] custom policy — stricter PREMIER threshold ------------------------
console.log("\n[6] custom policy (strict PREMIER threshold)");
{
  const now = Date.now();
  const att = buildAttestation({
    bureauObserved: {
      firstSeenMs: now - 180 * 86_400_000,
      lastSeenMs: now,
      peakLifetimeBeats: 250_000,
    },
    chainClaim: {
      firstBeatTs: now - 180 * 86_400_000,
      lifetimeBeats: 250_000,
      schema: "proof-of-origin:v2",
    },
    sensorCoherence: {
      luxObserved: true,
      luxPlausible: true,
      motionRmsObserved: true,
      motionRmsPlausible: true,
      pressureHpaObserved: true,
      pressureHpaPlausible: true,
    },
  });
  const defaultResult = attestationToTier(att);
  assert(defaultResult.tier === "PREMIER", "default policy → PREMIER");

  const strictPolicy = {
    ...DEFAULT_POLICY,
    tierBands: {
      ...DEFAULT_POLICY.tierBands,
      PREMIER: { min: 1001 }, // unreachable
    },
  };
  const strictResult = attestationToTier(att, strictPolicy);
  assert(
    strictResult.tier === "STRONG",
    `strict policy demotes PREMIER → STRONG (got ${strictResult.tier})`,
  );
  assert(
    strictResult.score === defaultResult.score,
    "score identical under custom policy (only band threshold differs)",
  );
}

// ---- [7] contributingFactors sum equals score (before flag floor) ----------
console.log("\n[7] contributingFactors sum");
{
  const now = Date.now();
  const att = buildAttestation({
    bureauObserved: {
      firstSeenMs: now - 90 * 86_400_000,
      lastSeenMs: now,
      peakLifetimeBeats: 10_000,
    },
    chainClaim: {
      firstBeatTs: now - 90 * 86_400_000,
      lifetimeBeats: 10_000,
      schema: "proof-of-origin:v2",
    },
    sensorCoherence: {
      luxObserved: true,
      luxPlausible: true,
      motionRmsObserved: true,
      motionRmsPlausible: true,
      pressureHpaObserved: false,
      pressureHpaPlausible: null,
    },
  });
  const r = attestationToTier(att);
  const sum =
    r.contributingFactors.baseline +
    r.contributingFactors.bureauObservedAge +
    r.contributingFactors.lifetimeBeats +
    r.contributingFactors.sensorCoherence;
  // Sum equals score because no flag floor applied (this attestation is clean).
  assert(sum === r.score, `factors sum (${sum}) equals score (${r.score})`);
}

// ----------------------------------------------------------------------------
console.log("\n--------------------------------------------------------");
console.log(
  `@getkinetik/evidence-mapping  ${passed} passed  ${failed} failed`,
);
if (failed > 0) {
  console.log("SMOKETEST FAILED");
  process.exit(1);
}
console.log("SMOKETEST PASSED");
