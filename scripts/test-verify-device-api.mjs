// ============================================================================
// Regression coverage for functions/api/verify-device.js.
//
// Runs the Cloudflare Pages handler in-process with signed proofs and a fake KV
// binding so endpoint-level identity, compact URL, and bureau persistence
// behavior are tested without deploying a worker.
//
// Run: node scripts/test-verify-device-api.mjs
// ============================================================================

import { readFile } from "node:fs/promises";

import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

if (typeof globalThis.atob !== "function") {
  globalThis.atob = (b64) => Buffer.from(b64, "base64").toString("binary");
}

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
const VERIFY_ENDPOINT = "https://getkinetik.app/api/verify-device";
const VERIFIER_ORIGIN = "https://getkinetik.app/verify/";
const dayMs = 86_400_000;

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

function makeKv() {
  const store = new Map();
  return {
    store,
    async get(key, options) {
      const value = store.get(key);
      if (value === undefined) return null;
      return options?.type === "json" ? JSON.parse(value) : value;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

async function importWorker() {
  const source = await readFile(
    new URL("../functions/api/verify-device.js", import.meta.url),
    "utf8",
  );
  const encoded = Buffer.from(source, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

async function makeProof({
  secretKey = ed.utils.randomSecretKey(),
  nodeId,
  issuedAt = Date.now(),
  mintedAt = issuedAt - dayMs,
  lifetimeBeats = 0,
  firstBeatTs = issuedAt - 60_000,
  includeHash = false,
} = {}) {
  const publicKey = await ed.getPublicKeyAsync(secretKey);
  const pubkey = toHex(publicKey);
  const derivedNodeId = `KINETIK-NODE-${toHex(sha256(publicKey))
    .slice(0, 8)
    .toUpperCase()}`;
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId: nodeId ?? derivedNodeId,
    pubkey,
    mintedAt,
    issuedAt,
    lifetimeBeats,
    firstBeatTs,
    chainTip: toHex(sha256(utf8(`${pubkey}:${lifetimeBeats}:${issuedAt}`))).slice(
      0,
      16,
    ),
    attribution: PROOF_ATTRIBUTION,
    sensors: null,
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), secretKey));
  const hash = toHex(sha256(utf8(message))).slice(0, 16);
  const artifact = includeHash
    ? { payload, signature, hash }
    : { payload, signature };
  return {
    secretKey,
    publicKey,
    payload,
    signature,
    hash,
    artifact,
    proofUrl: `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(
      JSON.stringify(artifact),
    )}`,
  };
}

async function postProof(worker, proofUrl, kv = makeKv()) {
  const waitUntilPromises = [];
  const response = await worker.onRequestPost({
    request: new Request(VERIFY_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    }),
    env: { KINETIK_KV: kv },
    waitUntil(promise) {
      waitUntilPromises.push(Promise.resolve(promise));
    },
  });
  await Promise.all(waitUntilPromises);
  return { result: await response.json(), kv };
}

function assert(name, condition, detail = "") {
  if (!condition) {
    throw new Error(`${name}${detail ? `: ${detail}` : ""}`);
  }
  console.log(`PASS ${name}`);
}

async function main() {
  const worker = await importWorker();

  {
    const proof = await makeProof({ lifetimeBeats: 0 });
    const { result } = await postProof(worker, proof.proofUrl);
    assert("compact proof URL verifies", result.valid === true, result.reason);
    assert("compact proof returns derived nodeId", result.nodeId === proof.payload.nodeId);
  }

  {
    const proof = await makeProof({ includeHash: true });
    const badArtifact = { ...proof.artifact, hash: "0000000000000000" };
    const proofUrl = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(
      JSON.stringify(badArtifact),
    )}`;
    const { result } = await postProof(worker, proofUrl);
    assert("present but wrong hash is rejected", result.valid === false);
    assert("wrong hash returns hash_mismatch", result.reason === "hash_mismatch");
  }

  {
    const victim = await makeProof();
    const forged = await makeProof({ nodeId: victim.payload.nodeId });
    const kv = makeKv();
    const { result } = await postProof(worker, forged.proofUrl, kv);
    assert("mismatched nodeId is rejected", result.valid === false);
    assert(
      "mismatched nodeId returns node_id_mismatch",
      result.reason === "node_id_mismatch",
      result.reason,
    );
    assert(
      "mismatched nodeId writes no bureau state",
      !kv.store.has(`bureau:${victim.payload.nodeId}`),
    );
    assert(
      "mismatched nodeId writes no score cache",
      !kv.store.has(`score:${victim.payload.nodeId}`),
    );
  }

  {
    const now = Date.now();
    const secretKey = ed.utils.randomSecretKey();
    const kv = makeKv();
    const inflated = await makeProof({
      secretKey,
      issuedAt: now,
      mintedAt: now - dayMs,
      lifetimeBeats: 1_000_000,
      firstBeatTs: now - 180 * dayMs,
    });

    const first = await postProof(worker, inflated.proofUrl, kv);
    assert("implausible beat proof is still cryptographically valid", first.result.valid);
    assert(
      "implausible beat proof is tamper flagged",
      first.result.tamperFlags.includes("beat_rate_implausible"),
    );
    const bureauAfterInflated = JSON.parse(
      kv.store.get(`bureau:${inflated.payload.nodeId}`),
    );
    assert(
      "implausible beats do not raise bureau peak",
      bureauAfterInflated.peakLifetimeBeats === 0,
      String(bureauAfterInflated.peakLifetimeBeats),
    );

    const later = await makeProof({
      secretKey,
      issuedAt: now + 30 * dayMs,
      mintedAt: now - dayMs,
      lifetimeBeats: 10,
      firstBeatTs: now,
    });
    const second = await postProof(worker, later.proofUrl, kv);
    assert("later plausible proof verifies", second.result.valid);
    assert(
      "later plausible proof is not chain rewinded",
      !second.result.tamperFlags.includes("chain_rewind"),
      JSON.stringify(second.result.tamperFlags),
    );
    const bureauAfterLater = JSON.parse(kv.store.get(`bureau:${later.payload.nodeId}`));
    assert(
      "later plausible proof advances bureau peak",
      bureauAfterLater.peakLifetimeBeats === 10,
      String(bureauAfterLater.peakLifetimeBeats),
    );
  }

  console.log("\nverify-device API regressions passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
