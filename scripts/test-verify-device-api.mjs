// ============================================================================
// Local regression checks for functions/api/verify-device.js.
//
// Covers the security-critical identity binding contract:
// a proof's nodeId must be the deterministic SHA-256(public key) ID for the
// public key that verifies the signature. Otherwise any valid keypair could
// poison bureau/score KV entries for another node by signing a payload that
// names the victim's nodeId.
//
// Run: node scripts/test-verify-device-api.mjs
// ============================================================================

import { onRequestPost } from "../functions/api/verify-device.js";

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";

const bytesToHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const stableStringify = (obj) => {
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${JSON.stringify(obj[k])}`)
    .join(",")}}`;
};

const sha256Hex = async (input) => {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
};

const base64urlJson = (value) =>
  Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

const deriveNodeId = async (publicKeyBytes) => {
  const fingerprint = await sha256Hex(publicKeyBytes);
  return `KINETIK-NODE-${fingerprint.slice(0, 8).toUpperCase()}`;
};

async function mintIdentity() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"],
  );
  const publicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey("raw", keyPair.publicKey),
  );
  return {
    keyPair,
    publicKeyHex: bytesToHex(publicKeyBytes),
    nodeId: await deriveNodeId(publicKeyBytes),
  };
}

async function signProof(identity, overrides = {}, envelopeOverrides = {}) {
  const now = Date.now();
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId: identity.nodeId,
    pubkey: identity.publicKeyHex,
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
  const signature = bytesToHex(
    new Uint8Array(
      await crypto.subtle.sign(
        "Ed25519",
        identity.keyPair.privateKey,
        new TextEncoder().encode(message),
      ),
    ),
  );
  return {
    payload,
    signature,
    ...envelopeOverrides,
  };
}

async function callVerifyDevice(envelope) {
  const proofUrl = `https://getkinetik.app/verify/#proof=${base64urlJson(envelope)}`;
  const writes = [];
  const waitUntilPromises = [];
  const kv = {
    async get() {
      return null;
    },
    async put(key, value) {
      writes.push({ key, value });
    },
  };
  const ctx = {
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    }),
    env: { KINETIK_KV: kv },
    waitUntil(promise) {
      waitUntilPromises.push(promise);
    },
  };

  const res = await onRequestPost(ctx);
  const body = await res.json();
  await Promise.allSettled(waitUntilPromises);
  return { status: res.status, body, writes };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tests = [
  [
    "accepts compact proof for matching pubkey-derived nodeId",
    async () => {
      const identity = await mintIdentity();
      const envelope = await signProof(identity);
      const { status, body, writes } = await callVerifyDevice(envelope);

      assert(status === 200, `expected HTTP 200, got ${status}`);
      assert(body.valid === true, `expected valid proof, got ${JSON.stringify(body)}`);
      assert(body.nodeId === identity.nodeId, "response nodeId should match identity");
      assert(
        writes.some((w) => w.key === `bureau:${identity.nodeId}`),
        "expected bureau context write for matching node",
      );
      assert(
        writes.some((w) => w.key === `score:${identity.nodeId}`),
        "expected score cache write for matching node",
      );
    },
  ],
  [
    "rejects a valid signature that claims another nodeId",
    async () => {
      const identity = await mintIdentity();
      const victimNodeId =
        identity.nodeId === "KINETIK-NODE-DEADBEEF"
          ? "KINETIK-NODE-CAFEBABE"
          : "KINETIK-NODE-DEADBEEF";
      const envelope = await signProof(identity, { nodeId: victimNodeId });
      const { body, writes } = await callVerifyDevice(envelope);

      assert(body.valid === false, `expected invalid proof, got ${JSON.stringify(body)}`);
      assert(body.reason === "node_id_mismatch", `unexpected reason ${body.reason}`);
      assert(
        !writes.some(
          (w) => w.key === `bureau:${victimNodeId}` || w.key === `score:${victimNodeId}`,
        ),
        "spoofed proof must not write victim bureau/score keys",
      );
    },
  ],
  [
    "rejects a full envelope with a present-but-wrong hash",
    async () => {
      const identity = await mintIdentity();
      const envelope = await signProof(identity, {}, { hash: "0000000000000000" });
      const { body, writes } = await callVerifyDevice(envelope);

      assert(body.valid === false, `expected invalid proof, got ${JSON.stringify(body)}`);
      assert(body.reason === "hash_mismatch", `unexpected reason ${body.reason}`);
      assert(
        !writes.some((w) => w.key.startsWith("bureau:") || w.key.startsWith("score:")),
        "hash-mismatched proof must not write bureau/score keys",
      );
    },
  ],
];

let passed = 0;
for (const [name, run] of tests) {
  try {
    await run();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(err);
  }
}

console.log(`\n${passed}/${tests.length} cases pass.`);
process.exit(passed === tests.length ? 0 : 1);
