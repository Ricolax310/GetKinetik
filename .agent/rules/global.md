# GETKINETIK — Universal Cryptographic & Encryption Rules

> **CRITICAL INVARIANT:** This codebase ships a cryptographic trust layer. Drift, formatting issues, or algorithm modifications in key files will silently break the integrity contract every signed proof depends on. Treat all changes to cryptography, serialization, or signing as potentially high-risk breaking changes.

---

## 1. Pinned Signing Algorithm
All GETKINETIK signed artifacts MUST use **Ed25519** (RFC 8032, pure/cofactor-free).
- **Libraries**: Pinned to `@noble/ed25519` v3.1.0 and `@noble/hashes` v2.2.0.
- **Message Hashing**: SHA-512 via `@noble/hashes/sha2.js` is the message hashing function for Ed25519.
- **Key Materials**:
  - Private key: 32 bytes (never exported in raw form).
  - Public key: 32 bytes (stored as a 64-character lowercase hex string).
  - Node ID: Human-readable fingerprint derived as `KINETIK-NODE-XXXXXXXX` (where `XXXXXXXX` represents the first 8 characters of `sha256(publicKey)` in uppercase hex).

---

## 2. Serialization Contract (`stableStringify`)
Any signable artifact (heartbeats, Proof of Origin cards, earning receipts) MUST be serialized to JSON with lexicographically sorted top-level keys and no whitespace or indentation before signing or verifying.
- **Shallow Lexicographical Sort**: Sorting only applies to the top-level keys.
- **Nested Objects**: Values inside nested objects (such as the `sensors` block) are serialized via the engine's default `JSON.stringify` (preserving insertion order). Callers MUST manually insert nested keys in canonical order (e.g., `motionRms`, `pressureHpa`, `lux`).
- **Standard Serialization Implementation**:
  ```typescript
  export const stableStringify = (obj: Record<string, unknown>): string => {
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
    }
    return `{${parts.join(',')}}`;
  };
  ```
- **Prohibited Types**: Date, undefined, functions, symbols, BigInt MUST be mapped to primitive types (number, string, boolean, null) before calling `stableStringify`.

---

## 3. Hash Chain Integrity
The heartbeat log and earning ledger both utilize hash chaining to detect gaps, duplicates, or tampering.
- **Truncated Hash Chain Tip**:
  ```
  prevHash = sha256(stableStringify(previousEntry))[:16] (lowercase hex)
  ```
- **Genesis Block**: The first entry in any chain has `prevHash: null`.
- **Audit Rule**: Any mismatch in `prevHash` or sequence gap indicates tampering.

---

## 4. Attribution Constant
Every Proof of Origin or Earning entry MUST include the signed-in branding attribution constant:
- **Value**: `"GETKINETIK by OutFromNothing LLC"`
- **Rule**: Verifiers MUST reject any artifact where `payload.attribution !== "GETKINETIK by OutFromNothing LLC"`. Stripping or changing this string invalidates the signature.

---

## 5. Protocol Fees & Precision Math
Earnings ledger records are subject to strict fee enforcement to prevent zero-fee bypasses or precision drift.
- **Enforced Rate**: **1% protocol fee** must be calculated and signed directly in the payload.
- **Formulas**:
  ```typescript
  fee = round8(gross * 0.01);
  net = round8(gross - fee);
  ```
- **Rounding Rule (round8)**: All values must be rounded to exactly 8 decimal places:
  ```typescript
  const round8 = (n: number): number => Math.round(n * 1e8) / 1e8;
  ```
- **Tolerance**: Math validation uses a strict tolerance of `< 1e-9` (absolute deviation).

---

## 6. Wallet Address Derivation
Sovereign node wallet addresses must be deterministically derived from their node public keys using domain-separated hashing.
- **Domain Separator**: `UTF-8("kinetik-wallet-v1")`
- **Derivation Algorithm**:
  ```
  combined = UTF-8("kinetik-wallet-v1") || publicKeyBytes (32 bytes raw)
  digest = sha256(combined)
  walletAddr = "kn1" + base32(digest)[0:32]
  ```
- **Constraint**: Wallet address derivation requires no new seed phrases or private key materials.

---

## 7. Change & Drift Verification
- After ANY change to cryptography, serialization formats, or verification files, you MUST run:
  ```bash
  node landing/verify/smoketest.mjs
  ```
- Any test failure in the smoketest indicates a contract breaking drift and MUST be resolved before committing.
