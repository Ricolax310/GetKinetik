// ============================================================================
// @getkinetik/evidence-mapping — reference policy for mapping a bureau
// attestation to a reward tier.
// ----------------------------------------------------------------------------
// Read this twice: this package is NOT THE BUREAU. The bureau ships signed
// evidence (a SignedAttestation from @getkinetik/verify) about a sovereign
// node. Mapping that evidence to a reward tier — "Should I pay this node
// the premium rate? Should I throttle them? Should I block them?" — is the
// PARTNER NETWORK'S decision, not the bureau's.
//
// This package exists so partners don't have to start from a blank file.
// It is a REFERENCE policy: the same math GETKINETIK runs on its own
// dashboard, exposed as a pure function partners can call, copy, or fork.
// If a partner runs this function against an attestation and disagrees
// with the result, they're encouraged to ship their own policy. That's
// the whole point.
//
// CONTRACT:
//   · Pure function. No clocks, no network, no state.
//   · Zero runtime dependencies. No noble, no expo, no react.
//   · Same input → same output. Versioned via POLICY_VERSION.
//
// USAGE:
//   import { attestationToTier, DEFAULT_POLICY } from '@getkinetik/evidence-mapping';
//   import { verifyArtifact } from '@getkinetik/verify';
//
//   const report = await verifyArtifact(rawAttestation);
//   if (!report.valid || report.kind !== 'attestation') return 'reject';
//
//   const result = attestationToTier(report.payload, DEFAULT_POLICY);
//   // result.tier === 'PREMIER' | 'STRONG' | 'STANDING' | 'NEW' | 'TAMPERED'
//   // result.score in [0, 1000]
//   // result.contributingFactors — breakdown for audit
// ============================================================================

// ----------------------------------------------------------------------------
// Structural input type. We don't import from @getkinetik/verify so partners
// can use this package standalone — every field below corresponds 1:1 to the
// AttestationPayload schema, but we type it structurally to avoid coupling.
// Field order matches kinetik-core/src/attestation.ts; if the schema ever
// gains a new top-level block, mirror it here.
// ----------------------------------------------------------------------------
export type AttestationLike = {
  v: number;
  kind: string;
  attribution: string;
  pubkey: string;
  bureauTs: number;
  subject: {
    chainTip: string | null;
    mintedAt: number;
    nodeId: string;
    pubkey: string;
  };
  bureauObserved: {
    firstSeenMs: number;
    lastSeenMs: number;
    peakLifetimeBeats: number;
  };
  chainClaim: {
    firstBeatTs: number | null;
    lifetimeBeats: number;
    schema: string;
  };
  sensorCoherence: {
    luxObserved: boolean;
    luxPlausible: boolean | null;
    motionRmsObserved: boolean;
    motionRmsPlausible: boolean | null;
    pressureHpaObserved: boolean;
    pressureHpaPlausible: boolean | null;
  };
  flags: string[];
  witnesses: Array<{ nodeId: string; pubkey: string; signature: string; ts: number }>;
};

// ----------------------------------------------------------------------------
// Reward tiers — the calibration anchors a partner can adopt as-is. A partner
// is free to define a different tier set entirely (e.g. {gold, silver, bronze});
// the score-to-tier mapping is policy-defined in EvidencePolicy.tierBands.
// ----------------------------------------------------------------------------
export type RewardTier = 'PREMIER' | 'STRONG' | 'STANDING' | 'NEW' | 'TAMPERED';

// ----------------------------------------------------------------------------
// EvidencePolicy — the tunable knobs. Defaults are calibrated against the
// live methodology (v1.1) so a partner using DEFAULT_POLICY today gets
// scores byte-for-byte identical to the bureau-side scores deployed before
// this package existed. Tune carefully — bumping `tierBands.PREMIER.min`
// shifts every node previously banded PREMIER → STRONG.
// ----------------------------------------------------------------------------
export type EvidencePolicy = {
  /** Maximum heartbeats per millisecond that we believe is physically
   *  possible. Default = 1 beat / 25 seconds. Beats accruing faster than
   *  this against the bureau-observed window are considered implausible
   *  and the attestation's `beat_rate_implausible` flag is honored. */
  maxBeatRatePerMs: number;
  /** Days of bureau-observed continuous operation to award full age credit
   *  (300 points by default). A node observed by the bureau for fewer
   *  days gets a proportional fraction. */
  fullAgeCreditDays: number;
  /** Multiplier on log10(lifetimeBeats + 1) for the beats-count contribution.
   *  Default 50 means ~25k beats → 220 pts, ~250k → 270 pts, ~1M → ~300 pts. */
  beatsLogMultiplier: number;
  /** Maximum contribution from the beats-count factor. */
  beatsScoreCap: number;
  /** Maximum contribution from the age factor. */
  ageScoreCap: number;
  /** Baseline awarded for an attestation whose cryptographic gates all
   *  passed (signature verified, attribution intact, bureau key matches). */
  baseline: number;
  /** Sensor coherence baseline awarded when the sensors block is present
   *  at all. Each plausible per-field reading adds `sensorPerFieldPoints`. */
  sensorBaseline: number;
  /** Points awarded per plausible per-field sensor reading. */
  sensorPerFieldPoints: number;
  /** Score is floored at this value when any flag is present. The live
   *  methodology v1.1 floors flagged nodes to <200 ("TAMPERED" band). */
  flaggedScoreCeiling: number;
  /** Reward tier bands. min is inclusive, max is exclusive. */
  tierBands: {
    PREMIER: { min: number };
    STRONG: { min: number };
    STANDING: { min: number };
    NEW: { min: number };
  };
};

// ----------------------------------------------------------------------------
// DEFAULT_POLICY — mirror of the live methodology v1.1 numbers. Update this
// in lockstep with docs/methodology/GENESIS_SCORE.md and rev POLICY_VERSION.
// ----------------------------------------------------------------------------
export const DEFAULT_POLICY: EvidencePolicy = {
  maxBeatRatePerMs: 1 / 25_000,
  fullAgeCreditDays: 180,
  beatsLogMultiplier: 50,
  beatsScoreCap: 300,
  ageScoreCap: 300,
  baseline: 200,
  sensorBaseline: 50,
  sensorPerFieldPoints: 50,
  flaggedScoreCeiling: 199,
  tierBands: {
    PREMIER: { min: 900 },
    STRONG: { min: 750 },
    STANDING: { min: 500 },
    NEW: { min: 0 },
  },
};

/** Policy version. Bump on any change to DEFAULT_POLICY or the scoring
 *  algorithm shape. Independent from the bureau's methodology version —
 *  this is the version of the CLIENT-SIDE mapping, not the methodology
 *  the bureau used to populate the attestation's flags / bureauObserved. */
export const POLICY_VERSION = 'v2.0.0';

// ----------------------------------------------------------------------------
// EvidenceMappingResult — the structured output. Partners that only care
// about the tier read `result.tier`. Partners that want to audit the
// decision read `result.contributingFactors`.
// ----------------------------------------------------------------------------
export type EvidenceMappingResult = {
  /** Reward tier — the partner-facing answer. */
  tier: RewardTier;
  /** Score in [0, 1000]. Sortable; tier is derived from it. */
  score: number;
  /** True if any flag was present in the attestation. When true, tier is
   *  forced to TAMPERED regardless of score (score is also floored). */
  flagged: boolean;
  /** Audit breakdown — each contributing factor and how many points it
   *  contributed. Sum equals `score` (before the flag floor is applied). */
  contributingFactors: {
    /** Baseline awarded for a valid attestation. */
    baseline: number;
    /** Bureau-observed age contribution (capped at ageScoreCap). */
    bureauObservedAge: number;
    /** Heartbeat count contribution (capped at beatsScoreCap). */
    lifetimeBeats: number;
    /** Sensor coherence contribution (baseline + per-field plausibility). */
    sensorCoherence: number;
  };
  /** The flags array from the attestation, passed through verbatim so
   *  partner code can inspect which specific tamper signal was raised. */
  flags: string[];
  /** Policy version that produced this result. Pin this when caching. */
  policyVersion: string;
};

// ----------------------------------------------------------------------------
// attestationToTier — pure function. Same input always returns same output.
// ----------------------------------------------------------------------------
// Algorithm mirrors the live methodology v1.1, with one structural change:
// the input is a SIGNED ATTESTATION the bureau already vouched for, not raw
// proof fields. Bureau-bounded age and chain-rewind detection happened
// server-side when the attestation was minted; this function reads the
// resulting `bureauObserved` block directly. That means a partner using
// this package never has to call any bureau endpoint to re-derive a score —
// the signed attestation is sufficient input.
// ----------------------------------------------------------------------------
export function attestationToTier(
  attestation: AttestationLike,
  policy: EvidencePolicy = DEFAULT_POLICY,
): EvidenceMappingResult {
  let score = policy.baseline;
  const flags = Array.isArray(attestation.flags) ? attestation.flags : [];
  const flagged = flags.length > 0;

  // Bureau-observed age — uses bureau clock, not node-claimed firstBeatTs.
  // The bureau has already done the bounding (firstSeenMs is the later of
  // claimed firstBeatTs and the bureau's first observation), so we trust it.
  const observedWindowMs = Math.max(
    0,
    attestation.bureauObserved.lastSeenMs - attestation.bureauObserved.firstSeenMs,
  );
  const ageDays = observedWindowMs / 86_400_000;
  const bureauObservedAge = Math.min(
    policy.ageScoreCap,
    Math.max(0, Math.round((ageDays / policy.fullAgeCreditDays) * policy.ageScoreCap)),
  );
  score += bureauObservedAge;

  // Lifetime beats — log-scale. The bureau already rate-checked this server
  // side (and would have raised `beat_rate_implausible` if the rate was
  // physically impossible), so we trust the count when no such flag is set.
  // If the flag IS present, the per-flag floor below will dominate.
  const claimedBeats =
    typeof attestation.chainClaim.lifetimeBeats === 'number' &&
    attestation.chainClaim.lifetimeBeats >= 0
      ? attestation.chainClaim.lifetimeBeats
      : 0;
  const lifetimeBeats =
    claimedBeats > 0
      ? Math.min(
          policy.beatsScoreCap,
          Math.round(Math.log10(claimedBeats + 1) * policy.beatsLogMultiplier),
        )
      : 0;
  score += lifetimeBeats;

  // Sensor coherence — baseline + per-field bonus only when the field was
  // observed AND plausible. An unobserved field contributes 0 (not a penalty);
  // an observed-but-implausible field also contributes 0 AND triggers a
  // bureau-side flag (which the floor below will handle).
  const sc = attestation.sensorCoherence;
  let sensorCoherence = 0;
  if (sc) {
    // Only award the sensor baseline if at least one sensor was observed.
    // A device with no sensors at all shouldn't get free points just for
    // having the block present.
    const anyObserved =
      sc.luxObserved || sc.motionRmsObserved || sc.pressureHpaObserved;
    if (anyObserved) sensorCoherence += policy.sensorBaseline;

    if (sc.luxObserved && sc.luxPlausible === true) {
      sensorCoherence += policy.sensorPerFieldPoints;
    }
    if (sc.motionRmsObserved && sc.motionRmsPlausible === true) {
      sensorCoherence += policy.sensorPerFieldPoints;
    }
    if (sc.pressureHpaObserved && sc.pressureHpaPlausible === true) {
      sensorCoherence += policy.sensorPerFieldPoints;
    }
  }
  score += sensorCoherence;

  // Hard ceiling — clamp to [0, 1000] before applying the flagged floor so
  // the flagged floor (199 by default) is honored even for a node that
  // would otherwise have scored 900.
  score = Math.max(0, Math.min(1000, score));

  // Flag floor — any tamper flag forces the score into the TAMPERED band.
  if (flagged) {
    score = Math.min(score, policy.flaggedScoreCeiling);
  }

  // Tier mapping.
  const tier: RewardTier = flagged
    ? 'TAMPERED'
    : score >= policy.tierBands.PREMIER.min
      ? 'PREMIER'
      : score >= policy.tierBands.STRONG.min
        ? 'STRONG'
        : score >= policy.tierBands.STANDING.min
          ? 'STANDING'
          : 'NEW';

  return {
    tier,
    score,
    flagged,
    contributingFactors: {
      baseline: policy.baseline,
      bureauObservedAge,
      lifetimeBeats,
      sensorCoherence,
    },
    flags: flags.slice(),
    policyVersion: POLICY_VERSION,
  };
}
