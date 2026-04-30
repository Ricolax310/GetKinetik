# GETKINETIK — Cryptographic Contract

> This document is the single source of truth for the signing contract.
> Any change here is a breaking change to every previously-minted artifact.

---

## Signing Algorithm

All GETKINETIK signed artifacts use **Ed25519** (RFC 8032, pure/cofactor-free).

**Library:** `@noble/ed25519` v3.1.0 (pinned)
**Hash function:** SHA-512 (for Ed25519 message hashing) via `@noble/hashes` v2.2.0

Both the mobile app and the browser verifier (`landing/verify/verifier.js`) use the same pinned library versions. The browser verifier vendors the exact ES-module bundles committed to the repo — zero external CDN fetches at verify time.

---

## Key Material

```
keypair:        Ed25519 keypair, 32 bytes private + 32 bytes public
storage:        expo-secure-store (Android Keystore / iOS Keychain)
key id:         KINETIK-KEYS-v1 (SecureStore key)
public key hex: lowercase hex, 64 characters, embedded in every signed payload
```

The keypair is **never exported** from the device in raw form. It is generated on first launch and persists until the user explicitly wipes the app.

---

## Serialization Contract (stableStringify)

Every signable artifact is serialized to JSON with **lexicographically sorted keys** at the top level. Values are serialized with `JSON.stringify` (spec-stable for primitive types across Hermes, V8, JavaScriptCore).

```typescript
// packages/kinetik-core/src/stableJson.ts
const stableStringify = (obj: Record<string, unknown>): string => {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(",")}}`;
};
```

**CRITICAL:** The browser verifier (`landing/verify/verifier.js`) and the Cloudflare Function (`functions/api/verify-device.js`) both contain byte-for-byte equivalent implementations. Any change to this function in any location is a breaking change to all existing signatures. Run `node landing/verify/smoketest.mjs` after any change.

---

## Attribution Constant

```typescript
const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
```

This string is baked into every signed artifact. The Ed25519 signature covers the full serialized payload including this field. Altering the attribution string invalidates the signature — there is no way to strip GETKINETIK's branding from a signed artifact without breaking every existing verifier.

---

## Hash Chain

The heartbeat log and earning ledger are both hash-chained:

```
prevHash = sha256(stableStringify(previousEntry))[:16]  (lowercase hex)
```

The first entry in any chain has `prevHash: null`.

**Verification:** Any gap, duplicate sequence number, or prevHash mismatch indicates tampering or missing data. The public verifier surfaces this as a chain integrity failure.

---

## Proof of Origin Signing Contract

```
message = stableStringify(proofPayload)
signature = ed25519.sign(message, privateKey)
hash = sha256(message)[:16]  // 16-char hex "chain tip"

SignedProof = { payload: proofPayload, message, signature, hash }
```

**Verification steps:**
1. Check `payload.attribution === PROOF_ATTRIBUTION`
2. Re-serialize: `canonical = stableStringify(payload)`
3. Check `sha256(canonical)[:16] === hash`
4. Check `ed25519.verify(signature, canonical, pubkey)` where pubkey is `payload.pubkey` decoded from hex

All four checks must pass. Failure at any step = invalid proof.

---

## Wallet Earning Entry Signing Contract

Same as Proof of Origin, with additional invariants:

```
fee = round8(gross × PROTOCOL_FEE_RATE)   // PROTOCOL_FEE_RATE = 0.01
net = round8(gross - fee)
round8(n) = Math.round(n × 1e8) / 1e8     // 8 decimal places
```

`signEarning()` throws if:
- `fee !== round8(gross × 0.01)` (tolerance: 1e-9)
- `net !== round8(gross - fee)` (tolerance: 1e-9)
- `attribution !== WALLET_ATTRIBUTION`

This makes it impossible to accidentally sign a zero-fee or wrong-net entry.

---

## Wallet Address Derivation

```
domain      = UTF-8("kinetik-wallet-v1")
combined    = domain || publicKey (raw 32 bytes)
hash        = sha256(combined)
walletAddr  = "kn1" + base32(hash)[0:32]
```

The "kinetik-wallet-v1" domain separator distinguishes the wallet address from the node ID fingerprint even though both derive from the same public key bytes. No new secret material required.

---

## Security Properties

| Property | Mechanism |
|---|---|
| Tamper detection | Ed25519 signature over stableStringify(payload) |
| Attribution enforced | attribution field is signed-in, not a display layer |
| Fee cannot be stripped | fee + net are signed; altering either breaks sig |
| Chain integrity | prevHash links each entry to the one before it |
| No custody | Private key never leaves SecureStore; we sign, not hold |
| Offline verification | Browser verifier vendors all crypto; no CDN required |
| Sybil resistance | One keypair per device, hardware-backed where available |

---

## Smoketest

The contract between the app's signing pipeline and the browser verifier is validated by:

```bash
node landing/verify/smoketest.mjs
```

This test:
1. Generates a fresh Ed25519 keypair
2. Mints a Proof of Origin using the app's signing code
3. Verifies it using the browser verifier's code
4. Asserts byte-for-byte hash equivalence

CI runs this test on every push via `.github/workflows/smoketest.yml`.
