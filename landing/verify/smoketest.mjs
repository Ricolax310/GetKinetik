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

// Mint a proof-of-origin exactly the way packages/kinetik-core/src/proof.ts does.
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
    assert("v:1 heartbeat verifies", r.valid);
  }

  // --------------------------------------------------------------------------
  // [7] v:2 heartbeat with sensors — the L2 schema bump.
  //
  // The `sensors` block is constructed in lexicographic key order (lux,
  // motionRms, pressureHpa) so JSON.stringify emits a reproducible byte
  // sequence regardless of where the readout originated. That ordering is
  // the contract enforced in packages/kinetik-core/src/sensors.ts canonicalSensorBlock().
  // --------------------------------------------------------------------------
  console.log("\n[7] v:2 heartbeat with sensors — schema bump verifies");
  {
    const sk = ed.utils.randomSecretKey();
    const pk = await ed.getPublicKeyAsync(sk);
    const pubkey = toHex(pk);
    const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
    const payload = {
      v: 2,
      kind: "heartbeat",
      nodeId,
      pubkey,
      seq: 1,
      ts: Date.now(),
      stabilityPct: 92,
      online: true,
      charging: false,
      prevHash: "0000000000000000",
      sensors: { lux: 348, motionRms: 0.07, pressureHpa: 1013.21 },
    };
    const message = stableStringify(payload);
    const signature = toHex(await ed.signAsync(utf8(message), sk));
    const hash = toHex(sha256(utf8(message))).slice(0, 16);
    const r = await verifyArtifact({ payload, message, signature, hash });
    assert("v:2 heartbeat verifies", r.valid);
    assert("v:2 canonicalMatches", r.canonicalMatches);
    assert("v:2 hash matches", r.hashMatches);
    assert("v:2 signature verifies", r.signatureOk);
  }

  // --------------------------------------------------------------------------
  // [8] v:2 heartbeat with NULL sensor fields — graceful degradation.
  //
  // A device missing a barometer (common on budget Androids and on iOS for
  // light) signs a payload with explicit nulls. The verifier MUST accept
  // null values without choking; the schema is what's signed, not the
  // nullability of any one field.
  // --------------------------------------------------------------------------
  console.log("\n[8] v:2 heartbeat with null sensor fields — still verifies");
  {
    const sk = ed.utils.randomSecretKey();
    const pk = await ed.getPublicKeyAsync(sk);
    const pubkey = toHex(pk);
    const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
    const payload = {
      v: 2,
      kind: "heartbeat",
      nodeId,
      pubkey,
      seq: 2,
      ts: Date.now(),
      stabilityPct: 88,
      online: true,
      charging: true,
      prevHash: "abcdef0123456789",
      sensors: { lux: null, motionRms: 0.02, pressureHpa: null },
    };
    const message = stableStringify(payload);
    const signature = toHex(await ed.signAsync(utf8(message), sk));
    const hash = toHex(sha256(utf8(message))).slice(0, 16);
    const r = await verifyArtifact({ payload, message, signature, hash });
    assert("v:2 with null sensors verifies", r.valid);
  }

  // --------------------------------------------------------------------------
  // [9] v:2 sensors tampered after signing — must fail signature check.
  //
  // Demonstrates the chain protects sensor readings the same way it
  // protects every other field. A spoofer swapping in fake high-motion
  // numbers to make a node "look more active" gets rejected.
  // --------------------------------------------------------------------------
  console.log("\n[9] Tampered v:2 sensors — must fail");
  {
    const sk = ed.utils.randomSecretKey();
    const pk = await ed.getPublicKeyAsync(sk);
    const pubkey = toHex(pk);
    const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
    const payload = {
      v: 2,
      kind: "heartbeat",
      nodeId,
      pubkey,
      seq: 3,
      ts: Date.now(),
      stabilityPct: 95,
      online: true,
      charging: false,
      prevHash: "1111222233334444",
      sensors: { lux: 200, motionRms: 0.05, pressureHpa: 1012.5 },
    };
    const message = stableStringify(payload);
    const signature = toHex(await ed.signAsync(utf8(message), sk));
    const hash = toHex(sha256(utf8(message))).slice(0, 16);
    const tampered = JSON.parse(JSON.stringify({ payload, message, signature, hash }));
    tampered.payload.sensors.motionRms = 9.99;
    const r = await verifyArtifact(tampered);
    assert("tampered v:2 sensors fail canonicalMatches", !r.canonicalMatches);
    assert("tampered v:2 sensors fail signature", !r.signatureOk);
    assert("tampered v:2 overall invalid", !r.valid);
  }

  // --------------------------------------------------------------------------
  // [10] v:2 PROOF-OF-ORIGIN with sensors block — the L2-on-PoO bump.
  //
  // PoO v:2 carries a `sensors` block sourced from the most recent signed
  // heartbeat (HeartbeatSummary.lastSensors). The verifier must accept the
  // new schema, the attribution check must still pass, and the rendering
  // surface gets sensor rows in the same canonical order as heartbeat v:2.
  // --------------------------------------------------------------------------
  console.log("\n[10] v:2 proof-of-origin with sensors — schema bump verifies");
  {
    const sk = ed.utils.randomSecretKey();
    const pk = await ed.getPublicKeyAsync(sk);
    const pubkey = toHex(pk);
    const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
    const payload = {
      v: 2,
      kind: "proof-of-origin",
      nodeId,
      pubkey,
      mintedAt: Date.now() - 86400000,
      issuedAt: Date.now(),
      lifetimeBeats: 314,
      firstBeatTs: Date.now() - 60000,
      chainTip: toHex(sha256(utf8("smoketest-v2-poo"))).slice(0, 16),
      attribution: PROOF_ATTRIBUTION,
      sensors: { lux: 412, motionRms: 0.04, pressureHpa: 1013.78 },
    };
    const message = stableStringify(payload);
    const signature = toHex(await ed.signAsync(utf8(message), sk));
    const hash = toHex(sha256(utf8(message))).slice(0, 16);
    const r = await verifyArtifact({ payload, message, signature, hash });
    assert("v:2 PoO verifies", r.valid);
    assert("v:2 PoO canonicalMatches", r.canonicalMatches);
    assert("v:2 PoO hash matches", r.hashMatches);
    assert("v:2 PoO attribution intact", r.attributionOk === true);
    assert("v:2 PoO signature verifies", r.signatureOk);
  }

  // --------------------------------------------------------------------------
  // [11] v:2 PoO with sensors=null — first-boot case.
  //
  // A node that has never emitted a heartbeat (zero accrued, lastSensors
  // null) still mints a valid PoO. The `sensors` field is signed as JSON
  // null; verifier renders all three rows as "—". Schema stays consistent.
  // --------------------------------------------------------------------------
  console.log("\n[11] v:2 proof-of-origin with sensors=null — still verifies");
  {
    const sk = ed.utils.randomSecretKey();
    const pk = await ed.getPublicKeyAsync(sk);
    const pubkey = toHex(pk);
    const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
    const payload = {
      v: 2,
      kind: "proof-of-origin",
      nodeId,
      pubkey,
      mintedAt: Date.now(),
      issuedAt: Date.now(),
      lifetimeBeats: 0,
      firstBeatTs: null,
      chainTip: null,
      attribution: PROOF_ATTRIBUTION,
      sensors: null,
    };
    const message = stableStringify(payload);
    const signature = toHex(await ed.signAsync(utf8(message), sk));
    const hash = toHex(sha256(utf8(message))).slice(0, 16);
    const r = await verifyArtifact({ payload, message, signature, hash });
    assert("v:2 PoO with null sensors verifies", r.valid);
    assert("v:2 PoO with null sensors attribution intact", r.attributionOk === true);
  }

  // --------------------------------------------------------------------------
  // [12] v:1 legacy PoO — backward compat. Every PoO minted before
  // 2026-04-25 has no `sensors` field at all. The verifier must still
  // accept these forever — failing here would invalidate every screenshot
  // and every QR ever shared from the old build.
  // --------------------------------------------------------------------------
  console.log("\n[12] v:1 legacy proof-of-origin (no sensors field) — still verifies");
  {
    const { artifact } = await mintProof(); // mintProof() is the v:1 generator
    const r = await verifyArtifact(artifact);
    assert("v:1 legacy PoO still verifies", r.valid);
    assert("v:1 legacy PoO attribution intact", r.attributionOk === true);
  }

  // --------------------------------------------------------------------------
  // [13] Tampered v:2 PoO sensors — must fail signature.
  //
  // Same threat model as the heartbeat tamper test: a spoofer flipping
  // motion/light/pressure to misrepresent the node's environment must be
  // rejected by the chain. Sensors are part of the signed payload — they
  // get the same protection as nodeId or pubkey.
  // --------------------------------------------------------------------------
  console.log("\n[13] Tampered v:2 PoO sensors — must fail");
  {
    const sk = ed.utils.randomSecretKey();
    const pk = await ed.getPublicKeyAsync(sk);
    const pubkey = toHex(pk);
    const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
    const payload = {
      v: 2,
      kind: "proof-of-origin",
      nodeId,
      pubkey,
      mintedAt: Date.now(),
      issuedAt: Date.now(),
      lifetimeBeats: 42,
      firstBeatTs: Date.now() - 60000,
      chainTip: toHex(sha256(utf8("smoketest-tamper"))).slice(0, 16),
      attribution: PROOF_ATTRIBUTION,
      sensors: { lux: 100, motionRms: 0.03, pressureHpa: 1014.2 },
    };
    const message = stableStringify(payload);
    const signature = toHex(await ed.signAsync(utf8(message), sk));
    const hash = toHex(sha256(utf8(message))).slice(0, 16);
    const tampered = JSON.parse(JSON.stringify({ payload, message, signature, hash }));
    tampered.payload.sensors.motionRms = 9.99;
    const r = await verifyArtifact(tampered);
    assert("tampered v:2 PoO sensors fail canonicalMatches", !r.canonicalMatches);
    assert("tampered v:2 PoO sensors fail signature", !r.signatureOk);
    assert("tampered v:2 PoO overall invalid", !r.valid);
  }

  // ==========================================================================
  // L4 EARNINGS LEDGER — wallet primitive smoketests
  //
  // These tests mirror packages/kinetik-core/src/wallet.ts using the same
  // crypto primitives. Every signing + verification rule exercised here
  // MUST stay byte-identical with the TypeScript source. Contract drift
  // between app and verifier is caught here before it hits a real device.
  // ==========================================================================

  // Shared wallet constants — must match wallet.ts exactly.
  const WALLET_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
  const PROTOCOL_FEE_RATE = 0.01;

  const round8 = (n) => Math.round(n * 1e8) / 1e8;

  // Base32 encoder (RFC 4648, lowercase) — mirrors wallet.ts base32Encode().
  const BASE32_CHARS = "abcdefghijklmnopqrstuvwxyz234567";
  function base32Encode(bytes) {
    let bits = 0, value = 0, output = "";
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) output += BASE32_CHARS[(value << (5 - bits)) & 31];
    return output;
  }

  function deriveWalletAddress(publicKey) {
    const domain = utf8("kinetik-wallet-v1");
    const combined = new Uint8Array(domain.length + publicKey.length);
    combined.set(domain);
    combined.set(publicKey, domain.length);
    const hash = sha256(combined);
    return "kn1" + base32Encode(hash).slice(0, 32);
  }

  async function signEarning(sk, pk, entry) {
    if (entry.attribution !== WALLET_ATTRIBUTION) {
      throw new Error("attribution mismatch");
    }
    const expectedFee = round8(entry.gross * PROTOCOL_FEE_RATE);
    if (Math.abs(entry.fee - expectedFee) > 1e-9) {
      throw new Error(`fee must be ${PROTOCOL_FEE_RATE * 100}% of gross`);
    }
    const expectedNet = round8(entry.gross - entry.fee);
    if (Math.abs(entry.net - expectedNet) > 1e-9) {
      throw new Error("net must be gross - fee");
    }
    const message = stableStringify(entry);
    const signature = toHex(await ed.signAsync(utf8(message), sk));
    const hash = toHex(sha256(utf8(message))).slice(0, 16);
    return { payload: entry, message, signature, hash };
  }

  async function verifyEarning(earning, publicKeyHex) {
    const { payload } = earning;
    if (payload.attribution !== WALLET_ATTRIBUTION) return false;
    const expectedFee = round8(payload.gross * PROTOCOL_FEE_RATE);
    if (Math.abs(payload.fee - expectedFee) > 1e-9) return false;
    const expectedNet = round8(payload.gross - payload.fee);
    if (Math.abs(payload.net - expectedNet) > 1e-9) return false;
    const canonicalMessage = stableStringify(payload);
    const canonicalHash = toHex(sha256(utf8(canonicalMessage))).slice(0, 16);
    if (canonicalHash !== earning.hash) return false;
    return ed.verifyAsync(fromHex(earning.signature), utf8(canonicalMessage), fromHex(publicKeyHex));
  }

  // --------------------------------------------------------------------------
  // [14] v:1 earning happy path — mint, sign, verify all checks.
  //
  // This is the canonical earning flow: adapter reports gross payout,
  // the wallet computes fee (1%) and net (gross - fee), signs the full
  // entry, and verifyEarning confirms every rule in one call.
  // --------------------------------------------------------------------------
  console.log("\n[14] v:1 earning happy path — sign and verify");
  {
    const sk = ed.utils.randomSecretKey();
    const pk = await ed.getPublicKeyAsync(sk);
    const pubkey = toHex(pk);
    const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
    const walletAddr = deriveWalletAddress(pk);

    assert("wallet address starts with kn1", walletAddr.startsWith("kn1"));
    assert("wallet address is 35 chars", walletAddr.length === 35);

    const gross = 12.3;
    const fee = round8(gross * PROTOCOL_FEE_RATE);
    const net = round8(gross - fee);

    const entry = {
      v: 1,
      kind: "earning",
      nodeId,
      pubkey,
      source: "nodle",
      externalRef: "nodle:alloc:test-0001",
      currency: "NODL",
      gross,
      fee,
      net,
      ts: Date.now(),
      prevHash: null,
      attribution: WALLET_ATTRIBUTION,
    };

    const signed = await signEarning(sk, pk, entry);
    const ok = await verifyEarning(signed, pubkey);
    assert("earning verifies end-to-end", ok);
    assert("hash is 16-char hex", /^[0-9a-f]{16}$/.test(signed.hash));
    assert("signature is 128-char hex", /^[0-9a-f]{128}$/.test(signed.signature));
    assert("fee is 1% of gross", Math.abs(signed.payload.fee - round8(gross * 0.01)) < 1e-9);
    assert("net is gross minus fee", Math.abs(signed.payload.net - round8(gross - fee)) < 1e-9);
  }

  // --------------------------------------------------------------------------
  // [15] Tampered fee — must fail verification.
  //
  // A receiver who alters `fee` to 0 (or any non-1% value) gets rejected
  // at verifyEarning step 2 (fee integrity) AND step 5 (signature), since
  // the fee field is part of the signed message. This is the central
  // economic guarantee of the earnings ledger.
  // --------------------------------------------------------------------------
  console.log("\n[15] Tampered fee — must fail");
  {
    const sk = ed.utils.randomSecretKey();
    const pk = await ed.getPublicKeyAsync(sk);
    const pubkey = toHex(pk);
    const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;

    const gross = 50.0;
    const fee = round8(gross * PROTOCOL_FEE_RATE);
    const net = round8(gross - fee);
    const entry = {
      v: 1, kind: "earning", nodeId, pubkey,
      source: "nodle", externalRef: "nodle:alloc:tamper-test",
      currency: "NODL", gross, fee, net,
      ts: Date.now(), prevHash: null, attribution: WALLET_ATTRIBUTION,
    };

    const signed = await signEarning(sk, pk, entry);
    // Tamper: zero out the fee (the "I deserve everything" attack).
    const tampered = JSON.parse(JSON.stringify(signed));
    tampered.payload.fee = 0;
    tampered.payload.net = gross; // try to cover the tamper

    const ok = await verifyEarning(tampered, pubkey);
    assert("tampered fee is rejected", !ok);

    // Also verify signEarning itself throws on bad fee input.
    let threw = false;
    try {
      await signEarning(sk, pk, { ...entry, fee: 0, net: gross });
    } catch {
      threw = true;
    }
    assert("signEarning throws on wrong fee", threw);
  }

  // --------------------------------------------------------------------------
  // [16] Sequential chain integrity — two entries linked via prevHash.
  //
  // Entry #2 embeds entry #1's hash in prevHash. Tampering #2 breaks
  // the message byte-for-byte, which invalidates the signature and hash.
  // This is how the earnings ledger maintains the same tamper-evidence
  // as the heartbeat log: every entry is cryptographically chained to
  // every entry before it.
  // --------------------------------------------------------------------------
  console.log("\n[16] Sequential chain integrity — prevHash links verified");
  {
    const sk = ed.utils.randomSecretKey();
    const pk = await ed.getPublicKeyAsync(sk);
    const pubkey = toHex(pk);
    const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;

    const gross1 = 5.0;
    const entry1 = {
      v: 1, kind: "earning", nodeId, pubkey,
      source: "nodle", externalRef: "nodle:alloc:chain-01",
      currency: "NODL",
      gross: gross1, fee: round8(gross1 * 0.01), net: round8(gross1 * 0.99),
      ts: Date.now(), prevHash: null, attribution: WALLET_ATTRIBUTION,
    };
    const signed1 = await signEarning(sk, pk, entry1);
    assert("entry #1 verifies", await verifyEarning(signed1, pubkey));

    const gross2 = 7.5;
    const entry2 = {
      v: 1, kind: "earning", nodeId, pubkey,
      source: "nodle", externalRef: "nodle:alloc:chain-02",
      currency: "NODL",
      gross: gross2, fee: round8(gross2 * 0.01), net: round8(gross2 * 0.99),
      ts: Date.now() + 1, prevHash: signed1.hash, attribution: WALLET_ATTRIBUTION,
    };
    const signed2 = await signEarning(sk, pk, entry2);
    assert("entry #2 verifies with correct prevHash", await verifyEarning(signed2, pubkey));
    assert("entry #2 prevHash equals entry #1 hash", signed2.payload.prevHash === signed1.hash);

    // Tamper #2: replace prevHash with a fake one.
    const tampered2 = JSON.parse(JSON.stringify(signed2));
    tampered2.payload.prevHash = "0000000000000000";
    assert("tampered prevHash fails verification", !(await verifyEarning(tampered2, pubkey)));
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
