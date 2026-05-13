// ============================================================================
// /api/verify-device regression tests.
//
// Exercises the Cloudflare Function directly so the server-side verifier stays
// compatible with app-generated compact QR URLs and rejects signed nodeId/pubkey
// mismatches before they can poison bureau KV state.
//
// Run: node scripts/test-verify-device-api.mjs
// ============================================================================

import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";

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

const base64UrlEncode = (input) =>
  Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

function makeKv(initialEntries = []) {
  const store = new Map(initialEntries);
  return {
    store,
    async get(key, options = {}) {
      const value = store.get(key);
      if (value == null) return null;
      return options.type === "json" ? JSON.parse(value) : value;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

async function makeIdentity() {
  const secretKey = ed.utils.randomSecretKey();
  const publicKey = await ed.getPublicKeyAsync(secretKey);
  const pubkey = toHex(publicKey);
  const nodeId = `KINETIK-NODE-${toHex(sha256(publicKey)).slice(0, 8).toUpperCase()}`;
  return { secretKey, publicKey, pubkey, nodeId };
}

async function mintProof(identity, overrides = {}, options = {}) {
  const now = options.issuedAt ?? Date.now();
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId: identity.nodeId,
    pubkey: identity.pubkey,
    mintedAt: now - 60_000,
    issuedAt: now,
    lifetimeBeats: 0,
    firstBeatTs: null,
    chainTip: null,
    attribution: PROOF_ATTRIBUTION,
    sensors: null,
    ...overrides,
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), identity.secretKey));
  const hash = toHex(sha256(utf8(message))).slice(0, 16);
  const envelope = { payload, signature };
  if (options.includeHash) envelope.hash = options.hashOverride ?? hash;
  const proofUrl = `${VERIFY_ORIGIN}#proof=${base64UrlEncode(JSON.stringify(envelope))}`;
  return { payload, signature, hash, proofUrl };
}

async function postProof(proofUrl, kv = makeKv()) {
  const waitUntil = [];
  const ctx = {
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    }),
    env: { KINETIK_KV: kv },
    waitUntil(promise) {
      waitUntil.push(Promise.resolve(promise));
    },
  };
  const response = await onRequestPost(ctx);
  const body = await response.json();
  await Promise.all(waitUntil);
  return { response, body, kv };
}

let failures = 0;
function assert(label, condition) {
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) failures += 1;
}

console.log("[1] Compact app proof without hash verifies");
{
  const id = await makeIdentity();
  const { proofUrl } = await mintProof(id, {}, { includeHash: false });
  const { body } = await postProof(proofUrl);
  assert("response is valid", body.valid === true);
  assert("nodeId is returned", body.nodeId === id.nodeId);
  assert("compact proof does not require hash", body.reason === undefined);
}

console.log("\n[2] Present-but-wrong hash is rejected");
{
  const id = await makeIdentity();
  const { proofUrl } = await mintProof(id, {}, {
    includeHash: true,
    hashOverride: "0".repeat(16),
  });
  const { body } = await postProof(proofUrl);
  assert("response is invalid", body.valid === false);
  assert("hash mismatch reason", body.reason === "hash_mismatch");
}

console.log("\n[3] Signed nodeId/pubkey mismatch cannot poison victim KV");
{
  const victim = await makeIdentity();
  const attacker = await makeIdentity();
  const { proofUrl } = await mintProof(attacker, { nodeId: victim.nodeId });
  const kv = makeKv();
  const { body } = await postProof(proofUrl, kv);
  assert("response is invalid", body.valid === false);
  assert("node mismatch reason", body.reason === "node_id_mismatch");
  assert("victim bureau context not written", !kv.store.has(`bureau:${victim.nodeId}`));
  assert("victim score cache not written", !kv.store.has(`score:${victim.nodeId}`));
}

console.log("\n[4] First bureau sighting with positive beats is not tampered");
{
  const id = await makeIdentity();
  const now = Date.now();
  const { proofUrl } = await mintProof(
    id,
    {
      lifetimeBeats: 1,
      firstBeatTs: now - 30_000,
      chainTip: toHex(sha256(utf8("first-beat"))).slice(0, 16),
    },
    { issuedAt: now },
  );
  const kv = makeKv();
  const { body } = await postProof(proofUrl, kv);
  const bureau = JSON.parse(kv.store.get(`bureau:${id.nodeId}`));
  assert("response is valid", body.valid === true);
  assert("no beat-rate tamper flag", !body.tamperFlags.includes("beat_rate_implausible"));
  assert("band is not tampered", body.scoreBand !== "TAMPERED");
  assert("first-sighting beat baseline stored", bureau.firstSeenLifetimeBeats === 1);
  assert("peak stored at first sighting", bureau.peakLifetimeBeats === 1);
}

console.log("\n[5] Implausible observed beat jump does not advance peak");
{
  const id = await makeIdentity();
  const now = Date.now();
  const prior = {
    nodeId: id.nodeId,
    firstSeenMs: now - 5 * 60_000,
    firstSeenAt: new Date(now - 5 * 60_000).toISOString(),
    firstSeenLifetimeBeats: 1,
    peakLifetimeBeats: 1,
    lastSeenMs: now - 5 * 60_000,
    lastSeenAt: new Date(now - 5 * 60_000).toISOString(),
  };
  const kv = makeKv([[`bureau:${id.nodeId}`, JSON.stringify(prior)]]);
  const { proofUrl } = await mintProof(
    id,
    {
      lifetimeBeats: 1_000,
      firstBeatTs: now - 60 * 60_000,
      chainTip: toHex(sha256(utf8("jump"))).slice(0, 16),
    },
    { issuedAt: now },
  );
  const { body } = await postProof(proofUrl, kv);
  const bureau = JSON.parse(kv.store.get(`bureau:${id.nodeId}`));
  assert("response is valid but tampered", body.valid === true);
  assert("beat-rate flag present", body.tamperFlags.includes("beat_rate_implausible"));
  assert("peak was not advanced by impossible claim", bureau.peakLifetimeBeats === 1);
}

console.log("\n--------------------------------------------------------");
if (failures > 0) {
  console.log(`/api/verify-device regression tests FAILED (${failures})`);
  process.exit(1);
}
console.log("/api/verify-device regression tests PASSED");
