// ============================================================================
// Sovereign Earnings Wallet — address derivation + signed earnings ledger.
// ----------------------------------------------------------------------------
// This is L4 of the four-layer aggregator architecture. It lives in the same
// package as identity + heartbeat + proof because it shares the same
// cryptographic primitives and the same trust model:
//
//   · The wallet ADDRESS is derived from the existing Ed25519 keypair —
//     no new secret, no second device to back up. The Sovereign Node IS
//     the wallet.
//
//   · Each EarningEntry is stableStringify'd and signed Ed25519. The signed
//     chain is append-only and tamper-evident, exactly like heartbeats.
//
//   · The 1% protocol fee is baked INTO the signed payload. Stripping or
//     altering `fee` invalidates the signature — same pattern as
//     PROOF_ATTRIBUTION in proof.ts. There is no way to renegotiate the
//     fee after the fact without breaking every auditor.
//
//   · GETKINETIK NEVER holds tokens. The wallet address is sovereign —
//     adapters move tokens on their own networks; we sign receipts.
//
// WALLET ADDRESS DERIVATION (no new secret material):
//
//   walletAddress = "kn1" + base32(sha256("kinetik-wallet-v1" || publicKey))[:32]
//
//   "kinetik-wallet-v1" is the domain separator — different from identity
//   derivation so the wallet address cannot be confused with the nodeId
//   fingerprint even though they share the same public key bytes.
//
// EARNING ENTRY SCHEMA (v:1):
//
//   {
//     v: 1,
//     kind: "earning",
//     nodeId: "KINETIK-NODE-A3F2B719",
//     pubkey: <64-char hex>,
//     source: "nodle",           // adapter id
//     externalRef: "nodle:tx:…", // adapter-specific dedup/dispute ID
//     currency: "NODL",
//     gross: 12.3,               // raw payout in currency units
//     fee: 0.123,                // 1% of gross, signed in
//     net: 12.177,               // gross - fee, what the user keeps
//     ts: 1714000000000,
//     prevHash: <16-char hex> | null,
//     attribution: "GETKINETIK by OutFromNothing LLC",
//   }
//
// PERSISTENCE (SecureStore — same pattern as heartbeat log):
//
//   kinetik.wallet.addr.v1         cached derived wallet address
//   kinetik.wallet.log.count.v1    total earning entries ever
//   kinetik.wallet.log.lastHash.v1 chain tip (16-char hex)
// ============================================================================

import { sha256 } from '@noble/hashes/sha2.js';
import * as SecureStore from 'expo-secure-store';

import { type NodeIdentity, signMessage, verifyMessage } from './identity';
import { stableStringify } from './stableJson';

// ----------------------------------------------------------------------------
// Attribution constant — baked into every signed EarningEntry. Altering it
// invalidates the Ed25519 signature, same mechanism as PROOF_ATTRIBUTION.
// ----------------------------------------------------------------------------
export const WALLET_ATTRIBUTION = 'GETKINETIK by OutFromNothing LLC' as const;

// Protocol fee rate — 1% of gross. Encoded as a typed const so it appears
// in the public surface and can be audited without reading source comments.
export const PROTOCOL_FEE_RATE = 0.01 as const;

export const WALLET_KEYS = {
  addr: 'kinetik.wallet.addr.v1',
  count: 'kinetik.wallet.log.count.v1',
  lastHash: 'kinetik.wallet.log.lastHash.v1',
} as const;

// ----------------------------------------------------------------------------
// Types.
// ----------------------------------------------------------------------------

export type EarningEntry = {
  v: 1;
  kind: 'earning';
  nodeId: string;
  pubkey: string;
  /** Adapter id — stable string used in the earnings ledger, e.g. 'nodle'. */
  source: string;
  /** Adapter-specific identifier for deduplication and dispute resolution. */
  externalRef: string;
  /** Native currency of the adapter, e.g. 'NODL', 'HONEY'. */
  currency: string;
  /** Raw payout from the network in currency units. */
  gross: number;
  /** GETKINETIK protocol fee — exactly PROTOCOL_FEE_RATE of gross, signed in. */
  fee: number;
  /** gross - fee — what the user keeps. Signed in. */
  net: number;
  ts: number;
  /** Hash of the previous EarningEntry — null for the first entry ever. */
  prevHash: string | null;
  attribution: typeof WALLET_ATTRIBUTION;
  // ------------------------------------------------------------------
  // Optional verified-user premium fields (v1.5+).
  // Present only when a partner pays the hardware-attestation premium.
  // OMITTED entirely (not set to undefined) when not applicable so that
  // stableStringify produces identical output to pre-premium entries.
  // ------------------------------------------------------------------
  /**
   * Standard reward rate per token unit in USD (what non-attested nodes earn).
   * Signed into the receipt so the premium amount is auditable.
   */
  standardRate?: number;
  /**
   * Premium reward rate per token unit in USD (what attested nodes earn).
   * Present only when the partner has activated verified-user premium.
   */
  premiumRate?: number;
  /**
   * Premium above standard in basis points (100 bp = 1%).
   * e.g. 1500 means this node earned 15% more than non-attested peers.
   */
  premiumBasisPoints?: number;
};

export type SignedEarning = {
  payload: EarningEntry;
  /** stably-stringified JSON — what was actually signed */
  message: string;
  /** 128-char lowercase hex Ed25519 signature */
  signature: string;
  /** 16-char lowercase hex truncation of sha256(message) — chain tip */
  hash: string;
};

export type WalletSummary = {
  /** Deterministic wallet address derived from the node's Ed25519 public key. */
  walletAddress: string;
  /** Total earning entries ever appended to this node's log. */
  count: number;
  /** 16-char hex chain tip, or null if no entries exist yet. */
  lastHash: string | null;
};

// ----------------------------------------------------------------------------
// Parameters for appendEarningLog — callers supply the economic facts,
// the function computes fee/net, chains the prevHash, and signs.
// ----------------------------------------------------------------------------
export type AppendEarningParams = {
  source: string;
  externalRef: string;
  currency: string;
  /** Raw payout in currency units before the protocol fee is deducted. */
  gross: number;
  /**
   * Optional verified-user premium data. When present, all three fields
   * must be supplied together — they are either all signed in or all omitted.
   * The trio is written to the EarningEntry only if premiumBasisPoints > 0.
   */
  premiumBasisPoints?: number;
  standardRate?: number;
  premiumRate?: number;
};

// ----------------------------------------------------------------------------
// Helpers — local, same pattern as heartbeat.ts.
// ----------------------------------------------------------------------------
const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const secureGet = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.warn('[wallet] SecureStore read failed:', key, err);
    return null;
  }
};

const secureSet = async (key: string, value: unknown): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, String(value));
  } catch (err) {
    console.warn('[wallet] SecureStore write failed:', key, err);
  }
};

const secureDelete = async (key: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.warn('[wallet] SecureStore delete failed:', key, err);
  }
};

// ----------------------------------------------------------------------------
// Base32 encoder (RFC 4648, lowercase). Used only for wallet address
// derivation. Pure JS — no native module, no new build step.
// ----------------------------------------------------------------------------
const BASE32_CHARS = 'abcdefghijklmnopqrstuvwxyz234567';

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }
  return output;
}

// ----------------------------------------------------------------------------
// Fee rounding — 8 decimal places to avoid floating-point drift while
// preserving sub-satoshi precision for high-decimal currencies like NODL
// (11 decimal places on-chain). Both sides of the contract (signEarning +
// verifyEarning) use the same rounding so checks pass byte-for-byte.
// ----------------------------------------------------------------------------
const round8 = (n: number): number => Math.round(n * 1e8) / 1e8;

// ----------------------------------------------------------------------------
// deriveWalletAddress — pure, synchronous, deterministic.
//
// Domain-separates from nodeId derivation via the "kinetik-wallet-v1" prefix,
// so even though both use the same Ed25519 public key, the addresses are
// unrelated strings. No new secret required.
// ----------------------------------------------------------------------------
export function deriveWalletAddress(publicKey: Uint8Array): string {
  const domain = new TextEncoder().encode('kinetik-wallet-v1');
  const combined = new Uint8Array(domain.length + publicKey.length);
  combined.set(domain);
  combined.set(publicKey, domain.length);
  const hash = sha256(combined);
  return 'kn1' + base32Encode(hash).slice(0, 32);
}

// ----------------------------------------------------------------------------
// signEarning — builds the canonical message and signs it.
//
// HARD RULES encoded here (not only in docs):
//   · attribution must be WALLET_ATTRIBUTION — any other value throws
//   · fee must be exactly PROTOCOL_FEE_RATE % of gross — throws otherwise
//   · net must be gross - fee — throws otherwise
//
// These invariants mean a caller can never accidentally sign a zero-fee
// or wrong-net entry. The throws surface the bug at construction time,
// not silently at audit time.
// ----------------------------------------------------------------------------
export async function signEarning(
  identity: NodeIdentity,
  entry: EarningEntry,
): Promise<SignedEarning> {
  if (entry.attribution !== WALLET_ATTRIBUTION) {
    throw new Error(
      '[wallet] attribution must equal WALLET_ATTRIBUTION — it is baked into every signature',
    );
  }
  const expectedFee = round8(entry.gross * PROTOCOL_FEE_RATE);
  if (Math.abs(entry.fee - expectedFee) > 1e-9) {
    throw new Error(
      `[wallet] fee must be exactly ${PROTOCOL_FEE_RATE * 100}% of gross (expected ${expectedFee}, got ${entry.fee})`,
    );
  }
  const expectedNet = round8(entry.gross - entry.fee);
  if (Math.abs(entry.net - expectedNet) > 1e-9) {
    throw new Error(
      `[wallet] net must be gross - fee (expected ${expectedNet}, got ${entry.net})`,
    );
  }

  const message = stableStringify(entry as unknown as Record<string, unknown>);
  const signature = await signMessage(identity, message);
  const hash = toHex(sha256(new TextEncoder().encode(message))).slice(0, 16);
  return { payload: entry, message, signature, hash };
}

// ----------------------------------------------------------------------------
// verifyEarning — the audit path. Given a signed earning and the node's
// public key hex, confirms:
//   1. attribution is WALLET_ATTRIBUTION
//   2. fee is exactly PROTOCOL_FEE_RATE of gross (tamper-detection)
//   3. net is exactly gross - fee (tamper-detection)
//   4. hash matches sha256(message)[:16]
//   5. Ed25519 signature verifies
//
// Returns false on any violation — does not throw. Callers should treat
// false as a hard rejection, not a transient error.
// ----------------------------------------------------------------------------
export async function verifyEarning(
  earning: SignedEarning,
  publicKeyHex: string,
): Promise<boolean> {
  try {
    const { payload } = earning;

    if (payload.attribution !== WALLET_ATTRIBUTION) return false;

    const expectedFee = round8(payload.gross * PROTOCOL_FEE_RATE);
    if (Math.abs(payload.fee - expectedFee) > 1e-9) return false;

    const expectedNet = round8(payload.gross - payload.fee);
    if (Math.abs(payload.net - expectedNet) > 1e-9) return false;

    const canonicalMessage = stableStringify(
      payload as unknown as Record<string, unknown>,
    );
    const canonicalHash = toHex(
      sha256(new TextEncoder().encode(canonicalMessage)),
    ).slice(0, 16);
    if (canonicalHash !== earning.hash) return false;

    return await verifyMessage(earning.signature, canonicalMessage, publicKeyHex);
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// loadWalletSummary — rehydrate the persisted earning chain summary.
// Identity is needed to derive the wallet address on first call.
// ----------------------------------------------------------------------------
export async function loadWalletSummary(
  identity: NodeIdentity,
): Promise<WalletSummary> {
  const [addrRaw, countRaw, lastHashRaw] = await Promise.all([
    secureGet(WALLET_KEYS.addr),
    secureGet(WALLET_KEYS.count),
    secureGet(WALLET_KEYS.lastHash),
  ]);

  // Derive and cache the wallet address if not already stored.
  let walletAddress = addrRaw ?? '';
  if (!walletAddress) {
    walletAddress = deriveWalletAddress(identity.publicKey);
    void secureSet(WALLET_KEYS.addr, walletAddress);
  }

  const count = Number(countRaw);
  const validCount = Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;

  const validHash =
    typeof lastHashRaw === 'string' && /^[0-9a-f]{16}$/i.test(lastHashRaw)
      ? lastHashRaw.toLowerCase()
      : null;

  return { walletAddress, count: validCount, lastHash: validHash };
}

// ----------------------------------------------------------------------------
// appendEarningLog — the main entry point for adapters.
//
// Builds an EarningEntry from the supplied economic facts, computes fee + net,
// threads the prevHash from the current chain tip, signs it, persists the
// updated summary, and returns the SignedEarning for the caller to display
// or relay.
//
// Fire-and-forget persistence (same pattern as heartbeat): a failed
// SecureStore write warns but does not block the caller. The signed
// artifact is the source of truth — the summary can be recomputed.
// ----------------------------------------------------------------------------
export async function appendEarningLog(
  identity: NodeIdentity,
  params: AppendEarningParams,
): Promise<SignedEarning> {
  const summary = await loadWalletSummary(identity);

  const gross = params.gross;
  const fee = round8(gross * PROTOCOL_FEE_RATE);
  const net = round8(gross - fee);

  // Build premium fields — only include when all three are supplied and the
  // premium is positive. Never assign undefined to a key (stableStringify
  // would serialise undefined as the string "undefined", breaking signatures).
  const premiumFields: Pick<EarningEntry, 'standardRate' | 'premiumRate' | 'premiumBasisPoints'> =
    params.premiumBasisPoints != null &&
    params.premiumBasisPoints > 0 &&
    params.standardRate != null &&
    params.premiumRate != null
      ? {
          standardRate: params.standardRate,
          premiumRate: params.premiumRate,
          premiumBasisPoints: params.premiumBasisPoints,
        }
      : {};

  const entry: EarningEntry = {
    v: 1,
    kind: 'earning',
    nodeId: identity.nodeId,
    pubkey: identity.publicKeyHex,
    source: params.source,
    externalRef: params.externalRef,
    currency: params.currency,
    gross,
    fee,
    net,
    ts: Date.now(),
    prevHash: summary.lastHash,
    attribution: WALLET_ATTRIBUTION,
    ...premiumFields,
  };

  const signed = await signEarning(identity, entry);

  // Persist — fire and forget.
  const newCount = summary.count + 1;
  void secureSet(WALLET_KEYS.count, newCount);
  void secureSet(WALLET_KEYS.lastHash, signed.hash);

  return signed;
}

// ----------------------------------------------------------------------------
// eraseEarningLog — for __kinetikResetSecureStore. Clearing identity without
// clearing the earning log would leave orphan chain data under a new key.
// ----------------------------------------------------------------------------
export async function eraseEarningLog(): Promise<void> {
  await secureDelete(WALLET_KEYS.addr);
  await secureDelete(WALLET_KEYS.count);
  await secureDelete(WALLET_KEYS.lastHash);
}
