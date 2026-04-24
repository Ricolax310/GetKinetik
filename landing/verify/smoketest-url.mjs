// ============================================================================
// URL round-trip smoke test — confirms the app's buildVerifierUrl() output
// decodes cleanly through the verifier's fromBase64Url + verifyArtifact.
// Run with:    node landing/verify/smoketest-url.mjs
//
// This catches any drift between the app's base64url encoder and the
// verifier's decoder — the contract that makes QR codes actually work.
// ============================================================================

import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
const VERIFIER_ORIGIN = "https://getkinetik.app/verify/";

// ---- App-side encoder (copied from src/lib/proofShare.ts verbatim) ----
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

// ---- Verifier-side decoder (copied from verifier.js fromBase64Url) ----
const fromBase64Url = (s) => {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = Buffer.from(b64, "base64").toString("binary");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
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

async function run() {
  let failures = 0;
  const assert = (name, cond) => {
    console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`);
    if (!cond) failures += 1;
  };

  console.log("[1] App mints proof → builds URL → verifier decodes → valid");
  const sk = ed.utils.randomSecretKey();
  const pk = await ed.getPublicKeyAsync(sk);
  const pubkey = toHex(pk);
  const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
  const payload = {
    v: 1,
    kind: "proof-of-origin",
    nodeId,
    pubkey,
    mintedAt: Date.now() - 86400000,
    issuedAt: Date.now(),
    lifetimeBeats: 42,
    firstBeatTs: Date.now() - 60000,
    chainTip: toHex(sha256(utf8("e2e"))).slice(0, 16),
    attribution: PROOF_ATTRIBUTION,
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));

  // App-side: build the URL the QR encodes.
  const compact = { payload, signature };
  const url = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify(compact))}`;
  console.log(`  URL length: ${url.length} chars`);
  assert("URL starts with verifier origin", url.startsWith(VERIFIER_ORIGIN));
  assert("URL contains fragment", url.includes("#proof="));

  // Verifier-side: extract, decode, parse, verify.
  const frag = url.split("#proof=")[1];
  const json = fromBase64Url(frag);
  const decoded = JSON.parse(json);

  assert("decoded payload.nodeId matches", decoded.payload.nodeId === nodeId);
  assert("decoded payload.pubkey matches", decoded.payload.pubkey === pubkey);
  assert("decoded signature matches", decoded.signature === signature);

  // Now run the full verifier check against the decoded compact artifact.
  const canonical = stableStringify(decoded.payload);
  const sigOk = await ed.verifyAsync(
    fromHex(decoded.signature),
    utf8(canonical),
    fromHex(decoded.payload.pubkey),
  );
  assert("verifier signature check passes", sigOk);
  assert(
    "canonical message matches original signed message",
    canonical === message,
  );

  console.log("\n[2] Unicode + emoji payload encodes safely");
  const weird = {
    v: 1,
    kind: "proof-of-origin",
    nodeId: "KINETIK-NODE-ÜNÏCØDÉ",
    pubkey,
    mintedAt: 0,
    issuedAt: 0,
    lifetimeBeats: 0,
    firstBeatTs: null,
    chainTip: null,
    attribution: PROOF_ATTRIBUTION,
  };
  const wmsg = stableStringify(weird);
  const wsig = toHex(await ed.signAsync(utf8(wmsg), sk));
  const wurl = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify({ payload: weird, signature: wsig }))}`;
  const wdecoded = JSON.parse(fromBase64Url(wurl.split("#proof=")[1]));
  assert("unicode nodeId round-trips", wdecoded.payload.nodeId === weird.nodeId);
  const wsigOk = await ed.verifyAsync(
    fromHex(wdecoded.signature),
    utf8(stableStringify(wdecoded.payload)),
    fromHex(wdecoded.payload.pubkey),
  );
  assert("unicode proof verifies after round-trip", wsigOk);

  console.log("\n" + "-".repeat(56));
  if (failures === 0) {
    console.log("URL ROUND-TRIP PASSES — QR codes will verify cleanly.");
    process.exit(0);
  } else {
    console.log(`${failures} CHECK(S) FAILED.`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("crashed:", err);
  process.exit(2);
});
