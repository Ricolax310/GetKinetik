// ============================================================================
// Heartbeat durable storage — SecureStore keys + erase helper.
// ----------------------------------------------------------------------------
// Split out of heartbeat.ts so identity.ts can call eraseHeartbeatLog() when
// minting a brand-new keypair without importing the full heartbeat module
// (which imports identity for signing — circular dependency otherwise).
//
// CONTRACT: HEARTBEAT_KEYS must stay byte-for-byte identical to the values
// historically shipped in heartbeat.ts v1.
// ============================================================================

import * as SecureStore from 'expo-secure-store';

export const HEARTBEAT_KEYS = {
  seq: 'kinetik.hb.seq.v1',
  count: 'kinetik.hb.count.v1',
  firstTs: 'kinetik.hb.firstTs.v1',
  lastHash: 'kinetik.hb.lastHash.v1',
} as const;

/** Last pubkey hex that extended this chain — detects identity rotation without a wipe. */
export const HEARTBEAT_CHAIN_PUBKEY_KEY = 'kinetik.hb.chainPub.v1' as const;

async function secureDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.warn('[heartbeatPersist] SecureStore delete failed:', key, err);
  }
}

/**
 * Wipe persisted heartbeat chain state. Call when rotating or minting a new
 * node identity so lifetime beats do not carry over under a new pubkey.
 */
export async function eraseHeartbeatLog(): Promise<void> {
  await secureDelete(HEARTBEAT_KEYS.seq);
  await secureDelete(HEARTBEAT_KEYS.count);
  await secureDelete(HEARTBEAT_KEYS.firstTs);
  await secureDelete(HEARTBEAT_KEYS.lastHash);
  await secureDelete(HEARTBEAT_CHAIN_PUBKEY_KEY);
}
