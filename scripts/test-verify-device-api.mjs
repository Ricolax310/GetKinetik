// ============================================================================
// Focused regression tests for functions/api/verify-device.js.
//
// Run: node scripts/test-verify-device-api.mjs
// ============================================================================

import { readFile } from "node:fs/promises";
import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";

if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import("node:crypto");
  globalThis.crypto = webcrypto;
}

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const WORKER_PATH = new URL("../functions/api/verify-device.js", import.meta.url);
const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
const VERIFIER_ORIGIN = "https://getkinetik.app/verify/";

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

const base64UrlEncode = (input) =>
  Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

async function loadWorker() {
  const source = await readFile(WORKER_PATH, "utf8");
  const wrapped = `${source.replace(/\bexport\s+/g, "")}
export { onRequestPost };`;
  const encoded = Buffer.from(wrapped, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

async function mintProof({ nodeIdOverride, hashOverride, omitHash = false } = {}) {
  const sk = ed.utils.randomSecretKey();
  const pk = await ed.getPublicKeyAsync(sk);
  const pubkey = toHex(pk);
  const nodeId =
    nodeIdOverride ??
    `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;

  const now = Date.now();
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId,
    pubkey,
    mintedAt: now,
    issuedAt: now,
    lifetimeBeats: 0,
    firstBeatTs: null,
    chainTip: null,
    attribution: PROOF_ATTRIBUTION,
    sensors: null,
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const hash = hashOverride ?? toHex(sha256(utf8(message))).slice(0, 16);
  const envelope = omitHash ? { payload, signature } : { payload, signature, hash };
  const proofUrl = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify(envelope))}`;
  return { proofUrl, payload, signature };
}

async function postProof(onRequestPost, proofUrl, env) {
  const pending = [];
  const response = await onRequestPost({
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    }),
    env,
    waitUntil: (promise) => pending.push(Promise.resolve(promise)),
  });
  const body = await response.json();
  await Promise.all(pending);
  return body;
}

function makeKv() {
  const writes = [];
  const store = new Map();
  return {
    writes,
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value) {
      writes.push({ key, value });
      store.set(key, JSON.parse(value));
    },
  };
}

const { onRequestPost } = await loadWorker();
const failures = [];

const assert = (name, condition, detail = "") => {
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!condition) failures.push(name);
};

console.log("[1] Compact app QR URL verifies without embedded hash");
{
  const env = { KINETIK_KV: makeKv() };
  const { proofUrl, payload } = await mintProof({ omitHash: true });
  const result = await postProof(onRequestPost, proofUrl, env);
  assert("compact proof is valid", result.valid === true, result.reason);
  assert("nodeId is returned", result.nodeId === payload.nodeId);
}

console.log("\n[2] Present-but-wrong hash is still rejected");
{
  const env = { KINETIK_KV: makeKv() };
  const { proofUrl } = await mintProof({ hashOverride: "0000000000000000" });
  const result = await postProof(onRequestPost, proofUrl, env);
  assert("bad hash is invalid", result.valid === false);
  assert("bad hash reports hash_mismatch", result.reason === "hash_mismatch", result.reason);
}

console.log("\n[3] Signed spoofed nodeId is rejected before KV writes");
{
  const kv = makeKv();
  const { proofUrl } = await mintProof({ nodeIdOverride: "KINETIK-NODE-DEADBEEF" });
  const result = await postProof(onRequestPost, proofUrl, { KINETIK_KV: kv });
  assert("spoofed nodeId is invalid", result.valid === false);
  assert("spoofed nodeId reports node_id_mismatch", result.reason === "node_id_mismatch", result.reason);
  assert("spoofed nodeId does not write KV", kv.writes.length === 0, `${kv.writes.length} writes`);
}

console.log("\n" + "-".repeat(56));
if (failures.length === 0) {
  console.log("verify-device API regressions pass.");
  process.exit(0);
}

console.log(`${failures.length} regression(s) failed: ${failures.join(", ")}`);
process.exit(1);
