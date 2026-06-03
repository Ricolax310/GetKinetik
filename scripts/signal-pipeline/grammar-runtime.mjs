// Grammar runtime version control for semantic classification.
// This is a runtime execution layer: deterministic, versioned, auditable.

import { mapLegacyToV2 } from "./taxonomy-v2.mjs";

const SUPPORTED = new Set(["v2", "v3"]);
const DEFAULT_VERSION = "v2";

/**
 * Resolve the active grammar version from environment/user input.
 * Contract:
 * - undefined/empty -> v2
 * - v2              -> current frozen behavior
 * - v3              -> future experimental layer (currently deterministic shim)
 */
export function resolveGrammarVersion(input = process.env.GRAMMAR_VERSION) {
  const raw = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (!raw) return DEFAULT_VERSION;
  if (SUPPORTED.has(raw)) return raw;
  return DEFAULT_VERSION;
}

function classifyV2Frozen(signal, v1Category) {
  return (
    mapLegacyToV2(signal?.anomalyType) ||
    mapLegacyToV2(v1Category) ||
    mapLegacyToV2(signal?.type) ||
    "UNMAPPED"
  );
}

function classifyV3Experimental(signal, v1Category) {
  // v3 is intentionally experimental but deterministic.
  // For now it is a strict shim over frozen v2 behavior so we can run side-by-
  // side comparisons without changing classification outcomes unexpectedly.
  return classifyV2Frozen(signal, v1Category);
}

/**
 * Classify a signal to a versioned semantic category.
 */
export function classifyByGrammarVersion(signal, v1Category, grammarVersion) {
  if (grammarVersion === "v3") return classifyV3Experimental(signal, v1Category);
  return classifyV2Frozen(signal, v1Category);
}
