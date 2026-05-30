// ============================================================================
// Verifier parity proof — browser verifier vs @getkinetik/verify SDK.
// ----------------------------------------------------------------------------
// Establishes deterministic behavior parity across representative fixtures.
// This script is intended to run before and after verifier migration.
//
// Coverage:
//   1) valid proof URL decode
//   2) truncated URL handling
//   3) invalid signature rejection
//   4) missing required fields structural errors
//   5) attestation branch (including bureauOk)
//
// Exit 0 = parity holds for all supported fixtures.
// ============================================================================

import * as ed from '@noble/ed25519';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  BUREAU_PUBKEY,
  PROOF_ATTRIBUTION,
  decodeProofUrl as sdkDecodeProofUrl,
  stableStringify,
  verifyArtifact as sdkVerifyArtifact,
} from '../packages/verify/dist/index.js';

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const browserVerifierPath = resolve(repoRoot, 'landing/verify/verifier.js');

const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const utf8 = (s) => new TextEncoder().encode(s);
const round8 = (n) => Math.round(n * 1e8) / 1e8;
const b64url = (s) =>
  Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const FIXED_SK = Uint8Array.from(
  Buffer.from('0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20', 'hex'),
);

async function mintArtifact(payload, sk = FIXED_SK) {
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const hash = toHex(sha256(utf8(message))).slice(0, 16);
  return { payload, message, signature, hash };
}

function normalizeResult(x) {
  return JSON.stringify(x);
}

function makeElement(id) {
  return {
    id,
    value: '',
    innerHTML: '',
    classList: { add() {}, remove() {} },
    addEventListener() {},
    focus() {},
    scrollIntoView() {},
  };
}

async function loadBrowserVerifier() {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  };

  globalThis.document = { getElementById: get };
  globalThis.window = {
    location: { hash: '', pathname: '/verify/' },
    __kinetikVerifier: undefined,
  };
  globalThis.history = { replaceState() {} };
  globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
  globalThis.console = console;

  const href = `${pathToFileURL(browserVerifierPath).href}?parity=${Date.now()}-${Math.random()}`;
  await import(href);

  if (!globalThis.window.__kinetikVerifier) {
    throw new Error('browser verifier did not attach window.__kinetikVerifier');
  }

  return {
    api: globalThis.window.__kinetikVerifier,
    elements,
  };
}

let passed = 0;
let failed = 0;
let unsupported = 0;

function pass(label) {
  passed += 1;
  console.log(`  PASS  ${label}`);
}
function fail(label, detail) {
  failed += 1;
  console.log(`  FAIL  ${label}`);
  if (detail) console.log(`        ${detail}`);
}
function unsupportedCase(label, detail) {
  unsupported += 1;
  console.log(`  UNSUPPORTED  ${label}`);
  if (detail) console.log(`        ${detail}`);
}

function expectEqual(label, a, b) {
  if (a === b) pass(label);
  else fail(label, `expected ${a}\n        actual   ${b}`);
}

function expectThrows(label, fn) {
  try {
    fn();
    fail(label, 'expected throw');
    return null;
  } catch (err) {
    pass(label);
    return err instanceof Error ? err.message : String(err);
  }
}

async function run() {
  const pk = await ed.getPublicKeyAsync(FIXED_SK);
  const pubkey = toHex(pk);
  const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;

  const { api: browser } = await loadBrowserVerifier();
  const browserVerifyArtifact = browser.verifyArtifact;
  const browserDecodeProofUrl =
    typeof browser.decodeProofUrl === 'function' ? browser.decodeProofUrl : null;
  const browserBureauPubkey =
    typeof browser.BUREAU_PUBKEY === 'string' ? browser.BUREAU_PUBKEY : null;
  console.log('[1] invalid signature parity');
  const basePayload = {
    v: 2,
    kind: 'proof-of-origin',
    nodeId,
    pubkey,
    mintedAt: 1_700_000_000_000,
    issuedAt: 1_700_000_100_000,
    lifetimeBeats: 42,
    firstBeatTs: 1_700_000_050_000,
    chainTip: '0123456789abcdef',
    attribution: PROOF_ATTRIBUTION,
    sensors: { latitude: 37.774, longitude: -122.419, lux: 220, motionRms: 0.04, pressureHpa: 1013.22 },
  };
  const signed = await mintArtifact(basePayload);
  const forged = { ...signed, signature: signed.signature.replace(/.$/, '0') };
  const sdkBadSig = await sdkVerifyArtifact(forged);
  const browserBadSig = await browserVerifyArtifact(forged);
  expectEqual('invalid signature report parity', normalizeResult(browserBadSig), normalizeResult(sdkBadSig));

  console.log('\n[2] missing fields parity');
  const missingPayloadArtifact = { signature: signed.signature };
  const sdkMissingPayloadErr = await (async () => {
    try {
      await sdkVerifyArtifact(missingPayloadArtifact);
      return 'NO_ERROR';
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  })();
  const browserMissingPayloadErr = await (async () => {
    try {
      await browserVerifyArtifact(missingPayloadArtifact);
      return 'NO_ERROR';
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  })();
  expectEqual('missing payload error parity', browserMissingPayloadErr, sdkMissingPayloadErr);

  const missingSignatureArtifact = { payload: basePayload };
  const sdkMissingSigErr = await (async () => {
    try {
      await sdkVerifyArtifact(missingSignatureArtifact);
      return 'NO_ERROR';
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  })();
  const browserMissingSigErr = await (async () => {
    try {
      await browserVerifyArtifact(missingSignatureArtifact);
      return 'NO_ERROR';
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  })();
  expectEqual('missing signature error parity', browserMissingSigErr, sdkMissingSigErr);

  console.log('\n[3] proof URL parity');
  const compact = { payload: basePayload, signature: signed.signature };
  const proofUrl = `https://getkinetik.app/verify/#proof=${b64url(JSON.stringify(compact))}`;
  if (!browserDecodeProofUrl) {
    unsupportedCase('browser decodeProofUrl missing');
  } else {
    const sdkDecoded = sdkDecodeProofUrl(proofUrl);
    const browserDecoded = browserDecodeProofUrl(proofUrl);
    expectEqual(
      'valid proof URL decode parity',
      normalizeResult(browserDecoded),
      normalizeResult(sdkDecoded),
    );

    const truncated = proofUrl.replace(/proof=.{12}/, 'proof=abc...xyz');
    const sdkErr = expectThrows('sdk truncated URL throws', () => sdkDecodeProofUrl(truncated));
    const browserErr = expectThrows('browser truncated URL throws', () =>
      browserDecodeProofUrl(truncated),
    );
    if (sdkErr !== null && browserErr !== null) {
      expectEqual('truncated URL error parity', browserErr, sdkErr);
    }
  }

  console.log('\n[4] attestation branch parity');
  const bureauSk = Uint8Array.from(
    Buffer.from('202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f', 'hex'),
  );
  const bureauPk = await ed.getPublicKeyAsync(bureauSk);
  const bureauPubHex = toHex(bureauPk);
  const attPayload = {
    v: 1,
    kind: 'attestation',
    attribution: PROOF_ATTRIBUTION,
    pubkey: bureauPubHex,
    bureauTs: 1_700_000_200_000,
    subject: { mintedAt: 1_700_000_000_000, nodeId, pubkey, chainTip: null },
    bureauObserved: { firstSeenMs: 1_700_000_000_000, lastSeenMs: 1_700_000_200_000, peakLifetimeBeats: 42 },
    chainClaim: { firstBeatTs: 1_700_000_000_000, lifetimeBeats: 42, schema: 'proof-of-origin:v2' },
    sensorCoherence: {
      luxObserved: true,
      luxPlausible: true,
      motionRmsObserved: true,
      motionRmsPlausible: true,
      pressureHpaObserved: true,
      pressureHpaPlausible: true,
    },
    flags: [],
    witnesses: [],
  };
  const att = await mintArtifact(attPayload, bureauSk);
  const sdkAtt = await sdkVerifyArtifact(att);
  const browserAtt = await browserVerifyArtifact(att);
  const browserHasBureauCheck =
    !!browserAtt && !!browserAtt.checks && Object.prototype.hasOwnProperty.call(browserAtt.checks, 'bureauOk');
  if (!browserHasBureauCheck) {
    unsupportedCase('browser attestation bureau check missing');
  } else {
    expectEqual('attestation report parity', normalizeResult(browserAtt), normalizeResult(sdkAtt));
    expectEqual(
      'attestation bureauOk expectation',
      String(browserAtt.checks.bureauOk),
      String(bureauPubHex.toLowerCase() === BUREAU_PUBKEY.toLowerCase()),
    );
  }

  if (!browserBureauPubkey) {
    unsupportedCase('browser BUREAU_PUBKEY missing');
  } else {
    expectEqual('browser/sdk BUREAU_PUBKEY parity', browserBureauPubkey, BUREAU_PUBKEY);
  }

  console.log('\n--------------------------------------------------------');
  console.log(`verifier parity  ${passed} passed  ${failed} failed  ${unsupported} unsupported`);
  if (failed > 0 || unsupported > 0) {
    console.log('VERIFIER PARITY FAILED');
    process.exit(1);
  }
  console.log('VERIFIER PARITY PASSED');
}

run().catch((err) => {
  console.error('verifier parity crashed:', err);
  process.exit(2);
});
