/**
 * POST /api/verify-device
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
 * 6. Verify the optional message/hash fields match the canonical payload
 *
 * This is a server-side implementation of the same logic in landing/verify/verifier.js.
 * Both must remain byte-for-byte equivalent — the CRYPTOGRAPHIC_CONTRACT comment
 * in verifier.js documents the required parity.
 */

// ── Constants ────────────────────────────────────────────────────────────────
const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
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

  const { payload, signature } = envelope;
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

  const claimedMessage =
    typeof envelope.message === "string" ? envelope.message : message;
  const claimedHash =
    typeof envelope.hash === "string" ? envelope.hash.toLowerCase() : expectedHash;

  if (claimedMessage !== message) {
    return { valid: false, reason: "message_mismatch" };
  }
  if (expectedHash !== claimedHash) {
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

  // Step 7: return the verified node identity.
  return {
    valid: true,
    nodeId: payload.nodeId ?? null,
    pubkey: pubkeyHex,
    mintedAt: payload.mintedAt ?? payload.ts ?? null,
    schema: `proof-of-origin:v${payload.v ?? 1}`,
    attribution: payload.attribution,
  };
}

// ── Request handler ───────────────────────────────────────────────────────────

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
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
