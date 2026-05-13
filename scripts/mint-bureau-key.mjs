// ============================================================================
// Mint the GETKINETIK Genesis Bureau Ed25519 signing key.
//
// This script generates the keypair that signs every bureau attestation.
// Run ONCE. After the ceremony, the public key is committed to the repo
// (as @getkinetik/verify's BUREAU_PUBKEY constant) and the private seed
// is stored in your password manager + Cloudflare Pages secrets.
//
// The bureau key is the highest-trust secret in the entire GETKINETIK
// system. If it leaks, anyone can mint forged attestations that pass
// every check in @getkinetik/verify. If it's lost, every cached
// attestation is still verifiable but no new ones can be signed and
// the only recovery is a key rotation — which invalidates every cached
// attestation already in the wild.
//
// Run:    node scripts/mint-bureau-key.mjs
// Output: prints the pubkey hex (safe to commit) and the secret seed hex
//         (NEVER commit, NEVER paste in chat, NEVER log).
//
// After running:
//   1. Copy the SECRET SEED HEX into Bitwarden / 1Password under
//      "GETKINETIK Genesis Bureau signing seed". Multiple admins MUST
//      have access — losing this key is unrecoverable.
//   2. Open Cloudflare Pages → getkinetik → Settings → Variables and
//      Secrets and set TWO secrets:
//        BUREAU_SIGNING_KEY_HEX  ← the secret seed hex from this script
//        BUREAU_PUBKEY_HEX       ← the public key hex from this script
//      Both are required by functions/api/_lib/bureauSign.js — the
//      worker derives the pubkey from the seed and fails loudly if the
//      two env vars disagree.
//   3. Edit packages/verify/src/index.ts and replace BUREAU_PUBKEY's
//      placeholder value (64 zero chars) with the public key hex from
//      this script. Bump @getkinetik/verify VERSION. Rebuild the
//      package and republish. Existing partners get the new pubkey
//      via their next `npm update`.
//   4. Redeploy production. Until the deploy goes green, the new key
//      will not be used and `/api/verify-device` will return
//      `attestation: null` in every response.
//   5. Run scripts/mint-demo-proof.mjs and POST it to the live endpoint
//      to confirm the bureau is now minting signed attestations. The
//      response's `attestation.payload.pubkey` MUST equal the public
//      key from this script.
//
// MIGRATION TO HSM / KMS (phase 2):
//   The interface in functions/api/_lib/bureauSign.js — { pubkeyHex,
//   sign(message) → hex } — is satisfied by any sign-only API. When
//   migrating, write a new loader that returns the same shape but
//   delegates signing to your KMS / HSM client. The wire contract
//   stays identical; partners notice nothing.
// ============================================================================

import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const seed = ed.utils.randomSecretKey();
const pub = await ed.getPublicKeyAsync(seed);

const seedHex = toHex(seed);
const pubHex = toHex(new Uint8Array(pub));
const fingerprint = toHex(sha256(new Uint8Array(pub))).slice(0, 16);

console.log("");
console.log("=== GETKINETIK Genesis Bureau key minted ===");
console.log("");
console.log("Public key fingerprint (sha256(pub)[:16]):");
console.log("");
console.log(`  ${fingerprint}`);
console.log("");
console.log("BUREAU_PUBKEY_HEX (safe to commit, paste into");
console.log("packages/verify/src/index.ts as BUREAU_PUBKEY,");
console.log("AND set as Cloudflare secret BUREAU_PUBKEY_HEX):");
console.log("");
console.log(`  ${pubHex}`);
console.log("");
console.log("──────────────────────────────────────────────────────────────");
console.log("BUREAU_SIGNING_KEY_HEX  ⚠  SECRET  ⚠");
console.log("");
console.log("Anyone holding this seed can mint forged bureau attestations.");
console.log("Store in Bitwarden / 1Password BEFORE pasting into Cloudflare.");
console.log("NEVER commit. NEVER paste in chat. NEVER log.");
console.log("");
console.log(`  ${seedHex}`);
console.log("");
console.log("──────────────────────────────────────────────────────────────");
console.log("");
console.log("Next steps:");
console.log("  1. Store BUREAU_SIGNING_KEY_HEX in your password manager.");
console.log("  2. Set both env vars as Cloudflare Pages secrets.");
console.log("  3. Replace BUREAU_PUBKEY in packages/verify/src/index.ts.");
console.log("  4. Bump packages/verify VERSION, rebuild, republish.");
console.log("  5. Redeploy and verify with a fresh proof.");
console.log("");
