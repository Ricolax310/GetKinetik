import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { onRequestPost } from "./verify-device.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
const VERIFIER_ORIGIN = "https://getkinetik.app/verify/";

const B64URL_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

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

function assert(name, condition) {
  if (!condition) {
    throw new Error(`FAIL: ${name}`);
  }
  console.log(`PASS: ${name}`);
}

async function callVerifyDevice(proofUrl) {
  const response = await onRequestPost({
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    }),
  });
  return response.json();
}

async function signedUrl(payload, { includeHash = false, hashOverride } = {}) {
  const sk = ed.utils.randomSecretKey();
  const pk = await ed.getPublicKeyAsync(sk);
  const signedPayload = {
    ...payload,
    pubkey: toHex(pk),
    nodeId: payload.nodeId ?? `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`,
    attribution: PROOF_ATTRIBUTION,
  };
  const message = stableStringify(signedPayload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const envelope = { payload: signedPayload, signature };
  if (includeHash) {
    envelope.hash =
      hashOverride ?? toHex(sha256(utf8(message))).slice(0, 16);
  }
  return `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify(envelope))}`;
}

async function main() {
  const nowMs = Date.now();
  const proofUrl = await signedUrl({
    v: 2,
    kind: "proof-of-origin",
    mintedAt: nowMs - 60_000,
    issuedAt: nowMs,
    lifetimeBeats: 42,
    firstBeatTs: nowMs - 55_000,
    chainTip: "0123456789abcdef",
    sensors: null,
  });

  const proofResult = await callVerifyDevice(proofUrl);
  assert("compact Proof-of-Origin verifies", proofResult.valid === true);
  assert("mintedAt comes from payload.mintedAt", proofResult.mintedAt === nowMs - 60_000);
  assert("issuedAt is returned for freshness checks", proofResult.issuedAt === nowMs);

  const earningUrl = await signedUrl({
    v: 1,
    kind: "earning",
    source: "nodle",
    externalRef: "nodle:lifetime:1.00000000:test",
    currency: "NODL",
    gross: 1,
    fee: 0.01,
    net: 0.99,
    ts: nowMs,
    prevHash: null,
  });

  const earningResult = await callVerifyDevice(earningUrl);
  assert(
    "signed non-Proof artifact is rejected",
    earningResult.valid === false && earningResult.reason === "unsupported_artifact_kind",
  );

  const badHashUrl = await signedUrl(
    {
      v: 2,
      kind: "proof-of-origin",
      mintedAt: nowMs,
      issuedAt: nowMs,
      lifetimeBeats: 1,
      firstBeatTs: nowMs,
      chainTip: null,
      sensors: null,
    },
    { includeHash: true, hashOverride: "0000000000000000" },
  );

  const badHashResult = await callVerifyDevice(badHashUrl);
  assert(
    "full artifact with wrong hash is rejected",
    badHashResult.valid === false && badHashResult.reason === "hash_mismatch",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
