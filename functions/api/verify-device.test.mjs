import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";

const stableStringify = (obj) => {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(",")}}`;
};

const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const utf8 = (s) => new TextEncoder().encode(s);

const sha256Hex = async (bytes) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(new Uint8Array(digest));
};

const base64UrlEncode = (input) =>
  Buffer.from(input, "utf8").toString("base64url");

const workerSource = await readFile(new URL("./verify-device.js", import.meta.url), "utf8");
const workerModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(
  `${workerSource}\nexport { verifyProofUrl };`,
)}`;
const { verifyProofUrl } = await import(workerModuleUrl);

async function mintProofEnvelope() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"],
  );
  const pk = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
  const pubkey = toHex(pk);
  const now = Date.now();
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId: `KINETIK-NODE-${(await sha256Hex(pk)).slice(0, 8).toUpperCase()}`,
    pubkey,
    mintedAt: now - 9 * 86_400_000,
    issuedAt: now,
    lifetimeBeats: 25_847,
    firstBeatTs: now - 9 * 86_400_000 + 5_000,
    chainTip: (await sha256Hex(utf8("verify-device-test"))).slice(0, 16),
    attribution: PROOF_ATTRIBUTION,
    sensors: { lux: 412, motionRms: 0.06, pressureHpa: 1014.07 },
  };
  const message = stableStringify(payload);
  const signature = toHex(
    new Uint8Array(await crypto.subtle.sign("Ed25519", keyPair.privateKey, utf8(message))),
  );
  const hash = (await sha256Hex(utf8(message))).slice(0, 16);
  return { payload, message, signature, hash };
}

const proofUrlFor = (envelope) =>
  `https://getkinetik.app/verify/#proof=${base64UrlEncode(JSON.stringify(envelope))}`;

const full = await mintProofEnvelope();

{
  const compact = { payload: full.payload, signature: full.signature };
  const result = await verifyProofUrl(proofUrlFor(compact));
  assert.equal(result.valid, true, "compact app verifier URLs must verify");
  assert.equal(result.nodeId, full.payload.nodeId);
  assert.equal(result.pubkey, full.payload.pubkey);
  assert.equal(result.lifetimeBeats, full.payload.lifetimeBeats);
  assert.equal(result.firstBeatTs, full.payload.firstBeatTs);
  assert.equal(typeof result.genesisScore, "number");
  assert.equal(result.methodologyVersion, "v1.0");
}

{
  const result = await verifyProofUrl(proofUrlFor(full));
  assert.equal(result.valid, true, "full signed envelopes must still verify");
}

{
  const tamperedHash = { ...full, hash: "0000000000000000" };
  const result = await verifyProofUrl(proofUrlFor(tamperedHash));
  assert.deepEqual(
    result,
    { valid: false, reason: "hash_mismatch" },
    "present-but-wrong hashes must still be rejected",
  );
}

console.log("verify-device compact proof regression tests passed");
