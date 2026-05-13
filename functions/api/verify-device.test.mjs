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
const base64url = (s) =>
  Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function mintProof({ nodeIdOverride } = {}) {
  const sk = ed.utils.randomSecretKey();
  const pk = await ed.getPublicKeyAsync(sk);
  const pubkey = toHex(pk);
  const nodeId =
    nodeIdOverride ?? `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId,
    pubkey,
    mintedAt: Date.now() - 86400000,
    issuedAt: Date.now(),
    lifetimeBeats: 25000,
    firstBeatTs: Date.now() - 9 * 86400000,
    chainTip: toHex(sha256(utf8("api-regression"))).slice(0, 16),
    attribution: PROOF_ATTRIBUTION,
    sensors: { lux: 412, motionRms: 0.06, pressureHpa: 1014.07 },
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const hash = toHex(sha256(utf8(message))).slice(0, 16);
  const envelope = { payload, message, signature, hash };
  return {
    expectedNodeId: `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`,
    proofUrl: `https://getkinetik.app/verify/#proof=${base64url(JSON.stringify(envelope))}`,
  };
}

async function postProof(proofUrl) {
  const kvWrites = [];
  const response = await onRequestPost({
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    }),
    env: {
      KINETIK_KV: {
        put: async (...args) => {
          kvWrites.push(args);
        },
      },
    },
    waitUntil: (promise) => promise,
  });
  return { body: await response.json(), kvWrites };
}

let failures = 0;
const assert = (cond, label) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures += 1;
};

{
  const { proofUrl, expectedNodeId } = await mintProof();
  const { body, kvWrites } = await postProof(proofUrl);
  assert(body.valid === true, "valid proof verifies");
  assert(body.nodeId === expectedNodeId, "valid proof returns derived nodeId");
  assert(kvWrites.length === 1, "valid proof is cached under nodeId");
}

{
  const { proofUrl, expectedNodeId } = await mintProof({
    nodeIdOverride: "KINETIK-NODE-DEADBEEF",
  });
  const { body, kvWrites } = await postProof(proofUrl);
  assert(body.valid === false, "spoofed nodeId is rejected");
  assert(
    body.reason === "node_id_pubkey_mismatch",
    "spoofed nodeId returns binding reason",
  );
  assert(body.expectedNodeId === expectedNodeId, "response exposes derived nodeId");
  assert(kvWrites.length === 0, "spoofed nodeId is not cached");
}

process.exit(failures === 0 ? 0 : 1);
