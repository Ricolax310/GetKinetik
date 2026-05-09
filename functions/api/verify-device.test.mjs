import * as ed from '@noble/ed25519';
import { sha256, sha512 } from '@noble/hashes/sha2.js';

import { onRequestPost } from './verify-device.js';

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const PROOF_ATTRIBUTION = 'GETKINETIK by OutFromNothing LLC';

const stableStringify = (obj) => {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(',')}}`;
};

const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const utf8 = (s) => new TextEncoder().encode(s);

const base64UrlEncode = (s) =>
  Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

async function mintProof({ nodeIdOverride, includeHash = false } = {}) {
  const sk = ed.utils.randomSecretKey();
  const pk = await ed.getPublicKeyAsync(sk);
  const pubkey = toHex(pk);
  const nodeId =
    nodeIdOverride ?? `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
  const payload = {
    v: 2,
    kind: 'proof-of-origin',
    nodeId,
    pubkey,
    mintedAt: Date.now() - 86400000,
    issuedAt: Date.now(),
    lifetimeBeats: 42,
    firstBeatTs: Date.now() - 60000,
    chainTip: toHex(sha256(utf8('verify-device-test'))).slice(0, 16),
    attribution: PROOF_ATTRIBUTION,
    sensors: { lux: null, motionRms: null, pressureHpa: null },
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const hash = toHex(sha256(utf8(message))).slice(0, 16);
  const artifact = includeHash
    ? { payload, message, signature, hash }
    : { payload, signature };
  return { artifact, nodeId, pubkey };
}

async function verifyArtifact(artifact) {
  const proofUrl = `https://getkinetik.app/verify/#proof=${base64UrlEncode(
    JSON.stringify(artifact),
  )}`;
  const request = new Request('https://getkinetik.app/api/verify-device', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ proofUrl }),
  });
  const response = await onRequestPost({ request });
  return response.json();
}

let failed = 0;
const assert = (condition, label) => {
  console.log(`  ${condition ? 'PASS' : 'FAIL'}  ${label}`);
  if (!condition) failed += 1;
};

console.log('[1] compact app verifier URL is accepted');
{
  const { artifact, nodeId, pubkey } = await mintProof();
  const result = await verifyArtifact(artifact);
  assert(result.valid === true, 'compact proof verifies');
  assert(result.nodeId === nodeId, 'nodeId returned');
  assert(result.pubkey === pubkey, 'pubkey returned');
}

console.log('\n[2] full artifact hash mismatch is rejected');
{
  const { artifact } = await mintProof({ includeHash: true });
  const result = await verifyArtifact({ ...artifact, hash: 'ffffffffffffffff' });
  assert(result.valid === false, 'invalid result');
  assert(result.reason === 'hash_mismatch', 'hash mismatch reason');
}

console.log('\n[3] signed spoofed nodeId is rejected');
{
  const { artifact } = await mintProof({ nodeIdOverride: 'KINETIK-NODE-FFFFFFFF' });
  const result = await verifyArtifact(artifact);
  assert(result.valid === false, 'invalid result');
  assert(result.reason === 'node_id_mismatch', 'node ID mismatch reason');
}

if (failed > 0) {
  console.log(`\nverify-device tests failed: ${failed}`);
  process.exit(1);
}
console.log('\nverify-device tests passed');
