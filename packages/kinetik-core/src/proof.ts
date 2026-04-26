// ============================================================================
// Proof of Origin — the Sovereign Node's exportable, verifiable birth record.
// ----------------------------------------------------------------------------
// A Proof of Origin is a live, Ed25519-signed declaration that this device
// is a real Sovereign Node. Each time the user opens the card, a FRESH
// signature is produced over the current state:
//
//   · nodeId            — KINETIK-NODE-XXXXXXXX
//   · pubkey            — 64-char hex public key (verifier's only input)
//   · mintedAt          — when the keypair was first generated (epoch ms)
//   · issuedAt          — when THIS card was signed (epoch ms)
//   · lifetimeBeats     — total heartbeats ever emitted on this device
//   · firstBeatTs       — timestamp of the very first heartbeat (or null)
//   · chainTip          — most recent heartbeat chain hash (or null)
//   · attribution       — const "GETKINETIK by OutFromNothing LLC"
//
// The freshness matters: a screenshot of the card is a timestamped claim,
// not a stale export. Anyone with the pubkey can re-stringify the payload
// via stableStringify + verify the signature — the card is self-auditing.
//
// Attribution is baked into the signed payload. A third party cannot
// copy this card, strip the attribution, and re-emit it as their own
// without breaking the signature — because the attribution is part of
// what was signed.
//
// This module is pure logic. The UI lives in src/components/ProofOfOrigin.tsx.
// ============================================================================

import { sha256 } from '@noble/hashes/sha2.js';

import {
  type NodeIdentity,
  signMessage,
  verifyMessage,
} from './identity';
import {
  canonicalSensorBlock,
  type SensorReadout,
} from './sensors';
import { stableStringify } from './stableJson';

// ----------------------------------------------------------------------------
// Attribution — ownership stamp embedded in every signed proof.
// Change this ONLY with express authorization from OutFromNothing LLC.
// Changing it rotates the signature surface for every card minted after
// the change; old cards remain verifiable against the old attribution.
// ----------------------------------------------------------------------------
export const PROOF_ATTRIBUTION = 'GETKINETIK by OutFromNothing LLC' as const;

// ----------------------------------------------------------------------------
// Byte <-> hex helper. Duplicated from identity.ts so this module can be
// imported in isolation without pulling the full identity surface; both
// copies produce the exact same lowercase hex for any given byte array.
// ----------------------------------------------------------------------------
const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

// UTF-8 encode for hashing. RN 0.81 ships TextEncoder; this is a safety
// shim in case it's ever stripped from the Hermes globals.
const encodeUtf8 = (s: string): Uint8Array =>
  typeof TextEncoder !== 'undefined'
    ? new TextEncoder().encode(s)
    : new Uint8Array(Array.from(s).map((c) => c.charCodeAt(0)));

// ----------------------------------------------------------------------------
// Types — versioned so we can add fields without breaking verifiers.
// ----------------------------------------------------------------------------
// SCHEMA HISTORY:
//   v:1 — identity + uptime fields only (nodeId, pubkey, mintedAt, issuedAt,
//         lifetimeBeats, firstBeatTs, chainTip, attribution). Every Proof of
//         Origin minted before 2026-04-25 is v:1.
//   v:2 — adds the `sensors` block carrying the same SensorReadout shape as
//         the heartbeat v:2 payload. Sourced from the most recent SIGNED
//         heartbeat (caller passes lastSensors via stats), so the PoO is
//         anchored to a real on-chain reading instead of side-reading the
//         live sensor stream and stealing samples from the next heartbeat
//         window. May be null if no heartbeats have been emitted yet on
//         this device, OR if no sensor sampler is wired in (legacy app
//         versions). Verifier accepts both v:1 and v:2; existing v:1
//         artifacts remain valid forever.
// ----------------------------------------------------------------------------
export type ProofOfOriginPayload = {
  v: 2;
  kind: 'proof-of-origin';
  nodeId: string;
  pubkey: string;
  mintedAt: number;
  issuedAt: number;
  lifetimeBeats: number;
  firstBeatTs: number | null;
  chainTip: string | null;
  attribution: typeof PROOF_ATTRIBUTION;
  /**
   * L2 — sensor block from the most recent SIGNED heartbeat. Same shape
   * and same canonical ordering (lux, motionRms, pressureHpa) as the
   * heartbeat v:2 payload's sensors field. Null if no heartbeat has been
   * emitted yet on this device. Never side-read from the live sensors at
   * mint time: doing so would drain the accel ring and starve the next
   * heartbeat. Anchoring to lastSensors keeps PoO and chain in lock-step.
   */
  sensors: SensorReadout | null;
};

export type SignedProofOfOrigin = {
  payload: ProofOfOriginPayload;
  /** stably-stringified JSON — exact bytes that were signed */
  message: string;
  /** 128-char lowercase hex Ed25519 signature */
  signature: string;
  /** 16-char lowercase hex sha256(message) — human-readable fingerprint */
  hash: string;
};

// ----------------------------------------------------------------------------
// Stats the caller passes in. Caller is responsible for reading these
// from the heartbeat summary (or passing nulls if the node has never
// proven uptime on this device yet).
//
// `lastSensors` is the SensorReadout from the most recently SIGNED
// heartbeat — pull straight from `HeartbeatSummary.lastSensors`. Pass
// `null` if the node has never emitted a beat on this device or if the
// caller has no sensor sampler wired in.
// ----------------------------------------------------------------------------
export type ProofOfOriginStats = {
  lifetimeBeats: number;
  firstBeatTs: number | null;
  chainTip: string | null;
  lastSensors: SensorReadout | null;
};

// ----------------------------------------------------------------------------
// createProofOfOrigin — produces a fresh signed proof for the current state.
// ----------------------------------------------------------------------------
// Async because Ed25519 signing is async (SHA-512 is the bottleneck). On a
// modern device this returns in ~5-10ms, but the UI should still show a
// brief "signing" state for the first open.
//
// The `sensors` block is constructed via canonicalSensorBlock() so the
// nested object's JSON.stringify output is reproducible byte-for-byte
// across the app and the verifier — the same contract used by the
// heartbeat v:2 emit path. If lastSensors is null, the field is signed
// as JSON null, which the verifier renders as "—" without breaking.
// ----------------------------------------------------------------------------
export async function createProofOfOrigin(
  identity: NodeIdentity,
  stats: ProofOfOriginStats,
): Promise<SignedProofOfOrigin> {
  const payload: ProofOfOriginPayload = {
    v: 2,
    kind: 'proof-of-origin',
    nodeId: identity.nodeId,
    pubkey: identity.publicKeyHex,
    mintedAt: identity.createdAt,
    issuedAt: Date.now(),
    lifetimeBeats: stats.lifetimeBeats,
    firstBeatTs: stats.firstBeatTs,
    chainTip: stats.chainTip,
    attribution: PROOF_ATTRIBUTION,
    sensors: stats.lastSensors
      ? canonicalSensorBlock(stats.lastSensors)
      : null,
  };

  const message = stableStringify(
    payload as unknown as Record<string, unknown>,
  );
  const signature = await signMessage(identity, message);
  const hash = toHex(sha256(encodeUtf8(message))).slice(0, 16);

  return { payload, message, signature, hash };
}

// ----------------------------------------------------------------------------
// verifyProofOfOrigin — given a signed proof and the claimed public key,
// confirm that:
//   1. sha256(message) matches the embedded hash.
//   2. Ed25519 signature verifies against the message + public key.
//   3. The payload's pubkey field matches the verifying public key — so
//      an attacker can't paste a valid signature from a different node.
//   4. The attribution string is intact.
//
// Used on-device today for self-audit; will be the exact same function a
// verifier web page or server-side pipeline runs in the future.
// ----------------------------------------------------------------------------
export async function verifyProofOfOrigin(
  proof: SignedProofOfOrigin,
  publicKeyHex: string,
): Promise<boolean> {
  if (proof.payload.pubkey !== publicKeyHex) return false;
  if (proof.payload.attribution !== PROOF_ATTRIBUTION) return false;

  const computedHash = toHex(sha256(encodeUtf8(proof.message))).slice(0, 16);
  if (computedHash !== proof.hash) return false;

  return verifyMessage(proof.signature, proof.message, publicKeyHex);
}
