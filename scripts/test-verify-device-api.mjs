// ============================================================================
// /api/verify-device v2 regression smoke test.
// ----------------------------------------------------------------------------
// Exercises the Cloudflare Pages Function directly under Node with a tiny KV
// mock. This locks high-risk bureau invariants:
//   - signed nodeId must match the Ed25519 pubkey-derived node ID
//   - first-sighting/pre-bureau beats do not become tamper flags
//   - implausible post-bureau beat jumps do not advance peakLifetimeBeats
//   - v2 responses keep legacy score aliases for shipped app clients
// ============================================================================

import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";

import { onRequestPost } from "../functions/api/verify-device.js";
import { onRequestGet as onScoreGet } from "../functions/api/score/[nodeId].js";

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
  Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

function assert(label, condition) {
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) throw new Error(label);
}

function makeKv() {
  const store = new Map();
  return {
    store,
    async get(key, options) {
      if (!store.has(key)) return null;
      const raw = store.get(key);
      return options?.type === "json" ? JSON.parse(raw) : raw;
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

async function makeProofUrl(identity, overrides = {}) {
  const now = Date.now();
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId: identity.nodeId,
    pubkey: identity.pubkey,
    mintedAt: now - 7 * 86_400_000,
    issuedAt: now,
    firstBeatTs: now - 7 * 86_400_000,
    lifetimeBeats: 0,
    chainTip: toHex(sha256(utf8(`tip:${now}:${identity.nodeId}`))).slice(0, 16),
    sensors: {
      lux: 100,
      motionRms: 1,
      pressureHpa: 1013,
    },
    attribution: PROOF_ATTRIBUTION,
    ...overrides,
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), identity.secretKey));
  const compact = { payload, signature };
  return `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify(compact))}`;
}

async function postVerify(env, proofUrl) {
  const waits = [];
  const response = await onRequestPost({
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    }),
    env,
    waitUntil(promise) {
      waits.push(Promise.resolve(promise));
    },
  });
  const body = await response.json();
  await Promise.all(waits);
  return { response, body };
}

async function getScore(env, nodeId) {
  const response = await onScoreGet({
    request: new Request(`https://getkinetik.app/api/score/${nodeId}`),
    params: { nodeId },
    env,
  });
  return { response, body: await response.json() };
}

const realDateNow = Date.now;
let failures = 0;

async function runCase(label, fn) {
  console.log(`\n[${label}]`);
  try {
    await fn();
  } catch (err) {
    failures += 1;
    console.error(`  ERROR  ${err.message}`);
  }
}

try {
  await runCase("first sighting is not tampered", async () => {
    const now = 1_800_000_000_000;
    Date.now = () => now;
    const kv = makeKv();
    const env = { KINETIK_KV: kv };
    const identity = await makeIdentity();
    const proofUrl = await makeProofUrl(identity, { lifetimeBeats: 1000 });

    const { body } = await postVerify(env, proofUrl);
    assert("verification succeeds", body.valid === true);
    assert("first_sighting remains visible", body.derived.flags.includes("first_sighting"));
    assert(
      "first_sighting does not floor to TAMPERED",
      body.derived.flagged === false && body.derived.tier !== "TAMPERED",
    );
    assert(
      "pre-bureau beats are not rate flagged",
      !body.derived.flags.includes("beat_rate_implausible"),
    );
    assert("legacy genesisScore alias present", body.genesisScore === body.derived.score);
    assert("legacy scoreBand alias present", body.scoreBand === body.derived.tier);

    const context = await kv.get(`bureau:${identity.nodeId}`, { type: "json" });
    assert("first seen lifetime beats recorded", context.firstSeenLifetimeBeats === 1000);
    assert("initial peak recorded", context.peakLifetimeBeats === 1000);

    const score = await getScore(env, identity.nodeId);
    assert("cached score lookup succeeds", score.response.status === 200);
    assert(
      "cached response includes legacy score aliases",
      score.body.genesisScore === score.body.derived.score &&
        score.body.scoreBand === score.body.derived.tier,
    );
  });

  await runCase("post-bureau beat rate uses first-seen baseline", async () => {
    const start = 1_800_000_000_000;
    let now = start;
    Date.now = () => now;
    const kv = makeKv();
    const env = { KINETIK_KV: kv };
    const identity = await makeIdentity();

    await postVerify(env, await makeProofUrl(identity, { lifetimeBeats: 1000 }));

    now = start + 5 * 60_000;
    const normal = await postVerify(
      env,
      await makeProofUrl(identity, { lifetimeBeats: 1012 }),
    );
    assert("normal post-bureau increment succeeds", normal.body.valid === true);
    assert(
      "normal increment is not rate flagged",
      !normal.body.derived.flags.includes("beat_rate_implausible"),
    );
    let context = await kv.get(`bureau:${identity.nodeId}`, { type: "json" });
    assert("normal increment advances peak", context.peakLifetimeBeats === 1012);

    now = start + 6 * 60_000;
    const jump = await postVerify(
      env,
      await makeProofUrl(identity, { lifetimeBeats: 2000 }),
    );
    assert("implausible jump still returns signed evidence result", jump.body.valid === true);
    assert(
      "implausible jump is rate flagged",
      jump.body.derived.flags.includes("beat_rate_implausible"),
    );
    assert("implausible jump floors tier", jump.body.derived.tier === "TAMPERED");
    context = await kv.get(`bureau:${identity.nodeId}`, { type: "json" });
    assert("implausible jump does not advance peak", context.peakLifetimeBeats === 1012);
  });

  await runCase("signed nodeId must match pubkey-derived ID", async () => {
    const now = 1_800_000_000_000;
    Date.now = () => now;
    const kv = makeKv();
    const env = { KINETIK_KV: kv };
    const attacker = await makeIdentity();
    const victim = await makeIdentity();
    const proofUrl = await makeProofUrl(attacker, {
      nodeId: victim.nodeId,
      lifetimeBeats: 1,
    });

    const { body } = await postVerify(env, proofUrl);
    assert("mismatched nodeId is rejected", body.valid === false);
    assert("rejection reason is node_id_mismatch", body.reason === "node_id_mismatch");
    assert("victim bureau key was not written", !kv.store.has(`bureau:${victim.nodeId}`));
    assert("victim attestation key was not written", !kv.store.has(`attestation:${victim.nodeId}`));
  });
} finally {
  Date.now = realDateNow;
}

console.log("\n--------------------------------------------------------");
if (failures > 0) {
  console.log(`/api/verify-device regression test FAILED (${failures} case(s))`);
  process.exit(1);
}
console.log("/api/verify-device regression test PASSED");
