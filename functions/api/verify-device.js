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
 * 6. If a hash field is present, verify it matches sha256(message)[:16]
 *
 * This is a server-side implementation of the same logic in landing/verify/verifier.js.
 * Both must remain byte-for-byte equivalent — the CRYPTOGRAPHIC_CONTRACT comment
 * in verifier.js documents the required parity.
 */

// ── Constants ────────────────────────────────────────────────────────────────
const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
const GENESIS_METHODOLOGY_VERSION = "v1.0";

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

// ── Genesis Score v1 ─────────────────────────────────────────────────────────
//
// Computes a 0–1000 score from observable proof-of-origin fields per the
// published methodology at docs/methodology/GENESIS_SCORE.md.
//
// v1 inputs (everything available in a single signed proof, no server state):
//   - Identity integrity:   already gated by caller (signature verified)
//   - Uptime continuity:    chain age from firstBeatTs, plus lifetimeBeats
//   - Sensor coherence:     presence + per-field plausibility ranges
//
// Not yet wired (returns 0 contribution from these categories):
//   - Network engagement:   requires partner attestation channel
//   - Disclosure receipts:  requires L4 earnings ledger ingestion
//
// Hard gates (per §3.6) that floor the score and raise tamperFlags:
//   - Sensor values physically impossible (e.g. negative pressure)
//
// The methodology document is authoritative; this function must stay in sync.
function computeGenesisScoreV1(payload) {
  let score = 200; // §4 baseline for a cryptographically valid identity.
  const tamperFlags = [];

  // ── Uptime continuity — chain age ─────────────────────────────────────────
  // Linear ramp: 0 days → 0 pts, 180 days → 300 pts (capped).
  const firstBeatTs =
    typeof payload.firstBeatTs === "number" ? payload.firstBeatTs : null;
  const referenceTs =
    typeof payload.issuedAt === "number"
      ? payload.issuedAt
      : typeof payload.mintedAt === "number"
        ? payload.mintedAt
        : Date.now();
  if (firstBeatTs !== null && firstBeatTs <= referenceTs) {
    const ageDays = (referenceTs - firstBeatTs) / 86_400_000;
    const ageScore = Math.min(300, Math.round((ageDays / 180) * 300));
    score += Math.max(0, ageScore);
  }

  // ── Uptime continuity — lifetime beats (logarithmic) ──────────────────────
  // log10(beats+1) * 50: ~25k → 220 pts, ~250k → 270 pts, ~1M → 300 pts (cap).
  const lifetimeBeats =
    typeof payload.lifetimeBeats === "number" && payload.lifetimeBeats >= 0
      ? payload.lifetimeBeats
      : 0;
  if (lifetimeBeats > 0) {
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

// ── Main verification logic ───────────────────────────────────────────────────

async function verifyProofUrl(proofUrl) {
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

  // Step 5: verify hash = sha256(stableStringify(payload))[:16] when supplied.
  // App QR/verifier URLs use compact { payload, signature } envelopes and rely
  // on the verifier deriving the canonical hash from the signed payload.
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

  // Step 7: compute Genesis Score from observable proof fields.
  const scoreBlock = computeGenesisScoreV1(payload);

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
    const result = await verifyProofUrl(proofUrl);
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
