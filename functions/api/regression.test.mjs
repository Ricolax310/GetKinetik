import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";

function loadFunctionModule(file, exportNames, globals = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8").replace(
    /export async function /g,
    "async function ",
  );
  const globalNames = Object.keys(globals);
  const globalValues = Object.values(globals);
  return new Function(
    ...globalNames,
    `${source}\nreturn { ${exportNames.join(", ")} };`,
  )(...globalValues);
}

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

const toProofFragment = (artifact) =>
  Buffer.from(JSON.stringify(artifact))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

async function mintProof({ nodeIdOverride } = {}) {
  const sk = ed.utils.randomSecretKey();
  const pk = await ed.getPublicKeyAsync(sk);
  const pubkey = toHex(pk);
  const derivedNodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
  const now = 1_777_086_288_998;
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId: nodeIdOverride ?? derivedNodeId,
    pubkey,
    mintedAt: now - 86_400_000,
    issuedAt: now,
    lifetimeBeats: 25_847,
    firstBeatTs: now - 9 * 86_400_000,
    chainTip: toHex(sha256(utf8("regression-chain"))).slice(0, 16),
    attribution: PROOF_ATTRIBUTION,
    sensors: { lux: 412, motionRms: 0.06, pressureHpa: 1014.07 },
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const hash = toHex(sha256(utf8(message))).slice(0, 16);
  return {
    nodeId: derivedNodeId,
    proofUrl: `https://getkinetik.app/verify/#proof=${toProofFragment({
      payload,
      signature,
      hash,
    })}`,
  };
}

async function responseJson(response) {
  return JSON.parse(await response.text());
}

async function testVerifyDeviceRejectsNodeIdSpoofing() {
  const { onRequestPost } = loadFunctionModule("./verify-device.js", [
    "onRequestPost",
  ], {
    crypto: webcrypto,
    Response,
    TextEncoder,
    TextDecoder,
    URL,
    atob: (b64) => Buffer.from(b64, "base64").toString("binary"),
  });

  const validProof = await mintProof();
  const validWrites = [];
  const validResponse = await onRequestPost({
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl: validProof.proofUrl }),
    }),
    env: {
      KINETIK_KV: {
        put: async (...args) => {
          validWrites.push(args);
        },
      },
    },
    waitUntil: (promise) => promise,
  });
  const validBody = await responseJson(validResponse);
  assert.equal(validBody.valid, true);
  assert.equal(validWrites.length, 1);
  assert.equal(validWrites[0][0], `score:${validProof.nodeId}`);

  const victimNodeId = "KINETIK-NODE-DEADBEEF";
  const forgedProof = await mintProof({ nodeIdOverride: victimNodeId });
  const forgedWrites = [];
  const forgedResponse = await onRequestPost({
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl: forgedProof.proofUrl }),
    }),
    env: {
      KINETIK_KV: {
        put: async (...args) => {
          forgedWrites.push(args);
        },
      },
    },
    waitUntil: (promise) => promise,
  });
  const forgedBody = await responseJson(forgedResponse);
  assert.equal(forgedBody.valid, false);
  assert.equal(forgedBody.reason, "node_id_mismatch");
  assert.deepEqual(forgedWrites, []);
}

async function testAttestationReceiptsDoNotCollide() {
  let uuidCounter = 0;
  const { onRequestPost } = loadFunctionModule("./attest.js", ["onRequestPost"], {
    crypto: {
      randomUUID: () => `receipt-${++uuidCounter}`,
    },
    Response,
  });

  const originalNow = Date.now;
  Date.now = () => 1_777_086_288_998;
  try {
    const writes = [];
    const ctxFor = () => ({
      request: new Request("https://getkinetik.app/api/attest", {
        method: "POST",
        headers: {
          authorization: "Bearer partner-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          nodeId: "KINETIK-NODE-A3F2B719",
          kind: "engagement",
          network: "dimo",
          detail: "Trip uploaded successfully.",
          weight: 1,
        }),
      }),
      env: {
        ATTEST_API_KEY: "partner-secret",
        KINETIK_KV: {
          put: async (...args) => {
            writes.push(args);
          },
        },
      },
    });

    const first = await responseJson(await onRequestPost(ctxFor()));
    const second = await responseJson(await onRequestPost(ctxFor()));
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(writes.length, 2);
    assert.notEqual(writes[0][0], writes[1][0]);
    assert.equal(
      writes[0][0],
      "attest:KINETIK-NODE-A3F2B719:1777086288998:receipt-1",
    );
    assert.equal(
      writes[1][0],
      "attest:KINETIK-NODE-A3F2B719:1777086288998:receipt-2",
    );
  } finally {
    Date.now = originalNow;
  }
}

await testVerifyDeviceRejectsNodeIdSpoofing();
await testAttestationReceiptsDoNotCollide();
console.log("API regression tests passed.");
