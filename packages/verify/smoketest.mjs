// ============================================================================
// @kinetik/verify — package smoketest.
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

console.log(`@kinetik/verify smoketest — package version ${VERSION}\n`);

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

// ---- [10] structurally-invalid input — must throw --------------------------
console.log('\n[9] structurally-invalid inputs throw');
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
console.log(`@kinetik/verify  ${passed} passed  ${failed} failed`);
if (failed > 0) {
  console.log('SMOKETEST FAILED');
  process.exit(1);
}
console.log('SMOKETEST PASSED');
