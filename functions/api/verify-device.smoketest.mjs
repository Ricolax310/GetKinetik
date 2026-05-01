// ============================================================================
// verify-device Worker smoke test - exercises the public partner API with the
// exact compact #proof= URL emitted by packages/kinetik-core/src/proofShare.ts.
// Run with:
//
//   node functions/api/verify-device.smoketest.mjs
// ============================================================================

import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
const VERIFIER_ORIGIN = "https://getkinetik.app/verify/";
const B64URL_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

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

const base64UrlEncode = (input) => {
  const bytes = new TextEncoder().encode(input);
  let out = "";
  let i = 0;
  const n = bytes.length;
  while (i < n) {
    const b1 = bytes[i++];
    const b2 = i < n ? bytes[i++] : 0;
    const b3 = i < n ? bytes[i++] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    out += B64URL_CHARS[(triplet >> 18) & 0x3f];
    out += B64URL_CHARS[(triplet >> 12) & 0x3f];
    out += B64URL_CHARS[(triplet >> 6) & 0x3f];
    out += B64URL_CHARS[triplet & 0x3f];
  }
  const rem = n % 3;
  if (rem === 1) return out.slice(0, -2);
  if (rem === 2) return out.slice(0, -1);
  return out;
};

async function importWorker() {
  const sourcePath = new URL("./verify-device.js", import.meta.url);
  const source = await readFile(sourcePath, "utf8");
  const sourceUrl = pathToFileURL(sourcePath.pathname).href;
  return import(
    `data:text/javascript;charset=utf-8,${encodeURIComponent(
      `${source}\n//# sourceURL=${sourceUrl}`,
    )}`
  );
}

async function mintProof() {
  const sk = ed.utils.randomSecretKey();
  const pk = await ed.getPublicKeyAsync(sk);
  const pubkey = toHex(pk);
  const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
  const mintedAt = Date.now() - 86400000;
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId,
    pubkey,
    mintedAt,
    issuedAt: Date.now(),
    lifetimeBeats: 42,
    firstBeatTs: Date.now() - 60000,
    chainTip: toHex(sha256(utf8("verify-device-smoketest"))).slice(0, 16),
    attribution: PROOF_ATTRIBUTION,
    sensors: null,
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const hash = toHex(sha256(utf8(message))).slice(0, 16);
  return { payload, message, signature, hash };
}

function buildCompactVerifierUrl(proof) {
  const compact = {
    payload: proof.payload,
    signature: proof.signature,
  };
  return `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify(compact))}`;
}

async function postProofUrl(onRequestPost, proofUrl) {
  const response = await onRequestPost({
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    }),
  });
  return response.json();
}

async function run() {
  let failures = 0;
  const assert = (name, cond) => {
    console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`);
    if (!cond) failures += 1;
  };

  const { onRequestPost } = await importWorker();

  console.log("[1] Compact app verifier URL verifies through partner API");
  {
    const proof = await mintProof();
    const result = await postProofUrl(onRequestPost, buildCompactVerifierUrl(proof));
    assert("compact proof URL is valid", result.valid === true);
    assert("nodeId is returned", result.nodeId === proof.payload.nodeId);
    assert("pubkey is returned", result.pubkey === proof.payload.pubkey);
    assert(
      "mintedAt maps from proof-of-origin mintedAt",
      result.mintedAt === proof.payload.mintedAt,
    );
  }

  console.log("\n[2] Full envelope still rejects tampered hash");
  {
    const proof = await mintProof();
    const full = { ...proof, hash: "0000000000000000" };
    const url = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify(full))}`;
    const result = await postProofUrl(onRequestPost, url);
    assert("tampered hash is rejected", result.valid === false);
    assert("rejection reason is hash_mismatch", result.reason === "hash_mismatch");
  }

  console.log("\n" + "-".repeat(56));
  if (failures === 0) {
    console.log("VERIFY-DEVICE API SMOKETEST PASSED.");
    process.exit(0);
  }
  console.log(`${failures} CHECK(S) FAILED.`);
  process.exit(1);
}

run().catch((err) => {
  console.error("verify-device smoketest crashed:", err);
  process.exit(2);
});
