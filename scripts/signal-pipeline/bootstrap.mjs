// Bootstrap: load env + initialize runtime clients before pipeline runs.
// Import this once at the top of any entrypoint. Idempotent.

import { loadEnvQuiet } from "../bureau/lib.mjs";
import { resolveGrammarVersion } from "./grammar-runtime.mjs";
import { getGrammar } from "./grammar-v2.mjs";

let _bootstrapped = false;

export function bootstrap() {
  if (_bootstrapped) return;
  _bootstrapped = true;
  loadEnvQuiet();
}

export function getBootstrappedGrammar() {
  bootstrap();
  const version = resolveGrammarVersion();
  return { version, grammar: getGrammar(version) };
}
