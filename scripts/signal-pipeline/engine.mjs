// Endgame compiler entrypoint (orchestrator).
// This file maps the Signal Execution endgame spec onto the deterministic
// A -> B -> C pipeline. It is a thin, stable wrapper — the actual stages live
// in their isolated modules and are NOT reinterpreted here:
//
//   A  schema validation  -> schema-contracts.mjs
//   B  grammar runtime     -> grammar-runtime.mjs + signal-interpretation.mjs
//   C  rendering           -> signal-execution-engine.mjs (Stage C)
//
// Contract: same input + same GRAMMAR_VERSION => identical output.

import { runSignalExecution } from "./signal-execution-engine.mjs";

/**
 * Deterministic compiler entrypoint.
 *
 * @param {object} args
 * @param {object} args.input - normalized signal feed (ExecutionFeedSchema)
 * @param {string} [args.grammarVersion] - "v2" | "v3" (defaults to env/v2)
 * @returns {{ markdown: string, grammarVersion: string, stats: object }}
 */
export async function runCompiler({ input, grammarVersion } = {}) {
  return runSignalExecution(input, { grammarVersion });
}
