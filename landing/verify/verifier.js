// -----------------------------------------------------------------------------
// GENERATED FILE — DO NOT EDIT
//
// Source of truth:
// packages/verify/src/index.ts
//
// Regenerate:
// npm run verifier:sync
// -----------------------------------------------------------------------------

// ============================================================================
// @getkinetik/verify — independent verifier for GETKINETIK signed artifacts.
// ----------------------------------------------------------------------------
// This package is the byte-for-byte equivalent of the verifier shipped at
// https://getkinetik.app/verify/. It exists so partner networks, lenders,
// auditors, and any third-party integrator can confirm a Proof of Origin,
// signed heartbeat, or signed earning *without ever calling our servers* and
// without copying source files into their own repo.
//
// CONTRACT — must match packages/kinetik-core/src/proof.ts and
// packages/kinetik-core/src/heartbeat.ts in the GETKINETIK app, AND
// landing/verify/verifier.js for the public web verifier:
//
//   · stableStringify()    — shallow lex-sorted serializer
//   · sha256(message)[:16] — embedded `hash` truncation
//   · ed25519.verifyAsync  — Ed25519 signature scheme + SHA-512 wiring
//   · PROOF_ATTRIBUTION    — ownership stamp constant
//
// If any of those four constants drift between this package and the app,
// previously-minted artifacts will silently fail to verify. Bump VERSION
// below + add a CHANGELOG entry on any serialization change.
//
// ZERO RUNTIME NETWORK CALLS. ZERO HIDDEN STATE. PURE FUNCTION OF INPUT.
// ============================================================================
import * as ed from "./vendor/ed25519.js";
import { sha256, sha512 } from "./vendor/sha2.js";
// stableStringify is the single canonical serializer. This is a GENERATED
// mirror of the SSOT (packages/kinetik-core/src/stableJson.ts), produced by
// `npm run canonical:sync` and drift-guarded in CI. It is compiled into this
// package's dist so the published SDK stays self-contained (no runtime
// dependency on the private, unbuilt @kinetik/core package).
import { stableStringify } from "./stable-json.js";
// @noble/ed25519 v3 freezes `ed.hashes` but the fields are writable. We
// override sha512 + sha512Async with the pure-JS @noble/hashes implementation
// so the verifier works in any runtime — Node, browser, edge worker — without
// depending on WebCrypto's `crypto.subtle.digest` being available.
ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = (async (msg) => sha512(msg));
// ----------------------------------------------------------------------------
// Constants — the cryptographic ownership stamp and protocol fee rate.
// These ARE part of every Proof of Origin / Signed Earning payload, so a
// valid signature already requires that the exact bytes were signed. The
// explicit checks below give clearer failure modes for tampered-but-resigned
// forgery attempts.
// ----------------------------------------------------------------------------
export const PROOF_ATTRIBUTION = 'GETKINETIK by OutFromNothing LLC';
export const PROTOCOL_FEE_RATE = 0.01;
// ----------------------------------------------------------------------------
// BUREAU_PUBKEY — the Genesis Bureau's published Ed25519 verification key.
// Every bureau-signed attestation MUST verify against this exact pubkey for
// `report.checks.bureauOk` to pass. A different valid signature (from any
// other Ed25519 key) will still verify cryptographically — `signatureOk` —
// but fails the `bureauOk` check, surfacing forgery attempts where someone
// tries to mint attestations under a non-bureau key.
//
// PLACEHOLDER: this constant is 64 zero hex chars until the bureau key
// ceremony has been performed (see scripts/mint-bureau-key.mjs). While
// the placeholder is in effect, every attestation's `bureauOk` is false
// because no real bureau pubkey has been published yet. Cryptographic
// verification (`signatureOk`) still works against whatever pubkey is
// embedded in the payload — so test harnesses that mint ephemeral bureau
// keys can exercise the full pipeline.
//
// After the ceremony:
//   1. Replace the constant below with the 64-char hex pubkey output by
//      scripts/mint-bureau-key.mjs.
//   2. Bump VERSION (this is a contract change for every downstream
//      consumer of the verify package).
//   3. Add a CHANGELOG entry noting the bureau key fingerprint and the
//      date of the ceremony.
// ----------------------------------------------------------------------------
export const BUREAU_PUBKEY = '852fbc2bdd7c0243c6ee42462f7d31274fd3be3a0f2125e8eb797b76410dfb26';
/** Package version. Bump this on any change to the contract constants
 *  above (stableStringify shape, sha256 truncation, signature scheme,
 *  attribution string, or the bureau pubkey). Stays in lockstep with
 *  landing/verify/verifier.js.
 *
 *  v0.2.1 (2026-05-13) — Genesis Bureau key minted and published. The
 *  BUREAU_PUBKEY constant above is no longer a placeholder; every
 *  attestation signed by `functions/api/_lib/bureauSign.js` in
 *  production verifies against this exact key. */
export const VERSION = '0.2.1';
// stableStringify is re-exported so existing consumers of `@getkinetik/verify`
// (and the package smoketest) keep importing it from the package root. The
// implementation now lives in the generated ./stableJson mirror — see the
// import at the top of this file.
export { stableStringify };
// ----------------------------------------------------------------------------
// Byte / hex / base64url helpers. Local so the package has no dependency
// on the host's helper landscape.
// ----------------------------------------------------------------------------
const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
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
//
// Defensive against the most common real-world failure mode: a user copy-
// pasting a display-truncated URL where the terminal / email client / chat
// app rendered the middle as literal "..." (or the Unicode horizontal
// ellipsis "…"). Without this guard, atob throws an opaque
// "InvalidCharacterError" with no hint that the input was truncated rather
// than corrupt.
const fromBase64Url = (s) => {
    if (typeof s !== 'string' || s.length === 0) {
        throw new Error('Empty or non-string base64url payload');
    }
    if (s.includes('...') || s.includes('\u2026')) {
        throw new Error("URL appears truncated — paste the full link (no '...' / '\u2026'), or scan the QR code instead");
    }
    const cleaned = s.replace(/[^A-Za-z0-9_\-]/g, '');
    if (cleaned.length === 0) {
        throw new Error('No base64url-shaped data found in fragment');
    }
    const pad = cleaned.length % 4 === 0 ? '' : '='.repeat(4 - (cleaned.length % 4));
    const b64 = cleaned.replace(/-/g, '+').replace(/_/g, '/') + pad;
    let bin;
    if (typeof globalThis.atob === 'function') {
        try {
            bin = globalThis.atob(b64);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`base64url decode failed: ${message}`);
        }
    }
    else if (typeof Buffer !== 'undefined') {
        bin = Buffer.from(b64, 'base64').toString('binary');
    }
    else {
        throw new Error('No base64 decoder available (need atob or Node Buffer in this runtime)');
    }
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
        out[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(out);
};
const round8 = (n) => Math.round(n * 1e8) / 1e8;
// ----------------------------------------------------------------------------
// verifyArtifact — runs all five checks and returns a structured report.
//
// Throws ONLY on structurally-invalid input (missing payload, malformed
// signature hex, malformed pubkey hex). Any cryptographic or content-level
// failure is reflected in `report.checks.*` and `report.valid`, never as
// an exception — this lets the caller render a clear "what failed and why"
// without having to wrap every call in a try/catch.
// ----------------------------------------------------------------------------
export async function verifyArtifact(raw) {
    if (!raw || typeof raw !== 'object') {
        throw new Error('artifact must be a JSON object');
    }
    const { payload, signature: rawSignature } = raw;
    if (!payload || typeof payload !== 'object') {
        throw new Error('artifact missing `payload` object');
    }
    if (typeof rawSignature !== 'string' ||
        !/^[0-9a-f]{128}$/i.test(rawSignature)) {
        throw new Error('artifact `signature` must be 128-char hex');
    }
    // Canonicalize signature to lowercase so the rest of the pipeline (and
    // the returned report) always reflect the contract documented above.
    // Uppercase hex is structurally valid Ed25519 input but historically we
    // emit lowercase from the app, so callers can use string equality on
    // report.signature without surprise normalization.
    const signature = rawSignature.toLowerCase();
    const pubkey = payload.pubkey;
    if (typeof pubkey !== 'string' || !/^[0-9a-f]{64}$/i.test(pubkey)) {
        throw new Error('payload.pubkey must be 64-char hex');
    }
    const canonicalMessage = stableStringify(payload);
    const canonicalHashFull = toHex(sha256(utf8(canonicalMessage)));
    const canonicalHash = canonicalHashFull.slice(0, 16);
    const claimedMessage = typeof raw.message === 'string' ? raw.message : canonicalMessage;
    const claimedHash = typeof raw.hash === 'string' ? raw.hash.toLowerCase() : canonicalHash;
    const canonicalMatches = claimedMessage === canonicalMessage;
    const hashMatches = claimedHash === canonicalHash;
    const kindRaw = payload.kind;
    const isProofOfOrigin = kindRaw === 'proof-of-origin';
    const isEarning = kindRaw === 'earning';
    const isAttestation = kindRaw === 'attestation';
    // Attribution is carried on every artifact kind except heartbeats. The
    // bureau attestation kind embeds the same PROOF_ATTRIBUTION string so a
    // partner can grep for it without knowing the kind in advance.
    const attributionOk = isProofOfOrigin || isEarning || isAttestation
        ? payload.attribution ===
            PROOF_ATTRIBUTION
        : null;
    let feeIntegrityOk = null;
    if (isEarning) {
        const grossRaw = payload.gross;
        const feeRaw = payload.fee;
        const netRaw = payload.net;
        const gross = typeof grossRaw === 'number' ? grossRaw : 0;
        const expectedFee = round8(gross * PROTOCOL_FEE_RATE);
        const expectedNet = round8(gross - expectedFee);
        feeIntegrityOk =
            typeof feeRaw === 'number' &&
                typeof netRaw === 'number' &&
                Math.abs(feeRaw - expectedFee) < 1e-9 &&
                Math.abs(netRaw - expectedNet) < 1e-9;
    }
    // bureauOk: payload.pubkey is the BUREAU's pubkey (signer), not the
    // device's. We confirm it equals the published BUREAU_PUBKEY constant —
    // this is what prevents a forger from minting attestations under their
    // own key and having partners accept them.
    //
    // Case insensitivity: BUREAU_PUBKEY is stored lowercase, payload pubkey
    // is normalized lowercase by the caller before signing, but compare
    // case-insensitively for defensive robustness.
    const bureauOk = isAttestation
        ? pubkey.toLowerCase() === BUREAU_PUBKEY.toLowerCase()
        : null;
    // We verify against the CANONICAL message, not the claimed one. If the
    // claimed message has been altered to match a different payload,
    // canonicalMatches catches it; the signature verify still passes against
    // canonical — unless the payload itself was re-signed by a different key
    // (in which case signatureOk also fails because pubkey won't match the
    // signer).
    let signatureOk = false;
    let signatureError = null;
    try {
        const sigBytes = fromHex(signature);
        const pubBytes = fromHex(pubkey);
        const msgBytes = utf8(canonicalMessage);
        signatureOk = await ed.verifyAsync(sigBytes, msgBytes, pubBytes);
    }
    catch (err) {
        signatureError = err instanceof Error ? err.message : String(err);
    }
    const valid = canonicalMatches &&
        hashMatches &&
        (attributionOk === true || attributionOk === null) &&
        (feeIntegrityOk === true || feeIntegrityOk === null) &&
        (bureauOk === true || bureauOk === null) &&
        signatureOk;
    const kind = kindRaw === 'proof-of-origin' ||
        kindRaw === 'heartbeat' ||
        kindRaw === 'earning' ||
        kindRaw === 'attestation'
        ? kindRaw
        : 'unknown';
    return {
        valid,
        kind,
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
            feeIntegrityOk,
            bureauOk,
            signatureOk,
            signatureError,
        },
    };
}
// ----------------------------------------------------------------------------
// decodeProofUrl — convenience for the QR / URL flow. Given a full verifier
// URL (e.g. https://getkinetik.app/verify/#proof=<base64url>), decode the
// fragment back to the SignedArtifact JSON object the verify pipeline
// accepts. Defensive against truncated / wrapped URLs (see fromBase64Url).
// ----------------------------------------------------------------------------
export function decodeProofUrl(url) {
    if (typeof url !== 'string' || url.length === 0) {
        throw new Error('decodeProofUrl: url must be a non-empty string');
    }
    const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : url;
    const match = fragment.match(/(?:^|&)proof=([^&]+)/);
    if (!match) {
        throw new Error('URL has no #proof= fragment');
    }
    const json = fromBase64Url(decodeURIComponent(match[1]));
    let parsed;
    try {
        parsed = JSON.parse(json);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`#proof= fragment is not valid JSON: ${message}`);
    }
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('#proof= fragment did not decode to an object');
    }
    return parsed;
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
        : kind === "earning"
          ? "EARNING VERIFIED"
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
    // heartbeat (see packages/kinetik-core/src/proof.ts). Render with the same labels and
    // units as the heartbeat sensor rows so the user reads ONE consistent
    // set of values everywhere. Same forward-compat policy: missing or
    // null fields just render as "—" — the signature has already proven
    // the entire payload byte-for-byte by the time we get here.
    // ----------------------------------------------------------------------
    if (payload.sensors && typeof payload.sensors === "object") {
      const s = payload.sensors;
      const latLabel =
        typeof s.latitude === "number" ? `${s.latitude.toFixed(3)}°` : "—";
      const lngLabel =
        typeof s.longitude === "number" ? `${s.longitude.toFixed(3)}°` : "—";
      const motionLabel =
        typeof s.motionRms === "number" ? `${s.motionRms.toFixed(2)} g` : "—";
      const pressureLabel =
        typeof s.pressureHpa === "number"
          ? `${s.pressureHpa.toFixed(2)} hPa`
          : "—";
      const luxLabel =
        typeof s.lux === "number" ? `${Math.round(s.lux)} lx` : "—";
      rows.push(["LATITUDE", latLabel]);
      rows.push(["LONGITUDE", lngLabel]);
      rows.push(["MOTION", motionLabel]);
      rows.push(["PRESSURE", pressureLabel]);
      rows.push(["LIGHT", luxLabel]);
    }
  } else if (kind === "earning") {
    const currency = payload.currency ?? "";
    const fmtAmt = (n) =>
      typeof n === "number" ? `${n} ${currency}`.trim() : "—";
    rows.push(["SOURCE", payload.source ?? "—"]);
    rows.push(["CURRENCY", currency || "—"]);
    rows.push(["GROSS", fmtAmt(payload.gross)]);
    rows.push(["FEE (1%)", fmtAmt(payload.fee)]);
    rows.push(["NET", fmtAmt(payload.net)]);
    rows.push(["WHEN", fmtIsoDateTime(payload.ts)]);
    rows.push(["REF", payload.externalRef ?? "—"]);
    rows.push([
      "PREV HASH",
      payload.prevHash ? String(payload.prevHash).toUpperCase() : "—",
    ]);
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
    // schema. Forward-compatible by default. See packages/kinetik-core/src/sensors.ts for
    // the canonical SensorReadout shape and rounding rules.
    // ----------------------------------------------------------------------
    if (payload.sensors && typeof payload.sensors === "object") {
      const s = payload.sensors;
      const latLabel =
        typeof s.latitude === "number" ? `${s.latitude.toFixed(3)}°` : "—";
      const lngLabel =
        typeof s.longitude === "number" ? `${s.longitude.toFixed(3)}°` : "—";
      const motionLabel =
        typeof s.motionRms === "number" ? `${s.motionRms.toFixed(2)} g` : "—";
      const pressureLabel =
        typeof s.pressureHpa === "number"
          ? `${s.pressureHpa.toFixed(2)} hPa`
          : "—";
      const luxLabel =
        typeof s.lux === "number" ? `${Math.round(s.lux)} lx` : "—";
      rows.push(["LATITUDE", latLabel]);
      rows.push(["LONGITUDE", lngLabel]);
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
      checks.feeIntegrityOk === true,
      "Third-party network fee math integrity (earnings receipts only)",
      checks.feeIntegrityOk === null,
    ),
    mkCheck(
      checks.signatureOk,
      checks.signatureError
        ? `Ed25519 signature — error: ${checks.signatureError}`
        : "Ed25519 signature verifies against payload.pubkey",
    ),
  ].join("");

  const attributionBlock =
    (kind === "proof-of-origin" || kind === "earning") && payload.attribution
      ? `
        <div class="divider"></div>
        <div class="attribution-block">
          <p class="attribution">${esc(payload.attribution)}</p>
          <p class="attribution-sub">${kind === "earning" ? "A Sovereign Earning receipt · 1% protocol fee signed in" : "A Sovereign Node artifact · not transferable"}</p>
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
    // Stack traces in the DOM are noise — they scare users and tell
    // them nothing actionable. Surface the message in the UI; log the
    // full error (with stack, if any) to the console for ops/debug.
    if (err && err.stack) console.error("[verifier]", err);
    renderError(err?.message ?? String(err), null);
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
//
// IMPORTANT: this value MUST stay in lockstep with the `?v=…` cache-bust
// query strings in landing/verify/index.html. The query strings force
// every browser (especially mobile Chrome on phones that visited the old
// verifier) to fetch the new bytes on the next deploy. Bumping here without
// also bumping the index.html query string means returning testers will
// silently keep running the old verifier — which is exactly the bug that
// hid PoO sensor rows from the v1.2.0 first-day cohort.
// ----------------------------------------------------------------------------
window.__kinetikVerifier = {
  version: "1.3.3",
  verifyArtifact,
  decodeProofUrl,
  stableStringify,
  PROOF_ATTRIBUTION,
  BUREAU_PUBKEY,
};
