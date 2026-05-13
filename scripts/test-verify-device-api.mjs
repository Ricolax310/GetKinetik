import assert from "node:assert/strict";

import * as ed from "../landing/verify/vendor/ed25519.js";
import { sha256, sha512 } from "../landing/verify/vendor/sha2.js";
import { onRequestPost } from "../functions/api/verify-device.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
const VERIFY_ORIGIN = "https://getkinetik.app/verify/";

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

class MockKV {
  constructor() {
    this.store = new Map();
    this.writes = [];
  }

  async get(key, options) {
    const raw = this.store.get(key);
    if (raw == null) return null;
    if (options?.type === "json") return JSON.parse(raw);
    return raw;
  }

  async put(key, value, options) {
    this.writes.push({ key, value, options });
    this.store.set(key, value);
  }
}

async function makeProof({ payloadOverrides = {}, includeHash = false, hashOverride } = {}) {
  const secretKey = ed.utils.randomSecretKey();
  const publicKey = await ed.getPublicKeyAsync(secretKey);
  const pubkey = toHex(publicKey);
  const derivedNodeId = `KINETIK-NODE-${toHex(sha256(publicKey)).slice(0, 8).toUpperCase()}`;
  const now = Date.now();
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId: derivedNodeId,
    pubkey,
    mintedAt: now,
    issuedAt: now,
    lifetimeBeats: 0,
    firstBeatTs: null,
    chainTip: null,
    attribution: PROOF_ATTRIBUTION,
    sensors: null,
    ...payloadOverrides,
  };

  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), secretKey));
  const hash = toHex(sha256(utf8(message))).slice(0, 16);
  const envelope = { payload, signature };
  if (includeHash) envelope.hash = hashOverride ?? hash;

  return {
    derivedNodeId,
    payload,
    hash,
    proofUrl: `${VERIFY_ORIGIN}#proof=${Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url")}`,
  };
}

async function verify(proofUrl, kv = new MockKV()) {
  const waitUntilPromises = [];
  const response = await onRequestPost({
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    }),
    env: { KINETIK_KV: kv },
    waitUntil: (promise) => waitUntilPromises.push(Promise.resolve(promise)),
  });
  const body = await response.json();
  await Promise.all(waitUntilPromises);
  return { body, kv };
}

async function testCompactProofAccepted() {
  const proof = await makeProof();
  const { body, kv } = await verify(proof.proofUrl);

  assert.equal(body.valid, true);
  assert.equal(body.nodeId, proof.derivedNodeId);
  assert.equal(body.pubkey, proof.payload.pubkey);
  assert.equal(kv.store.has(`bureau:${proof.derivedNodeId}`), true);
  assert.equal(kv.store.has(`score:${proof.derivedNodeId}`), true);
}

async function testWrongHashRejected() {
  const proof = await makeProof({
    includeHash: true,
    hashOverride: "0000000000000000",
  });
  const { body } = await verify(proof.proofUrl);

  assert.equal(body.valid, false);
  assert.equal(body.reason, "hash_mismatch");
}

async function testNodeIdMustMatchPubkey() {
  const first = await makeProof();
  const forgedNodeId =
    first.derivedNodeId === "KINETIK-NODE-00000000"
      ? "KINETIK-NODE-FFFFFFFF"
      : "KINETIK-NODE-00000000";
  const proof = await makeProof({ payloadOverrides: { nodeId: forgedNodeId } });
  const kv = new MockKV();
  const { body } = await verify(proof.proofUrl, kv);

  assert.equal(body.valid, false);
  assert.equal(body.reason, "node_id_mismatch");
  assert.equal(kv.writes.length, 0);
}

async function testImplausibleBeatRateDoesNotAdvancePeak() {
  const proof = await makeProof({
    payloadOverrides: {
      firstBeatTs: Date.now() - 180 * 86_400_000,
      lifetimeBeats: 1_000_000,
    },
  });
  const { body, kv } = await verify(proof.proofUrl);

  assert.equal(body.valid, true);
  assert.equal(body.scoreBand, "TAMPERED");
  assert.equal(body.tamperFlags.includes("beat_rate_implausible"), true);

  const bureau = JSON.parse(kv.store.get(`bureau:${proof.derivedNodeId}`));
  assert.equal(bureau.peakLifetimeBeats, 0);
  assert.equal(typeof bureau.firstSeenMs, "number");
  assert.equal(typeof bureau.lastSeenMs, "number");
}

const tests = [
  testCompactProofAccepted,
  testWrongHashRejected,
  testNodeIdMustMatchPubkey,
  testImplausibleBeatRateDoesNotAdvancePeak,
];

let passed = 0;
for (const test of tests) {
  await test();
  passed++;
  console.log(`PASS ${test.name}`);
}

console.log(`\n${passed}/${tests.length} verify-device API cases pass.`);
