/**
 * POST /api/verify-device — partner verification webhook.
 * GET returns discovery JSON (humans pasting the URL in a browser tab).
 *
 * Public webhook for partner-side device verification.
 * Any DePIN partner can call this endpoint to confirm that a GETKINETIK
 * node has a valid hardware-attested Ed25519 identity.
 *
 * ── Request ──────────────────────────────────────────────────────────────
 * Content-Type: application/json
 * {
 *   "proofUrl": "https://getkinetik.app/verify/#proof=<base64url>"
 * }
 *
 * ── Response 200 — verified ───────────────────────────────────────────────
 * {
 *   "valid": true,
 *   "nodeId": "KINETIK-NODE-A3F2B719",
 *   "pubkey": "<64-char hex>",
 *   "mintedAt": 1714000000000,
 *   "schema": "proof-of-origin:v2",
 *   "attribution": "GETKINETIK by OutFromNothing LLC"
 * }
 *
 * ── Response 200 — invalid ────────────────────────────────────────────────
 * { "valid": false, "reason": "signature_invalid" }
 *
 * ── Response 400 ─────────────────────────────────────────────────────────
 * { "error": "proofUrl is required" }
 *
 * ── GET (browser discovery) ───────────────────────────────────────────────
 * Opening this URL in a browser tab issues GET (not POST). We return 200
 * JSON with usage hints — not a verification result.
 *
 * ── CORS ──────────────────────────────────────────────────────────────────
 * All origins are permitted — this is a public verification API, not an
 * authenticated endpoint. Proof validity is determined by cryptographic
 * verification, not by who calls the endpoint.
 *
 * ── VERIFICATION ALGORITHM ───────────────────────────────────────────────
 * 1. Extract the base64url-encoded payload from the URL fragment (#proof=...)
 * 2. Decode and parse the JSON proof payload
 * 3. Verify the PROOF_ATTRIBUTION field matches the expected constant
 * 4. Re-serialise the payload using stableStringify (lex-sorted keys)
 * 5. Verify the Ed25519 signature against the serialised message and the
 *    pubkey embedded in the payload using SubtleCrypto (native in CF Workers)
 * 6. Verify the hash field matches sha256(message)[:16]
 *
 * This is a server-side implementation of the same logic in landing/verify/verifier.js.
 * Both must remain byte-for-byte equivalent — the CRYPTOGRAPHIC_CONTRACT comment
 * in verifier.js documents the required parity.
 */

// ── Constants ────────────────────────────────────────────────────────────────
const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
const GENESIS_METHODOLOGY_VERSION = "v1.1";

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

/**
 * stableStringify — byte-for-byte equivalent of packages/kinetik-core/src/stableJson.ts.
 * Sorts keys lexicographically at every level.
 * CRITICAL: this must match the app's implementation exactly.
 */
function stableStringify(obj) {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(",")}}`;
}

/**
 * fromBase64Url — decodes a URL-safe base64 string to a Uint8Array.
 * Handles missing padding, + → +, / → /.
 */
function fromBase64Url(b64url) {
  // Strip trailing ellipsis or whitespace that could appear in a truncated URL.
  const clean = b64url.replace(/[…\s]/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = clean + "=".repeat((4 - (clean.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/**
 * hexToBytes — convert a hex string to Uint8Array.
 */
function hexToBytes(hex) {
  if (typeof hex !== "string" || hex.length % 2 !== 0) return null;
  if (!/^[0-9a-f]+$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (isNaN(byte)) return null;
    bytes[i] = byte;
  }
  return bytes;
}

function bytesToHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * sha256Hex — SHA-256 of a UTF-8 string, returned as a lowercase hex string.
 */
async function sha256Hex(message) {
  const encoded = new TextEncoder().encode(message);
  return sha256BytesHex(encoded);
}

async function sha256BytesHex(bytes) {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(buf));
}

async function deriveNodeIdFromPubkey(pubkeyBytes) {
  const fingerprint = await sha256BytesHex(pubkeyBytes);
  return `KINETIK-NODE-${fingerprint.slice(0, 8).toUpperCase()}`;
}

/**
 * extractProofFragment — parses the base64url proof payload from a verifier URL.
 * Handles both full URLs and bare base64url strings.
 */
function extractProofFragment(proofUrl) {
  let fragment;
  try {
    const url = new URL(proofUrl);
    fragment = url.hash.slice(1); // remove leading '#'
  } catch {
    // Not a full URL — treat the whole string as the base64url payload.
    fragment = proofUrl;
  }

  // Support both #proof=<b64> and bare <b64>.
  if (fragment.startsWith("proof=")) {
    return fragment.slice("proof=".length);
  }
  return fragment;
}

// ── Genesis Score v1.1 ───────────────────────────────────────────────────────
//
// Computes a 0–1000 score from observable proof-of-origin fields per the
// published methodology at docs/methodology/GENESIS_SCORE.md.
//
// v1.1 hardens v1.0 against payload-claim attacks:
//   - chain age is bounded by `bureauFirstSeenAt` (server-side first-seen
//     registration). A fresh keypair claiming to be 6 months old gets the
//     bureau's first-seen timestamp instead — no time travel.
//   - new `lifetimeBeats` accrued after the bureau first sees the node are
//     rate-checked. Pre-bureau history is not trusted for scoring, but it is
//     also not treated as tampering on first sight.
//   - prior peak `lifetimeBeats` is tracked. Any later proof claiming
//     fewer beats trips a `chain_rewind` hard gate per methodology §3.2.
//
// v1.1 inputs:
//   - Identity integrity:   already gated by caller (signature verified)
//   - Uptime continuity:    bureau-bounded chain age, rate-checked beats
//   - Sensor coherence:     presence + per-field plausibility ranges
//
// Not yet wired (return 0 contribution from these categories):
//   - Network engagement:   /api/attest stores attestations; v1.2 reads them
//   - Disclosure receipts:  requires L4 earnings ledger ingestion
//
// Hard gates per §3.6:
//   - Sensor values physically impossible
//   - chain_rewind: claimed lifetimeBeats < previously-recorded peak
//
// The methodology document is authoritative; this function must stay in sync.
const MAX_BEAT_RATE_PER_MS = 1 / 25_000; // one beat per 25 seconds, hard ceiling

function computeGenesisScoreV1(payload, bureauContext) {
  let score = 200; // §4 baseline for a cryptographically valid identity.
  const tamperFlags = [];

  const claimedFirstBeatTs =
    typeof payload.firstBeatTs === "number" ? payload.firstBeatTs : null;
  const referenceTs =
    typeof payload.issuedAt === "number"
      ? payload.issuedAt
      : typeof payload.mintedAt === "number"
        ? payload.mintedAt
        : Date.now();

  // ── Bureau-bounded chain age ─────────────────────────────────────────────
  // Use the LATER of (claimed firstBeatTs) and (bureau first-seen) so a
  // fresh keypair can't backdate itself. If we've never seen this node,
  // bureauContext.firstSeenMs is the current request time.
  const bureauFirstSeenMs =
    bureauContext && typeof bureauContext.firstSeenMs === "number"
      ? bureauContext.firstSeenMs
      : referenceTs;

  const effectiveFirstBeatTs =
    claimedFirstBeatTs === null
      ? bureauFirstSeenMs
      : Math.max(claimedFirstBeatTs, bureauFirstSeenMs);

  if (effectiveFirstBeatTs <= referenceTs) {
    const ageDays = (referenceTs - effectiveFirstBeatTs) / 86_400_000;
    const ageScore = Math.min(300, Math.round((ageDays / 180) * 300));
    score += Math.max(0, ageScore);
  }

  // ── Lifetime beats with rate sanity ──────────────────────────────────────
  // log10(beats+1) * 50: ~25k → 220 pts, ~250k → 270 pts, ~1M → 300 pts (cap).
  const lifetimeBeats =
    typeof payload.lifetimeBeats === "number" && payload.lifetimeBeats >= 0
      ? payload.lifetimeBeats
      : 0;

  const hasBureauContext =
    bureauContext && typeof bureauContext.firstSeenMs === "number";
  const firstSeenLifetimeBeats =
    hasBureauContext &&
    typeof bureauContext.firstSeenLifetimeBeats === "number"
      ? bureauContext.firstSeenLifetimeBeats
      : hasBureauContext &&
          typeof bureauContext.peakLifetimeBeats === "number"
        ? bureauContext.peakLifetimeBeats
        : lifetimeBeats;
  const bureauObservedBeats = Math.max(
    0,
    lifetimeBeats - firstSeenLifetimeBeats,
  );

  // Beat-rate sanity: only beats accrued since the bureau first saw this node
  // can be rate-checked. The first sighting establishes the baseline; otherwise
  // every existing honest node with any history would be flagged immediately.
  let beatRateOk = true;
  if (hasBureauContext && bureauObservedBeats > 0) {
    const observedWindowMs = Math.max(1, referenceTs - bureauFirstSeenMs);
    if (bureauObservedBeats / observedWindowMs > MAX_BEAT_RATE_PER_MS) {
      tamperFlags.push("beat_rate_implausible");
      beatRateOk = false;
    }
  }

  // ── Chain rewind hard gate (§3.2 / §3.6) ─────────────────────────────────
  // If we have ever recorded a higher lifetimeBeats for this node, a later
  // proof claiming fewer beats is a tamper signal.
  if (
    bureauContext &&
    typeof bureauContext.peakLifetimeBeats === "number" &&
    lifetimeBeats < bureauContext.peakLifetimeBeats
  ) {
    tamperFlags.push("chain_rewind");
  }

  if (bureauObservedBeats > 0 && beatRateOk) {
    const beatScore = Math.min(
      300,
      Math.round(Math.log10(bureauObservedBeats + 1) * 50),
    );
    score += beatScore;
  }

  // ── Sensor coherence — presence + plausibility ────────────────────────────
  // Up to 200 pts: 50 baseline for the block, 50 per plausible field.
  const sensors =
    payload.sensors && typeof payload.sensors === "object"
      ? payload.sensors
      : null;
  if (sensors) {
    let sensorScore = 50;
    const lux = sensors.lux;
    const motionRms = sensors.motionRms;
    const pressureHpa = sensors.pressureHpa;

    if (typeof lux === "number") {
      if (lux < 0 || lux > 200_000) tamperFlags.push("lux_implausible");
      else sensorScore += 50;
    }
    if (typeof motionRms === "number") {
      if (motionRms < 0 || motionRms > 50)
        tamperFlags.push("motion_implausible");
      else sensorScore += 50;
    }
    if (typeof pressureHpa === "number") {
      if (pressureHpa < 800 || pressureHpa > 1100)
        tamperFlags.push("pressure_implausible");
      else sensorScore += 50;
    }
    score += sensorScore;
  }

  // ── Hard gate — sensor tamper flags floor the score per §3.6 ──────────────
  if (tamperFlags.length > 0) score = Math.min(score, 199);

  // ── Clamp to [0, 1000] ────────────────────────────────────────────────────
  score = Math.max(0, Math.min(1000, score));

  // ── Score band per §4 ─────────────────────────────────────────────────────
  let scoreBand;
  if (tamperFlags.length > 0) scoreBand = "TAMPERED";
  else if (score < 500) scoreBand = "NEW";
  else if (score < 750) scoreBand = "STANDING";
  else if (score < 900) scoreBand = "STRONG";
  else scoreBand = "PREMIER";

  return {
    genesisScore: score,
    scoreBand,
    methodologyVersion: GENESIS_METHODOLOGY_VERSION,
    tamperFlags,
    asOf: new Date().toISOString(),
  };
}

// ── Bureau context (KV-backed first-seen + peak beats per nodeId) ────────────
// Lookup is best-effort: if KV is unavailable, hardening degrades gracefully
// to v1.0 behaviour (no chain_rewind detection, claimed firstBeatTs trusted).

async function loadBureauContext(env, nodeId) {
  if (!env?.KINETIK_KV || !nodeId) return null;
  try {
    const raw = await env.KINETIK_KV.get(`bureau:${nodeId}`, { type: "json" });
    if (raw && typeof raw === "object") return raw;
  } catch (err) {
    console.error("[verify-device] bureau context read failed:", err);
  }
  return null;
}

async function persistBureauContext(env, nodeId, prior, observed) {
  if (!env?.KINETIK_KV || !nodeId) return;
  const priorPeak =
    typeof prior?.peakLifetimeBeats === "number" ? prior.peakLifetimeBeats : 0;
  const observedBeats =
    typeof observed.lifetimeBeats === "number" && observed.lifetimeBeats >= 0
      ? observed.lifetimeBeats
      : 0;
  const peakLifetimeBeats = observed.allowPeakAdvance === false
    ? priorPeak
    : Math.max(priorPeak, observedBeats);
  const next = {
    nodeId,
    firstSeenMs: prior?.firstSeenMs ?? observed.nowMs,
    firstSeenAt: prior?.firstSeenAt ?? new Date(observed.nowMs).toISOString(),
    firstSeenLifetimeBeats:
      typeof prior?.firstSeenLifetimeBeats === "number"
        ? prior.firstSeenLifetimeBeats
        : observedBeats,
    peakLifetimeBeats,
    lastSeenMs: observed.nowMs,
    lastSeenAt: new Date(observed.nowMs).toISOString(),
  };
  try {
    await env.KINETIK_KV.put(`bureau:${nodeId}`, JSON.stringify(next), {
      // Keep bureau context for 2 years — we want long memory of peak claims.
      expirationTtl: 60 * 60 * 24 * 365 * 2,
    });
  } catch (err) {
    console.error("[verify-device] bureau context write failed:", err);
  }
}

// ── Main verification logic ───────────────────────────────────────────────────

async function verifyProofUrl(proofUrl, env) {
  // Step 1: extract the base64url payload.
  const b64 = extractProofFragment(proofUrl);
  if (!b64 || b64.length < 16) {
    return { valid: false, reason: "invalid_url_format" };
  }

  // Step 2: decode and parse the JSON payload.
  const payloadBytes = fromBase64Url(b64);
  if (!payloadBytes) {
    return { valid: false, reason: "base64_decode_failed" };
  }

  let envelope;
  try {
    const jsonStr = new TextDecoder().decode(payloadBytes);
    envelope = JSON.parse(jsonStr);
  } catch {
    return { valid: false, reason: "json_parse_failed" };
  }

  // Step 3: validate envelope structure.
  if (!envelope || typeof envelope !== "object") {
    return { valid: false, reason: "malformed_envelope" };
  }

  const { payload, signature, hash } = envelope;
  if (!payload || !signature) {
    return { valid: false, reason: "missing_fields" };
  }

  // Step 4: verify attribution.
  if (payload.attribution !== PROOF_ATTRIBUTION) {
    return { valid: false, reason: "attribution_mismatch" };
  }

  // Step 5: verify hash = sha256(stableStringify(payload))[:16].
  const message = stableStringify(payload);
  const fullHash = await sha256Hex(message);
  const expectedHash = fullHash.slice(0, 16);
  if (
    Object.prototype.hasOwnProperty.call(envelope, "hash") &&
    (typeof hash !== "string" || expectedHash !== hash.toLowerCase())
  ) {
    return { valid: false, reason: "hash_mismatch" };
  }

  // Step 6: verify Ed25519 signature using SubtleCrypto.
  // The pubkey is a 64-char lowercase hex string (32 raw bytes).
  const pubkeyHex = payload.pubkey;
  if (typeof pubkeyHex !== "string" || pubkeyHex.length !== 64) {
    return { valid: false, reason: "invalid_pubkey" };
  }
  const pubkeyBytes = hexToBytes(pubkeyHex);
  if (!pubkeyBytes) {
    return { valid: false, reason: "pubkey_decode_failed" };
  }
  const expectedNodeId = await deriveNodeIdFromPubkey(pubkeyBytes);
  if (payload.nodeId !== expectedNodeId) {
    return { valid: false, reason: "node_id_mismatch" };
  }
  const sigBytes = hexToBytes(signature);
  if (!sigBytes || sigBytes.length !== 64) {
    return { valid: false, reason: "invalid_signature_format" };
  }

  let verified = false;
  try {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      pubkeyBytes,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const msgBytes = new TextEncoder().encode(message);
    verified = await crypto.subtle.verify("Ed25519", cryptoKey, sigBytes, msgBytes);
  } catch {
    // SubtleCrypto Ed25519 may not be available in all CF Worker environments.
    // Fall back to returning valid: false with a clear reason code.
    return { valid: false, reason: "crypto_unavailable" };
  }

  if (!verified) {
    return { valid: false, reason: "signature_invalid" };
  }

  // Step 7: compute Genesis Score from observable proof fields, bounded by
  // the bureau's prior knowledge of this node (first-seen, peak beats).
  const nodeId = payload.nodeId ?? null;
  const priorContext = await loadBureauContext(env, nodeId);
  const scoreBlock = computeGenesisScoreV1(payload, priorContext);

  // Update bureau memory regardless of score (we still want to record the
  // first-seen moment for new nodes that turn out tampered later).
  await persistBureauContext(env, nodeId, priorContext, {
    nowMs: Date.now(),
    lifetimeBeats:
      typeof payload.lifetimeBeats === "number" ? payload.lifetimeBeats : 0,
    allowPeakAdvance: !scoreBlock.tamperFlags.includes("beat_rate_implausible"),
  });

  // Step 8: return the verified node identity + score.
  // Timestamp field priority: Proof-of-Origin uses issuedAt (card signed) /
  // mintedAt (key birth); heartbeat uses ts. Previous payload.ts-only mapping
  // returned null for every valid PoO — fixed 2026-05.
  return {
    valid: true,
    nodeId: payload.nodeId ?? null,
    pubkey: pubkeyHex,
    mintedAt:
      typeof payload.issuedAt === "number"
        ? payload.issuedAt
        : typeof payload.mintedAt === "number"
          ? payload.mintedAt
          : typeof payload.ts === "number"
            ? payload.ts
            : null,
    schema: `proof-of-origin:v${payload.v ?? 1}`,
    attribution: payload.attribution,
    lifetimeBeats:
      typeof payload.lifetimeBeats === "number" ? payload.lifetimeBeats : null,
    firstBeatTs:
      typeof payload.firstBeatTs === "number" ? payload.firstBeatTs : null,
    ...scoreBlock,
  };
}

// ── Request handler ───────────────────────────────────────────────────────────

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

const VERIFY_DEVICE_SPEC =
  "https://github.com/Ricolax310/GetKinetik/blob/main/docs/api/verify-device.md";
const PUBLIC_VERIFIER = "https://getkinetik.app/verify/";

/** GET — human pastes the API URL in a browser; explain POST instead of 405. */
export async function onRequestGet() {
  return json(
    {
      documentation: true,
      summary:
        "Partner verification webhook — call with HTTP POST and a JSON body. This GET response is not a proof result.",
      method: "POST",
      contentType: "application/json",
      bodyExample: {
        proofUrl: "https://getkinetik.app/verify/#proof=<paste from GETKINETIK app Share>",
      },
      tryInBrowser: PUBLIC_VERIFIER,
      spec: VERIFY_DEVICE_SPEC,
      curlExample:
        "curl -s -X POST https://getkinetik.app/api/verify-device -H \"Content-Type: application/json\" -d \"{\\\"proofUrl\\\":\\\"PASTE_FULL_PROOF_URL\\\"}\"",
    },
    200,
  );
}

export async function onRequestPost(ctx) {
  let body;
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const proofUrl = typeof body?.proofUrl === "string" ? body.proofUrl.trim() : "";
  if (!proofUrl) {
    return json({ error: "proofUrl is required." }, 400);
  }

  if (proofUrl.length > 8192) {
    return json({ error: "proofUrl exceeds maximum length." }, 400);
  }

  try {
    const result = await verifyProofUrl(proofUrl, ctx.env);

    // If valid + scored, snapshot the previous cached band BEFORE we write
    // the new one, so the webhook helper can detect band transitions.
    // Synchronous read here — adds one KV round trip but unblocks correct
    // webhook semantics. Best-effort: any failure → null prior band.
    let priorBand = null;
    if (result.valid && result.nodeId && ctx.env?.KINETIK_KV) {
      try {
        const prior = await ctx.env.KINETIK_KV.get(
          `score:${result.nodeId}`,
          { type: "json" },
        );
        if (prior && typeof prior.scoreBand === "string") {
          priorBand = prior.scoreBand;
        }
      } catch (err) {
        console.error("[verify-device] prior score read failed:", err);
      }
    }

    // Cache score under score:<nodeId> so GET /api/score/:nodeId can serve
    // partner lookups without a fresh proof. Best-effort — a KV write
    // failure must not change the API response shape callers depend on.
    if (result.valid && result.nodeId && ctx.env?.KINETIK_KV) {
      const cacheEntry = {
        nodeId: result.nodeId,
        genesisScore: result.genesisScore,
        scoreBand: result.scoreBand,
        methodologyVersion: result.methodologyVersion,
        tamperFlags: result.tamperFlags,
        lifetimeBeats: result.lifetimeBeats,
        firstBeatTs: result.firstBeatTs,
        asOf: result.asOf,
        cachedAt: new Date().toISOString(),
      };
      ctx.waitUntil(
        ctx.env.KINETIK_KV.put(
          `score:${result.nodeId}`,
          JSON.stringify(cacheEntry),
          { expirationTtl: 60 * 60 * 24 * 30 }, // 30 days
        ).catch((err) => {
          console.error("[verify-device] kv score cache failed:", err);
        }),
      );
    }

    // Bureau stats — eventually-consistent counters under stats:* keys.
    // Best-effort; never blocks or changes the response shape.
    if (ctx.env?.KINETIK_KV) {
      ctx.waitUntil(
        bumpBureauStats(ctx.env.KINETIK_KV, result).catch((err) => {
          console.error("[verify-device] stats bump failed:", err);
        }),
      );
    }

    // Score-change webhooks — fire when the band moved (or on first sighting
    // if so configured). Best-effort, no retries.
    if (result.valid && result.nodeId) {
      ctx.waitUntil(
        maybeFireScoreWebhook(ctx.env, result, priorBand).catch((err) => {
          console.error("[verify-device] webhook fire failed:", err);
        }),
      );
    }

    return json(result, 200);
  } catch (err) {
    // Catch-all — never expose stack traces to callers.
    console.error("[verify-device] unexpected error:", err);
    return json({ valid: false, reason: "internal_error" }, 200);
  }
}

// ── Score-change webhooks ────────────────────────────────────────────────────
//
// Partners can register receiver URLs that get a signed POST whenever a node's
// `scoreBand` transitions. Wired via Cloudflare env:
//
//   SCORE_WEBHOOK_URLS    JSON array of URLs, e.g. ["https://x.com/hook"]
//   SCORE_WEBHOOK_SECRET  HMAC-SHA256 signing key (any sufficiently long string)
//
// Payload:
//   {
//     "event":     "score.changed",
//     "nodeId":    "KINETIK-NODE-...",
//     "fromBand":  "STANDING" | null,
//     "toBand":    "TAMPERED",
//     "fromScore": 636 | null,
//     "toScore":   199,
//     "tamperFlags": ["chain_rewind"],
//     "methodologyVersion": "v1.1",
//     "asOf":      "2026-05-13T13:34:22.674Z",
//     "delivery":  "<uuid>"
//   }
//
// Headers:
//   Content-Type: application/json
//   User-Agent:   GETKINETIK-Bureau/1.1
//   X-GETKINETIK-Event:     score.changed
//   X-GETKINETIK-Delivery:  <uuid>
//   X-GETKINETIK-Signature: sha256=<hex hmac of raw body>
//
// Delivery is best-effort: no retries, no queue. Webhook failures are logged
// and never affect the /verify-device response.

async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return bytesToHex(new Uint8Array(sig));
}

function parseWebhookUrls(env) {
  const raw =
    typeof env?.SCORE_WEBHOOK_URLS === "string"
      ? env.SCORE_WEBHOOK_URLS.trim()
      : "";
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("[verify-device] SCORE_WEBHOOK_URLS is not valid JSON");
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((u) => typeof u === "string" && /^https:\/\//i.test(u))
    .slice(0, 16); // hard cap
}

async function maybeFireScoreWebhook(env, result, priorBand) {
  const urls = parseWebhookUrls(env);
  if (urls.length === 0) return;

  // Only fire on band transitions (incl. first-ever sighting if priorBand=null).
  if (priorBand && priorBand === result.scoreBand) return;

  const secret = typeof env?.SCORE_WEBHOOK_SECRET === "string"
    ? env.SCORE_WEBHOOK_SECRET
    : "";

  // crypto.randomUUID is available in Cloudflare Workers.
  const delivery =
    (crypto.randomUUID && crypto.randomUUID()) ||
    `del-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const payload = {
    event: "score.changed",
    nodeId: result.nodeId,
    fromBand: priorBand,
    toBand: result.scoreBand,
    toScore: result.genesisScore,
    tamperFlags: result.tamperFlags,
    methodologyVersion: result.methodologyVersion,
    asOf: result.asOf,
    delivery,
  };

  const body = JSON.stringify(payload);
  const signature = secret ? `sha256=${await hmacSha256Hex(secret, body)}` : "";

  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "user-agent": "GETKINETIK-Bureau/1.1",
            "x-getkinetik-event": "score.changed",
            "x-getkinetik-delivery": delivery,
            ...(signature ? { "x-getkinetik-signature": signature } : {}),
          },
          body,
          // 5-second hard ceiling — slow partners don't get to slow us down.
          signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
        });
        if (!res.ok) {
          console.error(
            `[verify-device] webhook ${url} → HTTP ${res.status}`,
          );
        }
      } catch (err) {
        console.error(`[verify-device] webhook ${url} failed:`, err);
      }
    }),
  );
}

// ── Bureau stats ─────────────────────────────────────────────────────────────
// Eventually-consistent aggregate counters published at GET /api/bureau/stats.
// Stored under a single key so the read endpoint is one KV get.
// Last-writer-wins is fine: a public dashboard does not require exact counts.
async function bumpBureauStats(kv, result) {
  const STATS_KEY = "stats:bureau:v1";

  let stats;
  try {
    stats = (await kv.get(STATS_KEY, { type: "json" })) || null;
  } catch {
    stats = null;
  }

  if (!stats || typeof stats !== "object") {
    stats = {
      total: 0,
      valid: 0,
      invalid: 0,
      tampered: 0,
      byBand: { NEW: 0, STANDING: 0, STRONG: 0, PREMIER: 0, TAMPERED: 0 },
      uniqueNodeIds: 0,
      firstVerifyAt: null,
      lastVerifyAt: null,
    };
  }

  stats.total = (stats.total || 0) + 1;
  if (result.valid) stats.valid = (stats.valid || 0) + 1;
  else stats.invalid = (stats.invalid || 0) + 1;

  if (Array.isArray(result.tamperFlags) && result.tamperFlags.length > 0) {
    stats.tampered = (stats.tampered || 0) + 1;
  }

  if (result.scoreBand && stats.byBand && stats.byBand[result.scoreBand] !== undefined) {
    stats.byBand[result.scoreBand] += 1;
  }

  const nowIso = new Date().toISOString();
  if (!stats.firstVerifyAt) stats.firstVerifyAt = nowIso;
  stats.lastVerifyAt = nowIso;

  await kv.put(STATS_KEY, JSON.stringify(stats), {
    expirationTtl: 60 * 60 * 24 * 365 * 2, // 2 years
  });
}

export async function onRequest(ctx) {
  if (ctx.request.method === "OPTIONS") return onRequestOptions();
  if (ctx.request.method === "POST")    return onRequestPost(ctx);
  return json({ error: "Method not allowed." }, 405);
}
