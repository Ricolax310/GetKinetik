// ============================================================================
// @kinetik/core — public surface (the "front door").
// ----------------------------------------------------------------------------
// Anything re-exported from this file is part of the package's public API.
// Anything NOT re-exported here is internal — callers must not reach past
// this file into individual modules. Today the only consumer is the
// GETKINETIK app shell. Tomorrow the verifier and DePIN integrations will
// consume the same surface. The day this package goes public as an SDK,
// THIS file is the contract every external integrator depends on.
//
// CONTRACT RULE: removing or renaming an export from this file is a
// breaking change. Adding a new export is non-breaking. When in doubt,
// add — never remove. If a primitive needs deprecation, leave the export
// in place and mark it `@deprecated` in the source so the type-system
// surfaces a warning at every call site.
//
// The current surface is the union of what the app currently uses. Curating
// this list (deciding what should stay private) is a deliberate next step
// once we have a second consumer to reveal which pieces are truly load-bearing.
// ============================================================================

// ----- L1: identity --------------------------------------------------------
export {
  IDENTITY_KEYS,
  type NodeIdentity,
  getOrCreateNodeIdentity,
  signMessage,
  verifyMessage,
  eraseNodeIdentity,
} from './identity';

// ----- L1: canonical signing contract --------------------------------------
export { stableStringify } from './stableJson';

// ----- L1: hash-chained heartbeat log --------------------------------------
export {
  HEARTBEAT_KEYS,
  type HeartbeatPayload,
  type HeartbeatSnapshot,
  type HeartbeatSummary,
  type SignedHeartbeat,
  useHeartbeat,
  verifyHeartbeat,
  eraseHeartbeatLog,
} from './heartbeat';

// ----- L2: sensor sampler + canonical sensor block -------------------------
export {
  type SensorReadout,
  startSensorSampler,
  stopSensorSampler,
  readSensorAggregate,
  canonicalSensorBlock,
} from './sensors';

// ----- L1: Proof of Origin (signing + verification) ------------------------
export {
  PROOF_ATTRIBUTION,
  type ProofOfOriginPayload,
  type ProofOfOriginStats,
  type SignedProofOfOrigin,
  createProofOfOrigin,
  verifyProofOfOrigin,
} from './proof';

// ----- L1: Proof of Origin export (verifier URL + native share sheet) ------
export {
  VERIFIER_ORIGIN,
  buildVerifierUrl,
  shareProof,
} from './proofShare';

// ----- L3: DePIN adapter contract -------------------------------------------
export {
  type AdapterStatus,
  type EarningSnapshot,
  type DepinAdapter,
} from './adapter';

// ----- L4: sovereign earnings wallet ----------------------------------------
export {
  WALLET_ATTRIBUTION,
  PROTOCOL_FEE_RATE,
  WALLET_KEYS,
  type EarningEntry,
  type SignedEarning,
  type WalletSummary,
  type AppendEarningParams,
  deriveWalletAddress,
  signEarning,
  verifyEarning,
  loadWalletSummary,
  appendEarningLog,
  eraseEarningLog,
} from './wallet';
