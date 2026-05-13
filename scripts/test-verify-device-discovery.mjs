// ============================================================================
// Regression check for GET /api/verify-device discovery routing.
//
// Run: node scripts/test-verify-device-discovery.mjs
// ============================================================================

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = new URL("../functions/api/verify-device.js", import.meta.url);
const tmpDir = await mkdtemp(join(tmpdir(), "getkinetik-verify-device-"));

try {
  // The repository is CommonJS by default, while Cloudflare Pages treats
  // function files as ESM. Copy to .mjs so Node exercises the exported router.
  const modulePath = join(tmpDir, "verify-device.mjs");
  await writeFile(modulePath, await readFile(sourcePath, "utf8"));

  const { onRequest } = await import(pathToFileURL(modulePath).href);
  const response = await onRequest({
    request: new Request("https://getkinetik.app/api/verify-device", {
      method: "GET",
    }),
  });

  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.documentation, true);
  assert.equal(body.method, "POST");
  assert.match(body.summary, /Partner verification webhook/);
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}

console.log("verify-device discovery route ok");
