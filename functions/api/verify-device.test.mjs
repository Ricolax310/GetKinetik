import assert from "node:assert/strict";

import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";

import { onRequestPost } from "./verify-device.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";

const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const utf8 = (s) => new TextEncoder().encode(s);
const stableStringify = (obj) => {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(",")}}`;
};
const encodeProof = (artifact) =>
  Buffer.from(JSON.stringify(artifact), "utf8").toString("base64url");

const postVerify = async (proofUrl) => {
  const response = await onRequestPost({
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    }),
  });
  assert.equal(response.status, 200);
  return response.json();
};

const secretKey = ed.utils.randomSecretKey();
const publicKey = await ed.getPublicKeyAsync(secretKey);
const pubkey = toHex(publicKey);
const nodeId = `KINETIK-NODE-${toHex(sha256(publicKey)).slice(0, 8).toUpperCase()}`;
const payload = {
  v: 2,
  kind: "proof-of-origin",
  nodeId,
  pubkey,
  mintedAt: 1714000000000,
  issuedAt: 1714000001234,
  lifetimeBeats: 42,
  firstBeatTs: 1713999000000,
  chainTip: "aaaaaaaaaaaaaaaa",
  attribution: PROOF_ATTRIBUTION,
  sensors: { lux: 200, motionRms: 0.03, pressureHpa: 1015.2 },
};
const message = stableStringify(payload);
const signature = toHex(await ed.signAsync(utf8(message), secretKey));
const hash = toHex(sha256(utf8(message))).slice(0, 16);

{
  const compactProofUrl = `https://getkinetik.app/verify/#proof=${encodeProof({
    payload,
    signature,
  })}`;
  const result = await postVerify(compactProofUrl);
  assert.equal(result.valid, true);
  assert.equal(result.nodeId, nodeId);
  assert.equal(result.mintedAt, payload.issuedAt);
}

{
  const compactProofUrlWithFragmentParams =
    `https://getkinetik.app/verify/#proof=${encodeProof({ payload, signature })}` +
    "&utm_source=test";
  const result = await postVerify(compactProofUrlWithFragmentParams);
  assert.equal(result.valid, true);
}

{
  const fullProofUrl = `https://getkinetik.app/verify/#proof=${encodeProof({
    payload,
    message,
    signature,
    hash,
  })}`;
  const result = await postVerify(fullProofUrl);
  assert.equal(result.valid, true);
}

{
  const tamperedHashUrl = `https://getkinetik.app/verify/#proof=${encodeProof({
    payload,
    signature,
    hash: "0000000000000000",
  })}`;
  const result = await postVerify(tamperedHashUrl);
  assert.deepEqual(result, { valid: false, reason: "hash_mismatch" });
}

{
  const tamperedMessageUrl = `https://getkinetik.app/verify/#proof=${encodeProof({
    payload,
    message: `${message} `,
    signature,
    hash,
  })}`;
  const result = await postVerify(tamperedMessageUrl);
  assert.deepEqual(result, { valid: false, reason: "message_mismatch" });
}

console.log("verify-device API tests passed");
