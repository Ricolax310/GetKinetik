/**
 * Bureau Ed25519 signer for Cloudflare Pages Functions.
 *
 * Loads the bureau signing seed (32 raw bytes, hex-encoded) from the
 * Cloudflare environment and exposes a signAttestation() helper that
 * mints a SignedAttestation envelope from a canonical AttestationPayload.
 *
 * ZERO npm dependencies on purpose. Uses crypto.subtle natively — the
 * Cloudflare Workers runtime supports Ed25519 sign/verify via SubtleCrypto
 * since 2023 (workerd PR #500). Pages Functions are bundled with esbuild
 * and have no node_modules to resolve against unless a build command is
 * configured; staying inside the runtime API keeps deploys friction-free
 * and matches the pattern the other functions/api/*.js workers already use.
 *
 * KEY STORAGE CONTRACT — set these as Cloudflare Pages secrets:
 *
 *   BUREAU_SIGNING_KEY_HEX   64-char lowercase hex of the 32-byte Ed25519
 *                            seed produced by scripts/mint-bureau-key.mjs.
 *                            Treat like a master password — never log it,
 *                            never check it into the repo. If this rotates,
 *                            the public BUREAU_PUBKEY in @getkinetik/verify
 *                            MUST rotate in lockstep (otherwise every
 *                            partner's bureauOk check starts failing).
 *
 *   BUREAU_PUBKEY_HEX        64-char lowercase hex of the matching pubkey.
 *                            Server-side mirror of the public constant —
 *                            stored as an env var so we don't have to
 *                            derive the pubkey from the seed via signing
 *                            tricks on every request. Verified against
 *                            the seed at startup (we sign a self-test
 *                            message with the seed and verify against
 *                            this pubkey) so a misconfigured deployment
 *                            fails loudly instead of silently signing
 *                            under the wrong identity.
 *
 * MIGRATION TO HSM / KMS — see docs/methodology/ATTESTATION.md §6.
 *   The contract here is: anything that exports a `pubkeyHex` string and a
 *   `sign(message: string) → Promise<128-char hex>` is a valid bureau
 *   signer. The current env-key implementation will be replaced by a
 *   sign-only HSM/KMS client in phase 2; downstream code calling
 *   signAttestation() does not change.
 *
 * ZERO LOGGING OF KEY MATERIAL. Any `console.error` in this file MUST
 * exclude the seed, the pkcs8, or any other sensitive byte sequence —
 * Cloudflare logs are not a secret store.
 */

// ----------------------------------------------------------------------------
// PKCS8 prefix for an Ed25519 private key. Per RFC 8410:
//
//   SEQUENCE (0x30) length 0x2e (46 bytes following)
//     INTEGER (0x02) length 1, value 0      ← version
//     SEQUENCE (0x30) length 5
//       OID (0x06) length 3, value 1.3.101.112  ← id-Ed25519
//     OCTET STRING (0x04) length 0x22 (34)  ← curvePrivateKey wrapper
//       OCTET STRING (0x04) length 0x20 (32) ← raw 32-byte seed follows
//
// Total length of the prefix bytes: 16. Append the 32-byte seed to get a
// complete 48-byte pkcs8 DER. This wrapper never changes for Ed25519.
// ----------------------------------------------------------------------------
const PKCS8_PREFIX = new Uint8Array([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06,
  0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
]);

function seedToPkcs8(seedBytes) {
  const out = new Uint8Array(PKCS8_PREFIX.length + seedBytes.length);
  out.set(PKCS8_PREFIX, 0);
  out.set(seedBytes, PKCS8_PREFIX.length);
  return out;
}

// ----------------------------------------------------------------------------
// Hex / byte helpers — local so this file has no cross-cutting dependency
// on the rest of the worker. Matches the contract in packages/verify.
// ----------------------------------------------------------------------------

function hexToBytes(hex) {
  if (typeof hex !== "string" || hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) return null;
    out[i] = byte;
  }
  return out;
}

function bytesToHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

const utf8 = (s) => new TextEncoder().encode(s);

async function sha256Bytes(message) {
  const buf = await crypto.subtle.digest("SHA-256", utf8(message));
  return new Uint8Array(buf);
}

// ----------------------------------------------------------------------------
// stableStringify — byte-for-byte equivalent of packages/kinetik-core's
// stableJson.ts and packages/verify's stableStringify. CRITICAL: this must
// stay in lockstep with both. Any future move to a recursive sort needs to
// land in all three files in the same commit, with a schema version bump.
// ----------------------------------------------------------------------------
export function stableStringify(obj) {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(",")}}`;
}

// ----------------------------------------------------------------------------
// loadBureauSigner — returns a signer interface backed by env vars, or
// `null` if the bureau key has not been configured for this deployment.
// Callers MUST handle the null case (typically by omitting the signed
// attestation field from the response so partners get a clean signal
// instead of an attestation under a placeholder key).
//
// Self-check at load time: we sign a fixed test message with the seed
// and verify against the published BUREAU_PUBKEY_HEX. If the verification
// fails, the two env vars disagree — refuse to return a signer rather
// than silently sign under the wrong identity.
// ----------------------------------------------------------------------------
const SELF_CHECK_MESSAGE = "GETKINETIK-bureau-signer-self-check";

export async function loadBureauSigner(env) {
  const skHex =
    typeof env?.BUREAU_SIGNING_KEY_HEX === "string"
      ? env.BUREAU_SIGNING_KEY_HEX.toLowerCase().trim()
      : "";
  const pubHex =
    typeof env?.BUREAU_PUBKEY_HEX === "string"
      ? env.BUREAU_PUBKEY_HEX.toLowerCase().trim()
      : "";

  if (!skHex || !pubHex) return null;
  if (!/^[0-9a-f]{64}$/.test(skHex) || !/^[0-9a-f]{64}$/.test(pubHex)) {
    console.error("[bureauSign] BUREAU_*_HEX env vars are not 64-char hex");
    return null;
  }

  const seed = hexToBytes(skHex);
  const pub = hexToBytes(pubHex);
  if (!seed || !pub) return null;

  // Import the private key (non-extractable, sign-only). Wrapping the
  // 32-byte seed in the fixed pkcs8 prefix is what makes this work with
  // crypto.subtle — the runtime accepts pkcs8 DER but not a raw seed.
  let privateKey;
  try {
    privateKey = await crypto.subtle.importKey(
      "pkcs8",
      seedToPkcs8(seed),
      { name: "Ed25519" },
      false,
      ["sign"],
    );
  } catch (err) {
    console.error("[bureauSign] failed to import bureau private key:", err);
    return null;
  }

  // Sanity check: sign a fixed message with the private key and verify
  // against the published pubkey. If they disagree, the env vars were
  // rotated incorrectly and we would otherwise silently sign under the
  // wrong identity — every partner's bureauOk check would fail.
  try {
    const publicKey = await crypto.subtle.importKey(
      "raw",
      pub,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const testMsg = utf8(SELF_CHECK_MESSAGE);
    const testSig = await crypto.subtle.sign("Ed25519", privateKey, testMsg);
    const matches = await crypto.subtle.verify(
      "Ed25519",
      publicKey,
      testSig,
      testMsg,
    );
    if (!matches) {
      console.error(
        "[bureauSign] BUREAU_PUBKEY_HEX does not match the pubkey derived from BUREAU_SIGNING_KEY_HEX — check Cloudflare Pages secrets.",
      );
      return null;
    }
  } catch (err) {
    console.error("[bureauSign] bureau self-check failed:", err);
    return null;
  }

  return {
    pubkeyHex: pubHex,
    async sign(message) {
      const sigBuf = await crypto.subtle.sign(
        "Ed25519",
        privateKey,
        utf8(message),
      );
      return bytesToHex(new Uint8Array(sigBuf));
    },
  };
}

// ----------------------------------------------------------------------------
// Canonical sub-block helpers — mirror packages/kinetik-core/src/attestation.ts.
// The byte-for-byte contract is the entire reason attestations verify offline.
// If any of these helpers diverges from the kinetik-core counterpart, every
// minted attestation will fail @getkinetik/verify in partner code.
// ----------------------------------------------------------------------------

function canonicalSubject(s) {
  return {
    chainTip: s.chainTip ?? null,
    mintedAt: s.mintedAt,
    nodeId: s.nodeId,
    pubkey: s.pubkey,
  };
}

function canonicalBureauObserved(b) {
  return {
    firstSeenMs: b.firstSeenMs,
    lastSeenMs: b.lastSeenMs,
    peakLifetimeBeats: b.peakLifetimeBeats,
  };
}

function canonicalChainClaim(c) {
  return {
    firstBeatTs: c.firstBeatTs ?? null,
    lifetimeBeats: c.lifetimeBeats,
    schema: c.schema,
  };
}

function canonicalSensorCoherence(s) {
  return {
    luxObserved: !!s.luxObserved,
    luxPlausible: s.luxPlausible ?? null,
    motionRmsObserved: !!s.motionRmsObserved,
    motionRmsPlausible: s.motionRmsPlausible ?? null,
    pressureHpaObserved: !!s.pressureHpaObserved,
    pressureHpaPlausible: s.pressureHpaPlausible ?? null,
  };
}

function canonicalFlags(flags) {
  return Array.from(new Set(Array.isArray(flags) ? flags : [])).sort();
}

function canonicalWitnesses(ws) {
  if (!Array.isArray(ws)) return [];
  const cloned = ws.map((w) => ({
    nodeId: w.nodeId,
    pubkey: w.pubkey,
    signature: w.signature,
    ts: w.ts,
  }));
  cloned.sort((a, b) => (a.ts - b.ts) || a.nodeId.localeCompare(b.nodeId));
  return cloned;
}

// ----------------------------------------------------------------------------
// canonicalAttestation — produces a byte-stable AttestationPayload.
// ALWAYS run an attestation through this before signing.
// ----------------------------------------------------------------------------
export function canonicalAttestation(raw) {
  return {
    v: raw.v,
    kind: raw.kind,
    attribution: raw.attribution,
    pubkey: raw.pubkey,
    bureauTs: raw.bureauTs,
    subject: canonicalSubject(raw.subject),
    bureauObserved: canonicalBureauObserved(raw.bureauObserved),
    chainClaim: canonicalChainClaim(raw.chainClaim),
    sensorCoherence: canonicalSensorCoherence(raw.sensorCoherence),
    flags: canonicalFlags(raw.flags),
    witnesses: canonicalWitnesses(raw.witnesses),
  };
}

// ----------------------------------------------------------------------------
// PROOF_ATTRIBUTION — duplicated from packages/kinetik-core. Must stay
// byte-for-byte identical with the published verifier constant.
// ----------------------------------------------------------------------------
const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";

// ----------------------------------------------------------------------------
// signAttestation — the high-level entry point the verify-device worker calls.
//
// Inputs are the structured facts the worker has assembled from the verified
// proof + KV bureau context. This function:
//   1. Canonicalizes every sub-block.
//   2. Stably stringifies the payload.
//   3. Signs with the bureau key via crypto.subtle.
//   4. Computes the 16-char chain-tip hash via crypto.subtle.digest.
//   5. Returns { payload, message, signature, hash } in the SignedAttestation
//      envelope shape the verifier expects.
//
// Throws ONLY on signer error or invalid input — the caller is responsible
// for falling back to an unsigned response if the bureau signer is null.
// ----------------------------------------------------------------------------
export async function signAttestation(signer, input) {
  if (!signer || typeof signer.sign !== "function") {
    throw new Error("signAttestation: bureau signer not configured");
  }

  const payload = canonicalAttestation({
    v: 1,
    kind: "attestation",
    attribution: PROOF_ATTRIBUTION,
    pubkey: signer.pubkeyHex,
    bureauTs: input.bureauTs ?? Date.now(),
    subject: input.subject,
    bureauObserved: input.bureauObserved,
    chainClaim: input.chainClaim,
    sensorCoherence: input.sensorCoherence,
    flags: input.flags ?? [],
    witnesses: input.witnesses ?? [],
  });

  const message = stableStringify(payload);
  const signature = await signer.sign(message);
  const hashFull = bytesToHex(await sha256Bytes(message));
  const hash = hashFull.slice(0, 16);

  return { payload, message, signature, hash };
}
