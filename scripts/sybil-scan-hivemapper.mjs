// ============================================================================
// GETKINETIK Bureau — Network-Aware Sybil Risk Scan: Hivemapper
//
// Unlike WeatherXM (public cells API) or Geodnet (public station list),
// Hivemapper does not publish a single unauthenticated JSON feed of every
// contributor with coordinates. This script therefore does two things:
//
//   1. DEFAULT — On-chain HONEY distribution scan (Solana mainnet, public RPC).
//      Uses getTokenSupply + getTokenLargestAccounts + getMultipleAccounts to
//      resolve SPL token account owners. Surfaces *economic concentration* —
//      whales, cumulative top-N share — which is a different lens than GPS
//      co-location but still honest "public data, independent read."
//
//   2. OPTIONAL — If you obtain a public or partner-shared node dump with
//      lat/lng (same schema as scripts/sample-nodes.json), pass:
//        --nodes=path/to/nodes.json
//      and this script will also run scripts/sybil-report.mjs and append the
//      geometry heuristics section to the same markdown output.
//
// Run:
//   node scripts/sybil-scan-hivemapper.mjs
//   node scripts/sybil-scan-hivemapper.mjs --nodes=scripts/data/hivemapper-nodes.json
//
// Env:
//   SOLANA_RPC_URL — optional; defaults to rotating public endpoints below.
//                    For reliable runs, use your own RPC (e.g. Helius / Triton).
//
// Output:
//   docs/reports/hivemapper-sybil-report.md
//   scripts/data/hivemapper-snapshot.json
// ============================================================================

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const HONEY_MINT = "4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy";

const DEFAULT_RPCS = [
  ...new Set(
    [process.env.SOLANA_RPC_URL, "https://api.mainnet-beta.solana.com"].filter(
      Boolean,
    ),
  ),
];

/** Reuse the first RPC that succeeds (avoids rate-limit mismatch across hosts). */
let stickyRpcUrl = null;

const OUTPUT_REPORT = path.join(REPO_ROOT, "docs/reports/hivemapper-sybil-report.md");
const OUTPUT_SNAPSHOT = path.join(REPO_ROOT, "scripts/data/hivemapper-snapshot.json");
const SYBIL_REPORT = path.join(REPO_ROOT, "scripts/sybil-report.mjs");

const args = process.argv.slice(2);
const nodesArg = args.find((a) => a.startsWith("--nodes="))?.split("=")[1] ?? null;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function solanaPost(rpcUrl, payload, attempt = 0) {
  const isBatch = Array.isArray(payload);
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let json;
  try {
    json = await res.json();
  } catch {
    const retry = attempt < 3 && (res.status === 429 || res.status === 503);
    if (retry) {
      await sleep(2000 * (attempt + 1));
      return solanaPost(rpcUrl, payload, attempt + 1);
    }
    throw new Error(`${rpcUrl}: non-JSON HTTP ${res.status}`);
  }

  const httpRetry =
    attempt < 3 &&
    (res.status === 429 || res.status === 503 || res.status === 502);

  if (isBatch) {
    if (!Array.isArray(json)) {
      throw new Error(`${rpcUrl}: expected JSON-RPC batch array`);
    }
    const errItem = json.find((x) => x.error);
    if (errItem) {
      const msg = errItem.error.message || String(errItem.error.code ?? "");
      const retry =
        httpRetry ||
        (attempt < 3 &&
          (/too many|rate|timed out|specific RPC|429|503|502/i.test(msg) ||
            errItem.error.code === 429));
      if (retry) {
        await sleep(2000 * (attempt + 1));
        return solanaPost(rpcUrl, payload, attempt + 1);
      }
      throw new Error(`${rpcUrl}: ${msg}`);
    }
    if (!res.ok && !httpRetry) {
      throw new Error(`${rpcUrl}: HTTP ${res.status}`);
    }
    return json.map((x) => x.result);
  }

  if (json.error) {
    const code = json.error.code;
    const msg = json.error.message || String(code ?? "rpc-error");
    const retry =
      attempt < 3 &&
      (code === 429 ||
        httpRetry ||
        /too many|rate|timed out|specific RPC|403|502|503/i.test(String(msg)));
    if (retry) {
      await sleep(2000 * (attempt + 1));
      return solanaPost(rpcUrl, payload, attempt + 1);
    }
    throw new Error(`${rpcUrl}: ${msg}`);
  }
  if (!res.ok) {
    if (httpRetry) {
      await sleep(2000 * (attempt + 1));
      return solanaPost(rpcUrl, payload, attempt + 1);
    }
    throw new Error(`${rpcUrl}: HTTP ${res.status}`);
  }
  if (json.result === undefined) {
    throw new Error(`${rpcUrl}: missing result in JSON-RPC response`);
  }
  return json.result;
}

async function rpcWithFallback(bodyOrBatch) {
  if (stickyRpcUrl) {
    try {
      const r = await solanaPost(stickyRpcUrl, bodyOrBatch);
      return { rpcUrl: stickyRpcUrl, result: r };
    } catch {
      stickyRpcUrl = null;
    }
  }
  let lastErr;
  for (const url of DEFAULT_RPCS) {
    try {
      const r = await solanaPost(url, bodyOrBatch);
      stickyRpcUrl = url;
      return { rpcUrl: url, result: r };
    } catch (e) {
      lastErr = e;
      await sleep(600);
    }
  }
  throw lastErr;
}

function pct(n) {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  return (n * 100).toFixed(2) + "%";
}

// ---- 1–3. On-chain HONEY scan (optional if public RPC rate-limits) -----------
let rpcUrlUsed = null;
let supplyUi = null;
let supplyRaw = null;
let rows = [];
let top20Sum = 0;
let top20Share = null;
let onChainErr = null;

console.error("[1/4] Fetching HONEY supply + largest accounts (batched Solana RPC) …");
try {
  const batchRes = await rpcWithFallback([
    { jsonrpc: "2.0", id: 1, method: "getTokenSupply", params: [HONEY_MINT] },
    { jsonrpc: "2.0", id: 2, method: "getTokenLargestAccounts", params: [HONEY_MINT] },
  ]);
  rpcUrlUsed = batchRes.rpcUrl;
  const batchResults = batchRes.result;
  if (!Array.isArray(batchResults) || batchResults.length !== 2) {
    throw new Error("unexpected batch response shape");
  }
  const supplyResult = batchResults[0];
  const largestWrap = batchResults[1];

  supplyUi = Number(supplyResult?.value?.uiAmountString ?? NaN);
  supplyRaw = supplyResult?.value?.amount;
  if (!Number.isFinite(supplyUi) || supplyUi <= 0) {
    throw new Error("unexpected getTokenSupply shape");
  }
  console.error(`      → RPC: ${rpcUrlUsed}`);
  console.error(`      → UI supply: ${supplyUi.toLocaleString()} HONEY`);

  console.error("[2/4] Parsing largest HONEY token accounts …");
  const lr = largestWrap?.value ?? largestWrap;
  const largest = Array.isArray(lr) ? lr : lr?.value;
  if (!Array.isArray(largest) || largest.length === 0) {
    throw new Error("unexpected getTokenLargestAccounts shape");
  }
  console.error(`      → ${largest.length} accounts (RPC max is 20).`);
  await sleep(800);

  console.error("[3/4] Resolving token account owners …");
  const addresses = largest.map((x) => x.address).filter(Boolean);
  const owners = [];
  const CHUNK = 100;
  for (let i = 0; i < addresses.length; i += CHUNK) {
    const chunk = addresses.slice(i, i + CHUNK);
    const accRes = await rpcWithFallback({
      jsonrpc: "2.0",
      id: 3 + i,
      method: "getMultipleAccounts",
      params: [chunk, { encoding: "jsonParsed" }],
    });
    const arr = accRes.result?.value ?? accRes.result;
    if (!Array.isArray(arr)) {
      throw new Error("unexpected getMultipleAccounts response");
    }
    for (let j = 0; j < chunk.length; j++) {
      const acc = arr[j];
      let owner = null;
      try {
        owner = acc?.data?.parsed?.info?.owner ?? null;
      } catch {
        owner = null;
      }
      const row = largest[i + j];
      owners.push({
        tokenAccount: chunk[j],
        ownerWallet: owner,
        uiAmount: Number(row.uiAmountString ?? row.uiAmount ?? 0),
      });
    }
    await sleep(250);
  }

  rows = [...owners].sort((a, b) => b.uiAmount - a.uiAmount);
  top20Sum = rows.reduce((s, r) => s + (r.uiAmount || 0), 0);
  top20Share = top20Sum / supplyUi;
} catch (e) {
  onChainErr = String(e?.message || e);
  console.error(`[warn] On-chain section skipped: ${onChainErr}`);
}

if (!rows.length && !nodesArg) {
  console.error(
    "\nCould not read Solana on-chain HONEY data (public RPC rate limits are common). " +
      "Fix: set env `SOLANA_RPC_URL` to your own mainnet endpoint (Helius / QuickNode / Triton), " +
      "or pass `--nodes=your.json` to run geometry-only heuristics from a lat/lng dump.\n",
  );
  process.exit(1);
}

// ---- 3b. Optional geometry report -------------------------------------------
let geoMarkdown = "";
let geoNote = "";
if (nodesArg) {
  const absNodes = path.isAbsolute(nodesArg)
    ? nodesArg
    : path.join(REPO_ROOT, nodesArg);
  if (!fs.existsSync(absNodes)) {
    console.error(`--nodes file not found: ${absNodes}`);
    process.exit(1);
  }
  const tmpGeo = path.join(REPO_ROOT, "docs/reports/_hivemapper-geo-sybil-temp.md");
  console.error("[3b/4] Running sybil-report.mjs on supplied nodes …");
  try {
    execFileSync(
      process.execPath,
      [SYBIL_REPORT, absNodes, "--network=Hivemapper", `--out=${tmpGeo}`],
      { stdio: "inherit", cwd: REPO_ROOT },
    );
    geoMarkdown = fs.readFileSync(tmpGeo, "utf8").replace(/^#\s[^\n]+\n+/, "");
    fs.unlinkSync(tmpGeo);
    geoNote = `Geometry heuristics were run on user-supplied file \`${path.relative(REPO_ROOT, absNodes)}\` (see appendix).`;
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
} else {
  geoNote =
    "No `--nodes=` file was supplied. For GPS / co-location style heuristics (same family as Geodnet / WeatherXM scans), obtain a public or partner-shared contributor snapshot with `lat` / `lng` and re-run with `--nodes=…` (schema: `scripts/sample-nodes.json`).";
}

// ---- 4. Snapshot + markdown -------------------------------------------------
const now = new Date();
const snapshot = {
  generatedAt: now.toISOString(),
  honeyMint: HONEY_MINT,
  rpcUrl: rpcUrlUsed,
  onChainError: onChainErr,
  supplyUiAmount: supplyUi,
  supplyRawAmount: supplyRaw,
  largestTokenAccounts: rows,
  top20SumUi: top20Sum,
  top20ShareOfSupply: top20Share,
  optionalNodesFile: nodesArg,
};
fs.mkdirSync(path.dirname(OUTPUT_SNAPSHOT), { recursive: true });
fs.writeFileSync(OUTPUT_SNAPSHOT, JSON.stringify(snapshot, null, 2), "utf8");

const lines = [];
lines.push("# Sybil Risk Scan — Hivemapper Network");
lines.push("");
lines.push(
  "> Independent scan generated by the GETKINETIK Bureau. **Part A** (when Solana RPC " +
    "succeeds) reads on-chain state for the public HONEY SPL mint. **Part B** (optional) runs " +
    "the same four geometry heuristics as `sybil-report.mjs` on a node list *you* supply. " +
    "Hivemapper does not publish an unauthenticated global contributor JSON like WeatherXM's " +
    "cells API or Geodnet's station list — use your own `SOLANA_RPC_URL` for reliable Part A, " +
    "or attach `--nodes=` for the Geodnet-style pass.",
);
lines.push("");
lines.push(`- **Generated:** ${now.toISOString()}`);
lines.push(`- **Solana RPC used:** \`${rpcUrlUsed ?? "—"}\``);
lines.push(`- **HONEY mint:** \`${HONEY_MINT}\``);
if (rows.length && supplyUi != null) {
  lines.push(`- **Reported circulating / UI supply:** ${supplyUi.toLocaleString()} HONEY`);
  lines.push(
    `- **Sum of top ${rows.length} largest SPL token accounts:** ${top20Sum.toLocaleString()} HONEY (${pct(top20Share)} of UI supply)`,
  );
} else {
  lines.push("- **Part A (on-chain):** _skipped — see section below._");
  lines.push(`- **RPC error:** \`${onChainErr || "unknown"}\``);
}
lines.push(`- **${geoNote}**`);
lines.push("");
lines.push("---");
lines.push("");

if (rows.length && supplyUi != null) {
  lines.push("## Part A — On-chain HONEY concentration (Solana mainnet)");
  lines.push("");
  lines.push(
    "The Solana RPC `getTokenLargestAccounts` returns at most **20** token accounts per call. " +
      "This is a *lower bound* on concentration insight (the tail is not enumerated here), but " +
      "the headline numbers are still useful for partner conversations: how much of the visible " +
      "float sits in the largest visible SPL accounts.",
  );
  lines.push("");
  lines.push("| Rank | Owner wallet (best-effort) | Token account | Balance (HONEY) | % of UI supply |");
  lines.push("|---:|---|---|---:|---:|");
  rows.forEach((r, idx) => {
    const share = r.uiAmount / supplyUi;
    lines.push(
      `| ${idx + 1} | \`${r.ownerWallet || "—"}\` | \`${r.tokenAccount}\` | ${r.uiAmount.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })} | ${pct(share)} |`,
    );
  });
  lines.push("");
  lines.push("### Cumulative top-N (of the 20 returned)");
  lines.push("");
  lines.push("| N | Cumulative HONEY | Cumulative % of UI supply |");
  lines.push("|---:|---:|---:|");
  let cum = 0;
  for (let n = 0; n < rows.length; n++) {
    cum += rows[n].uiAmount;
    lines.push(`| ${n + 1} | ${cum.toLocaleString(undefined, { maximumFractionDigits: 2 })} | ${pct(cum / supplyUi)} |`);
  }
  lines.push("");
  lines.push(
    "**Interpretation:** extreme concentration can correlate with treasury, MM, or " +
      "exchange custody — *not* automatically Sybil. Treat as economic *shape* worth " +
      "cross-checking against internal contributor analytics, not as fraud findings.",
  );
  lines.push("");
} else {
  lines.push("## Part A — On-chain scan skipped");
  lines.push("");
  lines.push(
    "The public Solana RPC endpoint rate-limited or rejected the batched `getTokenSupply` / " +
      "`getTokenLargestAccounts` request. This is common for unauthenticated mainnet traffic.",
  );
  lines.push("");
  lines.push("**To populate Part A:** set environment variable `SOLANA_RPC_URL` to a mainnet " +
    "HTTPS endpoint from Helius, QuickNode, Triton, Alchemy, etc., then re-run this script.");
  lines.push("");
  if (nodesArg) {
    lines.push(
      "_Part B still ran because `--nodes=` was supplied — see appendix for geometry heuristics._",
    );
    lines.push("");
  }
}

if (geoMarkdown) {
  lines.push("---");
  lines.push("");
  lines.push("## Appendix — Geometry heuristics (user-supplied `nodes.json`)");
  lines.push("");
  lines.push(
    "_Appendix: output of `scripts/sybil-report.mjs` (leading `# …` title line removed so this file keeps a single top-level heading)._",
  );
  lines.push("");
  lines.push(geoMarkdown.trimEnd());
  lines.push("");
}

lines.push("---");
lines.push("");
lines.push("## Methodology");
lines.push("");
lines.push(
  "- **Part A:** `getTokenSupply` + `getTokenLargestAccounts` + `getMultipleAccounts` " +
    "(jsonParsed) on Solana mainnet when RPC allows. Requires a dedicated `SOLANA_RPC_URL` on " +
    "many networks due to public-RPC rate limits.",
);
lines.push(
  "- **Part B (optional):** same four conservative heuristics as `sybil-report.mjs` " +
    "(co-location, birth burst, beat-rate, metadata twins) on a JSON array you provide.",
);
lines.push(
  "- For hardware-rooted per-node attestation, POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.",
);
lines.push("");
lines.push(
  "Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/",
);
lines.push("");

fs.mkdirSync(path.dirname(OUTPUT_REPORT), { recursive: true });
fs.writeFileSync(OUTPUT_REPORT, lines.join("\n"), "utf8");

console.error(`[4/4] wrote ${path.relative(REPO_ROOT, OUTPUT_REPORT)}`);
console.error(`      snapshot → ${path.relative(REPO_ROOT, OUTPUT_SNAPSHOT)}`);
console.error("");
console.error("Summary:");
if (rows.length && supplyUi != null) {
  console.error(`  UI supply (HONEY)     : ${supplyUi.toLocaleString()}`);
  console.error(`  top-${rows.length} sum / supply : ${pct(top20Share)}`);
} else {
  console.error("  Part A (on-chain)     : skipped (set SOLANA_RPC_URL)");
}
if (nodesArg) console.error("  geometry appendix   : yes (--nodes)");
