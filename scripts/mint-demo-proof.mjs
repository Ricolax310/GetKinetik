// ============================================================================
// Mint a one-shot demonstration Proof-of-Origin URL for partner outreach.
// ----------------------------------------------------------------------------
// Spins up a throwaway Ed25519 keypair, signs a realistic v:2 Proof of Origin
// payload (with sensor block), encodes it into the verifier's URL fragment
// shape, and prints the link. The keypair is discarded — the artifact stays
// permanently valid because verification only needs the embedded public key.
//
// Run with:    node scripts/mint-demo-proof.mjs
//
// The URL byte format is contract-locked to:
//   landing/verify/verifier.js              (browser verifier)
//   landing/verify/smoketest-url.mjs        (URL round-trip regression)
//   packages/kinetik-core/src/proof.ts      (app signer)
//   packages/kinetik-core/src/proofShare.ts (app URL encoder)
// If any of those drift, this script's URL stops verifying. That's the
// failure mode you want — the binding is the whole point.
// ============================================================================

import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
const VERIFIER_ORIGIN = "https://getkinetik.app/verify/";

const B64URL_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const base64UrlEncode = (input) => {
  const bytes = new TextEncoder().encode(input);
  let out = "";
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
  const rem = n % 3;
  if (rem === 1) return out.slice(0, -2);
  if (rem === 2) return out.slice(0, -1);
  return out;
};

const stableStringify = (obj) => {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(",")}}`;
};

const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};
const utf8 = (s) => new TextEncoder().encode(s);

async function main() {
  // --- Keypair (throwaway — only the public key matters for verification) ---
  const sk = ed.utils.randomSecretKey();
  const pk = await ed.getPublicKeyAsync(sk);
  const pubkey = toHex(pk);
  const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;

  // --- Realistic timing: minted 9 days ago, issued just now -----------------
  const nowMs = Date.now();
  const dayMs = 86_400_000;
  const mintedAt = nowMs - 9 * dayMs;
  const firstBeatTs = mintedAt + 5_000;

  // --- Lifetime beats: 9 days * 24 hours * 120 (one beat / 30s) -------------
  // Slight under-count to look organic, not synthetic.
  const lifetimeBeats = 25_847;

  // --- Chain tip: SHA-256 of a deterministic-ish seed, truncated 16 hex ----
  const chainTip = toHex(sha256(utf8(`${nodeId}:${lifetimeBeats}:demo`))).slice(
    0,
    16,
  );

  // --- Sensor block (lex-sorted keys per canonicalSensorBlock) --------------
  // Indoor desk, ambient light, mild ambient motion, sea-level pressure.
  const sensors = {
    lux: 412,
    motionRms: 0.06,
    pressureHpa: 1014.07,
  };

  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId,
    pubkey,
    mintedAt,
    issuedAt: nowMs,
    lifetimeBeats,
    firstBeatTs,
    chainTip,
    attribution: PROOF_ATTRIBUTION,
    sensors,
  };

  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));

  // --- Self-verify before we hand the URL out ------------------------------
  const sigOk = await ed.verifyAsync(
    fromHex(signature),
    utf8(message),
    fromHex(pubkey),
  );
  if (!sigOk) {
    console.error("self-verification failed — refusing to print artifact");
    process.exit(1);
  }

  const compact = { payload, signature };
  const url = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify(compact))}`;

  console.log("");
  console.log("=== GETKINETIK Demo Proof-of-Origin URL ===");
  console.log("");
  console.log(`nodeId          ${nodeId}`);
  console.log(`pubkey          ${pubkey}`);
  console.log(`mintedAt        ${new Date(mintedAt).toISOString()}`);
  console.log(`issuedAt        ${new Date(nowMs).toISOString()}`);
  console.log(`lifetimeBeats   ${lifetimeBeats.toLocaleString()}`);
  console.log(`chainTip        ${chainTip}`);
  console.log(`sensors         lux=${sensors.lux} motionRms=${sensors.motionRms} pressureHpa=${sensors.pressureHpa}`);
  console.log(`url length      ${url.length} chars`);
  console.log("");
  console.log("URL (paste into browser, or share with partner):");
  console.log("");
  console.log(url);
  console.log("");
}

main().catch((err) => {
  console.error("crashed:", err);
  process.exit(2);
});
