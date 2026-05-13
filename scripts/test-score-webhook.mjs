import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../functions/api/verify-device.js", import.meta.url),
  "utf8",
);
const testModuleUrl =
  "data:text/javascript;base64," +
  Buffer.from(
    `${source}\nexport { maybeFireScoreWebhook, hmacSha256Hex };\n`,
  ).toString("base64");

const { maybeFireScoreWebhook, hmacSha256Hex } = await import(testModuleUrl);

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const calls = [];

globalThis.fetch = async (url, init) => {
  calls.push({ url, init });
  return new Response("ok", { status: 200 });
};
console.error = () => {};

try {
  const result = {
    nodeId: "KINETIK-NODE-A3F2B719",
    scoreBand: "TAMPERED",
    genesisScore: 199,
    tamperFlags: ["chain_rewind"],
    methodologyVersion: "v1.1",
    asOf: "2026-05-13T13:34:22.674Z",
  };
  const urls = JSON.stringify(["https://partner.example/getkinetik-webhook"]);

  await maybeFireScoreWebhook({ SCORE_WEBHOOK_URLS: urls }, result, "STANDING");
  assert.equal(calls.length, 0, "missing HMAC secret must fail closed");

  await maybeFireScoreWebhook(
    { SCORE_WEBHOOK_URLS: urls, SCORE_WEBHOOK_SECRET: "   " },
    result,
    "STANDING",
  );
  assert.equal(calls.length, 0, "blank HMAC secret must fail closed");

  await maybeFireScoreWebhook(
    { SCORE_WEBHOOK_URLS: urls, SCORE_WEBHOOK_SECRET: "top-secret" },
    result,
    "NEW",
  );
  assert.equal(calls.length, 1, "configured secret should allow delivery");
  assert.equal(calls[0].url, "https://partner.example/getkinetik-webhook");

  const headers = calls[0].init.headers;
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(headers["x-getkinetik-event"], "score.changed");
  assert.equal(headers["x-getkinetik-delivery"], payload.delivery);
  assert.equal(payload.fromBand, "NEW");
  assert.equal(payload.toBand, "TAMPERED");
  assert.equal(
    headers["x-getkinetik-signature"],
    `sha256=${await hmacSha256Hex("top-secret", calls[0].init.body)}`,
  );

  await maybeFireScoreWebhook(
    { SCORE_WEBHOOK_URLS: urls, SCORE_WEBHOOK_SECRET: "top-secret" },
    result,
    "TAMPERED",
  );
  assert.equal(calls.length, 1, "unchanged bands should not fire");

  console.log("PASS score webhook dispatch safety");
} finally {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
}
