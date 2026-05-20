# GETKINETIK — Android App & Mobile Runtime Rules

> **TARGET DIRECTORIES:** These rules apply strictly to React Native, Expo, and native mobile modules under `packages/`, `src/`, `App.tsx`, and `modules/`. The code runs in the Expo standalone/development runtime (Hermes engine) and must respect native hardware/software enclaves.

---

## 1. Hardware-Backed Enclave Policy
The private key defines the identity of a Sovereign Node. Key material must be protected against local app sandbox traversal:
- **Expo Secure Store**: Private keys (`kinetik.identity.sk.v1`) and recovery mnemonics (`kinetik.identity.mnemonic.v1`) MUST be stored in hardware-backed enclaves using `expo-secure-store`.
- **Android / iOS TEE Binding**: Underneath the hood, these keys map to the Android Keystore (backed by TEE/enclaves) and the iOS Keychain (backed by Secure Enclave).
- **No Custody / No Export**: Private keys MUST never be exported or transmitted off the device. All transactions/heartbeats are signed locally on-device.

---

## 2. Hermes Crypto & CSPRNG Override
React Native Hermes runtimes lack standard browser/Node APIs like `crypto.subtle`. We must bypass this limitation using pure-JS overrides:
- **SHA-512 Async Override**: `@noble/ed25519` tries to use `crypto.subtle.digest` for signature calculations, which crashes under Hermes. You MUST override the library's internal hash mappings at import time:
  ```typescript
  import * as ed from '@noble/ed25519';
  import { sha512 } from '@noble/hashes/sha2.js';

  ed.hashes.sha512 = sha512 as unknown as typeof ed.hashes.sha512;
  ed.hashes.sha512Async = (async (msg: Uint8Array): Promise<Uint8Array> => sha512(msg)) as typeof ed.hashes.sha512Async;
  ```
- **CSPRNG Guardrail**: The system MUST verify the presence of a cryptographically secure random number generator at import time and fail loudly if `globalThis.crypto.getRandomValues` is unavailable:
  ```typescript
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('[identity] crypto.getRandomValues unavailable — need CSPRNG.');
  }
  ```
  This prevents silent, insecure fallbacks to `Math.random` during key generation.

---

## 3. Legacy Key Migration Bridge
To support legacy users who registered before mnemonic recovery was introduced, we utilize a deterministic backward-compatibility bridge:
- **Bridge Logic**: If `secretKey` is present in `SecureStore` but `mnemonic` is missing, derive a deterministic 12-word recovery mnemonic from the **first 16 bytes of the secret key** using entropy-to-mnemonic functions:
  ```typescript
  const entropy = secretKey.slice(0, 16);
  mnemonic = entropyToMnemonic(entropy);
  ```
- **Goal**: Provides immediate backup capabilities to existing users without rotating their keys or changing their public Node ID.

---

## 4. State Cleansing on Identity Change
Sovereign heartbeats are hash-chained. Restoring or changing the node identity without clearing local cache creates a corrupt ledger:
- **State Erasure**: Any operation that overwrites or wipes the node's secret identity (such as `restoreIdentityFromMnemonic` or `eraseNodeIdentity`) MUST immediately call the log wiper `eraseHeartbeatLog()` to delete historical heartbeats.
- **Goal**: Avoids identity mismatch errors where the verifier encounters a heartbeat block that does not belong to the active node identity chain.

---

## 5. Sensor Telemetry Precision
Sensor captures (accelerometer, barometer, light) must be clean, lightweight, and parsed through rounding limits before serialization:
- **Determinism**: Raw float precision varies by phone hardware (different frequencies and accelerometer specs).
- **Rounding Limits**: Payloads must be sanitized before stringifying:
  - `motionRms`: Round to 2 decimal places (`motionRms.toFixed(2)`).
  - `pressureHpa`: Round to 2 decimal places (`pressureHpa.toFixed(2)`).
  - `lux`: Round to nearest whole number (`Math.round(lux)`).
