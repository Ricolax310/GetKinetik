// ============================================================================
// Bureau Attestation — signed evidence bundle about a sovereign node.
// ----------------------------------------------------------------------------
// This is the bureau's output. It is NOT a verdict.
//
// A Genesis Bureau attestation is a snapshot of what the bureau has observed
// about a specific node — chain claims from the node itself, bureau-bounded
// temporal facts (first-seen, peak beats), sensor coherence booleans, and a
// flat array of flags raised during processing. Signed with the bureau's
// Ed25519 key so any partner can verify offline against the published
// BUREAU_PUBKEY (see @getkinetik/verify).
//
// CRITICAL: this module ships evidence, never a score band. Mapping evidence
// to a reward tier (PREMIER / STANDARD / WEAK / etc.) is the partner's job
// — see @getkinetik/evidence-mapping for the reference mapping a partner
// can adopt, fork, or ignore.
//
// SCHEMA HISTORY:
//   v:1 — initial. Bureau signs a flat, fully-canonicalized payload. Witness
//         counter-signatures slot is present but always empty in v:1; phase C
//         populates it without a schema bump because the field already exists.
//
// THE TWO PUBKEYS IN AN ATTESTATION:
//   payload.pubkey         — the BUREAU's pubkey. The signature verifies
//                            against this. Matches @getkinetik/verify's
//                            published BUREAU_PUBKEY constant in production.
//   payload.subject.pubkey — the DEVICE's pubkey. The thing being attested
//                            to. Matches the pubkey on the verified Proof
//                            of Origin / heartbeat that triggered the
//                            attestation.
//
// This module is signer-agnostic. The device app imports the TYPE to consume
// bureau responses; the bureau service imports `createAttestation` to mint
// them. The signing function is injected so the bureau can swap from
// env-key to KMS to HSM later without touching the contract.
// ============================================================================

import { sha256 } from '@noble/hashes/sha2.js';

import { PROOF_ATTRIBUTION } from './proof';
import { stableStringify } from './stableJson';

// ----------------------------------------------------------------------------
// Subject — the device this attestation is about.
// ----------------------------------------------------------------------------
export type AttestationSubject = {
  /** ms-since-epoch of the device key's birth (claimed, from the proof). */
  mintedAt: number;
  /** Stable device identifier: KINETIK-NODE-XXXXXXXX. */
  nodeId: string;
  /** Device's Ed25519 public key (64-char hex). */
  pubkey: string;
  /** Most recent heartbeat chain tip hash (16-char hex) or null if unknown. */
  chainTip: string | null;
};

// ----------------------------------------------------------------------------
// BureauObserved — facts the BUREAU saw, not the node. This is the hardening
// surface from Genesis Score §3.2: the bureau's first-seen timestamp bounds
// the node's age, and the peak-beats memory detects chain rewinds. The node
// cannot lie about these.
// ----------------------------------------------------------------------------
export type AttestationBureauObserved = {
  /** ms-since-epoch the bureau first observed this node. */
  firstSeenMs: number;
  /** ms-since-epoch the bureau last observed this node (≈ bureauTs). */
  lastSeenMs: number;
  /** Highest `lifetimeBeats` value the bureau has ever recorded for this node. */
  peakLifetimeBeats: number;
};

// ----------------------------------------------------------------------------
// ChainClaim — what the NODE says about its own chain in the verified proof.
// These are claims, not facts; the bureau cannot independently verify a
// `firstBeatTs` without longitudinal evidence (which is why `bureauObserved`
// exists). Partners reading this block should cross-reference with
// `bureauObserved` to detect implausible claims.
// ----------------------------------------------------------------------------
export type AttestationChainClaim = {
  /** Earliest signed heartbeat ts (claimed) or null if node has no chain yet. */
  firstBeatTs: number | null;
  /** Lifetime heartbeat count (claimed). */
  lifetimeBeats: number;
  /** The artifact schema the claim came from, e.g. "proof-of-origin:v2". */
  schema: string;
};

// ----------------------------------------------------------------------------
// SensorCoherence — boolean observations of the proof's sensor block.
// We commit to booleans, not raw values, so the attestation does not embed
// device-specific data a partner could side-channel into a fingerprint.
// "observed" = the proof carried a numeric value for that field.
// "plausible" = the value sat inside a documented physical range; null when
// the field wasn't observed.
// ----------------------------------------------------------------------------
export type AttestationSensorCoherence = {
  luxObserved: boolean;
  luxPlausible: boolean | null;
  motionRmsObserved: boolean;
  motionRmsPlausible: boolean | null;
  pressureHpaObserved: boolean;
  pressureHpaPlausible: boolean | null;
};

// ----------------------------------------------------------------------------
// Witness — a counter-signature from another node or partner adapter that
// observed (or attested to) the subject's activity. Empty in v:1; phase C
// populates it. Keeping the field present from v:1 means we never need a
// schema bump to start collecting witnesses.
// ----------------------------------------------------------------------------
export type AttestationWitness = {
  /** Witness node ID. */
  nodeId: string;
  /** Witness Ed25519 pubkey (64-char hex). */
  pubkey: string;
  /** Witness signature (128-char hex) over the canonical subject digest. */
  signature: string;
  /** ms-since-epoch the witness signed. */
  ts: number;
};

// ----------------------------------------------------------------------------
// AttestationPayload — the signed body.
// Field names match this module's canonical helpers so stableStringify
// produces a byte-stable serialization across signer and verifier.
// ----------------------------------------------------------------------------
export type AttestationPayload = {
  v: 1;
  kind: 'attestation';
  attribution: typeof PROOF_ATTRIBUTION;
  /** Bureau's Ed25519 pubkey — the verifier checks the signature against this.
   *  In production, must equal @getkinetik/verify's BUREAU_PUBKEY constant. */
  pubkey: string;
  /** ms-since-epoch the bureau minted this attestation. */
  bureauTs: number;
  subject: AttestationSubject;
  bureauObserved: AttestationBureauObserved;
  chainClaim: AttestationChainClaim;
  sensorCoherence: AttestationSensorCoherence;
  /** Flags raised during chain/proof processing. Empty array means no flags
   *  were raised — NOT a verdict of "this node is good." Documented tokens:
   *  'chain_rewind', 'beat_rate_implausible', 'lux_implausible',
   *  'motion_implausible', 'pressure_implausible', 'first_sighting'. The
   *  list is intentionally open-ended for future flags. */
  flags: string[];
  /** Witness counter-signatures. Empty in v:1, populated in phase C. */
  witnesses: AttestationWitness[];
};

export type SignedAttestation = {
  payload: AttestationPayload;
  /** stably-stringified JSON — exact bytes that were signed */
  message: string;
  /** 128-char lowercase hex Ed25519 signature */
  signature: string;
  /** 16-char lowercase hex sha256(message) — chain-tip-shaped digest */
  hash: string;
};

// ----------------------------------------------------------------------------
// Canonical helpers. stableStringify only sorts top-level keys; any nested
// object must be constructed with keys inserted in lexicographic order so
// JSON.stringify produces byte-stable output. Each helper below enforces
// that contract for one sub-block of the payload.
// ----------------------------------------------------------------------------

export function canonicalSubject(s: AttestationSubject): AttestationSubject {
  return {
    chainTip: s.chainTip,
    mintedAt: s.mintedAt,
    nodeId: s.nodeId,
    pubkey: s.pubkey,
  };
}

export function canonicalBureauObserved(
  b: AttestationBureauObserved,
): AttestationBureauObserved {
  return {
    firstSeenMs: b.firstSeenMs,
    lastSeenMs: b.lastSeenMs,
    peakLifetimeBeats: b.peakLifetimeBeats,
  };
}

export function canonicalChainClaim(
  c: AttestationChainClaim,
): AttestationChainClaim {
  return {
    firstBeatTs: c.firstBeatTs,
    lifetimeBeats: c.lifetimeBeats,
    schema: c.schema,
  };
}

export function canonicalSensorCoherence(
  s: AttestationSensorCoherence,
): AttestationSensorCoherence {
  return {
    luxObserved: s.luxObserved,
    luxPlausible: s.luxPlausible,
    motionRmsObserved: s.motionRmsObserved,
    motionRmsPlausible: s.motionRmsPlausible,
    pressureHpaObserved: s.pressureHpaObserved,
    pressureHpaPlausible: s.pressureHpaPlausible,
  };
}

export function canonicalWitness(w: AttestationWitness): AttestationWitness {
  return {
    nodeId: w.nodeId,
    pubkey: w.pubkey,
    signature: w.signature,
    ts: w.ts,
  };
}

// Sorts flags lex-ascending and dedupes. Order matters for byte stability;
// duplicates would only be a bug but we strip them so signing is idempotent.
export function canonicalFlags(flags: readonly string[]): string[] {
  return Array.from(new Set(flags)).sort();
}

// Witness array is sorted by (ts ASC, nodeId ASC) for byte stability. Two
// witnesses signing in the same ms (extremely unlikely but possible in tests)
// are tie-broken by nodeId.
export function canonicalWitnesses(
  ws: readonly AttestationWitness[],
): AttestationWitness[] {
  const cloned = ws.map(canonicalWitness);
  cloned.sort((a, b) => (a.ts - b.ts) || a.nodeId.localeCompare(b.nodeId));
  return cloned;
}

// ----------------------------------------------------------------------------
// canonicalAttestation — applies the canonical sub-block helpers above and
// returns a payload whose stableStringify output is byte-stable across the
// bureau signer and the verifier package. ALWAYS run an AttestationPayload
// through this before signing.
// ----------------------------------------------------------------------------
export function canonicalAttestation(
  raw: AttestationPayload,
): AttestationPayload {
  return {
    v: raw.v,
    kind: raw.kind,
    attribution: raw.attribution,
    pubkey: raw.pubkey,
    bureauTs: raw.bureauTs,
    subject: canonicalSubject(raw.subject),
    bureauObserved: canonicalBureauObserved(raw.bureauObserved),
    chainClaim: canonicalChainClaim(raw.chainClaim),
    sensorCoherence: canonicalSensorCoherence(raw.sensorCoherence),
    flags: canonicalFlags(raw.flags),
    witnesses: canonicalWitnesses(raw.witnesses),
  };
}

// ----------------------------------------------------------------------------
// Signer contract. The bureau service injects an implementation. Two impls
// live alongside this contract:
//   · functions/api/_lib/bureauSign.js — Cloudflare Worker, loads hex seed
//     from env.BUREAU_SIGNING_KEY_HEX.
//   · (future) KMS / HSM — non-exportable key, sign-only API.
// The device app never imports a signer; it only imports the type to consume
// bureau responses.
// ----------------------------------------------------------------------------
export type BureauSigner = {
  /** 64-char hex bureau pubkey. Embedded in payload.pubkey. */
  pubkeyHex: string;
  /** Sign a UTF-8 string with the bureau's Ed25519 key; return 128-char hex. */
  sign: (message: string) => Promise<string>;
};

// ----------------------------------------------------------------------------
// createAttestation — produces a fresh signed attestation. Pure logic. The
// caller is responsible for:
//   · Having already cryptographically verified the underlying proof.
//   · Loading bureau-observed facts (first-seen, peak beats) from durable
//     storage and updating them before/after calling this.
//   · Choosing what flags to include (the bureau service decides; this
//     module just canonicalizes the resulting array).
// ----------------------------------------------------------------------------
const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const encodeUtf8 = (s: string): Uint8Array =>
  typeof TextEncoder !== 'undefined'
    ? new TextEncoder().encode(s)
    : new Uint8Array(Array.from(s).map((c) => c.charCodeAt(0)));

export type CreateAttestationInput = {
  subject: AttestationSubject;
  bureauObserved: AttestationBureauObserved;
  chainClaim: AttestationChainClaim;
  sensorCoherence: AttestationSensorCoherence;
  flags?: readonly string[];
  witnesses?: readonly AttestationWitness[];
  /** Override the bureau clock (tests). Defaults to Date.now(). */
  bureauTs?: number;
};

export async function createAttestation(
  signer: BureauSigner,
  input: CreateAttestationInput,
): Promise<SignedAttestation> {
  const payload: AttestationPayload = canonicalAttestation({
    v: 1,
    kind: 'attestation',
    attribution: PROOF_ATTRIBUTION,
    pubkey: signer.pubkeyHex,
    bureauTs: input.bureauTs ?? Date.now(),
    subject: input.subject,
    bureauObserved: input.bureauObserved,
    chainClaim: input.chainClaim,
    sensorCoherence: input.sensorCoherence,
    flags: Array.from(input.flags ?? []),
    witnesses: Array.from(input.witnesses ?? []),
  });

  const message = stableStringify(
    payload as unknown as Record<string, unknown>,
  );
  const signature = await signer.sign(message);
  const hash = toHex(sha256(encodeUtf8(message))).slice(0, 16);

  return { payload, message, signature, hash };
}
