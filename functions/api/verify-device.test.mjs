import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

if (!globalThis.atob) {
  Object.defineProperty(globalThis, 'atob', {
    value: (value) => Buffer.from(value, 'base64').toString('binary'),
  });
}

const PROOF_ATTRIBUTION = 'GETKINETIK by OutFromNothing LLC';
const PROTOCOL_FEE_RATE = 0.01;

const utf8 = (value) => new TextEncoder().encode(value);
const toHex = (bytes) =>
  Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
const round8 = (n) => Math.round(n * 1e8) / 1e8;

const stableStringify = (obj) => {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const key of keys) {
    parts.push(`${JSON.stringify(key)}:${JSON.stringify(obj[key])}`);
  }
  return `{${parts.join(',')}}`;
};

const sha256Hex = async (message) => {
  const digest = await crypto.subtle.digest('SHA-256', utf8(message));
  return toHex(digest);
};

const toProofUrl = (artifact) => {
  const b64 = Buffer.from(JSON.stringify(artifact))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `https://getkinetik.app/verify/#proof=${b64}`;
};

const source = await readFile(new URL('./verify-device.js', import.meta.url), 'utf8');
const worker = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);

const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
  'sign',
  'verify',
]);
const pubkey = toHex(await crypto.subtle.exportKey('raw', keyPair.publicKey));
const nodeId = `KINETIK-NODE-${(await sha256Hex(pubkey)).slice(0, 8).toUpperCase()}`;

async function signArtifact(payload, options = {}) {
  const { includeMessage = true, includeHash = true } = options;
  const message = stableStringify(payload);
  const signature = toHex(await crypto.subtle.sign('Ed25519', keyPair.privateKey, utf8(message)));
  const artifact = { payload, signature };
  if (includeMessage) artifact.message = message;
  if (includeHash) artifact.hash = (await sha256Hex(message)).slice(0, 16);
  return artifact;
}

async function postArtifact(artifact) {
  const response = await worker.onRequestPost({
    request: new Request('https://getkinetik.app/api/verify-device', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ proofUrl: toProofUrl(artifact) }),
    }),
  });
  const body = await response.json();
  return { status: response.status, body };
}

let failures = 0;
const check = (label, condition) => {
  console.log(`  ${condition ? 'PASS' : 'FAIL'}  ${label}`);
  if (!condition) failures += 1;
};

console.log('verify-device webhook parity tests\n');

{
  const issuedAt = Date.now();
  const artifact = await signArtifact({
    v: 2,
    kind: 'proof-of-origin',
    nodeId,
    pubkey,
    mintedAt: issuedAt - 86_400_000,
    issuedAt,
    lifetimeBeats: 42,
    firstBeatTs: issuedAt - 60_000,
    chainTip: 'aaaaaaaaaaaaaaaa',
    attribution: PROOF_ATTRIBUTION,
    sensors: { lux: 123, motionRms: 0.02, pressureHpa: 1012.3 },
  });
  const { status, body } = await postArtifact(artifact);
  check('proof-of-origin request returns HTTP 200', status === 200);
  check('proof-of-origin verifies', body.valid === true);
  check('proof-of-origin schema is preserved', body.schema === 'proof-of-origin:v2');
  check('proof-of-origin issuedAt is returned', body.mintedAt === issuedAt);
}

{
  const ts = Date.now();
  const artifact = await signArtifact(
    {
      v: 2,
      kind: 'heartbeat',
      nodeId,
      pubkey,
      seq: 23,
      ts,
      stabilityPct: 97,
      online: true,
      charging: false,
      prevHash: '0000000000000000',
      sensors: { lux: 110, motionRms: 0.02, pressureHpa: 1009.5 },
    },
    { includeMessage: false, includeHash: false },
  );
  const { body } = await postArtifact(artifact);
  check('compact heartbeat without attribution verifies', body.valid === true);
  check('heartbeat schema is preserved', body.schema === 'heartbeat:v2');
  check('heartbeat timestamp is returned', body.mintedAt === ts);
}

{
  const gross = 2;
  const artifact = await signArtifact({
    v: 1,
    kind: 'earning',
    nodeId,
    pubkey,
    source: 'TEST_NETWORK',
    currency: 'USD',
    gross,
    fee: 0.05,
    net: gross - 0.05,
    ts: Date.now(),
    externalRef: 'tampered-fee',
    prevHash: '0000000000000000',
    attribution: PROOF_ATTRIBUTION,
  });
  const { body } = await postArtifact(artifact);
  check('signed earning with wrong fee is rejected', body.valid === false);
  check('wrong fee reports fee integrity mismatch', body.reason === 'fee_integrity_mismatch');
}

{
  const gross = 2;
  const fee = round8(gross * PROTOCOL_FEE_RATE);
  const artifact = await signArtifact({
    v: 1,
    kind: 'earning',
    nodeId,
    pubkey,
    source: 'TEST_NETWORK',
    currency: 'USD',
    gross,
    fee,
    net: round8(gross - fee),
    ts: Date.now(),
    externalRef: 'valid-fee',
    prevHash: '0000000000000000',
    attribution: PROOF_ATTRIBUTION,
  });
  const { body } = await postArtifact(artifact);
  check('signed earning with correct fee verifies', body.valid === true);
  check('earning schema is preserved', body.schema === 'earning:v1');
}

{
  const payload = {
    v: 2,
    kind: 'proof-of-origin',
    nodeId,
    pubkey,
    mintedAt: Date.now() - 1000,
    issuedAt: Date.now(),
    lifetimeBeats: 3,
    firstBeatTs: Date.now() - 2000,
    chainTip: 'bbbbbbbbbbbbbbbb',
    attribution: PROOF_ATTRIBUTION,
    sensors: { lux: null, motionRms: null, pressureHpa: null },
  };
  const artifact = await signArtifact(payload);
  artifact.message = stableStringify({ ...payload, lifetimeBeats: 999 });
  const { body } = await postArtifact(artifact);
  check('artifact with non-canonical message is rejected', body.valid === false);
  check('non-canonical message reports message mismatch', body.reason === 'message_mismatch');
}

console.log(`\n${failures === 0 ? 'verify-device tests passed' : 'verify-device tests failed'}`);
if (failures > 0) {
  process.exit(1);
}
