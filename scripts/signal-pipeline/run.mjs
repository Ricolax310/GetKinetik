// CLI entrypoint: `npm run signal:run`
// Loads a normalized signal feed and runs the deterministic compiler.
// Output is ONLY the final JSON { markdown, grammarVersion, stats }.
//
// Feed resolution (first that exists):
//   1. --feed <path> / SIGNAL_FEED env
//   2. scripts/data/latest-feed.json
//   3. signals/daily/latest.json
// Grammar: GRAMMAR_VERSION env (default v2).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCompiler } from "./engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

function resolveFeedPath() {
  const argIdx = process.argv.indexOf("--feed");
  const cliPath = argIdx !== -1 ? process.argv[argIdx + 1] : null;
  const candidates = [
    cliPath,
    process.env.SIGNAL_FEED,
    path.join(REPO_ROOT, "scripts/data/latest-feed.json"),
    path.join(REPO_ROOT, "signals/daily/latest.json"),
  ].filter(Boolean);
  for (const p of candidates) {
    const abs = path.isAbsolute(p) ? p : path.join(REPO_ROOT, p);
    if (fs.existsSync(abs)) return abs;
  }
  throw new Error(`No signal feed found. Tried: ${candidates.join(", ")}`);
}

const feedPath = resolveFeedPath();
const input = JSON.parse(fs.readFileSync(feedPath, "utf8"));
const grammarVersion = process.env.GRAMMAR_VERSION || "v2";

const result = await runCompiler({ input, grammarVersion });
console.log(JSON.stringify(result, null, 2));
