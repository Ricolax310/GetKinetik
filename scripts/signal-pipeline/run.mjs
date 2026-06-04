// CLI entrypoint: `npm run signal:run`
// Full 8-step hands-off pipeline:
//   1. ingest signals
//   2. grammar engine (v2/v3)
//   3. renderer (C)
//   4. hashtag layer
//   5. safety gate
//   6. dedupe check
//   7. X API post (if autopilot)
//   8. log result
//
// KINETIK_MODE=manual   run only when triggered, never auto-post (default)
// KINETIK_MODE=safe     run full pipeline, log output, do NOT post
// KINETIK_MODE=autopilot run full pipeline and post to X if gate passes
//
// Feed resolution (first that exists):
//   --feed <path> / SIGNAL_FEED env
//   scripts/data/latest-feed.json
//   signals/daily/latest.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCompiler } from "./engine.mjs";
import { runDaily } from "./pipeline.mjs";
import { buildEcosystemThread, buildEcosystemPost } from "./post-builder.mjs";
import { isPremium } from "./limits.mjs";
import { appendHashtags } from "../bureau/tweet-compose.mjs";
import { safetyGate, saveLastHash, resolveKinetikMode } from "./safety-gate.mjs";
import { loadXCredentials, postThread } from "../bureau/social-x.mjs";
import { bootstrap } from "./bootstrap.mjs";
import { createTrace } from "./tracer.mjs";
bootstrap();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const LOG_DIR = path.join(REPO_ROOT, "logs/signal-run");

function log(entry) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.writeFileSync(path.join(LOG_DIR, `${stamp}.json`), JSON.stringify(entry, null, 2), "utf8");
    fs.writeFileSync(path.join(LOG_DIR, "latest.json"), JSON.stringify(entry, null, 2), "utf8");
  } catch { /* non-fatal */ }
}

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

// Category labels for cross-network summary tweet.
const CATEGORY_LABEL = {
  CAPACITY:       "capacity pressure",
  IDENTITY:       "identity signals",
  CONSISTENCY:    "telemetry drift",
  ECONOMICS:      "economic concentration",
  BEHAVIORAL:     "behavioral signals",
  INFRASTRUCTURE: "coverage signals",
};

// Build a cross-network sector-level summary tweet from compiler output.
// Used for the first/default post — always sector first, never single-network.
function extractPostText(result, feed) {
  const breakdown = result.stats?.categoryBreakdown || {};
  const categories = Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (!categories.length) {
    return "DePIN signal index updated — no active signals this run. getkinetik.app/audits.html";
  }

  // Active network names from feed.
  const activeNetworks = (feed?.networks || [])
    .filter((n) => n.status === "active" && n.signals?.length)
    .map((n) => n.network);

  const networkCount = activeNetworks.length || result.stats?.activeNetworks || 0;
  const signalCount = result.stats?.signalCount || 0;
  const suppressed = result.stats?.suppressedCount || 0;
  const visible = signalCount - suppressed;

  // Build sector summary line: "CAPACITY · IDENTITY · CONSISTENCY"
  const sectorLine = categories
    .map(([cat]) => CATEGORY_LABEL[cat] || cat.toLowerCase())
    .join(", ");

  const networkLine = activeNetworks.length
    ? activeNetworks.join(", ")
    : `${networkCount} networks`;

  return `DePIN signal index — ${networkLine}. Active signals: ${sectorLine}. ${visible} signal(s) this run. getkinetik.app/audits.html`;
}

// For cross-network posts there's no single network id — return null so base tags apply.
function detectNetworkId() {
  return null;
}

async function main() {
  const mode = resolveKinetikMode();
  const grammarVersion = process.env.GRAMMAR_VERSION || "v2";

  console.log(`[signal:run] mode=${mode} grammar=${grammarVersion}`);

  // Step 1 — ALWAYS rebuild the feed first, then consume it in-process.
  // This makes signal:run a true autonomous engine: fresh data every run,
  // no stale cached feed. Use --no-rebuild or SIGNAL_FEED to read a fixed file.
  let input;
  const useFixedFeed = process.argv.includes("--no-rebuild") || process.env.SIGNAL_FEED;
  const live = process.argv.includes("--live");
  if (useFixedFeed) {
    const feedPath = resolveFeedPath();
    input = JSON.parse(fs.readFileSync(feedPath, "utf8"));
    console.log(`[signal:run] reading fixed feed: ${path.relative(REPO_ROOT, feedPath)}`);
  } else {
    console.log(`[signal:run] rebuilding feed (live=${live})...`);
    const { feed, errors } = runDaily({ live });
    if (errors?.length) console.warn(`[signal:run] ingest warnings: ${errors.join("; ")}`);
    input = feed;
    console.log(`[signal:run] feed rebuilt: ${input.totals?.signals} signals, ${input.totals?.activeNetworks}/${input.totals?.networks} networks`);
  }

  const trace = createTrace({ feed: input, grammarVersion, mode });
  trace.record("A:ingest", { rebuilt: !useFixedFeed, cadence: input.cadence, networks: input.networks?.length });

  // Steps 2 + 3 — grammar engine + renderer
  const result = await runCompiler({ input, grammarVersion });
  trace.record("B+C:compile", { grammarVersion: result.grammarVersion, stats: result.stats });

  // Step 4 — build the data-rich post. Premium = one long-form post;
  // standard = a reply-chained thread. Then add hashtags.
  const premium = isPremium();
  const rawThread = premium
    ? [buildEcosystemPost(input)].filter(Boolean)
    : buildEcosystemThread(input);
  const thread = rawThread.map((t) => appendHashtags(t, null));
  trace.record("D:thread", { premium, tweetCount: thread.length, thread });

  // Steps 5 + 6 — gate EVERY tweet (multi-network + tone + length) at send time.
  let gate = { ok: true, reason: null };
  for (let i = 0; i < thread.length; i++) {
    const g = safetyGate({ markdown: result.markdown, grammarVersion: result.grammarVersion, postText: thread[i] });
    if (!g.ok) { gate = { ok: false, reason: `tweet ${i + 1}/${thread.length}: ${g.reason}` }; break; }
  }
  if (!thread.length) gate = { ok: false, reason: "no thread produced (fewer than 2 active networks)" };
  // Dedupe on the whole thread content (time-windowed).
  const threadKey = thread.join("\n---\n");
  if (gate.ok) {
    const g = safetyGate({ markdown: result.markdown, grammarVersion: result.grammarVersion, postText: threadKey, networkCount: 99 });
    if (!g.ok && /duplicate/.test(g.reason)) gate = g;
  }
  trace.record("E:gate", { ...gate, tweetCount: thread.length });

  const entry = {
    at: new Date().toISOString(),
    mode,
    grammarVersion: result.grammarVersion,
    stats: result.stats,
    thread,
    gate,
    posted: false,
    tweetIds: null,
    error: null,
  };

  if (!gate.ok) {
    console.log(`[signal:run] gate BLOCKED — ${gate.reason}`);
    log(entry);
    return;
  }

  // Step 7 — post the thread (autopilot only)
  if (mode === "autopilot") {
    const creds = loadXCredentials();
    if (!creds) {
      entry.error = "X credentials missing";
      console.error("[signal:run] autopilot: X credentials not set");
    } else {
      try {
        const ids = await postThread(thread);
        entry.posted = true;
        entry.tweetIds = ids;
        saveLastHash(threadKey);
        console.log(`[signal:run] posted ${ids.length}-tweet thread: https://x.com/i/web/status/${ids[0]}`);
      } catch (e) {
        entry.error = e.message;
        console.error(`[signal:run] thread post failed: ${e.message}`);
      }
    }
  } else {
    console.log(`[signal:run] ${mode} mode — gate passed, NOT posting. ${thread.length}-tweet thread:`);
    thread.forEach((t, i) => console.log(`\n  [${i + 1}/${thread.length}] (${t.length}c) ${t}`));
  }

  // Step 8 — log + trace flush
  log(entry);
  trace.record("F:post", { posted: entry.posted, tweetIds: entry.tweetIds, error: entry.error });
  trace.flush({ ...entry, markdown: result.markdown });
}

main().catch((e) => {
  console.error("[signal:run] fatal:", e.message);
  process.exit(1);
});
