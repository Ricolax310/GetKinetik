/**
 * POST /api/verify-device — Genesis Bureau evidence endpoint.
 *
 * v2.0 — wire shape changed from VERDICT to SIGNED EVIDENCE.
 *
 * The endpoint now mints a SignedAttestation envelope as its primary output.
 * The attestation is a bureau-signed evidence bundle that a partner can
 * verify offline against the published BUREAU_PUBKEY in @getkinetik/verify.
 * The attestation contains observable facts (chain claim, bureau-observed
 * temporal facts, sensor coherence booleans, tamper flags) — never a
 * score band, never a verdict.
 *
 * The convenience `derived` block in the response computes a tier using the
 * default policy from @getkinetik/evidence-mapping. Partners are free to
 * ignore it and run their own policy against the signed attestation. That
 * separation is the positioning: bureau ships evidence, networks ship policy.
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
 *   "pubkey": "<64-char hex device pubkey>",
 *   "schema": "proof-of-origin:v2",
 *
 *   "attestation": {
 *     "payload":   {...AttestationPayload...},
 *     "message":   "<canonical bytes that were signed>",
 *     "signature": "<128-char hex bureau Ed25519>",
 *     "hash":      "<16-char hex sha256(message)[:16]>"
 *   } | null,
 *
 *   "derived": {
 *     "tier":             "PREMIER" | "STRONG" | "STANDING" | "NEW" | "TAMPERED",
 *     "score":            0..1000,
 *     "flagged":          true | false,
 *     "flags":            string[],
 *     "policyVersion":    "v2.0.2",
 *     "contributingFactors": {...}
 *   } | null,
 *
 *   "asOf": "ISO-8601 timestamp"
 * }
 *
 * `attestation` is null when BUREAU_SIGNING_KEY_HEX is not configured on
 * this deployment (e.g. local dev without secrets). `derived` is null in
 * the same case. A partner doing long-term integration MUST consume
 * `attestation` and run @getkinetik/verify against it — the top-level
 * `derived` block is a convenience for quick reads.
 *
 * ── Response 200 — invalid ────────────────────────────────────────────────
 * { "valid": false, "reason": "signature_invalid" }
 *
 * ── CORS ──────────────────────────────────────────────────────────────────
 * All origins permitted — this is a public verification API. Proof validity
 * is determined cryptographically, not by who calls the endpoint.
 *
 * ── VERIFICATION ALGORITHM ───────────────────────────────────────────────
 * 1. Extract the base64url-encoded payload from the URL fragment.
 * 2. Decode + parse the JSON proof envelope.
 * 3. Verify PROOF_ATTRIBUTION intact in the payload.
 * 4. Re-serialise via stableStringify and verify Ed25519 against
 *    canonical message + payload.pubkey using SubtleCrypto.
 * 5. Confirm `hash` (if claimed) matches sha256(message)[:16].
 * 6. Load bureau context for the node (first-seen, peak beats) from KV.
 * 7. Compute flags: chain_rewind, beat_rate_implausible, sensor implausibility.
 * 8. Build the attestation inputs (subject, bureauObserved, chainClaim,
 *    sensorCoherence, flags).
 * 9. Persist bureau context (first-seen, peak beats).
 * 10. If bureau signer is configured: mint a SignedAttestation envelope.
 * 11. Derive convenience tier using DEFAULT_POLICY (mirror of evidence-mapping).
 * 12. Cache attestation under attestation:<nodeId> and fire score-change webhook
 *     if the tier transitioned.
 */

import { loadBureauSigner, signAttestation } from "./_lib/bureauSign.js";

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
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

/**
 * stableStringify — byte-for-byte equivalent of packages/kinetik-core's
 * stableJson.ts. Sorts top-level keys lexicographically. Nested objects
 * use JSON.stringify's insertion-order serialization — callers (and the
 * bureauSign module) construct nested objects in canonical insertion
 * order, so the bytes stay reproducible across signer and verifier.
 */
function stableStringify(obj) {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(",")}}`;
}

function fromBase64Url(b64url) {
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

async function sha256Hex(message) {
  const encoded = new TextEncoder().encode(message);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function extractProofFragment(proofUrl) {
  let fragment;
  try {
    const url = new URL(proofUrl);
    fragment = url.hash.slice(1);
  } catch {
    fragment = proofUrl;
  }
  if (fragment.startsWith("proof=")) {
    return fragment.slice("proof=".length);
  }
  return fragment;
}

// ── Sensor coherence ──────────────────────────────────────────────────────────
//
// Documented physical ranges. Values outside these raise a flag.
const SENSOR_RANGES = {
  lux: { min: 0, max: 200_000 },
  motionRms: { min: 0, max: 50 },
  pressureHpa: { min: 800, max: 1100 },
};

function buildSensorCoherence(sensors, flagsOut) {
  // Defaults: everything unobserved / null. If the proof didn't carry a
  // sensors block at all (legacy v:1), we report all fields as
  // unobserved. The mapping policy treats this as 0 sensor contribution
  // without raising a flag.
  const result = {
    luxObserved: false,
    luxPlausible: null,
    motionRmsObserved: false,
    motionRmsPlausible: null,
    pressureHpaObserved: false,
    pressureHpaPlausible: null,
  };
  if (!sensors || typeof sensors !== "object") return result;

  const lux = sensors.lux;
  if (typeof lux === "number" && Number.isFinite(lux)) {
    result.luxObserved = true;
    const plausible = lux >= SENSOR_RANGES.lux.min && lux <= SENSOR_RANGES.lux.max;
    result.luxPlausible = plausible;
    if (!plausible) flagsOut.push("lux_implausible");
  }

  const motionRms = sensors.motionRms;
  if (typeof motionRms === "number" && Number.isFinite(motionRms)) {
    result.motionRmsObserved = true;
    const plausible =
      motionRms >= SENSOR_RANGES.motionRms.min &&
      motionRms <= SENSOR_RANGES.motionRms.max;
    result.motionRmsPlausible = plausible;
    if (!plausible) flagsOut.push("motion_implausible");
  }

  const pressureHpa = sensors.pressureHpa;
  if (typeof pressureHpa === "number" && Number.isFinite(pressureHpa)) {
    result.pressureHpaObserved = true;
    const plausible =
      pressureHpa >= SENSOR_RANGES.pressureHpa.min &&
      pressureHpa <= SENSOR_RANGES.pressureHpa.max;
    result.pressureHpaPlausible = plausible;
    if (!plausible) flagsOut.push("pressure_implausible");
  }

  return result;
}

// ── Bureau context (KV-backed first-seen + peak beats per nodeId) ────────────

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
      expirationTtl: 60 * 60 * 24 * 365 * 2,
    });
  } catch (err) {
    console.error("[verify-device] bureau context write failed:", err);
  }
  return next;
}

// ── Reference policy (mirror of @getkinetik/evidence-mapping DEFAULT_POLICY) ─
//
// This is duplicated here on purpose: the worker is a CF Pages Function that
// can't easily import a TS package, and we want the `derived` block in the
// response to use the same math partners will run on the signed attestation
// via @getkinetik/evidence-mapping. The two implementations are kept in
// lockstep — if you change one, change the other in the same commit.
//
// THE SOURCE OF TRUTH is @getkinetik/evidence-mapping. This worker copy
// exists for response convenience only; partners doing real integration
// run the package against the signed attestation themselves.

const POLICY_VERSION = "v2.0.2";
const DEFAULT_POLICY = {
  maxBeatRatePerMs: 1 / 25_000,
  fullAgeCreditDays: 180,
  beatsLogMultiplier: 50,
  beatsScoreCap: 300,
  ageScoreCap: 300,
  baseline: 200,
  sensorBaseline: 50,
  sensorPerFieldPoints: 50,
  flaggedScoreCeiling: 199,
  tierBands: {
    PREMIER: { min: 900 },
    STRONG: { min: 750 },
    STANDING: { min: 500 },
    NEW: { min: 0 },
  },
};

function attestationToTier(att, policy = DEFAULT_POLICY) {
  let score = policy.baseline;
  const flags = Array.isArray(att.flags) ? att.flags : [];
  /** Flags that inform partners but must not imply tamper / TAMPERED tier. */
  const informational = new Set(["first_sighting"]);
  const flagged = flags.filter((f) => !informational.has(f)).length > 0;

  const observedWindowMs = Math.max(
    0,
    att.bureauObserved.lastSeenMs - att.bureauObserved.firstSeenMs,
  );
  const ageDays = observedWindowMs / 86_400_000;
  const bureauObservedAge = Math.min(
    policy.ageScoreCap,
    Math.max(0, Math.round((ageDays / policy.fullAgeCreditDays) * policy.ageScoreCap)),
  );
  score += bureauObservedAge;

  const claimedBeats =
    typeof att.chainClaim.lifetimeBeats === "number" &&
    att.chainClaim.lifetimeBeats >= 0
      ? att.chainClaim.lifetimeBeats
      : 0;
  const lifetimeBeats =
    claimedBeats > 0
      ? Math.min(
          policy.beatsScoreCap,
          Math.round(Math.log10(claimedBeats + 1) * policy.beatsLogMultiplier),
        )
      : 0;
  score += lifetimeBeats;

  const sc = att.sensorCoherence;
  let sensorCoherence = 0;
  if (sc) {
    const anyObserved =
      sc.luxObserved || sc.motionRmsObserved || sc.pressureHpaObserved;
    if (anyObserved) sensorCoherence += policy.sensorBaseline;
    if (sc.luxObserved && sc.luxPlausible === true) {
      sensorCoherence += policy.sensorPerFieldPoints;
    }
    if (sc.motionRmsObserved && sc.motionRmsPlausible === true) {
      sensorCoherence += policy.sensorPerFieldPoints;
    }
    if (sc.pressureHpaObserved && sc.pressureHpaPlausible === true) {
      sensorCoherence += policy.sensorPerFieldPoints;
    }
  }
  score += sensorCoherence;

  score = Math.max(0, Math.min(1000, score));
  if (flagged) {
    score = Math.min(score, policy.flaggedScoreCeiling);
  }

  const tier = flagged
    ? "TAMPERED"
    : score >= policy.tierBands.PREMIER.min
      ? "PREMIER"
      : score >= policy.tierBands.STRONG.min
        ? "STRONG"
        : score >= policy.tierBands.STANDING.min
          ? "STANDING"
          : "NEW";

  return {
    tier,
    score,
    flagged,
    contributingFactors: {
      baseline: policy.baseline,
      bureauObservedAge,
      lifetimeBeats,
      sensorCoherence,
    },
    flags: flags.slice(),
    policyVersion: POLICY_VERSION,
  };
}

// ── Core verification + attestation pipeline ─────────────────────────────────

async function verifyAndAttest(proofUrl, env) {
  // Step 1-6: cryptographic verification (unchanged contract from v1).
  const b64 = extractProofFragment(proofUrl);
  if (!b64 || b64.length < 16) {
    return { valid: false, reason: "invalid_url_format" };
  }
  const payloadBytes = fromBase64Url(b64);
  if (!payloadBytes) return { valid: false, reason: "base64_decode_failed" };

  let envelope;
  try {
    envelope = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return { valid: false, reason: "json_parse_failed" };
  }
  if (!envelope || typeof envelope !== "object") {
    return { valid: false, reason: "malformed_envelope" };
  }

  const { payload, signature } = envelope;
  if (!payload || !signature) return { valid: false, reason: "missing_fields" };
  if (payload.attribution !== PROOF_ATTRIBUTION) {
    return { valid: false, reason: "attribution_mismatch" };
  }

  const message = stableStringify(payload);
  const fullHash = await sha256Hex(message);
  const canonicalHash = fullHash.slice(0, 16);
  const claimedHash =
    typeof envelope.hash === "string" ? envelope.hash.toLowerCase() : null;
  if (claimedHash !== null && claimedHash !== canonicalHash) {
    return { valid: false, reason: "hash_mismatch" };
  }

  const pubkeyHex = payload.pubkey;
  if (typeof pubkeyHex !== "string" || pubkeyHex.length !== 64) {
    return { valid: false, reason: "invalid_pubkey" };
  }
  const pubkeyBytes = hexToBytes(pubkeyHex);
  if (!pubkeyBytes) return { valid: false, reason: "pubkey_decode_failed" };
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
    verified = await crypto.subtle.verify(
      "Ed25519",
      cryptoKey,
      sigBytes,
      new TextEncoder().encode(message),
    );
  } catch {
    return { valid: false, reason: "crypto_unavailable" };
  }
  if (!verified) return { valid: false, reason: "signature_invalid" };

  // Step 7: load bureau context and compute flags.
  const nodeId = payload.nodeId ?? null;
  const priorContext = await loadBureauContext(env, nodeId);

  const nowMs = Date.now();
  const claimedFirstBeatTs =
    typeof payload.firstBeatTs === "number" ? payload.firstBeatTs : null;
  const claimedLifetimeBeats =
    typeof payload.lifetimeBeats === "number" && payload.lifetimeBeats >= 0
      ? payload.lifetimeBeats
      : 0;

  const bureauFirstSeenMs = priorContext?.firstSeenMs ?? nowMs;

  // bureau-bounded firstBeatTs — used to compute the bureau-observed window
  // for both flag detection and the attestation's bureauObserved block.
  const effectiveFirstBeatTs =
    claimedFirstBeatTs === null
      ? bureauFirstSeenMs
      : Math.max(claimedFirstBeatTs, bureauFirstSeenMs);

  const flags = [];

  // Beat-rate sanity: claimed beats vs elapsed time the proof can bound.
  // On *first* bureau contact, `bureauFirstSeenMs === nowMs`, so
  // `nowMs - bureauFirstSeenMs` is ~0. Forcing a 1ms floor made every
  // honest node with lifetimeBeats > 0 look like an infinite beat rate.
  // Use the max of (bureau span, device-claimed span from firstBeatTs). If
  // we still cannot bound time — skip rather than false-positive.
  //
  // Short-window false positive: the app emits an immediate heartbeat on go-
  // live then ~30s cadence. Over the first 60–90s the *average* beats/ms is
  // higher than sustained 1/25s policy (e.g. 2 beats in 40s looks "too
  // fast"). Skip the rate check until the observation span is long enough
  // for a 30s cadence to dominate the average (two full intervals + slack).
  const BEAT_RATE_MIN_WINDOW_MS = 120_000;
  if (claimedLifetimeBeats > 0) {
    const bureauSpanMs = Math.max(0, nowMs - bureauFirstSeenMs);
    let claimedSpanMs = 0;
    if (
      typeof claimedFirstBeatTs === "number" &&
      Number.isFinite(claimedFirstBeatTs) &&
      claimedFirstBeatTs > 0 &&
      claimedFirstBeatTs <= nowMs
    ) {
      claimedSpanMs = nowMs - claimedFirstBeatTs;
    }
    const observedWindowMs = Math.max(bureauSpanMs, claimedSpanMs);
    if (
      observedWindowMs >= BEAT_RATE_MIN_WINDOW_MS &&
      claimedLifetimeBeats / observedWindowMs > DEFAULT_POLICY.maxBeatRatePerMs
    ) {
      flags.push("beat_rate_implausible");
    }
  }

  // Chain rewind hard gate.
  if (
    priorContext &&
    typeof priorContext.peakLifetimeBeats === "number" &&
    claimedLifetimeBeats < priorContext.peakLifetimeBeats
  ) {
    flags.push("chain_rewind");
  }

  // First-sighting marker. Not strictly a tamper flag — it's an informational
  // flag for partners who want to apply a cooldown to brand-new nodes.
  if (!priorContext) {
    flags.push("first_sighting");
  }

  // Sensor coherence — collects sensor flags into the same array.
  const sensorCoherence = buildSensorCoherence(payload.sensors, flags);

  // Step 8: persist bureau context BEFORE building the attestation so the
  // attestation's bureauObserved reflects the just-updated state.
  const persistedContext = await persistBureauContext(env, nodeId, priorContext, {
    nowMs,
    lifetimeBeats: claimedLifetimeBeats,
  });
  const bureauContext = persistedContext ?? {
    nodeId,
    firstSeenMs: nowMs,
    lastSeenMs: nowMs,
    peakLifetimeBeats: claimedLifetimeBeats,
  };

  // Best-effort chain tip extraction: heartbeat-style payloads carry the
  // hash directly via `prevHash`; PoO cards carry it as `chainTip`. Either
  // way the attestation just records what the proof claimed.
  const chainTip =
    typeof payload.chainTip === "string"
      ? payload.chainTip
      : typeof payload.prevHash === "string"
        ? payload.prevHash
        : null;

  const schemaKind = typeof payload.kind === "string" ? payload.kind : "unknown";
  const schemaVer = typeof payload.v === "number" ? payload.v : 1;

  const attestationInputs = {
    subject: {
      mintedAt:
        typeof payload.mintedAt === "number"
          ? payload.mintedAt
          : typeof payload.issuedAt === "number"
            ? payload.issuedAt
            : nowMs,
      nodeId: nodeId ?? "unknown",
      pubkey: pubkeyHex,
      chainTip,
    },
    bureauObserved: {
      firstSeenMs: bureauContext.firstSeenMs,
      lastSeenMs: bureauContext.lastSeenMs,
      peakLifetimeBeats: bureauContext.peakLifetimeBeats,
    },
    chainClaim: {
      firstBeatTs: effectiveFirstBeatTs,
      lifetimeBeats: claimedLifetimeBeats,
      schema: `${schemaKind}:v${schemaVer}`,
    },
    sensorCoherence,
    flags,
    witnesses: [],
    bureauTs: nowMs,
  };

  // Step 9: sign the attestation if a bureau signer is configured.
  // Null signer = no attestation in the response (placeholder pubkey + dev
  // mode). The verdict-side `derived` block still runs against the same
  // inputs so the response is informative even pre-ceremony.
  const signer = await loadBureauSigner(env);
  let attestation = null;
  if (signer) {
    try {
      attestation = await signAttestation(signer, attestationInputs);
    } catch (err) {
      console.error("[verify-device] attestation sign failed:", err);
      attestation = null;
    }
  }

  // Step 10: derive convenience tier using DEFAULT_POLICY. Partners running
  // their own policy SHOULD ignore this block and run @getkinetik/evidence-
  // mapping against `attestation.payload` directly.
  const derivedInput = {
    bureauObserved: attestationInputs.bureauObserved,
    chainClaim: attestationInputs.chainClaim,
    sensorCoherence: attestationInputs.sensorCoherence,
    flags: attestationInputs.flags,
  };
  const derived = attestationToTier(derivedInput);

  return {
    valid: true,
    nodeId: nodeId,
    pubkey: pubkeyHex,
    schema: `${schemaKind}:v${schemaVer}`,
    attestation,
    derived,
    asOf: new Date(nowMs).toISOString(),
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
const ATTESTATION_SPEC =
  "https://github.com/Ricolax310/GetKinetik/blob/main/docs/methodology/ATTESTATION.md";

export async function onRequestGet() {
  return json(
    {
      documentation: true,
      summary:
        "Genesis Bureau evidence endpoint. POST with a Proof of Origin URL to receive a bureau-signed attestation. The bureau ships evidence, not verdicts — partners run their own policy against the signed attestation via @getkinetik/evidence-mapping.",
      method: "POST",
      contentType: "application/json",
      bodyExample: {
        proofUrl:
          "https://getkinetik.app/verify/#proof=<paste from GETKINETIK app Share>",
      },
      tryInBrowser: PUBLIC_VERIFIER,
      spec: VERIFY_DEVICE_SPEC,
      attestationSpec: ATTESTATION_SPEC,
      curlExample:
        'curl -s -X POST https://getkinetik.app/api/verify-device -H "Content-Type: application/json" -d \'{"proofUrl":"PASTE_FULL_PROOF_URL"}\'',
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
    const result = await verifyAndAttest(proofUrl, ctx.env);

    // If we minted an attestation, snapshot the previous cached tier BEFORE
    // we write the new one, so the webhook helper can detect tier transitions.
    let priorTier = null;
    if (result.valid && result.nodeId && ctx.env?.KINETIK_KV) {
      try {
        const prior = await ctx.env.KINETIK_KV.get(
          `attestation:${result.nodeId}`,
          { type: "json" },
        );
        if (prior && prior.derived && typeof prior.derived.tier === "string") {
          priorTier = prior.derived.tier;
        }
      } catch (err) {
        console.error("[verify-device] prior attestation read failed:", err);
      }
    }

    // Cache the latest signed attestation + derived block under
    // attestation:<nodeId>. GET /api/score/:nodeId serves from this key.
    if (result.valid && result.nodeId && ctx.env?.KINETIK_KV) {
      const cacheEntry = {
        nodeId: result.nodeId,
        attestation: result.attestation,
        derived: result.derived,
        asOf: result.asOf,
        cachedAt: new Date().toISOString(),
      };
      ctx.waitUntil(
        ctx.env.KINETIK_KV.put(
          `attestation:${result.nodeId}`,
          JSON.stringify(cacheEntry),
          { expirationTtl: 60 * 60 * 24 * 30 },
        ).catch((err) => {
          console.error("[verify-device] kv attestation cache failed:", err);
        }),
      );
    }

    // Bureau stats — eventually-consistent counters.
    if (ctx.env?.KINETIK_KV) {
      ctx.waitUntil(
        bumpBureauStats(ctx.env.KINETIK_KV, result).catch((err) => {
          console.error("[verify-device] stats bump failed:", err);
        }),
      );
    }

    // Tier-change webhooks — fire when the tier moved.
    if (result.valid && result.nodeId && result.derived) {
      ctx.waitUntil(
        maybeFireTierWebhook(ctx.env, result, priorTier).catch((err) => {
          console.error("[verify-device] webhook fire failed:", err);
        }),
      );
    }

    return json(result, 200);
  } catch (err) {
    console.error("[verify-device] unexpected error:", err);
    return json({ valid: false, reason: "internal_error" }, 200);
  }
}

// ── Tier-change webhooks ─────────────────────────────────────────────────────
//
// Partners can register receiver URLs that get a signed POST whenever a
// node's `derived.tier` transitions. The webhook payload includes the
// SIGNED attestation so partners can re-verify offline against the
// published BUREAU_PUBKEY before trusting the tier change.
//
// Cloudflare env:
//   SCORE_WEBHOOK_URLS    JSON array of URLs.
//   SCORE_WEBHOOK_SECRET  HMAC-SHA256 signing key (for X-GETKINETIK-Signature).
//
// Note: the env var name is unchanged from v1.x (SCORE_WEBHOOK_*) so existing
// secrets keep working. The payload shape is new.

function bytesToHexLocal(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

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
  return bytesToHexLocal(new Uint8Array(sig));
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
    .slice(0, 16);
}

async function maybeFireTierWebhook(env, result, priorTier) {
  const urls = parseWebhookUrls(env);
  if (urls.length === 0) return;
  if (priorTier && priorTier === result.derived.tier) return;

  const secret =
    typeof env?.SCORE_WEBHOOK_SECRET === "string"
      ? env.SCORE_WEBHOOK_SECRET
      : "";
  const delivery =
    (crypto.randomUUID && crypto.randomUUID()) ||
    `del-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const payload = {
    event: "tier.changed",
    nodeId: result.nodeId,
    fromTier: priorTier,
    toTier: result.derived.tier,
    score: result.derived.score,
    flags: result.derived.flags,
    policyVersion: result.derived.policyVersion,
    attestation: result.attestation,
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
            "user-agent": "GETKINETIK-Bureau/2.0",
            "x-getkinetik-event": "tier.changed",
            "x-getkinetik-delivery": delivery,
            ...(signature ? { "x-getkinetik-signature": signature } : {}),
          },
          body,
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

async function bumpBureauStats(kv, result) {
  const STATS_KEY = "stats:bureau:v2";
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
      flagged: 0,
      signedAttestations: 0,
      byTier: { NEW: 0, STANDING: 0, STRONG: 0, PREMIER: 0, TAMPERED: 0 },
      firstVerifyAt: null,
      lastVerifyAt: null,
    };
  }

  stats.total = (stats.total || 0) + 1;
  if (result.valid) stats.valid = (stats.valid || 0) + 1;
  else stats.invalid = (stats.invalid || 0) + 1;

  if (result.attestation) {
    stats.signedAttestations = (stats.signedAttestations || 0) + 1;
  }

  if (result.derived) {
    if (result.derived.flagged) stats.flagged = (stats.flagged || 0) + 1;
    const tier = result.derived.tier;
    if (stats.byTier && stats.byTier[tier] !== undefined) {
      stats.byTier[tier] += 1;
    }
  }

  const nowIso = new Date().toISOString();
  if (!stats.firstVerifyAt) stats.firstVerifyAt = nowIso;
  stats.lastVerifyAt = nowIso;

  await kv.put(STATS_KEY, JSON.stringify(stats), {
    expirationTtl: 60 * 60 * 24 * 365 * 2,
  });
}

export async function onRequest(ctx) {
  if (ctx.request.method === "OPTIONS") return onRequestOptions();
  if (ctx.request.method === "POST") return onRequestPost(ctx);
  if (ctx.request.method === "GET") return onRequestGet();
  return json({ error: "Method not allowed." }, 405);
}
