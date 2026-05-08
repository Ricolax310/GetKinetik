import assert from "node:assert/strict";

import { onRequestPost } from "./verify-device.js";

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";

const toHex = (bytes) =>
  Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");

const utf8 = (s) => new TextEncoder().encode(s);

const stableStringify = (obj) => {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(",")}}`;
};

const base64UrlEncode = (s) =>
  Buffer.from(s)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function makeProofUrl(payload) {
  const keyPair = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"],
  );
  const pubkey = toHex(await crypto.subtle.exportKey("raw", keyPair.publicKey));
  const signedPayload = { ...payload, pubkey };
  const message = stableStringify(signedPayload);
  const signature = toHex(
    await crypto.subtle.sign("Ed25519", keyPair.privateKey, utf8(message)),
  );
  const digest = await crypto.subtle.digest("SHA-256", utf8(message));
  const envelope = {
    payload: signedPayload,
    signature,
    hash: toHex(digest).slice(0, 16),
  };

  return `https://getkinetik.app/verify/#proof=${base64UrlEncode(JSON.stringify(envelope))}`;
}

async function postProof(proofUrl) {
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

{
  const mintedAt = 1714000000000;
  const issuedAt = 1714600000000;
  const proofUrl = await makeProofUrl({
    v: 2,
    kind: "proof-of-origin",
    nodeId: "KINETIK-NODE-TEST0001",
    mintedAt,
    issuedAt,
    lifetimeBeats: 100,
    firstBeatTs: mintedAt + 30000,
    chainTip: "0000000000000000",
    attribution: PROOF_ATTRIBUTION,
    sensors: null,
  });

  const result = await postProof(proofUrl);

  assert.equal(result.valid, true);
  assert.equal(result.mintedAt, mintedAt);
  assert.equal(result.issuedAt, issuedAt);
}

console.log("verify-device API timestamp contract passed");
