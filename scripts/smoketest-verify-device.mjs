// ============================================================================
// Server-side verify-device smoke test.
// ----------------------------------------------------------------------------
// Exercises the partner webhook against the same COMPACT verifier URL shape the
// app emits from packages/kinetik-core/src/proofShare.ts.
// ============================================================================

import { onRequestPost } from "../functions/api/verify-device.js";

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
const VERIFIER_ORIGIN = "https://getkinetik.app/verify/";
const B64URL_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const utf8 = (s) => new TextEncoder().encode(s);

const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const base64UrlEncode = (input) => {
  const bytes = utf8(input);
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

const sha256Hex = async (message) => {
  const buf = await crypto.subtle.digest("SHA-256", utf8(message));
  return toHex(new Uint8Array(buf));
};

const mintProofUrl = async ({ compact }) => {
  const keyPair = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"],
  );
  const publicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", keyPair.publicKey),
  );
  const pubkey = toHex(publicKey);
  const fingerprint = (await sha256Hex(pubkey)).slice(0, 16);
  const mintedAt = Date.now() - 86_400_000;
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId: `KINETIK-NODE-${fingerprint.slice(0, 8).toUpperCase()}`,
    pubkey,
    mintedAt,
    issuedAt: Date.now(),
    lifetimeBeats: 42,
    firstBeatTs: mintedAt + 30_000,
    chainTip: (await sha256Hex("verify-device-smoketest")).slice(0, 16),
    attribution: PROOF_ATTRIBUTION,
    sensors: null,
  };
  const message = stableStringify(payload);
  const signature = toHex(
    new Uint8Array(await crypto.subtle.sign("Ed25519", keyPair.privateKey, utf8(message))),
  );
  const hash = (await sha256Hex(message)).slice(0, 16);
  const envelope = compact
    ? { payload, signature }
    : { payload, message, signature, hash };
  const proofUrl = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify(envelope))}`;
  return { payload, proofUrl };
};

const callEndpoint = async (proofUrl) => {
  const response = await onRequestPost({
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    }),
  });
  return response.json();
};

const assert = (name, condition) => {
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) {
    throw new Error(name);
  }
};

console.log("[1] COMPACT app verifier URL verifies through partner webhook");
{
  const { payload, proofUrl } = await mintProofUrl({ compact: true });
  const result = await callEndpoint(proofUrl);
  assert("compact proof is accepted", result.valid === true);
  assert("nodeId returned", result.nodeId === payload.nodeId);
  assert("mintedAt returned", result.mintedAt === payload.mintedAt);
}

console.log("\n[2] FULL artifact URL still verifies through partner webhook");
{
  const { payload, proofUrl } = await mintProofUrl({ compact: false });
  const result = await callEndpoint(proofUrl);
  assert("full proof is accepted", result.valid === true);
  assert("pubkey returned", result.pubkey === payload.pubkey);
}

console.log("\nverify-device smoke test passed.");
