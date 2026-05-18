// ============================================================================
// Sovereign Node Mnemonic — BIP-39 Mnemonic Generator & Recovery Primitive.
// ----------------------------------------------------------------------------
// A sovereign node must be recoverable by the user. If the hardware is lost,
// a 12-word seed phrase (entropy) allows full recovery of their Ed25519 identity,
// their node ID, and their historic Genesis Score reputation.
//
// This module delegates all wordlist and checksum logic to @scure/bip39 —
// the standard pure-JS implementation by the same author as @noble/ed25519 and
// @noble/hashes (Paul Miller). It ships the exact 2048-word BIP-39 English
// wordlist, correct SHA-256 checksum validation, and is used by Metamask,
// Phantom, Ledger Live, and every major Web3 wallet.
//
// Key stretching: PBKDF2-SHA512 with 2048 iterations (BIP-39 standard).
// The async variant is used so the JS thread never locks on mobile.
// ============================================================================

import {
  generateMnemonic as _generate,
  mnemonicToEntropy,
  validateMnemonic as _validate,
  entropyToMnemonic as _entropyToMnemonic,
} from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha512 } from '@noble/hashes/sha2.js';

// Re-export for consumers that want direct wordlist access.
export { wordlist as WORDLIST };

// ----------------------------------------------------------------------------
// generateMnemonic — mints a fresh, cryptographically-random 12-word phrase
// backed by 128 bits of entropy from the runtime CSPRNG.
// ----------------------------------------------------------------------------
export function generateMnemonic(): string {
  return _generate(wordlist, 128);
}

// ----------------------------------------------------------------------------
// entropyToMnemonic — deterministically encodes a 16-byte entropy buffer as a
// 12-word phrase. Used to derive a backward-compatible mnemonic for legacy
// nodes that were created before this feature existed.
// ----------------------------------------------------------------------------
export function entropyToMnemonic(entropy: Uint8Array): string {
  if (entropy.length !== 16) {
    throw new Error('[mnemonic] Entropy must be exactly 16 bytes');
  }
  return _entropyToMnemonic(entropy, wordlist);
}

// ----------------------------------------------------------------------------
// validateMnemonic — returns true if the phrase is a valid 12-word BIP-39
// mnemonic with a correct SHA-256 checksum and all words in the English list.
// ----------------------------------------------------------------------------
export function validateMnemonic(mnemonic: string): boolean {
  try {
    return _validate(mnemonic.trim().toLowerCase().replace(/\s+/g, ' '), wordlist);
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// mnemonicToSeed — async PBKDF2-SHA512 key stretching, 2048 iterations.
// Returns the first 32 bytes as the Ed25519 secret key seed.
// Uses pbkdf2Async so the JS thread never blocks on mobile during restore.
// ----------------------------------------------------------------------------
export async function mnemonicToSeed(
  mnemonic: string,
  passphrase = '',
): Promise<Uint8Array> {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('[mnemonic] Invalid recovery phrase checksum or word');
  }
  const normalised = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  const salt = `mnemonic${passphrase}`;

  const stretched = await pbkdf2Async(sha512, normalised, salt, {
    c: 2048,
    dkLen: 64,
  });

  return stretched.slice(0, 32);
}

// ----------------------------------------------------------------------------
// mnemonicToEntropyHex — convenience helper for round-trip testing.
// Returns the raw 16-byte entropy as a 32-char hex string.
// ----------------------------------------------------------------------------
export function mnemonicToEntropyHex(mnemonic: string): string {
  const entropy = mnemonicToEntropy(
    mnemonic.trim().toLowerCase().replace(/\s+/g, ' '),
    wordlist,
  );
  return Array.from(entropy, (b) => b.toString(16).padStart(2, '0')).join('');
}
