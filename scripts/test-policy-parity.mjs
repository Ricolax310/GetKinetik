// ============================================================================
// Policy parity smoketest — worker `derived` block vs @getkinetik/evidence-mapping.
// ----------------------------------------------------------------------------
// PR 2 removed the inline attestationToTier / DEFAULT_POLICY / POLICY_VERSION
// duplication from functions/api/verify-device.js. The worker now imports
// functions/api/_lib/evidence-mapping.js — a generated, worker-consumable ESM
// mirror of the single source of truth (packages/evidence-mapping/src/index.ts).
//
// This test proves the migration is behavior-preserving: it loads real
// fixtures, runs attestationToTier from BOTH the published package (dist) and
// the worker mirror (_lib), projects each fixture exactly the way the worker
// builds its `derivedInput` block, and asserts the two results are
// byte-identical (JSON.stringify equality). It also pins DEFAULT_POLICY and
// POLICY_VERSION equality and the expected tier/flagged per fixture.
//
// Run AFTER `npm run policy:build` (so dist/ exists). The npm `policy:parity`
// script chains the build for you. Exit code 0 = parity holds.
// ============================================================================

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const PKG_PATH = resolve(repoRoot, "packages/evidence-mapping/dist/index.js");
const WORKER_PATH = resolve(repoRoot, "functions/api/_lib/evidence-mapping.js");
const FIXTURE_DIR = resolve(here, "fixtures/policy");

let pkg;
let worker;
try {
  pkg = await import(`file://${PKG_PATH}`);
} catch (err) {
  console.error(
    `[policy-parity] cannot import package dist at ${PKG_PATH}\n` +
      `Run the build first:  npm run policy:build`,
  );
  console.error(err);
  process.exit(1);
}
try {
  worker = await import(`file://${WORKER_PATH}`);
} catch (err) {
  console.error(
    `[policy-parity] cannot import worker mirror at ${WORKER_PATH}\n` +
      `Regenerate it:  npm run policy:sync`,
  );
  console.error(err);
  process.exit(1);
}

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

console.log(
  `policy parity — package v${pkg.POLICY_VERSION} vs worker v${worker.POLICY_VERSION}\n`,
);

// ---- [0] constants parity ---------------------------------------------------
console.log("[0] constants parity (DEFAULT_POLICY + POLICY_VERSION)");
assert(
  pkg.POLICY_VERSION === worker.POLICY_VERSION,
  `POLICY_VERSION matches (${pkg.POLICY_VERSION})`,
);
assert(
  JSON.stringify(pkg.DEFAULT_POLICY) === JSON.stringify(worker.DEFAULT_POLICY),
  "DEFAULT_POLICY byte-identical",
);

// ---- worker projection ------------------------------------------------------
// Mirror EXACTLY how functions/api/verify-device.js builds the input it feeds
// to attestationToTier (the `derivedInput` object):
//   { bureauObserved, chainClaim, sensorCoherence, flags }
function workerDerivedInput(att) {
  return {
    bureauObserved: att.bureauObserved,
    chainClaim: att.chainClaim,
    sensorCoherence: att.sensorCoherence,
    flags: att.flags,
  };
}

// Expected tier / flagged / score per fixture name. These pin the fixtures'
// intent so a fixture edit that changes behavior is caught explicitly.
const EXPECTED = {
  "clean.json": { tier: "PREMIER", flagged: false, score: 970 },
  "tampered.json": { tier: "TAMPERED", flagged: true, score: 199 },
  "stale.json": { tier: "NEW", flagged: false, score: 200 },
  "informational-only.json": { tier: "STANDING", flagged: false, score: 600 },
  "low-confidence.json": { tier: "NEW", flagged: false, score: 403 },
};

const files = readdirSync(FIXTURE_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

for (const file of files) {
  console.log(`\n[fixture] ${file}`);
  const att = JSON.parse(readFileSync(resolve(FIXTURE_DIR, file), "utf8"));
  const input = workerDerivedInput(att);

  const pkgResult = pkg.attestationToTier(input);
  const workerResult = worker.attestationToTier(input);

  const pkgJson = JSON.stringify(pkgResult);
  const workerJson = JSON.stringify(workerResult);

  assert(
    pkgJson === workerJson,
    "worker mirror === package (byte-identical derived output)",
  );

  const exp = EXPECTED[file];
  if (exp) {
    assert(pkgResult.tier === exp.tier, `tier = ${exp.tier} (got ${pkgResult.tier})`);
    assert(
      pkgResult.flagged === exp.flagged,
      `flagged = ${exp.flagged} (got ${pkgResult.flagged})`,
    );
    assert(
      pkgResult.score === exp.score,
      `score = ${exp.score} (got ${pkgResult.score})`,
    );
    assert(
      pkgResult.policyVersion === pkg.POLICY_VERSION,
      `policyVersion pinned (${pkgResult.policyVersion})`,
    );
  } else {
    console.log(`  (no pinned expectation for ${file})`);
  }
}

console.log("\n--------------------------------------------------------");
console.log(`policy parity  ${passed} passed  ${failed} failed`);
if (failed > 0) {
  console.log("POLICY PARITY FAILED");
  process.exit(1);
}
console.log("POLICY PARITY PASSED");
