// ============================================================================
// Proof export — turn a SignedProofOfOrigin into something portable.
// ----------------------------------------------------------------------------
// Two export surfaces:
//
//   1. buildVerifierUrl(proof)   → a full https:// URL that, when opened in
//                                   a browser, auto-verifies the artifact.
//                                   This is the string rendered inside the
//                                   QR code on the Proof of Origin card.
//
//   2. shareProof(proof)          → opens the native share sheet with the
//                                   full signed JSON as the message. Any
//                                   messenger (Signal, WhatsApp, email,
//                                   even copy-to-clipboard) receives the
//                                   same canonical payload the verifier
//                                   accepts.
//
// URL design — COMPACT form, base64url-encoded in the fragment:
//
//     https://getkinetik.app/verify/#proof=<base64url(JSON({payload,signature}))>
//
// Why COMPACT (no `message`, no `hash`) — the verifier re-derives both from
// `payload` via stableStringify, so including them in the QR payload would
// be redundant and bloat the QR dimensions. A typical proof encodes to
// ~720 base64url chars, which fits in a QR code version ~18 at medium
// error correction (~85x85 cells) — dense but reliably scannable on a
// phone screen at normal viewing distance.
//
// Fragment (not query): browsers never send URL fragments to servers, so
// even if verify.getkinetik.app had logging enabled (it does not), the
// signed artifact would remain client-side.
// ============================================================================

import { Platform, Share } from 'react-native';

import type { SignedProofOfOrigin } from './proof';

// ----------------------------------------------------------------------------
// The canonical verifier origin. Changing this shifts every future QR code
// minted by the app, so treat it as a hard-coded constant — NOT an env var.
// If the verifier moves, bump the app version in lockstep with the change
// so old QR codes remain traceable to the old verifier URL.
// ----------------------------------------------------------------------------
export const VERIFIER_ORIGIN = 'https://getkinetik.app/verify/';

// ----------------------------------------------------------------------------
// base64url encoder — pure JS, no btoa dependency.
// ----------------------------------------------------------------------------
// React Native's Hermes exposes global btoa in recent versions, but the
// encoder needs to run before any check on that global and must work on
// any RN runtime the app ships to. We therefore walk the UTF-8 bytes
// directly and emit base64url chars (the `-` and `_` variant, no padding),
// which matches the verifier's fromBase64Url helper byte-for-byte.
// ----------------------------------------------------------------------------
const B64URL_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const base64UrlEncode = (input: string): string => {
  const bytes = new TextEncoder().encode(input);
  let out = '';
  let i = 0;
  const n = bytes.length;
  while (i < n) {
    const b1 = bytes[i++];
    const b2 = i < n ? bytes[i++] : 0;
    const b3 = i < n ? bytes[i++] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    out += B64URL_CHARS[(triplet >> 18) & 0x3f];
    out += B64URL_CHARS[(triplet >> 12) & 0x3f];
    out += B64URL_CHARS[(triplet >> 6) & 0x3f];
    out += B64URL_CHARS[triplet & 0x3f];
  }
  // Strip padding that corresponds to synthetic trailing zero bytes.
  const rem = n % 3;
  if (rem === 1) return out.slice(0, -2);
  if (rem === 2) return out.slice(0, -1);
  return out;
};

// ----------------------------------------------------------------------------
// buildVerifierUrl — COMPACT JSON body, base64url'd into the fragment.
// ----------------------------------------------------------------------------
// The verifier accepts both FULL {payload, message, signature, hash} and
// COMPACT {payload, signature}; COMPACT is what we emit here because it
// produces the smallest possible QR. JSON.stringify is fine — the QR
// carrier doesn't care about key order (the verifier re-stringifies via
// stableStringify inside).
// ----------------------------------------------------------------------------
export const buildVerifierUrl = (proof: SignedProofOfOrigin): string => {
  const compact = { payload: proof.payload, signature: proof.signature };
  const json = JSON.stringify(compact);
  const encoded = base64UrlEncode(json);
  return `${VERIFIER_ORIGIN}#proof=${encoded}`;
};

// ----------------------------------------------------------------------------
// shareProof — native share sheet for the FULL signed artifact.
// ----------------------------------------------------------------------------
// On Android, Share.share({ message }) opens the standard chooser with the
// JSON as a text share. On iOS the dialog key is `message` as well, though
// iOS historically prefers `url` for rich link previews — we ship the JSON
// as `message` on both platforms so every recipient gets the same bytes
// regardless of how their messenger handles rich links.
//
// The caller is responsible for UI feedback. This function just wraps the
// Share API so we can swap implementations (for example, if we later add
// an in-app contacts sheet) without touching the card component.
// ----------------------------------------------------------------------------
export const shareProof = async (proof: SignedProofOfOrigin): Promise<void> => {
  const json = JSON.stringify(proof, null, 2);
  const title = `${proof.payload.nodeId} — Proof of Origin`;
  await Share.share(
    Platform.OS === 'ios'
      ? { message: json, title }
      : { message: json, title },
  );
};
