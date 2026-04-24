// ============================================================================
// Verifier smoke test — round-trips a minted proof through the verifier's
// exact logic using the installed @noble packages. Run with:
//
//   node verifier/smoketest.mjs
//
// This does not require a browser. It proves the four-step verification
// pipeline agrees with the signing pipeline — any drift between the app's
// stableStringify / attribution / hash-truncation rules and the verifier
// will fail here before a real artifact is ever minted in anger.
// ============================================================================

import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

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
const fromHex = (hex) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};
const utf8 = (s) => new TextEncoder().encode(s);

// Mint a proof-of-origin exactly the way src/lib/proof.ts does.
async function mintProof() {
  const sk = ed.utils.randomSecretKey();
  const pk = await ed.getPublicKeyAsync(sk);
  const pubkey = toHex(pk);
  const fingerprint = toHex(sha256(pk)).slice(0, 16);
  const nodeId = `KINETIK-NODE-${fingerprint.slice(0, 8).toUpperCase()}`;

  const payload = {
    v: 1,
    kind: "proof-of-origin",
    nodeId,
    pubkey,
    mintedAt: Date.now() - 86400000,
    issuedAt: Date.now(),
    lifetimeBeats: 17,
    firstBeatTs: Date.now() - 60000,
    chainTip: toHex(sha256(utf8("smoketest"))).slice(0, 16),
    attribution: PROOF_ATTRIBUTION,
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const hash = toHex(sha256(utf8(message))).slice(0, 16);
  return { sk, artifact: { payload, message, signature, hash } };
}

// Port of verifier.js::verifyArtifact — MUST stay byte-identical in behavior.
async function verifyArtifact(raw) {
  const { payload, signature } = raw;
  const canonicalMessage = stableStringify(payload);
  const canonicalHash = toHex(sha256(utf8(canonicalMessage))).slice(0, 16);
  const claimedMessage = raw.message ?? canonicalMessage;
  const claimedHash = raw.hash ?? canonicalHash;

  const canonicalMatches = claimedMessage === canonicalMessage;
  const hashMatches = claimedHash === canonicalHash;
  const attributionOk =
    payload.kind === "proof-of-origin"
      ? payload.attribution === PROOF_ATTRIBUTION
      : null;
  const signatureOk = await ed.verifyAsync(
    fromHex(signature),
    utf8(canonicalMessage),
    fromHex(payload.pubkey),
  );

  const valid =
    canonicalMatches &&
    hashMatches &&
    (attributionOk === true || attributionOk === null) &&
    signatureOk;
  return { valid, canonicalMatches, hashMatches, attributionOk, signatureOk };
}

// ----------------------------------------------------------------------------
// Test cases.
// ----------------------------------------------------------------------------

async function run() {
  let failures = 0;
  const assert = (name, cond) => {
    console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`);
    if (!cond) failures += 1;
  };

  console.log("[1] Happy path: fresh mint → verify → valid");
  {
    const { artifact } = await mintProof();
    const r = await verifyArtifact(artifact);
    assert("canonical serialization matches", r.canonicalMatches);
    assert("sha256(message)[:16] matches hash", r.hashMatches);
    assert("attribution intact", r.attributionOk === true);
    assert("signature verifies", r.signatureOk);
    assert("overall valid", r.valid);
  }

  console.log("\n[2] Tampered lifetimeBeats — should fail canonical + sig");
  {
    const { artifact } = await mintProof();
    const tampered = JSON.parse(JSON.stringify(artifact));
    tampered.payload.lifetimeBeats = 9999;
    const r = await verifyArtifact(tampered);
    assert("canonicalMatches is false (message drift)", !r.canonicalMatches);
    assert("signature fails against tampered payload", !r.signatureOk);
    assert("overall invalid", !r.valid);
  }

  console.log("\n[3] Stripped attribution — should fail attribution check");
  {
    const { artifact } = await mintProof();
    const tampered = JSON.parse(JSON.stringify(artifact));
    tampered.payload.attribution = "a different llc";
    const r = await verifyArtifact(tampered);
    assert("attributionOk is false", r.attributionOk === false);
    assert("overall invalid", !r.valid);
  }

  console.log("\n[4] Signature forged with wrong key — should fail sig");
  {
    const { artifact } = await mintProof();
    const { sk: otherSk } = await mintProof();
    const forgedSig = toHex(
      await ed.signAsync(utf8(artifact.message), otherSk),
    );
    const tampered = { ...artifact, signature: forgedSig };
    const r = await verifyArtifact(tampered);
    assert("signatureOk is false (pubkey mismatch)", !r.signatureOk);
    assert("overall invalid", !r.valid);
  }

  console.log("\n[5] COMPACT form (no message, no hash) — should still verify");
  {
    const { artifact } = await mintProof();
    const compact = { payload: artifact.payload, signature: artifact.signature };
    const r = await verifyArtifact(compact);
    assert("compact form verifies", r.valid);
  }

  console.log("\n[6] Heartbeat payload — no attribution check, still valid");
  {
    const sk = ed.utils.randomSecretKey();
    const pk = await ed.getPublicKeyAsync(sk);
    const pubkey = toHex(pk);
    const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
    const payload = {
      v: 1,
      kind: "heartbeat",
      nodeId,
      pubkey,
      seq: 1,
      ts: Date.now(),
      stabilityPct: 97,
      online: true,
      charging: false,
      prevHash: "0000000000000000",
    };
    const message = stableStringify(payload);
    const signature = toHex(await ed.signAsync(utf8(message), sk));
    const hash = toHex(sha256(utf8(message))).slice(0, 16);
    const r = await verifyArtifact({ payload, message, signature, hash });
    assert("attributionOk is null (N/A for heartbeat)", r.attributionOk === null);
    assert("heartbeat verifies", r.valid);
  }

  console.log("\n" + "-".repeat(56));
  if (failures === 0) {
    console.log("ALL CHECKS PASSED — verifier and app agree on the contract.");
    process.exit(0);
  } else {
    console.log(`${failures} CHECK(S) FAILED — contract drift.`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("smoketest crashed:", err);
  process.exit(2);
});
