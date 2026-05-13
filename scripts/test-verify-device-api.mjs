// ============================================================================
// Regression checks for /api/verify-device's proof envelope and identity gates.
//
// Run: node scripts/test-verify-device-api.mjs
// ============================================================================

import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";

import { onRequestPost } from "../functions/api/verify-device.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
const VERIFIER_ORIGIN = "https://getkinetik.app/verify/";

const utf8 = (s) => new TextEncoder().encode(s);
const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const stableStringify = (obj) => {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(",")}}`;
};

const base64UrlEncode = (input) =>
  Buffer.from(input, "utf8").toString("base64url");

const nodeIdForPubkey = (pubkeyBytes) =>
  `KINETIK-NODE-${toHex(sha256(pubkeyBytes)).slice(0, 8).toUpperCase()}`;

class MockKv {
  constructor() {
    this.store = new Map();
  }

  async get(key, opts) {
    const value = this.store.get(key);
    if (value == null) return null;
    return opts?.type === "json" ? JSON.parse(value) : value;
  }

  async put(key, value) {
    this.store.set(key, value);
  }
}

async function postProof(proofUrl, kv = new MockKv()) {
  const waitUntilPromises = [];
  const response = await onRequestPost({
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    }),
    env: { KINETIK_KV: kv },
    waitUntil(promise) {
      waitUntilPromises.push(promise);
    },
  });
  await Promise.all(waitUntilPromises);
  return { body: await response.json(), kv };
}

async function mintProof(overrides = {}) {
  const sk = ed.utils.randomSecretKey();
  const pubkeyBytes = await ed.getPublicKeyAsync(sk);
  const pubkey = toHex(pubkeyBytes);
  const now = Date.now();
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId: nodeIdForPubkey(pubkeyBytes),
    pubkey,
    mintedAt: now,
    issuedAt: now,
    lifetimeBeats: 0,
    firstBeatTs: null,
    chainTip: null,
    attribution: PROOF_ATTRIBUTION,
    sensors: null,
    ...overrides,
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const hash = toHex(sha256(utf8(message))).slice(0, 16);
  return { payload, message, signature, hash };
}

const assert = (name, condition, detail = "") => {
  if (!condition) {
    console.error(`FAIL  ${name}${detail ? `\n  ${detail}` : ""}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS  ${name}`);
};

const fullProof = await mintProof();
const fullUrl = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify(fullProof))}`;
const fullResult = await postProof(fullUrl);
assert("full proof verifies", fullResult.body.valid === true, JSON.stringify(fullResult.body));
assert(
  "full proof caches score under derived nodeId",
  fullResult.kv.store.has(`score:${fullProof.payload.nodeId}`),
);

const compactProof = {
  payload: fullProof.payload,
  signature: fullProof.signature,
};
const compactUrl = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify(compactProof))}`;
const compactResult = await postProof(compactUrl);
assert(
  "compact proof without hash verifies",
  compactResult.body.valid === true,
  JSON.stringify(compactResult.body),
);

const badHashUrl = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(
  JSON.stringify({ ...compactProof, hash: "0000000000000000" }),
)}`;
const badHashResult = await postProof(badHashUrl);
assert(
  "supplied wrong hash is rejected",
  badHashResult.body.valid === false && badHashResult.body.reason === "hash_mismatch",
  JSON.stringify(badHashResult.body),
);

const victimNodeId = "KINETIK-NODE-DEADBEEF";
const spoofed = await mintProof({ nodeId: victimNodeId });
const spoofedUrl = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify(spoofed))}`;
const spoofedResult = await postProof(spoofedUrl);
assert(
  "signed spoofed nodeId is rejected",
  spoofedResult.body.valid === false && spoofedResult.body.reason === "node_id_mismatch",
  JSON.stringify(spoofedResult.body),
);
assert(
  "spoofed nodeId does not poison score cache",
  !spoofedResult.kv.store.has(`score:${victimNodeId}`),
);
assert(
  "spoofed nodeId does not poison bureau context",
  !spoofedResult.kv.store.has(`bureau:${victimNodeId}`),
);

if (process.exitCode) {
  process.exit(process.exitCode);
}
