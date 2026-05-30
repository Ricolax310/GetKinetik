#!/usr/bin/env node
// ============================================================================
// Fuzz POST /api/verify-device — Genesis Score bounds & crash resistance.
//
// Body is ONLY { "proofUrl": "..." }. Malicious fields live inside the base64url
// proof JSON (see packages/kinetik-core/src/proof.ts, packages/verify/smoketest.mjs).
//
//   node scripts/fuzz/fuzz-verify-device.mjs              # 10_000 cases
//   node scripts/fuzz/fuzz-verify-device.mjs --count 100  # smoke
//   node scripts/fuzz/fuzz-verify-device.mjs --mode http --base-url http://127.0.0.1:8788
//
// Default mode imports functions/api/verify-device.js in-process (no wrangler).
// Exit 1 on unhandled exceptions, HTTP 5xx, or derived.score outside [0, 1000].
// valid: false is NOT a failure. HTTP 400 is OK (malformed body / oversize URL).
// ============================================================================

import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { onRequestPost } from "../../functions/api/verify-device.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
const VERIFIER_ORIGIN = "https://getkinetik.app/verify/";
const B64URL_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const VALID_CONTROL_CASES = 100;
const OVERSIZE_CASES = 50;
const PROOF_URL_MAX = 8192;

// ── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = {
    count: 10_000,
    mode: "handler",
    baseUrl: process.env.FUZZ_BASE_URL || "http://127.0.0.1:8788",
    seed: Date.now(),
    heapSampleEvery: 500,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--count" && argv[i + 1]) opts.count = Number(argv[++i]);
    else if (a === "--mode" && argv[i + 1]) opts.mode = argv[++i];
    else if (a === "--base-url" && argv[i + 1]) opts.baseUrl = argv[++i];
    else if (a === "--seed" && argv[i + 1]) opts.seed = Number(argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.log(`Usage: node scripts/fuzz/fuzz-verify-device.mjs [options]

  --count N              Cases to run (default: 10000)
  --mode handler|http    handler = in-process onRequestPost (default)
  --base-url URL         For http mode (default: FUZZ_BASE_URL or http://127.0.0.1:8788)
  --seed N               PRNG seed (default: Date.now())

Run wrangler pages dev first for http mode:
  wrangler pages dev landing --kv KINETIK_KV --kv WAITLIST
`);
      process.exit(0);
    }
  }
  if (!Number.isFinite(opts.count) || opts.count < 1) {
    console.error("--count must be a positive integer");
    process.exit(2);
  }
  if (opts.mode !== "handler" && opts.mode !== "http") {
    console.error("--mode must be handler or http");
    process.exit(2);
  }
  return opts;
}

// ── PRNG (deterministic per --seed) ─────────────────────────────────────────

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Encoding helpers (byte-for-byte match with verify-device.js stableStringify) ─

const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const utf8 = (s) => new TextEncoder().encode(s);

/** Same algorithm as functions/api/verify-device.js and @getkinetik/verify. */
const stableStringify = (obj) => {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(",")}}`;
};

const base64UrlEncode = (input) => {
  const bytes =
    typeof input === "string"
      ? utf8(input)
      : input instanceof Uint8Array
        ? input
        : utf8(JSON.stringify(input));
  let out = "";
  let i = 0;
  const n = bytes.length;
  while (i < n) {
    const b1 = bytes[i++];
    const b2 = i < n ? bytes[i++] : 0;
    const b3 = i < n ? bytes[i++] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    out += B64URL_CHARS[(triplet >> 18) & 0x3f];
    out += B64URL_CHARS[(triplet >> 12) & 0x3f];
    out += B64URL_CHARS[(triplet >> 6) & 0x3f];
    out += B64URL_CHARS[triplet & 0x3f];
  }
  const rem = n % 3;
  if (rem === 1) return out.slice(0, -2);
  if (rem === 2) return out.slice(0, -1);
  return out;
};

function proofUrlFromEnvelope(envelope) {
  const b64 = base64UrlEncode(JSON.stringify(envelope));
  return `${VERIFIER_ORIGIN}#proof=${b64}`;
}

function randomNodeId(rand) {
  const hex = toHex(sha256(utf8(`${rand()}:${Date.now()}:${Math.random()}`))).slice(
    0,
    8,
  );
  return `KINETIK-NODE-${hex.toUpperCase()}`;
}

// ── Keypool (valid signatures without 10k keygens) ──────────────────────────

async function buildKeypool(size) {
  const pool = [];
  for (let i = 0; i < size; i++) {
    const sk = ed.utils.randomSecretKey();
    const pk = await ed.getPublicKeyAsync(sk);
    const pubkey = toHex(pk);
    pool.push({ sk, pubkey });
  }
  return pool;
}

function pickKey(pool, rand) {
  return pool[Math.floor(rand() * pool.length)];
}

// ── Adversarial field generators ────────────────────────────────────────────

function randomUnixTs(rand) {
  const bucket = Math.floor(rand() * 8);
  switch (bucket) {
    case 0:
      return -rand() * 1e15;
    case 1:
      return 0;
    case 2:
      return 1e15 + rand() * 1e10;
    case 3:
      return NaN;
    case 4:
      return Infinity;
    case 5:
      return -Infinity;
    case 6:
      return Date.now() + (rand() - 0.5) * 2e13;
    default:
      return 1_000_000_000 + Math.floor(rand() * 1e11);
  }
}

function randomPubkey(rand, validHex) {
  const bucket = Math.floor(rand() * 6);
  if (bucket === 0) return "";
  if (bucket === 1) return "00";
  if (bucket === 2)
    return "not-hex-pubkey-at-all!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!";
  if (bucket === 3) return validHex.slice(0, 32);
  if (bucket === 4) return `${validHex}ff`;
  return validHex;
}

function malformedSignature(rand, validHex) {
  const bucket = Math.floor(rand() * 7);
  if (bucket === 0) return "";
  if (bucket === 1) return "YWJjZGVm";
  if (bucket === 2) return Buffer.from("malformed-signature-bytes").toString("base64");
  if (bucket === 3) return validHex.slice(0, 32);
  if (bucket === 4) return `${validHex}00`;
  if (bucket === 5) return "g".repeat(128);
  return validHex
    .split("")
    .map((c, i) => (i % 4 === 0 ? "f" : c))
    .join("");
}

function randomLifetimeBeats(rand) {
  const bucket = Math.floor(rand() * 6);
  if (bucket === 0) return -Math.floor(rand() * 1e9);
  if (bucket === 1) return -0;
  if (bucket === 2) return NaN;
  if (bucket === 3) return Infinity;
  if (bucket === 4) return -Infinity;
  return Math.floor(rand() * 1e9);
}

// ── Payload factories ───────────────────────────────────────────────────────

/** Golden-path signed proof — pattern from packages/verify/smoketest.mjs. */
async function buildValidSignedEnvelope(pool, rand) {
  const { sk, pubkey } = pickKey(pool, rand);
  const nodeId = randomNodeId(rand);
  const now = Date.now();
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId,
    pubkey,
    mintedAt: now - 86_400_000,
    issuedAt: now,
    lifetimeBeats: 142,
    firstBeatTs: now - 1_000_000,
    chainTip: toHex(sha256(utf8("chaintip"))).slice(0, 16),
    attribution: PROOF_ATTRIBUTION,
    sensors: { lux: 348, motionRms: 0.07, pressureHpa: 1013.21 },
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const hash = toHex(sha256(utf8(message))).slice(0, 16);
  return { payload, message, signature, hash };
}

async function buildSignedPayload(pool, rand, mutate) {
  const { sk, pubkey: validPubkey } = pickKey(pool, rand);
  const nodeId = randomNodeId(rand);
  const nowMs = Date.now();
  const payload = {
    v: 2,
    kind: "proof-of-origin",
    nodeId,
    pubkey: validPubkey,
    mintedAt: nowMs - 9 * 86_400_000,
    issuedAt: nowMs,
    lifetimeBeats: 25_847,
    firstBeatTs: nowMs - 9 * 86_400_000,
    chainTip: toHex(sha256(utf8(`fuzz:${nodeId}`))).slice(0, 16),
    attribution: PROOF_ATTRIBUTION,
    sensors: { lux: 412, motionRms: 0.06, pressureHpa: 1014.07 },
  };
  mutate(payload, rand, validPubkey);
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));
  const hash = toHex(sha256(utf8(message))).slice(0, 16);
  return { payload, message, signature, hash };
}

function mutateAdversarial(payload, rand, validPubkey) {
  payload.mintedAt = randomUnixTs(rand);
  payload.issuedAt = randomUnixTs(rand);
  payload.firstBeatTs = randomUnixTs(rand);
  payload.lifetimeBeats = randomLifetimeBeats(rand);
  payload.pubkey = randomPubkey(rand, validPubkey);
  if (rand() < 0.3) {
    payload.sensors = {
      lux: rand() < 0.5 ? -1e6 : 9e9,
      motionRms: rand() < 0.5 ? -10 : 999,
      pressureHpa: rand() < 0.5 ? -500 : 5000,
    };
  }
  if (rand() < 0.1) payload.attribution = "EVIL ATTRIBUTION";
  if (rand() < 0.15) payload.chainTip = rand() < 0.5 ? "not-hex" : "";
}

function mutateMild(payload, rand, validPubkey) {
  if (rand() < 0.5) payload.lifetimeBeats = Math.floor(rand() * 2_000_000);
  if (rand() < 0.3) payload.firstBeatTs = randomUnixTs(rand);
  if (rand() < 0.2) payload.pubkey = randomPubkey(rand, validPubkey);
}

async function generateRandomMaliciousCase(pool, rand) {
  const roll = rand();

  if (roll < 0.22) {
    const fullB64 = base64UrlEncode(JSON.stringify({ payload: {}, signature: "x" }));
    const garbage = [
      "not-a-url",
      `${VERIFIER_ORIGIN}#proof=`,
      `${VERIFIER_ORIGIN}#proof=${"!@#$%^&*()".repeat(20)}`,
      `${VERIFIER_ORIGIN}#proof=${base64UrlEncode("{not json")}`,
      `${VERIFIER_ORIGIN}#proof=${fullB64.slice(0, Math.max(1, Math.floor(fullB64.length * rand())))}`,
      base64UrlEncode("bare-fragment"),
    ];
    return { kind: "garbage_url", proofUrl: garbage[Math.floor(rand() * garbage.length)] };
  }

  if (roll < 0.44) {
    const { pubkey: validPubkey } = pickKey(pool, rand);
    const envelope = {
      payload: {
        v: 2,
        kind: "proof-of-origin",
        attribution: rand() < 0.7 ? PROOF_ATTRIBUTION : "wrong",
        pubkey: randomPubkey(rand, validPubkey),
        nodeId: randomNodeId(rand),
        mintedAt: randomUnixTs(rand),
        issuedAt: randomUnixTs(rand),
        firstBeatTs: randomUnixTs(rand),
        lifetimeBeats: randomLifetimeBeats(rand),
        chainTip: rand() < 0.5 ? "not-hex" : null,
        sensors:
          rand() < 0.4
            ? { lux: -1, motionRms: NaN, pressureHpa: 1e9 }
            : null,
      },
      signature: malformedSignature(rand, "a".repeat(128)),
      hash: rand() < 0.5 ? "deadbeefcafebabe" : undefined,
    };
    return { kind: "malformed_envelope", proofUrl: proofUrlFromEnvelope(envelope) };
  }

  if (roll < 0.82) {
    const envelope = await buildSignedPayload(pool, rand, mutateAdversarial);
    if (rand() < 0.15) {
      envelope.signature = malformedSignature(rand, envelope.signature);
    }
    return { kind: "signed_adversarial", proofUrl: proofUrlFromEnvelope(envelope) };
  }

  const envelope = await buildSignedPayload(pool, rand, mutateMild);
  return { kind: "signed_mild", proofUrl: proofUrlFromEnvelope(envelope) };
}

async function generateCase(i, count, pool, rand) {
  const validControls =
    count >= VALID_CONTROL_CASES + OVERSIZE_CASES
      ? VALID_CONTROL_CASES
      : Math.min(10, count);
  const oversizeCases =
    count >= VALID_CONTROL_CASES + OVERSIZE_CASES
      ? OVERSIZE_CASES
      : count > validControls
        ? 1
        : 0;

  if (i < validControls) {
    const envelope = await buildValidSignedEnvelope(pool, rand);
    return { kind: "valid_control", proofUrl: proofUrlFromEnvelope(envelope) };
  }

  if (i < validControls + oversizeCases) {
    const envelope = await buildValidSignedEnvelope(pool, rand);
    let proofUrl = proofUrlFromEnvelope(envelope);
    if (proofUrl.length <= PROOF_URL_MAX) {
      proofUrl += "X".repeat(PROOF_URL_MAX - proofUrl.length + 1);
    }
    return { kind: "oversize_url", proofUrl };
  }

  return generateRandomMaliciousCase(pool, rand);
}

// ── Mock KV ─────────────────────────────────────────────────────────────────

function createMockKv() {
  const store = new Map();
  return {
    async get(key, opts) {
      const raw = store.get(key);
      if (raw == null) return null;
      if (opts?.type === "json") {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      return raw;
    },
    async put(key, value) {
      store.set(key, typeof value === "string" ? value : JSON.stringify(value));
    },
  };
}

// ── Invocation ──────────────────────────────────────────────────────────────

async function invokeHandler(proofUrl, kv) {
  const req = new Request("https://fuzz.local/api/verify-device", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ proofUrl }),
  });
  const waitTasks = [];
  const res = await onRequestPost({
    request: req,
    env: { KINETIK_KV: kv },
    waitUntil: (p) => {
      waitTasks.push(p);
    },
  });
  await Promise.allSettled(waitTasks);
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { _parseError: true, _raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

async function invokeHttp(proofUrl, baseUrl) {
  const url = `${baseUrl.replace(/\/$/, "")}/api/verify-device`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ proofUrl }),
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { _parseError: true, _raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

// ── Response checks ───────────────────────────────────────────────────────────

function recordFailureReason(body, stats) {
  if (!body || body._parseError) return;
  const key =
    typeof body.error === "string"
      ? `error:${body.error}`
      : typeof body.reason === "string"
        ? `reason:${body.reason}`
        : null;
  if (key) stats.reasonHistogram[key] = (stats.reasonHistogram[key] || 0) + 1;
}

function checkScore(caseIndex, kind, body, stats) {
  if (!body || body._parseError) {
    stats.jsonParseFailures++;
    return;
  }

  if (body.derived == null) return;

  const score = body.derived.score;
  if (score === undefined || score === null) return;

  stats.scoresSeen++;
  if (!Number.isFinite(score) || score < 0 || score > 1000) {
    stats.scoreOutOfRange.push({
      caseIndex,
      kind,
      score,
      tier: body.derived.tier,
      valid: body.valid,
      nodeId: body.nodeId,
    });
  }
}

function formatHeapMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv);
  const rand = mulberry32(opts.seed);
  const pool = await buildKeypool(32);
  const kv = opts.mode === "handler" ? createMockKv() : null;

  const stats = {
    exceptions: [],
    unexpectedStatus: [],
    http400: 0,
    scoreOutOfRange: [],
    scoresSeen: 0,
    validTrue: 0,
    validFalse: 0,
    byKind: {},
    statusHistogram: {},
    reasonHistogram: {},
    jsonParseFailures: 0,
    latenciesMs: [],
    heapSamples: [],
  };

  const heap0 = process.memoryUsage().heapUsed;
  stats.heapSamples.push({ at: 0, heapUsed: heap0 });

  console.log(
    `fuzz-verify-device: count=${opts.count} mode=${opts.mode} seed=${opts.seed}`,
  );
  if (opts.mode === "http") {
    console.log(`  base_url=${opts.baseUrl}`);
  }

  const t0 = performance.now();

  for (let i = 0; i < opts.count; i++) {
    const { kind, proofUrl } = await generateCase(i, opts.count, pool, rand);
    stats.byKind[kind] = (stats.byKind[kind] || 0) + 1;

    const caseT0 = performance.now();
    let result;
    try {
      if (opts.mode === "http") {
        result = await invokeHttp(proofUrl, opts.baseUrl);
      } else {
        result = await invokeHandler(proofUrl, kv);
      }
    } catch (err) {
      stats.exceptions.push({
        caseIndex: i,
        kind,
        message: err?.message ?? String(err),
      });
      continue;
    }

    const latencyMs = performance.now() - caseT0;
    stats.latenciesMs.push(latencyMs);

    const { status, body } = result;
    stats.statusHistogram[status] = (stats.statusHistogram[status] || 0) + 1;

    if (status !== 200 && status !== 400) {
      stats.unexpectedStatus.push({ caseIndex: i, kind, status });
    } else if (status === 400) {
      stats.http400++;
    }

    if (body?.valid === true) stats.validTrue++;
    else if (body?.valid === false) stats.validFalse++;

    recordFailureReason(body, stats);
    checkScore(i, kind, body, stats);

    if ((i + 1) % opts.heapSampleEvery === 0) {
      const heapUsed = process.memoryUsage().heapUsed;
      stats.heapSamples.push({ at: i + 1, heapUsed });
      const deltaMb = formatHeapMb(heapUsed - heap0);
      console.log(
        `  [${i + 1}/${opts.count}] heap=${formatHeapMb(heapUsed)}MB delta=${deltaMb}MB max_latency=${Math.max(...stats.latenciesMs).toFixed(1)}ms`,
      );
    }
  }

  const elapsedMs = Math.round(performance.now() - t0);
  const heapEnd = process.memoryUsage().heapUsed;
  stats.heapSamples.push({ at: opts.count, heapUsed: heapEnd });

  const maxLatencyMs =
    stats.latenciesMs.length > 0 ? Math.max(...stats.latenciesMs) : 0;
  const avgLatencyMs =
    stats.latenciesMs.length > 0
      ? stats.latenciesMs.reduce((a, b) => a + b, 0) / stats.latenciesMs.length
      : 0;
  const heapGrowthMb = formatHeapMb(heapEnd - heap0);

  const topReasons = Object.entries(stats.reasonHistogram)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  console.log("\n--- summary ---");
  console.log(`elapsed_ms:      ${elapsedMs}`);
  console.log(`cases:           ${opts.count}`);
  console.log(`exceptions:      ${stats.exceptions.length}`);
  console.log(`http_400:        ${stats.http400}`);
  console.log(`unexpected_http: ${stats.unexpectedStatus.length}`);
  console.log(`scores_seen:     ${stats.scoresSeen}`);
  console.log(`score_oob:       ${stats.scoreOutOfRange.length}`);
  console.log(`valid_true:      ${stats.validTrue}`);
  console.log(`valid_false:     ${stats.validFalse}`);
  console.log(`json_parse_fail: ${stats.jsonParseFailures}`);
  console.log(`max_latency_ms:  ${maxLatencyMs.toFixed(1)}`);
  console.log(`avg_latency_ms:  ${avgLatencyMs.toFixed(1)}`);
  console.log(`heap_growth_mb:  ${heapGrowthMb}`);
  console.log(`by_kind:         ${JSON.stringify(stats.byKind)}`);
  console.log(`status:          ${JSON.stringify(stats.statusHistogram)}`);
  console.log(`reasons_top:     ${JSON.stringify(Object.fromEntries(topReasons))}`);

  if (stats.exceptions.length > 0) {
    console.log("\nfirst exceptions:");
    for (const e of stats.exceptions.slice(0, 5)) {
      console.log(`  #${e.caseIndex} [${e.kind}] ${e.message}`);
    }
  }
  if (stats.scoreOutOfRange.length > 0) {
    console.log("\nscore out of range (first 5):");
    console.log(JSON.stringify(stats.scoreOutOfRange.slice(0, 5), null, 2));
  }
  if (stats.unexpectedStatus.length > 0) {
    console.log("\nunexpected HTTP (first 5):");
    console.log(JSON.stringify(stats.unexpectedStatus.slice(0, 5), null, 2));
  }

  const failed =
    stats.exceptions.length > 0 ||
    stats.scoreOutOfRange.length > 0 ||
    stats.unexpectedStatus.length > 0;

  console.log(failed ? "\nFAIL" : "\nPASS");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
