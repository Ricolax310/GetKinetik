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
 * 5. Derive the canonical nodeId from the pubkey and require it to match
 * 6. Verify the Ed25519 signature against the serialised message and the
 *    pubkey embedded in the payload using SubtleCrypto (native in CF Workers)
 * 7. If a hash field is present, verify it matches sha256(message)[:16]
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
  if (typeof hex !== "string" || !/^[0-9a-f]+$/i.test(hex)) return null;
  if (hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (isNaN(byte)) return null;
    bytes[i] = byte;
  }
  return bytes;
}

/**
 * sha256Hex — SHA-256 of a UTF-8 string, returned as a lowercase hex string.
 */
async function sha256Hex(message) {
  const encoded = new TextEncoder().encode(message);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * sha256BytesHex — SHA-256 of raw bytes, returned as a lowercase hex string.
 */
async function sha256BytesHex(bytes) {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function deriveNodeIdFromPubkey(pubkeyBytes) {
  const fingerprint = (await sha256BytesHex(pubkeyBytes)).slice(0, 8).toUpperCase();
  return `KINETIK-NODE-${fingerprint}`;
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
//   - claimed `lifetimeBeats` is rate-checked against the *bureau-observed*
//     age. Beats accruing faster than 1 per 25s for the entire window is
//     physically impossible and raises a `beat_rate_implausible` flag.
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

  // Beat-rate sanity: claimed beats divided by bureau-observed window.
  // Use the bureau-observed window (referenceTs - bureauFirstSeenMs), not
  // the claimed window, so a brand-new node can't claim a million beats
  // and an ancient firstBeatTs to dodge the check.
  let beatRateOk = true;
  if (lifetimeBeats > 0) {
    const observedWindowMs = Math.max(1, referenceTs - bureauFirstSeenMs);
    if (lifetimeBeats / observedWindowMs > MAX_BEAT_RATE_PER_MS) {
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

  if (lifetimeBeats > 0 && beatRateOk) {
    const beatScore = Math.min(
      300,
      Math.round(Math.log10(lifetimeBeats + 1) * 50),
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
  const next = {
    nodeId,
    firstSeenMs: prior?.firstSeenMs ?? observed.nowMs,
    firstSeenAt: prior?.firstSeenAt ?? new Date(observed.nowMs).toISOString(),
    peakLifetimeBeats: Math.max(
      prior?.peakLifetimeBeats ?? 0,
      observed.lifetimeBeats ?? 0,
    ),
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

  // Step 5: derive canonical message/hash. Compact QR URLs omit `hash`;
  // full artifacts include it, and a present-but-wrong hash is rejected.
  const message = stableStringify(payload);
  const fullHash = await sha256Hex(message);
  const expectedHash = fullHash.slice(0, 16);
  if (hash !== undefined && expectedHash !== hash) {
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

    return json(result, 200);
  } catch (err) {
    // Catch-all — never expose stack traces to callers.
    console.error("[verify-device] unexpected error:", err);
    return json({ valid: false, reason: "internal_error" }, 200);
  }
}

export async function onRequest(ctx) {
  if (ctx.request.method === "OPTIONS") return onRequestOptions();
  if (ctx.request.method === "POST")    return onRequestPost(ctx);
  return json({ error: "Method not allowed." }, 405);
}
