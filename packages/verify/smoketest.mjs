// ============================================================================
// @getkinetik/verify — package smoketest.
// ----------------------------------------------------------------------------
// Mints a fresh ephemeral keypair, signs sample artifacts (proof-of-origin,
// heartbeat, earning) using the same byte contract the GETKINETIK app uses,
// then runs them through the BUILT package output (./dist/index.js) to
// confirm every check passes. Also runs negative cases (tampered payload,
// wrong key, bad fee).
//
// Run AFTER `npm run build`. The script imports from ./dist on purpose so
// it tests the actual published artifact, not the TypeScript source.
//
// Exit code 0 = all pass. Anything else = bug.
// ============================================================================

import * as ed from '@noble/ed25519';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import {
  BUREAU_PUBKEY,
  PROOF_ATTRIBUTION,
  PROTOCOL_FEE_RATE,
  VERSION,
  decodeProofUrl,
  stableStringify,
  verifyArtifact,
} from './dist/index.js';

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const utf8 = (s) => new TextEncoder().encode(s);
const round8 = (n) => Math.round(n * 1e8) / 1e8;

let passed = 0;
let failed = 0;

const assert = (cond, label) => {
  if (cond) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}`);
  }
};

console.log(`@getkinetik/verify smoketest — package version ${VERSION}\n`);

// ---- [1] mint a fresh node identity ----------------------------------------
const sk = ed.utils.randomSecretKey();
const pk = await ed.getPublicKeyAsync(sk);
const pubkey = toHex(pk);
const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;

// ---- [2] proof-of-origin happy path ----------------------------------------
console.log('[1] proof-of-origin happy path');
{
  const payload = {
    v: 2,
    kind: 'proof-of-origin',
    nodeId,
    pubkey,
    mintedAt: Date.now() - 86400000,
    issuedAt: Date.now(),
    lifetimeBeats: 142,
    firstBeatTs: Date.now() - 1_000_000,
    chainTip: toHex(sha256(utf8('chaintip'))).slice(0, 16),
    attribution: PROOF_ATTRIBUTION,
    sensors: { lux: 348, motionRms: 0.07, pressureHpa: 1013.21 },
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const hash = toHex(sha256(utf8(message))).slice(0, 16);
  const report = await verifyArtifact({ payload, message, signature, hash });
  assert(report.valid, 'overall valid');
  assert(report.kind === 'proof-of-origin', 'kind is proof-of-origin');
  assert(report.checks.canonicalMatches, 'canonical matches');
  assert(report.checks.hashMatches, 'hash matches');
  assert(report.checks.attributionOk === true, 'attribution intact');
  assert(report.checks.signatureOk, 'signature verifies');
  assert(report.checks.feeIntegrityOk === null, 'feeIntegrityOk is N/A');
}

// ---- [3] heartbeat happy path (no attribution check) -----------------------
console.log('\n[2] v:2 heartbeat happy path');
{
  const payload = {
    v: 2,
    kind: 'heartbeat',
    nodeId,
    pubkey,
    seq: 23,
    ts: Date.now(),
    stabilityPct: 97,
    online: true,
    charging: false,
    prevHash: '0000000000000000',
    sensors: { lux: 110, motionRms: 0.02, pressureHpa: 1009.5 },
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const report = await verifyArtifact({ payload, signature });
  assert(report.valid, 'compact form heartbeat verifies');
  assert(report.kind === 'heartbeat', 'kind is heartbeat');
  assert(report.checks.attributionOk === null, 'attributionOk is N/A');
  assert(report.checks.feeIntegrityOk === null, 'feeIntegrityOk is N/A');
}

// ---- [4] earning happy path (1% fee math) ----------------------------------
console.log('\n[3] earning happy path');
{
  const gross = 1.234567;
  const fee = round8(gross * PROTOCOL_FEE_RATE);
  const net = round8(gross - fee);
  const payload = {
    v: 1,
    kind: 'earning',
    nodeId,
    pubkey,
    source: 'TEST_NETWORK',
    currency: 'USD',
    gross,
    fee,
    net,
    ts: Date.now(),
    externalRef: 'test-ref-001',
    prevHash: '0000000000000000',
    attribution: PROOF_ATTRIBUTION,
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const report = await verifyArtifact({ payload, message, signature });
  assert(report.valid, 'earning overall valid');
  assert(report.checks.feeIntegrityOk === true, 'fee integrity holds');
  assert(report.checks.attributionOk === true, 'attribution intact');
}

// ---- [5] tampered earning fee — must fail ----------------------------------
console.log('\n[4] tampered earning fee');
{
  const gross = 2;
  const fee = 0.05; // wrong: should be 0.02
  const net = gross - fee;
  const payload = {
    v: 1,
    kind: 'earning',
    nodeId,
    pubkey,
    source: 'TEST_NETWORK',
    currency: 'USD',
    gross,
    fee,
    net,
    ts: Date.now(),
    externalRef: 'tamper-ref',
    prevHash: '0000000000000000',
    attribution: PROOF_ATTRIBUTION,
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const report = await verifyArtifact({ payload, message, signature });
  assert(!report.valid, 'tampered fee rejected');
  assert(report.checks.feeIntegrityOk === false, 'fee integrity check failed');
}

// ---- [6] tampered payload (lifetimeBeats changed) — must fail --------------
console.log('\n[5] tampered proof-of-origin payload');
{
  const payload = {
    v: 2,
    kind: 'proof-of-origin',
    nodeId,
    pubkey,
    mintedAt: Date.now(),
    issuedAt: Date.now(),
    lifetimeBeats: 100,
    firstBeatTs: Date.now() - 100000,
    chainTip: '0000000000000000',
    attribution: PROOF_ATTRIBUTION,
    sensors: { lux: null, motionRms: null, pressureHpa: null },
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  // Tamper after signing.
  const tampered = { ...payload, lifetimeBeats: 9999 };
  const report = await verifyArtifact({ payload: tampered, message, signature });
  assert(!report.valid, 'tampered payload rejected');
  assert(!report.checks.canonicalMatches, 'canonicalMatches false (drift)');
  assert(!report.checks.signatureOk, 'signature does not verify against tampered payload');
}

// ---- [7] stripped attribution — must fail ----------------------------------
console.log('\n[6] stripped attribution');
{
  const payload = {
    v: 2,
    kind: 'proof-of-origin',
    nodeId,
    pubkey,
    mintedAt: Date.now(),
    issuedAt: Date.now(),
    lifetimeBeats: 5,
    firstBeatTs: Date.now() - 1000,
    chainTip: '0000000000000000',
    attribution: 'NOT THE REAL ATTRIBUTION',
    sensors: { lux: null, motionRms: null, pressureHpa: null },
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const report = await verifyArtifact({ payload, message, signature });
  assert(!report.valid, 'wrong attribution rejected');
  assert(report.checks.attributionOk === false, 'attributionOk is false');
}

// ---- [8] wrong-key forgery — must fail -------------------------------------
console.log('\n[7] wrong-key forgery');
{
  const sk2 = ed.utils.randomSecretKey();
  const payload = {
    v: 2,
    kind: 'proof-of-origin',
    nodeId,
    pubkey, // claims to be the original key
    mintedAt: Date.now(),
    issuedAt: Date.now(),
    lifetimeBeats: 5,
    firstBeatTs: Date.now() - 1000,
    chainTip: '0000000000000000',
    attribution: PROOF_ATTRIBUTION,
    sensors: { lux: null, motionRms: null, pressureHpa: null },
  };
  const message = stableStringify(payload);
  // Sign with the WRONG key.
  const signature = toHex(await ed.signAsync(utf8(message), sk2));
  const report = await verifyArtifact({ payload, message, signature });
  assert(!report.valid, 'wrong-key forgery rejected');
  assert(!report.checks.signatureOk, 'signatureOk false (key mismatch)');
}

// ---- [9] decodeProofUrl roundtrip ------------------------------------------
console.log('\n[8] decodeProofUrl roundtrip');
{
  const payload = {
    v: 2,
    kind: 'proof-of-origin',
    nodeId,
    pubkey,
    mintedAt: Date.now(),
    issuedAt: Date.now(),
    lifetimeBeats: 7,
    firstBeatTs: Date.now() - 5000,
    chainTip: 'aaaaaaaaaaaaaaaa',
    attribution: PROOF_ATTRIBUTION,
    sensors: { lux: 200, motionRms: 0.03, pressureHpa: 1015.2 },
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const compact = { payload, signature };
  const json = JSON.stringify(compact);
  const b64 = Buffer.from(json).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const url = `https://getkinetik.app/verify/#proof=${b64}`;

  const decoded = decodeProofUrl(url);
  const report = await verifyArtifact(decoded);
  assert(report.valid, 'URL roundtrip artifact verifies');
  assert(report.kind === 'proof-of-origin', 'kind survives roundtrip');
}

// ---- [9.5] BUREAU_PUBKEY constant sanity ------------------------------------
console.log('\n[9.5] BUREAU_PUBKEY shape');
{
  assert(typeof BUREAU_PUBKEY === 'string', 'BUREAU_PUBKEY is a string');
  assert(
    /^[0-9a-f]{64}$/.test(BUREAU_PUBKEY),
    'BUREAU_PUBKEY is 64-char lowercase hex',
  );
}

// ---- [10] attestation happy path -------------------------------------------
//
// Mints an ephemeral bureau key, signs a canonical attestation, then verifies
// against @getkinetik/verify. signatureOk must pass; bureauOk fails *iff* the
// ephemeral key is not the published BUREAU_PUBKEY (it isn't, until the
// ceremony lands), so the overall artifact is `valid: false` due to bureauOk.
// Post-ceremony, this test must be updated to load the real bureau key.
console.log('\n[10] attestation happy path');

// Canonical sub-block helpers that mirror packages/kinetik-core/src/attestation.ts
// and functions/api/_lib/bureauSign.js — keep these byte-for-byte identical.
const canonicalSubject = (s) => ({
  chainTip: s.chainTip ?? null,
  mintedAt: s.mintedAt,
  nodeId: s.nodeId,
  pubkey: s.pubkey,
});
const canonicalBureauObserved = (b) => ({
  firstSeenMs: b.firstSeenMs,
  lastSeenMs: b.lastSeenMs,
  peakLifetimeBeats: b.peakLifetimeBeats,
});
const canonicalChainClaim = (c) => ({
  firstBeatTs: c.firstBeatTs ?? null,
  lifetimeBeats: c.lifetimeBeats,
  schema: c.schema,
});
const canonicalSensorCoherence = (s) => ({
  luxObserved: !!s.luxObserved,
  luxPlausible: s.luxPlausible ?? null,
  motionRmsObserved: !!s.motionRmsObserved,
  motionRmsPlausible: s.motionRmsPlausible ?? null,
  pressureHpaObserved: !!s.pressureHpaObserved,
  pressureHpaPlausible: s.pressureHpaPlausible ?? null,
});
const canonicalFlags = (flags) =>
  Array.from(new Set(Array.isArray(flags) ? flags : [])).sort();

{
  const bureauSk = ed.utils.randomSecretKey();
  const bureauPk = await ed.getPublicKeyAsync(bureauSk);
  const bureauPubHex = toHex(bureauPk);
  const now = Date.now();

  const payload = {
    v: 1,
    kind: 'attestation',
    attribution: PROOF_ATTRIBUTION,
    pubkey: bureauPubHex,
    bureauTs: now,
    subject: canonicalSubject({
      mintedAt: now - 1_000_000,
      nodeId,
      pubkey,
      chainTip: 'a1b2c3d4e5f60718',
    }),
    bureauObserved: canonicalBureauObserved({
      firstSeenMs: now - 10_000_000,
      lastSeenMs: now,
      peakLifetimeBeats: 25_847,
    }),
    chainClaim: canonicalChainClaim({
      firstBeatTs: now - 10_000_000,
      lifetimeBeats: 25_847,
      schema: 'proof-of-origin:v2',
    }),
    sensorCoherence: canonicalSensorCoherence({
      luxObserved: true,
      luxPlausible: true,
      motionRmsObserved: true,
      motionRmsPlausible: true,
      pressureHpaObserved: true,
      pressureHpaPlausible: true,
    }),
    flags: canonicalFlags([]),
    witnesses: [],
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), bureauSk));
  const report = await verifyArtifact({ payload, message, signature });

  assert(report.kind === 'attestation', 'kind is attestation');
  assert(report.checks.canonicalMatches, 'canonical matches');
  assert(report.checks.hashMatches, 'hash matches');
  assert(report.checks.attributionOk === true, 'attribution intact');
  assert(report.checks.feeIntegrityOk === null, 'feeIntegrityOk is N/A');
  assert(report.checks.signatureOk, 'signature verifies against bureau key');

  // bureauOk reflects whether the signing key equals the PUBLISHED bureau key.
  // While BUREAU_PUBKEY is the pre-ceremony placeholder (zeros), or any test
  // bureau key, this is expected to be false. Post-ceremony, the test must
  // be updated to use the real bureau key.
  const expectedBureauOk = bureauPubHex === BUREAU_PUBKEY;
  assert(
    report.checks.bureauOk === expectedBureauOk,
    `bureauOk matches BUREAU_PUBKEY comparison (${expectedBureauOk})`,
  );
  // Overall validity tracks bureauOk for the attestation kind.
  assert(
    report.valid === expectedBureauOk,
    `valid follows bureauOk (${expectedBureauOk})`,
  );
}

// ---- [11] attestation tampered subject — must fail -------------------------
console.log('\n[11] tampered attestation subject');
{
  const bureauSk = ed.utils.randomSecretKey();
  const bureauPk = await ed.getPublicKeyAsync(bureauSk);
  const bureauPubHex = toHex(bureauPk);
  const now = Date.now();

  const payload = {
    v: 1,
    kind: 'attestation',
    attribution: PROOF_ATTRIBUTION,
    pubkey: bureauPubHex,
    bureauTs: now,
    subject: canonicalSubject({
      mintedAt: now - 1_000_000,
      nodeId,
      pubkey,
      chainTip: 'a1b2c3d4e5f60718',
    }),
    bureauObserved: canonicalBureauObserved({
      firstSeenMs: now - 10_000_000,
      lastSeenMs: now,
      peakLifetimeBeats: 100,
    }),
    chainClaim: canonicalChainClaim({
      firstBeatTs: now - 10_000_000,
      lifetimeBeats: 100,
      schema: 'proof-of-origin:v2',
    }),
    sensorCoherence: canonicalSensorCoherence({
      luxObserved: false,
      motionRmsObserved: false,
      pressureHpaObserved: false,
    }),
    flags: canonicalFlags([]),
    witnesses: [],
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), bureauSk));

  // Tamper: change the subject nodeId after signing.
  const tampered = {
    ...payload,
    subject: { ...payload.subject, nodeId: 'KINETIK-NODE-DEADBEEF' },
  };
  const report = await verifyArtifact({
    payload: tampered,
    message,
    signature,
  });
  assert(!report.valid, 'tampered subject rejected');
  assert(!report.checks.canonicalMatches, 'canonicalMatches false');
  assert(
    !report.checks.signatureOk,
    'signature does not verify against tampered payload',
  );
}

// ---- [12] non-bureau-key forgery — bureauOk catches it ----------------------
//
// Sign a structurally-valid attestation with some random key whose hex is
// NOT equal to BUREAU_PUBKEY. signatureOk passes (it's a valid Ed25519
// signature against the embedded pubkey), but bureauOk fails — which is
// the property that protects partners from forged "GETKINETIK bureau"
// attestations signed by an attacker's own key.
console.log('\n[12] non-bureau-key forgery (bureauOk catches it)');
{
  const forgerSk = ed.utils.randomSecretKey();
  const forgerPk = await ed.getPublicKeyAsync(forgerSk);
  const forgerPubHex = toHex(forgerPk);
  const now = Date.now();

  // Confirm the forger key is definitely not the published bureau key.
  // Astronomically unlikely to collide; an extra defensive guard.
  assert(forgerPubHex !== BUREAU_PUBKEY, 'forger key != BUREAU_PUBKEY');

  const payload = {
    v: 1,
    kind: 'attestation',
    attribution: PROOF_ATTRIBUTION,
    pubkey: forgerPubHex,
    bureauTs: now,
    subject: canonicalSubject({
      mintedAt: now,
      nodeId,
      pubkey,
      chainTip: null,
    }),
    bureauObserved: canonicalBureauObserved({
      firstSeenMs: now,
      lastSeenMs: now,
      peakLifetimeBeats: 0,
    }),
    chainClaim: canonicalChainClaim({
      firstBeatTs: null,
      lifetimeBeats: 0,
      schema: 'proof-of-origin:v2',
    }),
    sensorCoherence: canonicalSensorCoherence({}),
    flags: canonicalFlags([]),
    witnesses: [],
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), forgerSk));
  const report = await verifyArtifact({ payload, message, signature });

  assert(report.checks.signatureOk, 'forger signature is cryptographically valid');
  assert(report.checks.bureauOk === false, 'bureauOk catches the non-bureau signer');
  assert(!report.valid, 'forgery rejected by bureauOk');
}

// ---- [13] structurally-invalid input — must throw --------------------------
console.log('\n[13] structurally-invalid inputs throw');
{
  let threw = false;
  try {
    await verifyArtifact({ payload: { pubkey: 'not-hex' }, signature: 'whatever' });
  } catch {
    threw = true;
  }
  assert(threw, 'malformed pubkey throws structural error');

  let threw2 = false;
  try {
    await verifyArtifact({ payload: { pubkey: 'a'.repeat(64) }, signature: 'too-short' });
  } catch {
    threw2 = true;
  }
  assert(threw2, 'malformed signature throws structural error');
}

// ----------------------------------------------------------------------------
console.log('\n--------------------------------------------------------');
console.log(`@getkinetik/verify  ${passed} passed  ${failed} failed`);
if (failed > 0) {
  console.log('SMOKETEST FAILED');
  process.exit(1);
}
console.log('SMOKETEST PASSED');
