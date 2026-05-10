import assert from 'node:assert/strict';

import { onRequestPost } from './verify-device.js';

const PROOF_ATTRIBUTION = 'GETKINETIK by OutFromNothing LLC';

const toHex = (bytes) =>
  Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');

const utf8 = (s) => new TextEncoder().encode(s);

const sha256Hex = async (bytes) =>
  toHex(await crypto.subtle.digest('SHA-256', bytes));

const stableStringify = (obj) => {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const key of keys) {
    parts.push(`${JSON.stringify(key)}:${JSON.stringify(obj[key])}`);
  }
  return `{${parts.join(',')}}`;
};

const base64UrlEncode = (value) =>
  Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

async function mintArtifact(overrides = {}) {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify'],
  );
  const publicKeyBytes = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const pubkey = toHex(publicKeyBytes);
  const fingerprint = await sha256Hex(publicKeyBytes);
  const payload = {
    v: 2,
    kind: 'proof-of-origin',
    nodeId: `KINETIK-NODE-${fingerprint.slice(0, 8).toUpperCase()}`,
    pubkey,
    mintedAt: Date.now() - 60_000,
    issuedAt: Date.now(),
    lifetimeBeats: 42,
    firstBeatTs: Date.now() - 30_000,
    chainTip: '0000000000000000',
    attribution: PROOF_ATTRIBUTION,
    sensors: null,
    ...overrides,
  };
  const message = stableStringify(payload);
  const signature = toHex(
    await crypto.subtle.sign('Ed25519', keyPair.privateKey, utf8(message)),
  );
  const hash = (await sha256Hex(utf8(message))).slice(0, 16);

  return { payload, message, signature, hash };
}

function verifierUrl(artifact) {
  return `https://getkinetik.app/verify/#proof=${base64UrlEncode(JSON.stringify(artifact))}`;
}

async function verify(proofUrl) {
  const request = new Request('https://getkinetik.app/api/verify-device', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ proofUrl }),
  });
  const response = await onRequestPost({ request });
  assert.equal(response.status, 200);
  return response.json();
}

{
  const full = await mintArtifact();
  const compact = { payload: full.payload, signature: full.signature };
  const result = await verify(verifierUrl(compact));

  assert.equal(result.valid, true);
  assert.equal(result.nodeId, full.payload.nodeId);
  assert.equal(result.pubkey, full.payload.pubkey);
  assert.equal(result.schema, 'proof-of-origin:v2');
}

{
  const full = await mintArtifact();
  const result = await verify(verifierUrl(full));

  assert.equal(result.valid, true);
  assert.equal(result.mintedAt, full.payload.issuedAt);
}

{
  const heartbeat = await mintArtifact({
    kind: 'heartbeat',
    attribution: undefined,
    ts: Date.now(),
  });
  const result = await verify(verifierUrl(heartbeat));

  assert.deepEqual(result, { valid: false, reason: 'wrong_kind' });
}

{
  const full = await mintArtifact();
  const tampered = {
    payload: { ...full.payload, lifetimeBeats: full.payload.lifetimeBeats + 1 },
    signature: full.signature,
  };
  const result = await verify(verifierUrl(tampered));

  assert.deepEqual(result, { valid: false, reason: 'signature_invalid' });
}

console.log('verify-device tests passed');
