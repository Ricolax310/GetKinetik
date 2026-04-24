// ============================================================================
// Sovereign Node Identity — Ed25519 keypair + keystore-backed secret key.
// ----------------------------------------------------------------------------
// A real DePIN node is defined by what it can *prove*, not what it claims.
// Every sovereign node owns an Ed25519 signing key that is:
//
//   1. Generated once, on first unlock, from the runtime's CSPRNG
//      (`globalThis.crypto.getRandomValues`, which Hermes in RN 0.74+ backs
//      with Android SecureRandom / iOS SecRandomCopyBytes).
//   2. Sealed inside the Android Keystore / iOS Keychain via expo-secure-store
//      in the standalone dev/production build (never in Expo Go).
//   3. Used to derive the visible NODE ID as a SHA-256 fingerprint of the
//      public key — so the ID is *deterministic* from the secret and can
//      never be spoofed by copying a string.
//   4. The signing root for Phase 5 Step 2's signed heartbeat log, and for
//      the shareable Proof of Origin cards in Step 4.
//
// This module is 100% pure JS — zero native modules beyond expo-secure-store,
// which was already in the dev client. Adding/removing features here does
// NOT require a dev-client rebuild.
// ============================================================================

import * as ed from '@noble/ed25519';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import * as SecureStore from 'expo-secure-store';

// ----------------------------------------------------------------------------
// @noble/ed25519 React Native wiring.
// ----------------------------------------------------------------------------
// The library's `etc` object is Object.freeze'd in v3, so we cannot override
// `etc.randomBytes`. We don't need to: the built-in `randomBytes` routes
// through `globalThis.crypto.getRandomValues`, which is installed by the
// `react-native-get-random-values` polyfill imported at the top of index.ts.
// That in turn maps to Android SecureRandom / iOS SecRandomCopyBytes.
//
// Both `hashes.sha512` (sync) AND `hashes.sha512Async` (async) must be
// populated. The library's default `sha512Async` tries `crypto.subtle.digest`
// first, which the polyfill does NOT provide in React Native — so without
// overriding it, every call to `signAsync` / `getPublicKeyAsync` throws
// "crypto.subtle must be defined". Overriding with a pure-JS SHA-512 from
// @noble/hashes makes both paths work without WebCrypto subtle.
//
// Guardrail: fail loudly at import time if the runtime has no CSPRNG, so we
// never silently fall back to Math.random for keygen.
// ----------------------------------------------------------------------------
ed.hashes.sha512 = sha512 as unknown as typeof ed.hashes.sha512;
ed.hashes.sha512Async = (async (
  msg: Uint8Array,
): Promise<Uint8Array> => sha512(msg)) as typeof ed.hashes.sha512Async;

{
  const g = globalThis as unknown as {
    crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array };
  };
  if (typeof g.crypto?.getRandomValues !== 'function') {
    throw new Error(
      '[identity] crypto.getRandomValues unavailable — need RN 0.74+ / Hermes.',
    );
  }
}

// ----------------------------------------------------------------------------
// SecureStore keys — v1-suffixed so a schema migration later doesn't clobber
// an existing on-device private key. Touch these ONLY through this module.
// ----------------------------------------------------------------------------
export const IDENTITY_KEYS = {
  secretKey: 'kinetik.identity.sk.v1',
  createdAt: 'kinetik.identity.created.v1',
} as const;

export type NodeIdentity = {
  /** 32-byte Ed25519 secret-key seed. Never leaves the device. */
  secretKey: Uint8Array;
  /** 32-byte Ed25519 public key. Safe to share / emboss on cards. */
  publicKey: Uint8Array;
  /** Public key as a 64-char lowercase hex string. */
  publicKeyHex: string;
  /** First 16 chars of SHA-256(publicKey). Stable per-device identifier. */
  fingerprint: string;
  /** Human-readable node ID: KINETIK-NODE-XXXXXXXX (8 uppercase hex). */
  nodeId: string;
  /** ms-since-epoch when this keypair was first minted on this device. */
  createdAt: number;
};

// ----------------------------------------------------------------------------
// Byte <-> hex helpers. Local to this module because @noble/ed25519's etc
// helpers accept broad typed-array inputs, and we only care about plain hex.
// ----------------------------------------------------------------------------
const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): Uint8Array => {
  const clean = hex.toLowerCase();
  const len = clean.length / 2;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

// ----------------------------------------------------------------------------
// Minimal UTF-8 encoder. RN 0.81 ships TextEncoder, but signing is critical
// enough that we carry our own fallback rather than trust the global.
// ----------------------------------------------------------------------------
const utf8Encode = (s: string): Uint8Array => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(s);
  }
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const c2 = s.charCodeAt(++i);
      c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
      bytes.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f),
      );
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return new Uint8Array(bytes);
};

// ----------------------------------------------------------------------------
// getOrCreateNodeIdentity — the only public entry point for reading identity.
// ----------------------------------------------------------------------------
// On first call ever for a given install, this mints a fresh Ed25519 keypair
// using the runtime CSPRNG, writes the 32-byte secret hex to SecureStore,
// and stamps a createdAt timestamp. On every subsequent call, it rehydrates
// the existing secret and rederives the public key (cheap — ~1ms on device).
//
// The derived fingerprint is the first 16 hex chars of SHA-256(publicKey).
// We hash the raw 32-byte public key (not the hex string) to match the
// standard approach used by SSH, Bitcoin, Ethereum, etc.
// ----------------------------------------------------------------------------
export async function getOrCreateNodeIdentity(): Promise<NodeIdentity> {
  let skHex: string | null = null;
  let createdRaw: string | null = null;
  try {
    skHex = await SecureStore.getItemAsync(IDENTITY_KEYS.secretKey);
    createdRaw = await SecureStore.getItemAsync(IDENTITY_KEYS.createdAt);
  } catch (err) {
    console.warn('[identity] SecureStore read failed:', err);
  }

  let secretKey: Uint8Array;
  let createdAt: number;

  if (skHex && /^[0-9a-f]{64}$/i.test(skHex)) {
    secretKey = fromHex(skHex);
    const parsedCreated = Number(createdRaw);
    createdAt = Number.isFinite(parsedCreated) ? parsedCreated : Date.now();
  } else {
    secretKey = ed.utils.randomSecretKey();
    createdAt = Date.now();
    try {
      await SecureStore.setItemAsync(
        IDENTITY_KEYS.secretKey,
        String(toHex(secretKey)),
      );
      await SecureStore.setItemAsync(
        IDENTITY_KEYS.createdAt,
        String(createdAt),
      );
      console.log('[identity] new sovereign keypair minted');
    } catch (err) {
      console.warn('[identity] SecureStore write failed:', err);
    }
  }

  const publicKeyRaw = await ed.getPublicKeyAsync(secretKey);
  const publicKey = new Uint8Array(publicKeyRaw);
  const publicKeyHex = toHex(publicKey);

  const digest = sha256(publicKey);
  const fingerprint = toHex(digest).slice(0, 16);
  const nodeId = `KINETIK-NODE-${fingerprint.slice(0, 8).toUpperCase()}`;

  return {
    secretKey,
    publicKey,
    publicKeyHex,
    fingerprint,
    nodeId,
    createdAt,
  };
}

// ----------------------------------------------------------------------------
// signMessage — Phase 5 Step 2 will wrap this to emit signed heartbeats.
// Returns a 128-char lowercase hex string (64-byte Ed25519 signature).
// ----------------------------------------------------------------------------
export async function signMessage(
  identity: NodeIdentity,
  message: string,
): Promise<string> {
  const msg = utf8Encode(message);
  const sig = await ed.signAsync(msg, identity.secretKey);
  return toHex(new Uint8Array(sig));
}

// ----------------------------------------------------------------------------
// verifyMessage — symmetry partner for signMessage. Used by future sharing /
// heartbeat-audit flows; kept here so the whole identity surface is one file.
// ----------------------------------------------------------------------------
export async function verifyMessage(
  signatureHex: string,
  message: string,
  publicKeyHex: string,
): Promise<boolean> {
  try {
    const sig = fromHex(signatureHex);
    const msg = utf8Encode(message);
    const pub = fromHex(publicKeyHex);
    return await ed.verifyAsync(sig, msg, pub);
  } catch (err) {
    console.warn('[identity] verify failed:', err);
    return false;
  }
}

// ----------------------------------------------------------------------------
// eraseNodeIdentity — ONLY for the __kinetikResetSecureStore dev helper. A
// user-facing "rotate identity" flow would live in a separate module, since
// rotation invalidates every previously signed heartbeat.
// ----------------------------------------------------------------------------
export async function eraseNodeIdentity(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(IDENTITY_KEYS.secretKey);
    await SecureStore.deleteItemAsync(IDENTITY_KEYS.createdAt);
  } catch (err) {
    console.warn('[identity] erase failed:', err);
  }
}
