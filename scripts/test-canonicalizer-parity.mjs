// ============================================================================
// Canonicalizer parity proof — every copy of stableStringify must produce
// byte-identical output, because that byte sequence is what Ed25519 signs.
// ----------------------------------------------------------------------------
// This is the safety net for PR 3 (one canonicalizer SSOT). It proves the
// migration is behavior-preserving by collecting a callable `stableStringify`
// from EVERY place one exists and asserting they all emit the exact same bytes
// for a thorough fixture set.
//
// It works in BOTH phases of the migration:
//   · BEFORE migration — the inline copies in verify-device.js / verifier.js /
//     packages/verify/src/index.ts are still present, so they are extracted by
//     text and included. Proves the original copies were already in lockstep
//     (baseline). If any had diverged, this fails BEFORE anything is changed.
//   · AFTER migration   — those inline copies are gone (the files import the
//     shared mirror), so they are skipped; the SSOT, the three generated
//     mirrors, the worker signer module, and the built SDK are all checked.
//     This is the ongoing drift guard.
//
// Run AFTER building the verify SDK so dist/ exists:
//   npm --prefix packages/verify run build
//   node scripts/test-canonicalizer-parity.mjs
// The npm `canonical:parity` script chains the build for you. Exit 0 = parity.
// ============================================================================

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const FIXTURE_DIR = resolve(here, "fixtures/canonicalizer");

// ---- extraction: pull a callable stableStringify out of source text ---------
// Mirrors scripts/sync-canonicalizer.mjs exactly (same regex + JS conversion).
const FN_RE =
  /(?:export\s+)?(?:const\s+stableStringify\s*=\s*\(obj[^)]*\)\s*(?::[^=]*)?=>\s*\{|function\s+stableStringify\s*\(obj[^)]*\)\s*\{)[\s\S]*?return\s*`\{\$\{parts\.join\([^)]*\)\}\}`\s*;\s*\}/;

function toJs(rawFn) {
  return rawFn
    .replace(/^export\s+/, "")
    .replace(/\(obj[^)]*\)/, "(obj)")
    .replace(/\)\s*:[^=]*=>/, ") =>")
    .replace(/const\s+parts\s*:[^=]*=/, "const parts =");
}

function extractFromFile(absPath) {
  if (!existsSync(absPath)) return null;
  const text = readFileSync(absPath, "utf8");
  const m = text.match(FN_RE);
  if (!m) return null; // no inline definition (already migrated to an import)
  // eslint-disable-next-line no-new-func
  const fn = new Function(`${toJs(m[0])}\nreturn stableStringify;`)();
  if (typeof fn !== "function") return null;
  return fn;
}

async function importExport(absPath) {
  if (!existsSync(absPath)) return null;
  const mod = await import(pathToFileURL(absPath).href);
  return typeof mod.stableStringify === "function" ? mod.stableStringify : null;
}

// ---- source registry --------------------------------------------------------
// `required` sources must be present (a missing one is a hard failure).
// `optional` sources are the pre-migration inline copies — included for the
// baseline run, skipped once they have been migrated to the shared mirror.
const SOURCES = [
  {
    label: "kinetik-core/src/stableJson.ts (SSOT)",
    required: true,
    get: () => extractFromFile(resolve(repoRoot, "packages/kinetik-core/src/stableJson.ts")),
  },
  {
    label: "functions/api/_lib/stable-json.js (worker mirror)",
    required: true,
    get: () => importExport(resolve(repoRoot, "functions/api/_lib/stable-json.js")),
  },
  {
    label: "landing/verify/stable-json.js (browser mirror)",
    required: true,
    get: () => importExport(resolve(repoRoot, "landing/verify/stable-json.js")),
  },
  {
    label: "packages/verify/src/stableJson.ts (verify SDK mirror)",
    required: true,
    get: () => extractFromFile(resolve(repoRoot, "packages/verify/src/stableJson.ts")),
  },
  {
    label: "functions/api/_lib/bureauSign.js (worker signer export)",
    required: true,
    get: () => importExport(resolve(repoRoot, "functions/api/_lib/bureauSign.js")),
  },
  {
    label: "packages/verify/dist/index.js (built SDK artifact)",
    required: true,
    get: () => importExport(resolve(repoRoot, "packages/verify/dist/index.js")),
  },
  {
    label: "packages/verify/src/index.ts (inline copy — pre-migration)",
    required: false,
    get: () => extractFromFile(resolve(repoRoot, "packages/verify/src/index.ts")),
  },
  {
    label: "functions/api/verify-device.js (inline copy — pre-migration)",
    required: false,
    get: () => extractFromFile(resolve(repoRoot, "functions/api/verify-device.js")),
  },
  {
    label: "landing/verify/verifier.js (inline copy — pre-migration)",
    required: false,
    get: () => extractFromFile(resolve(repoRoot, "landing/verify/verifier.js")),
  },
];

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

// ---- resolve every available source ----------------------------------------
const resolved = [];
for (const s of SOURCES) {
  let fn = null;
  try {
    fn = await s.get();
  } catch (err) {
    if (s.required) {
      console.error(`[canonicalizer-parity] failed loading required source: ${s.label}`);
      console.error(err);
      if (s.label.includes("dist")) {
        console.error("Build the SDK first:  npm --prefix packages/verify run build");
      }
      process.exit(1);
    }
  }
  if (!fn) {
    if (s.required) {
      console.error(`[canonicalizer-parity] required source unavailable: ${s.label}`);
      if (s.label.includes("dist")) {
        console.error("Build the SDK first:  npm --prefix packages/verify run build");
      }
      process.exit(1);
    }
    console.log(`  (skip) ${s.label} — no inline definition found (already migrated)`);
    continue;
  }
  resolved.push({ label: s.label, fn });
}

console.log(`\ncanonicalizer parity — ${resolved.length} live implementation(s):`);
for (const r of resolved) console.log(`   · ${r.label}`);

// Guard against a vacuous pass if extraction silently broke: we must always
// have the SSOT plus the three generated mirrors plus the built SDK + signer.
if (resolved.length < 6) {
  console.error(
    `\n[canonicalizer-parity] expected at least 6 live implementations, got ${resolved.length}.\n` +
      `Something is wrong with source resolution — refusing to declare parity.`,
  );
  process.exit(1);
}

// ---- run every fixture through every implementation -------------------------
const files = readdirSync(FIXTURE_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

if (files.length === 0) {
  console.error(`[canonicalizer-parity] no fixtures found in ${FIXTURE_DIR}`);
  process.exit(1);
}

console.log(`\nfixtures: ${files.length}\n`);

const reference = resolved[0]; // the SSOT
for (const file of files) {
  const obj = JSON.parse(readFileSync(resolve(FIXTURE_DIR, file), "utf8"));
  const refOut = reference.fn(obj);

  console.log(`[fixture] ${file}`);
  console.log(`   out: ${refOut}`);

  let allMatch = true;
  for (const r of resolved) {
    const out = r.fn(obj);
    if (out !== refOut) {
      allMatch = false;
      console.log(`   DIVERGENCE in ${r.label}`);
      console.log(`     expected: ${refOut}`);
      console.log(`     actual:   ${out}`);
    }
  }
  assert(allMatch, `${file} — byte-identical across all ${resolved.length} implementations`);
}

console.log("\n--------------------------------------------------------");
console.log(`canonicalizer parity  ${passed} passed  ${failed} failed`);
if (failed > 0) {
  console.log("CANONICALIZER PARITY FAILED");
  process.exit(1);
}
console.log("CANONICALIZER PARITY PASSED");
