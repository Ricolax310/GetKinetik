// ============================================================================
// sync-verifier — regenerate landing verifier core from verify SDK dist output.
// ----------------------------------------------------------------------------
// Single source of truth (SSOT): packages/verify/src/index.ts
//
// This script reads the compiled SDK verifier core from:
//   packages/verify/dist/index.js
//
// ...then rewrites its imports for the static landing verifier environment and
// splices it above the existing browser/UI glue in landing/verify/verifier.js.
// This keeps the verifier cryptographic contract authored once (SDK SSOT),
// while preserving the landing page DOM/rendering behavior byte-for-byte.
//
// Run: npm run verifier:sync
// CI reruns this and fails if landing/verify/verifier.js drifts.
// ============================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const DIST = resolve(repoRoot, "packages/verify/dist/index.js");
const OUT = resolve(repoRoot, "landing/verify/verifier.js");

const RENDER_MARKER =
  "// ----------------------------------------------------------------------------\n// RENDERING — all UI logic below; no crypto.";

const BANNER = `// -----------------------------------------------------------------------------
// GENERATED FILE — DO NOT EDIT
//
// Source of truth:
// packages/verify/src/index.ts
//
// Regenerate:
// npm run verifier:sync
// -----------------------------------------------------------------------------`;

function normalizeLf(s) {
  return s.replace(/\r\n/g, "\n");
}

function rewriteImports(compiled) {
  let out = compiled;
  out = out.replace(
    /import\s+\*\s+as\s+ed\s+from\s+['"]@noble\/ed25519['"];?/,
    'import * as ed from "./vendor/ed25519.js";',
  );
  out = out.replace(
    /import\s+\{\s*sha256,\s*sha512\s*\}\s+from\s+['"]@noble\/hashes\/sha2\.js['"];?/,
    'import { sha256, sha512 } from "./vendor/sha2.js";',
  );
  out = out.replace(
    /import\s+\{\s*stableStringify\s*\}\s+from\s+['"]\.\/stableJson\.js['"];?/,
    'import { stableStringify } from "./stable-json.js";',
  );
  return out;
}

let compiled;
try {
  compiled = readFileSync(DIST, "utf8");
} catch {
  console.error(
    `[sync-verifier] could not read ${DIST}\n` +
      `Run the package build first: npm --prefix packages/verify run build`,
  );
  process.exit(1);
}

let existing;
try {
  existing = readFileSync(OUT, "utf8");
} catch {
  console.error(`[sync-verifier] could not read landing verifier: ${OUT}`);
  process.exit(1);
}

const normalizedExisting = normalizeLf(existing);
const markerIdx = normalizedExisting.indexOf(RENDER_MARKER);
if (markerIdx < 0) {
  console.error(
    `[sync-verifier] could not find render marker in ${OUT}\n` +
      `Expected marker:\n${RENDER_MARKER}`,
  );
  process.exit(1);
}

const glue = normalizedExisting.slice(markerIdx).trimStart().trimEnd();

const core = rewriteImports(normalizeLf(compiled))
  .replace(/^\/\/# sourceMappingURL=.*$\n?/m, "")
  .trimEnd();

const generated = `${BANNER}\n\n${core}\n\n${glue}\n`;
if (normalizeLf(existing) === generated) {
  console.log(`[sync-verifier] up to date: ${OUT}`);
  process.exit(0);
}

writeFileSync(OUT, generated, "utf8");
console.log(`[sync-verifier] wrote ${OUT}`);
