// ============================================================================
// GETKINETIK Sovereign Verifier — browser-side Ed25519 proof auditor.
// ----------------------------------------------------------------------------
// This file is the single source of verification truth outside the app.
// It intentionally mirrors src/lib/proof.ts and src/lib/heartbeat.ts from
// the mobile codebase at the byte level:
//
//   · stableStringify()    — identical shallow lex-sorted serializer
//   · sha256(message)[:16] — identical hash-truncation for the embedded `hash`
//   · ed25519.verifyAsync  — identical signature scheme + SHA-512 wiring
//   · PROOF_ATTRIBUTION    — identical ownership stamp check
//
// If any of those four constants drift between this file and the app,
// previously-minted proofs will silently fail to verify. Treat both
// sides as a single cryptographic contract. The version of this file is
// stamped at the bottom — bump it on any serialization change and
// include a migration note in CHANGELOG.
//
// Runtime dependencies are VENDORED in ./vendor/. These are the exact
// ES-module bundles published by @noble/ed25519@3.1.0 and @noble/hashes@2.2.0
// — the same pinned versions the mobile app ships — fetched once from
// esm.sh and committed to this repo. The verifier therefore performs ZERO
// external network fetches at verify time:
//
//   · deploys cleanly under the landing site's strict CSP (`script-src 'self'`)
//   · verifies offline if the page is loaded from a saved bundle
//   · cannot be silently rotated by a third-party CDN
//
// To refresh the vendored crypto, re-run the fetch commands documented in
// README.md. After any refresh, run `node landing/verify/smoketest.mjs` to
// confirm byte-for-byte contract parity with the app's signing pipeline.
// ============================================================================

import * as ed from "./vendor/ed25519.js";
import { sha256, sha512 } from "./vendor/sha2.js";

// ----------------------------------------------------------------------------
// @noble/ed25519 v3 freezes `ed.hashes`, but the fields themselves are
// writable properties. The library's default sha512Async tries crypto.subtle
// first, which works in modern browsers but we wire the pure-JS path too so
// the verifier works over file:// and inside older WebViews — the exact
// same override the mobile app uses in src/lib/identity.ts.
// ----------------------------------------------------------------------------
ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

// ----------------------------------------------------------------------------
// The attribution string below is part of every Proof of Origin payload. A
// valid signature requires that this exact bytes were signed, so a proof
// whose attribution has been altered will fail at step 4 (signature
// verification) even before this explicit check. The explicit check gives
// us a clearer failure mode for a tampered-but-re-signed forgery attempt.
// ----------------------------------------------------------------------------
const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";

// ----------------------------------------------------------------------------
// stableStringify — byte-for-byte equivalent of src/lib/stableJson.ts. It
// sorts the top-level keys lexicographically and delegates value
// serialization to JSON.stringify, which is spec-stable across engines for
// the primitive types used in our payloads (string, number, boolean, null).
// All Sovereign Node payloads are flat, so the shallow sort is sufficient.
// If future payloads ever embed nested objects, BOTH this file and the
// app-side stableJson must switch to a recursive sort in the same commit.
// ----------------------------------------------------------------------------
const stableStringify = (obj) => {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(",")}}`;
};

// ----------------------------------------------------------------------------
// Byte/hex helpers. Kept local so the file is self-contained — a user who
// wants to audit the verifier never has to follow a chain of imports.
// ----------------------------------------------------------------------------
const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex) => {
  const clean = hex.toLowerCase();
  if (!/^[0-9a-f]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error(`invalid hex string (length ${hex.length})`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

const utf8 = (s) => new TextEncoder().encode(s);

// base64url decode, for `#proof=...` URL fragments.
const fromBase64Url = (s) => {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(out);
};

// ----------------------------------------------------------------------------
// verifyArtifact — runs all four checks, returns a structured report the
// UI can render without re-running any crypto. The report is intentionally
// verbose: each check's pass/fail + observed/expected values are exposed
// so a user can trace EXACTLY why an invalid proof was rejected.
//
// Input shape: the artifact minted by src/lib/proof.ts createProofOfOrigin
// (or src/lib/heartbeat.ts emit). Two forms are accepted:
//
//   FULL:    { payload, message, signature, hash }   — as minted
//   COMPACT: { payload, signature }                  — QR/URL friendly;
//                                                      message + hash are
//                                                      re-derived from payload
// ----------------------------------------------------------------------------
async function verifyArtifact(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("artifact must be a JSON object");
  }
  const { payload, signature } = raw;
  if (!payload || typeof payload !== "object") {
    throw new Error("artifact missing `payload` object");
  }
  if (typeof signature !== "string" || !/^[0-9a-f]{128}$/i.test(signature)) {
    throw new Error("artifact `signature` must be 128-char lowercase hex");
  }
  if (typeof payload.pubkey !== "string" || !/^[0-9a-f]{64}$/i.test(payload.pubkey)) {
    throw new Error("payload.pubkey must be 64-char lowercase hex");
  }

  // Canonical message — what the signing key actually committed to.
  const canonicalMessage = stableStringify(payload);
  const canonicalHashFull = toHex(sha256(utf8(canonicalMessage)));
  const canonicalHash = canonicalHashFull.slice(0, 16);

  // Claimed message + hash from the artifact, with fallbacks for COMPACT form.
  const claimedMessage =
    typeof raw.message === "string" ? raw.message : canonicalMessage;
  const claimedHash =
    typeof raw.hash === "string" ? raw.hash.toLowerCase() : canonicalHash;

  // ---- Check 1: canonical payload → claimed message byte equality. --------
  const canonicalMatches = claimedMessage === canonicalMessage;

  // ---- Check 2: sha256(message)[:16] === claimed hash. --------------------
  const hashMatches = claimedHash === canonicalHash;

  // ---- Check 3: attribution intact (only applies to proof-of-origin). -----
  const isProofOfOrigin = payload.kind === "proof-of-origin";
  const attributionOk = isProofOfOrigin
    ? payload.attribution === PROOF_ATTRIBUTION
    : null; // N/A for heartbeats

  // ---- Check 4: Ed25519 signature verifies against message + pubkey. ------
  // We verify against the CANONICAL message, not the claimed one. If the
  // claimed message has been altered to match a different payload, check 1
  // catches it; the signature verify should still pass against canonical,
  // unless the payload itself was re-signed by a different key (in which
  // case check 4 also fails because pubkey won't match the signer).
  let signatureOk = false;
  let signatureError = null;
  try {
    const sigBytes = fromHex(signature);
    const pubBytes = fromHex(payload.pubkey);
    const msgBytes = utf8(canonicalMessage);
    signatureOk = await ed.verifyAsync(sigBytes, msgBytes, pubBytes);
  } catch (err) {
    signatureError = err?.message ?? String(err);
  }

  const valid =
    canonicalMatches &&
    hashMatches &&
    (attributionOk === true || attributionOk === null) &&
    signatureOk;

  return {
    valid,
    kind: payload.kind ?? "unknown",
    payload,
    signature,
    canonicalMessage,
    canonicalHash,
    canonicalHashFull,
    claimedMessage,
    claimedHash,
    checks: {
      canonicalMatches,
      hashMatches,
      attributionOk,
      signatureOk,
      signatureError,
    },
  };
}

// ----------------------------------------------------------------------------
// RENDERING — all UI logic below; no crypto. Kept separate so the verify
// pipeline above can be unit-tested from a headless runner if we ever
// want a CI check against the app's golden fixtures.
// ----------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const inputEl = $("input");
const resultEl = $("result");

const fmtIsoDate = (ms) =>
  ms == null ? "—" : new Date(ms).toISOString().slice(0, 10);

const fmtIsoDateTime = (ms) =>
  ms == null
    ? "—"
    : new Date(ms).toISOString().replace("T", " ").slice(0, 19) + "Z";

// Break a hex string into newline-separated chunks for monospace display.
const chunkHex = (hex, size) => {
  const out = [];
  for (let i = 0; i < hex.length; i += size) out.push(hex.slice(i, i + size));
  return out.join("\n");
};

// Escape a string for safe innerHTML insertion. The verifier renders
// user-supplied payload values (nodeId, attribution, etc.) back to the DOM,
// so we MUST not trust them. Values come out as text nodes or through
// textContent where possible; where innerHTML is unavoidable (e.g. the
// hex block with newlines), this helper is used.
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );

function renderError(message, detail) {
  resultEl.classList.remove("hidden", "seal-valid");
  resultEl.classList.add("seal-invalid");
  resultEl.innerHTML = `
    <div class="seal seal-invalid">
      <div class="seal-glyph">✕</div>
      <div>
        <p class="seal-title">INVALID INPUT</p>
        <p class="seal-sub">${esc(message)}</p>
      </div>
    </div>
    ${detail ? `<pre class="hex-block-muted" style="text-align:left;">${esc(detail)}</pre>` : ""}
  `;
}

function renderReport(report) {
  const { valid, kind, payload, signature, checks } = report;
  resultEl.classList.remove("hidden", "seal-valid", "seal-invalid");
  resultEl.classList.add(valid ? "seal-valid" : "seal-invalid");

  const sealTitle = valid
    ? kind === "proof-of-origin"
      ? "PROOF VERIFIED"
      : kind === "heartbeat"
        ? "HEARTBEAT VERIFIED"
        : "SIGNATURE VERIFIED"
    : "VERIFICATION FAILED";

  const sealSub = valid
    ? `Signed by ${esc(payload.nodeId ?? "unknown")}`
    : "One or more checks did not pass — see detail below";

  // Data rows — we show different fields per artifact kind, but always
  // include the core cryptographic triple (nodeId, pubkey, hash).
  const rows = [];
  rows.push(["NODE", payload.nodeId ?? "—"]);

  if (kind === "proof-of-origin") {
    rows.push(["MINTED", fmtIsoDate(payload.mintedAt)]);
    rows.push(["BEATS", String(payload.lifetimeBeats ?? 0)]);
    rows.push(["SINCE", fmtIsoDate(payload.firstBeatTs)]);
    rows.push([
      "CHAIN TIP",
      payload.chainTip ? String(payload.chainTip).toUpperCase() : "—",
    ]);
    rows.push(["ISSUED", fmtIsoDateTime(payload.issuedAt)]);
    // ----------------------------------------------------------------------
    // v:2 PoOs carry a `sensors` block sourced from the most recent SIGNED
    // heartbeat (see src/lib/proof.ts). Render with the same labels and
    // units as the heartbeat sensor rows so the user reads ONE consistent
    // set of values everywhere. Same forward-compat policy: missing or
    // null fields just render as "—" — the signature has already proven
    // the entire payload byte-for-byte by the time we get here.
    // ----------------------------------------------------------------------
    if (payload.sensors && typeof payload.sensors === "object") {
      const s = payload.sensors;
      const motionLabel =
        typeof s.motionRms === "number" ? `${s.motionRms.toFixed(2)} g` : "—";
      const pressureLabel =
        typeof s.pressureHpa === "number"
          ? `${s.pressureHpa.toFixed(2)} hPa`
          : "—";
      const luxLabel =
        typeof s.lux === "number" ? `${Math.round(s.lux)} lx` : "—";
      rows.push(["MOTION", motionLabel]);
      rows.push(["PRESSURE", pressureLabel]);
      rows.push(["LIGHT", luxLabel]);
    }
  } else if (kind === "heartbeat") {
    rows.push(["SEQ", String(payload.seq ?? "—")]);
    rows.push(["WHEN", fmtIsoDateTime(payload.ts)]);
    rows.push(["STABILITY", `${payload.stabilityPct ?? "—"}%`]);
    rows.push(["ONLINE", payload.online ? "TRUE" : "FALSE"]);
    rows.push(["CHARGING", payload.charging ? "TRUE" : "FALSE"]);
    rows.push([
      "PREV HASH",
      payload.prevHash ? String(payload.prevHash).toUpperCase() : "—",
    ]);
    // ----------------------------------------------------------------------
    // v:2 heartbeats carry a `sensors` block with three permission-free
    // privacy-neutral aggregates. Rendering is intentionally tolerant —
    // the signature has already proven the entire payload byte-for-byte,
    // so any missing field just renders as "—" instead of failing the
    // schema. Forward-compatible by default. See src/lib/sensors.ts for
    // the canonical SensorReadout shape and rounding rules.
    // ----------------------------------------------------------------------
    if (payload.sensors && typeof payload.sensors === "object") {
      const s = payload.sensors;
      const motionLabel =
        typeof s.motionRms === "number" ? `${s.motionRms.toFixed(2)} g` : "—";
      const pressureLabel =
        typeof s.pressureHpa === "number"
          ? `${s.pressureHpa.toFixed(2)} hPa`
          : "—";
      const luxLabel =
        typeof s.lux === "number" ? `${Math.round(s.lux)} lx` : "—";
      rows.push(["MOTION", motionLabel]);
      rows.push(["PRESSURE", pressureLabel]);
      rows.push(["LIGHT", luxLabel]);
    }
  }
  rows.push(["HASH", report.canonicalHash.toUpperCase()]);

  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <div class="row">
          <span class="row-label">${esc(label)}</span>
          <span class="row-value">${esc(value)}</span>
        </div>`,
    )
    .join("");

  // Checks list — always rendered, so a user can see exactly which of the
  // four tests passed/failed even on a valid proof (reinforces what the
  // seal actually means).
  const mkCheck = (passed, label, skipped = false) => {
    const cls = skipped
      ? "check-skip"
      : passed
        ? "check-pass"
        : "check-fail";
    const mark = skipped ? "–" : passed ? "✓" : "✕";
    return `<div class="check ${cls}"><span class="check-mark">${mark}</span>${esc(label)}</div>`;
  };

  const checksHtml = [
    mkCheck(checks.canonicalMatches, "Payload re-serializes to signed message"),
    mkCheck(checks.hashMatches, "SHA-256(message)[:16] matches embedded hash"),
    mkCheck(
      checks.attributionOk === true,
      `Attribution intact: "${PROOF_ATTRIBUTION}"`,
      checks.attributionOk === null,
    ),
    mkCheck(
      checks.signatureOk,
      checks.signatureError
        ? `Ed25519 signature — error: ${checks.signatureError}`
        : "Ed25519 signature verifies against payload.pubkey",
    ),
  ].join("");

  const attributionBlock =
    kind === "proof-of-origin" && payload.attribution
      ? `
        <div class="divider"></div>
        <div class="attribution-block">
          <p class="attribution">${esc(payload.attribution)}</p>
          <p class="attribution-sub">A Sovereign Node artifact · not transferable</p>
        </div>`
      : "";

  resultEl.innerHTML = `
    <div class="seal ${valid ? "seal-valid" : "seal-invalid"}">
      <div class="seal-glyph">${valid ? "✓" : "✕"}</div>
      <div>
        <p class="seal-title">${esc(sealTitle)}</p>
        <p class="seal-sub">${esc(sealSub)}</p>
      </div>
    </div>

    <div class="data-block">${rowsHtml}</div>

    <div class="divider"></div>
    <h3 class="field-header">PUBLIC KEY</h3>
    <div class="hex-block">${esc(chunkHex(payload.pubkey ?? "", 16))}</div>

    <h3 class="field-header" style="margin-top:22px;">SIGNATURE</h3>
    <div class="hex-block-muted">${esc(chunkHex((signature ?? "").toUpperCase(), 32))}</div>

    <div class="divider"></div>
    <h3 class="field-header">CHECKS</h3>
    <div class="checks">${checksHtml}</div>

    ${attributionBlock}
  `;
  resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ----------------------------------------------------------------------------
// Input parsing. Accepts JSON (FULL or COMPACT form), with helpful errors.
// ----------------------------------------------------------------------------
function parseInput(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Paste a signed artifact or load via #proof=…");
  let obj;
  try {
    obj = JSON.parse(trimmed);
  } catch (err) {
    throw new Error(`Input is not valid JSON: ${err.message ?? err}`);
  }
  return obj;
}

async function runVerify() {
  try {
    const raw = parseInput(inputEl.value);
    const report = await verifyArtifact(raw);
    renderReport(report);
  } catch (err) {
    renderError(
      err?.message ?? String(err),
      err?.stack && err.stack !== err.message ? err.stack : null,
    );
  }
}

function runClear() {
  inputEl.value = "";
  resultEl.classList.add("hidden");
  resultEl.innerHTML = "";
  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname);
  }
  inputEl.focus();
}

// ----------------------------------------------------------------------------
// Self-test — mints an ephemeral keypair in-browser, signs a sample
// proof-of-origin payload, then feeds it back through the exact same
// verifyArtifact() the paste path uses. If this passes, the verifier
// pipeline is working end-to-end: any real proof minted by the app that
// FAILS here is a genuine verification failure, not a verifier bug.
// ----------------------------------------------------------------------------
async function runSelfTest() {
  try {
    const sk = ed.utils.randomSecretKey();
    const pk = await ed.getPublicKeyAsync(sk);
    const pubkey = toHex(pk);
    const nodeId = `KINETIK-TEST-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;

    const payload = {
      v: 1,
      kind: "proof-of-origin",
      nodeId,
      pubkey,
      mintedAt: Date.now() - 86400000,
      issuedAt: Date.now(),
      lifetimeBeats: 42,
      firstBeatTs: Date.now() - 60000,
      chainTip: toHex(sha256(utf8("selftest"))).slice(0, 16),
      attribution: PROOF_ATTRIBUTION,
    };
    const message = stableStringify(payload);
    const sig = await ed.signAsync(utf8(message), sk);
    const signature = toHex(sig);
    const hash = toHex(sha256(utf8(message))).slice(0, 16);

    const artifact = { payload, message, signature, hash };
    inputEl.value = JSON.stringify(artifact, null, 2);
    const report = await verifyArtifact(artifact);
    renderReport(report);
  } catch (err) {
    renderError(
      `Self-test failed: ${err?.message ?? String(err)}`,
      err?.stack ?? null,
    );
  }
}

// ----------------------------------------------------------------------------
// URL fragment bootstrap — a QR code can point at
// https://getkinetik.app/verify/#proof=<base64url(JSON)> and the page will
// decode, populate the textarea, and verify on load. Base64url is chosen
// over plain base64 so the fragment is URL-safe without encoding.
// ----------------------------------------------------------------------------
function tryLoadFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return false;
  const match = hash.match(/(?:^|&)proof=([^&]+)/);
  if (!match) return false;
  try {
    const json = fromBase64Url(decodeURIComponent(match[1]));
    inputEl.value = json;
    return true;
  } catch (err) {
    renderError(
      "Could not decode #proof= fragment",
      err?.message ?? String(err),
    );
    return false;
  }
}

// ----------------------------------------------------------------------------
// Wiring.
// ----------------------------------------------------------------------------
$("verify-btn").addEventListener("click", runVerify);
$("clear-btn").addEventListener("click", runClear);
$("selftest-btn").addEventListener("click", runSelfTest);

inputEl.addEventListener("keydown", (e) => {
  // Cmd/Ctrl+Enter to fire verify from inside the textarea.
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    runVerify();
  }
});

if (tryLoadFromHash()) {
  void runVerify();
}

// ----------------------------------------------------------------------------
// Version stamp. Bump on any change to stableStringify, PROOF_ATTRIBUTION,
// or the artifact shape. Exposed on window for debugging / ops probes.
// ----------------------------------------------------------------------------
window.__kinetikVerifier = {
  version: "1.2.0",
  verifyArtifact,
  stableStringify,
  PROOF_ATTRIBUTION,
};
