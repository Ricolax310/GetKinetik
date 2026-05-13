// ============================================================================
// @getkinetik/verify — independent verifier for GETKINETIK signed artifacts.
// ----------------------------------------------------------------------------
// This package is the byte-for-byte equivalent of the verifier shipped at
// https://getkinetik.app/verify/. It exists so partner networks, lenders,
// auditors, and any third-party integrator can confirm a Proof of Origin,
// signed heartbeat, or signed earning *without ever calling our servers* and
// without copying source files into their own repo.
//
// CONTRACT — must match packages/kinetik-core/src/proof.ts and
// packages/kinetik-core/src/heartbeat.ts in the GETKINETIK app, AND
// landing/verify/verifier.js for the public web verifier:
//
//   · stableStringify()    — shallow lex-sorted serializer
//   · sha256(message)[:16] — embedded `hash` truncation
//   · ed25519.verifyAsync  — Ed25519 signature scheme + SHA-512 wiring
//   · PROOF_ATTRIBUTION    — ownership stamp constant
//
// If any of those four constants drift between this package and the app,
// previously-minted artifacts will silently fail to verify. Bump VERSION
// below + add a CHANGELOG entry on any serialization change.
//
// ZERO RUNTIME NETWORK CALLS. ZERO HIDDEN STATE. PURE FUNCTION OF INPUT.
// ============================================================================

import * as ed from '@noble/ed25519';
import { sha256, sha512 } from '@noble/hashes/sha2.js';

// @noble/ed25519 v3 freezes `ed.hashes` but the fields are writable. We
// override sha512 + sha512Async with the pure-JS @noble/hashes implementation
// so the verifier works in any runtime — Node, browser, edge worker — without
// depending on WebCrypto's `crypto.subtle.digest` being available.
ed.hashes.sha512 = sha512 as unknown as typeof ed.hashes.sha512;
ed.hashes.sha512Async = (async (msg: Uint8Array): Promise<Uint8Array> =>
  sha512(msg)) as typeof ed.hashes.sha512Async;

// ----------------------------------------------------------------------------
// Constants — the cryptographic ownership stamp and protocol fee rate.
// These ARE part of every Proof of Origin / Signed Earning payload, so a
// valid signature already requires that the exact bytes were signed. The
// explicit checks below give clearer failure modes for tampered-but-resigned
// forgery attempts.
// ----------------------------------------------------------------------------
export const PROOF_ATTRIBUTION = 'GETKINETIK by OutFromNothing LLC';
export const PROTOCOL_FEE_RATE = 0.01;

// ----------------------------------------------------------------------------
// BUREAU_PUBKEY — the Genesis Bureau's published Ed25519 verification key.
// Every bureau-signed attestation MUST verify against this exact pubkey for
// `report.checks.bureauOk` to pass. A different valid signature (from any
// other Ed25519 key) will still verify cryptographically — `signatureOk` —
// but fails the `bureauOk` check, surfacing forgery attempts where someone
// tries to mint attestations under a non-bureau key.
//
// PLACEHOLDER: this constant is 64 zero hex chars until the bureau key
// ceremony has been performed (see scripts/mint-bureau-key.mjs). While
// the placeholder is in effect, every attestation's `bureauOk` is false
// because no real bureau pubkey has been published yet. Cryptographic
// verification (`signatureOk`) still works against whatever pubkey is
// embedded in the payload — so test harnesses that mint ephemeral bureau
// keys can exercise the full pipeline.
//
// After the ceremony:
//   1. Replace the constant below with the 64-char hex pubkey output by
//      scripts/mint-bureau-key.mjs.
//   2. Bump VERSION (this is a contract change for every downstream
//      consumer of the verify package).
//   3. Add a CHANGELOG entry noting the bureau key fingerprint and the
//      date of the ceremony.
// ----------------------------------------------------------------------------
export const BUREAU_PUBKEY = '852fbc2bdd7c0243c6ee42462f7d31274fd3be3a0f2125e8eb797b76410dfb26';

/** Package version. Bump this on any change to the contract constants
 *  above (stableStringify shape, sha256 truncation, signature scheme,
 *  attribution string, or the bureau pubkey). Stays in lockstep with
 *  landing/verify/verifier.js.
 *
 *  v0.2.1 (2026-05-13) — Genesis Bureau key minted and published. The
 *  BUREAU_PUBKEY constant above is no longer a placeholder; every
 *  attestation signed by `functions/api/_lib/bureauSign.js` in
 *  production verifies against this exact key. */
export const VERSION = '0.2.1';

// ----------------------------------------------------------------------------
// stableStringify — byte-for-byte equivalent of
// packages/kinetik-core/src/stableJson.ts. Sorts top-level keys
// lexicographically and delegates value serialization to JSON.stringify,
// which is spec-stable across engines for the primitive types used in our
// payloads (string, number, boolean, null) — and for the small structured
// `sensors` object the v:2 schema introduced.
//
// All Sovereign Node payloads are flat at the top level, so the shallow
// sort is sufficient. If future payloads ever embed a deeper nested
// object (other than the existing `sensors` block, whose insertion order
// is enforced by canonicalSensorBlock at sign time), this function AND
// the app-side stableJson must switch to a recursive sort in the same
// commit, with a `v` schema bump.
// ----------------------------------------------------------------------------
export const stableStringify = (obj: Record<string, unknown>): string => {
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(',')}}`;
};

// ----------------------------------------------------------------------------
// Byte / hex / base64url helpers. Local so the package has no dependency
// on the host's helper landscape.
// ----------------------------------------------------------------------------
const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): Uint8Array => {
  const clean = hex.toLowerCase();
  if (!/^[0-9a-f]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error(`invalid hex string (length ${hex.length})`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

// base64url decode, for `#proof=...` URL fragments.
//
// Defensive against the most common real-world failure mode: a user copy-
// pasting a display-truncated URL where the terminal / email client / chat
// app rendered the middle as literal "..." (or the Unicode horizontal
// ellipsis "…"). Without this guard, atob throws an opaque
// "InvalidCharacterError" with no hint that the input was truncated rather
// than corrupt.
const fromBase64Url = (s: string): string => {
  if (typeof s !== 'string' || s.length === 0) {
    throw new Error('Empty or non-string base64url payload');
  }
  if (s.includes('...') || s.includes('\u2026')) {
    throw new Error(
      "URL appears truncated — paste the full link (no '...' / '\u2026'), or scan the QR code instead",
    );
  }
  const cleaned = s.replace(/[^A-Za-z0-9_\-]/g, '');
  if (cleaned.length === 0) {
    throw new Error('No base64url-shaped data found in fragment');
  }
  const pad =
    cleaned.length % 4 === 0 ? '' : '='.repeat(4 - (cleaned.length % 4));
  const b64 = cleaned.replace(/-/g, '+').replace(/_/g, '/') + pad;

  let bin: string;
  if (typeof globalThis.atob === 'function') {
    try {
      bin = globalThis.atob(b64);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`base64url decode failed: ${message}`);
    }
  } else if (typeof Buffer !== 'undefined') {
    bin = Buffer.from(b64, 'base64').toString('binary');
  } else {
    throw new Error(
      'No base64 decoder available (need atob or Node Buffer in this runtime)',
    );
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(out);
};

// ----------------------------------------------------------------------------
// Public types — the shape of artifacts the package accepts and the report
// it returns. All structural — verifyArtifact does no schema-level
// rejection beyond the four required fields (payload, signature, payload.pubkey).
// ----------------------------------------------------------------------------

/** The artifact kinds this verifier recognizes. Anything else is reported
 *  as 'unknown' but still verified at the cryptographic layer.
 *
 *  · proof-of-origin, heartbeat, earning — signed by the DEVICE's Ed25519
 *    key. `payload.pubkey` is the device pubkey; the signature verifies
 *    against it.
 *
 *  · attestation — signed by the BUREAU's Ed25519 key. `payload.pubkey`
 *    is the bureau pubkey (compared against BUREAU_PUBKEY in `bureauOk`);
 *    `payload.subject.pubkey` is the device the attestation is about.
 *    Attestations are bureau evidence, NEVER a verdict / score band. */
export type ArtifactKind =
  | 'proof-of-origin'
  | 'heartbeat'
  | 'earning'
  | 'attestation'
  | 'unknown';

/** A signed artifact as minted by the GETKINETIK app or any byte-equivalent
 *  signer. Two forms are accepted:
 *
 *    FULL    { payload, message, signature, hash }   — as minted on device
 *    COMPACT { payload, signature }                  — QR / URL friendly,
 *                                                      message + hash are
 *                                                      re-derived from payload
 */
export type SignedArtifact = {
  payload: Record<string, unknown>;
  signature: string;
  message?: string;
  hash?: string;
};

/** Per-check result. `null` means N/A for this artifact kind (e.g. heartbeats
 *  carry no attribution; non-earning kinds carry no fee math; non-attestation
 *  kinds carry no bureau check). */
export type VerifyChecks = {
  /** stableStringify(payload) byte-equals the claimed `message`. */
  canonicalMatches: boolean;
  /** sha256(canonicalMessage)[:16] byte-equals the claimed `hash`. */
  hashMatches: boolean;
  /** PROOF_ATTRIBUTION present in payload (proof-of-origin, earning, attestation). */
  attributionOk: boolean | null;
  /** Earning fee is exactly 1% of gross AND net = gross - fee (earnings only). */
  feeIntegrityOk: boolean | null;
  /** payload.pubkey equals BUREAU_PUBKEY (attestation only). False when the
   *  attestation was signed by some other key (or while BUREAU_PUBKEY is the
   *  pre-ceremony placeholder). null for non-attestation artifact kinds. */
  bureauOk: boolean | null;
  /** Ed25519 signature verifies against canonical message + payload.pubkey. */
  signatureOk: boolean;
  /** Error message from the signature pipeline if one was thrown. */
  signatureError: string | null;
};

/** Full verification report. Always returned (never thrown) when `verifyArtifact`
 *  is called with a structurally-valid artifact — failed checks are reflected
 *  in the boolean fields, not exceptions. */
export type VerifyReport = {
  /** Aggregate result: every applicable check passed. */
  valid: boolean;
  kind: ArtifactKind;
  payload: Record<string, unknown>;
  signature: string;
  /** stableStringify(payload). What the signing key actually committed to. */
  canonicalMessage: string;
  /** sha256(canonicalMessage)[:16] — the chain-tip-shaped digest. */
  canonicalHash: string;
  /** sha256(canonicalMessage) full 64-char hex. */
  canonicalHashFull: string;
  /** The `message` field as claimed by the artifact (or canonicalMessage if absent). */
  claimedMessage: string;
  /** The `hash` field as claimed by the artifact (or canonicalHash if absent). */
  claimedHash: string;
  checks: VerifyChecks;
};

const round8 = (n: number): number => Math.round(n * 1e8) / 1e8;

// ----------------------------------------------------------------------------
// verifyArtifact — runs all five checks and returns a structured report.
//
// Throws ONLY on structurally-invalid input (missing payload, malformed
// signature hex, malformed pubkey hex). Any cryptographic or content-level
// failure is reflected in `report.checks.*` and `report.valid`, never as
// an exception — this lets the caller render a clear "what failed and why"
// without having to wrap every call in a try/catch.
// ----------------------------------------------------------------------------
export async function verifyArtifact(
  raw: SignedArtifact,
): Promise<VerifyReport> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('artifact must be a JSON object');
  }
  const { payload, signature: rawSignature } = raw;
  if (!payload || typeof payload !== 'object') {
    throw new Error('artifact missing `payload` object');
  }
  if (
    typeof rawSignature !== 'string' ||
    !/^[0-9a-f]{128}$/i.test(rawSignature)
  ) {
    throw new Error('artifact `signature` must be 128-char hex');
  }
  // Canonicalize signature to lowercase so the rest of the pipeline (and
  // the returned report) always reflect the contract documented above.
  // Uppercase hex is structurally valid Ed25519 input but historically we
  // emit lowercase from the app, so callers can use string equality on
  // report.signature without surprise normalization.
  const signature = rawSignature.toLowerCase();
  const pubkey = (payload as { pubkey?: unknown }).pubkey;
  if (typeof pubkey !== 'string' || !/^[0-9a-f]{64}$/i.test(pubkey)) {
    throw new Error('payload.pubkey must be 64-char hex');
  }

  const canonicalMessage = stableStringify(payload);
  const canonicalHashFull = toHex(sha256(utf8(canonicalMessage)));
  const canonicalHash = canonicalHashFull.slice(0, 16);

  const claimedMessage =
    typeof raw.message === 'string' ? raw.message : canonicalMessage;
  const claimedHash =
    typeof raw.hash === 'string' ? raw.hash.toLowerCase() : canonicalHash;

  const canonicalMatches = claimedMessage === canonicalMessage;
  const hashMatches = claimedHash === canonicalHash;

  const kindRaw = (payload as { kind?: unknown }).kind;
  const isProofOfOrigin = kindRaw === 'proof-of-origin';
  const isEarning = kindRaw === 'earning';
  const isAttestation = kindRaw === 'attestation';

  // Attribution is carried on every artifact kind except heartbeats. The
  // bureau attestation kind embeds the same PROOF_ATTRIBUTION string so a
  // partner can grep for it without knowing the kind in advance.
  const attributionOk: boolean | null =
    isProofOfOrigin || isEarning || isAttestation
      ? (payload as { attribution?: unknown }).attribution ===
        PROOF_ATTRIBUTION
      : null;

  let feeIntegrityOk: boolean | null = null;
  if (isEarning) {
    const grossRaw = (payload as { gross?: unknown }).gross;
    const feeRaw = (payload as { fee?: unknown }).fee;
    const netRaw = (payload as { net?: unknown }).net;
    const gross = typeof grossRaw === 'number' ? grossRaw : 0;
    const expectedFee = round8(gross * PROTOCOL_FEE_RATE);
    const expectedNet = round8(gross - expectedFee);
    feeIntegrityOk =
      typeof feeRaw === 'number' &&
      typeof netRaw === 'number' &&
      Math.abs(feeRaw - expectedFee) < 1e-9 &&
      Math.abs(netRaw - expectedNet) < 1e-9;
  }

  // bureauOk: payload.pubkey is the BUREAU's pubkey (signer), not the
  // device's. We confirm it equals the published BUREAU_PUBKEY constant —
  // this is what prevents a forger from minting attestations under their
  // own key and having partners accept them.
  //
  // Case insensitivity: BUREAU_PUBKEY is stored lowercase, payload pubkey
  // is normalized lowercase by the caller before signing, but compare
  // case-insensitively for defensive robustness.
  const bureauOk: boolean | null = isAttestation
    ? pubkey.toLowerCase() === BUREAU_PUBKEY.toLowerCase()
    : null;

  // We verify against the CANONICAL message, not the claimed one. If the
  // claimed message has been altered to match a different payload,
  // canonicalMatches catches it; the signature verify still passes against
  // canonical — unless the payload itself was re-signed by a different key
  // (in which case signatureOk also fails because pubkey won't match the
  // signer).
  let signatureOk = false;
  let signatureError: string | null = null;
  try {
    const sigBytes = fromHex(signature);
    const pubBytes = fromHex(pubkey);
    const msgBytes = utf8(canonicalMessage);
    signatureOk = await ed.verifyAsync(sigBytes, msgBytes, pubBytes);
  } catch (err) {
    signatureError = err instanceof Error ? err.message : String(err);
  }

  const valid =
    canonicalMatches &&
    hashMatches &&
    (attributionOk === true || attributionOk === null) &&
    (feeIntegrityOk === true || feeIntegrityOk === null) &&
    (bureauOk === true || bureauOk === null) &&
    signatureOk;

  const kind: ArtifactKind =
    kindRaw === 'proof-of-origin' ||
    kindRaw === 'heartbeat' ||
    kindRaw === 'earning' ||
    kindRaw === 'attestation'
      ? kindRaw
      : 'unknown';

  return {
    valid,
    kind,
    payload,
    signature,
    canonicalMessage,
    canonicalHash,
    canonicalHashFull,
    claimedMessage,
    claimedHash,
    checks: {
      canonicalMatches,
      hashMatches,
      attributionOk,
      feeIntegrityOk,
      bureauOk,
      signatureOk,
      signatureError,
    },
  };
}

// ----------------------------------------------------------------------------
// decodeProofUrl — convenience for the QR / URL flow. Given a full verifier
// URL (e.g. https://getkinetik.app/verify/#proof=<base64url>), decode the
// fragment back to the SignedArtifact JSON object the verify pipeline
// accepts. Defensive against truncated / wrapped URLs (see fromBase64Url).
// ----------------------------------------------------------------------------
export function decodeProofUrl(url: string): SignedArtifact {
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('decodeProofUrl: url must be a non-empty string');
  }
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : url;
  const match = fragment.match(/(?:^|&)proof=([^&]+)/);
  if (!match) {
    throw new Error('URL has no #proof= fragment');
  }
  const json = fromBase64Url(decodeURIComponent(match[1] as string));
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`#proof= fragment is not valid JSON: ${message}`);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('#proof= fragment did not decode to an object');
  }
  return parsed as SignedArtifact;
}
