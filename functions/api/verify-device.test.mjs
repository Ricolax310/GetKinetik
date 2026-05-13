import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";

import { onRequestPost } from "./verify-device.js";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}
if (!globalThis.atob) {
  globalThis.atob = (b64) => Buffer.from(b64, "base64").toString("binary");
}

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
const utf8 = (s) => new TextEncoder().encode(s);

async function mintEnvelope() {
  const sk = ed.utils.randomSecretKey();
  const pk = await ed.getPublicKeyAsync(sk);
  const pubkey = toHex(pk);
  const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
  const now = Date.now();
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId,
    pubkey,
    mintedAt: now - 86_400_000,
    issuedAt: now,
    lifetimeBeats: 2880,
    firstBeatTs: now - 86_395_000,
    chainTip: toHex(sha256(utf8(`${nodeId}:tip`))).slice(0, 16),
    attribution: PROOF_ATTRIBUTION,
    sensors: { lux: 412, motionRms: 0.06, pressureHpa: 1014.07 },
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const hash = toHex(sha256(utf8(message))).slice(0, 16);

  return { payload, signature, hash };
}

function toProofUrl(envelope) {
  return `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify(envelope))}`;
}

async function postProofUrl(proofUrl) {
  const response = await onRequestPost({
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    }),
  });
  assert.equal(response.status, 200);
  return response.json();
}

const fullEnvelope = await mintEnvelope();

{
  const compactUrl = toProofUrl({
    payload: fullEnvelope.payload,
    signature: fullEnvelope.signature,
  });
  const result = await postProofUrl(compactUrl);
  assert.equal(result.valid, true);
  assert.equal(result.nodeId, fullEnvelope.payload.nodeId);
  assert.equal(result.pubkey, fullEnvelope.payload.pubkey);
}

{
  const fullUrl = toProofUrl(fullEnvelope);
  const result = await postProofUrl(fullUrl);
  assert.equal(result.valid, true);
  assert.equal(result.nodeId, fullEnvelope.payload.nodeId);
}

{
  const badHashUrl = toProofUrl({ ...fullEnvelope, hash: "0".repeat(16) });
  const result = await postProofUrl(badHashUrl);
  assert.deepEqual(result, { valid: false, reason: "hash_mismatch" });
}

console.log("verify-device compact proof regression passed");
