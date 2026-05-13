// ============================================================================
// Local regression tests for the Cloudflare Pages /api/attest function.
//
// Run: node scripts/test-attest-api.mjs
// ============================================================================

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function loadAttestModule() {
  const fileUrl = new URL("../functions/api/attest.js", import.meta.url);
  let source = await readFile(fileUrl, "utf8");
  source = source.replaceAll("export async function ", "async function ");
  return new Function(`${source}\nreturn { onRequestPost, onRequest };`)();
}

class MockKv {
  constructor() {
    this.map = new Map();
    this.puts = [];
  }

  async put(key, value, options) {
    this.map.set(key, { value, options });
    this.puts.push({ key, value, options });
  }
}

function requestFor(body, bearerToken) {
  return new Request("https://getkinetik.app/api/attest", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(body),
  });
}

async function postAttestation(onRequestPost, env, body, bearerToken) {
  const response = await onRequestPost({
    env,
    request: requestFor(body, bearerToken),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

const { onRequestPost } = await loadAttestModule();

const nodeId = "KINETIK-NODE-A3F2B719";
const baseBody = {
  nodeId,
  kind: "engagement",
  network: "dimo",
  detail: "Trip uploaded successfully.",
  weight: 1,
};

{
  const kv = new MockKv();
  const result = await postAttestation(
    onRequestPost,
    {
      ATTEST_API_KEYS: JSON.stringify({ dimo: "dimo-secret", hivemapper: "hm-secret" }),
      KINETIK_KV: kv,
    },
    baseBody,
    "dimo-secret",
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.attestor, "dimo");
  assert.equal(kv.puts.length, 1);
  assert.match(result.body.receipt, new RegExp(`^attest:${nodeId}:\\d+:`));

  const stored = JSON.parse(kv.puts[0].value);
  assert.equal(stored.attestor, "dimo");
  assert.equal(stored.nodeId, nodeId);
}

{
  const kv = new MockKv();
  const result = await postAttestation(
    onRequestPost,
    {
      ATTEST_API_KEYS: JSON.stringify({ dimo: "dimo-secret" }),
      ATTEST_API_KEY: "legacy-secret",
      KINETIK_KV: kv,
    },
    baseBody,
    "legacy-secret",
  );

  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { error: "invalid_auth" });
  assert.equal(kv.puts.length, 0);
}

{
  const realDateNow = Date.now;
  Date.now = () => 1778679539654;
  try {
    const kv = new MockKv();
    const env = {
      ATTEST_API_KEYS: JSON.stringify({ dimo: "dimo-secret" }),
      KINETIK_KV: kv,
    };

    const first = await postAttestation(
      onRequestPost,
      env,
      { ...baseBody, detail: "first same-millisecond signal" },
      "dimo-secret",
    );
    const second = await postAttestation(
      onRequestPost,
      env,
      { ...baseBody, detail: "second same-millisecond signal" },
      "dimo-secret",
    );

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.notEqual(first.body.receipt, second.body.receipt);
    assert.match(first.body.receipt, new RegExp(`^attest:${nodeId}:1778679539654:`));
    assert.match(second.body.receipt, new RegExp(`^attest:${nodeId}:1778679539654:`));
    assert.equal(kv.map.size, 2);

    const details = [...kv.map.values()].map(({ value }) => JSON.parse(value).detail).sort();
    assert.deepEqual(details, [
      "first same-millisecond signal",
      "second same-millisecond signal",
    ]);
  } finally {
    Date.now = realDateNow;
  }
}

console.log("PASS  /api/attest partner auth and same-millisecond receipt uniqueness");
